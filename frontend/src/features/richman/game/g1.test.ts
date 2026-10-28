import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { GameEngine, replayGame } from './engine';
import type { Action, Replay } from './engine';
import { G1_GOODS, G1_RULES, G1_FINGERPRINT, g1Options, g1PurchaseReason, g1Adjacent, g1Draw } from './g1';
import type { G1Option } from './g1';
import { PROPERTY_CATALOG } from './economy';
import { NEARBY_WORKER_EFFECT } from './nearby-construction';
import { REMOTE_EFFECT } from './items';
import { WEALTH_FINGERPRINT } from './wealth';
import nodes from '../../../../../shared/richman/japan-topology.fixture.json';
import v6 from './fixtures/tools-v6-replay.json';
import golden from './fixtures/tools-v6-golden.json';

const map = [20,50,3,4,5,6].map((id,i,ids)=>({id,x:1000+i*8,y:1000,kind:id===50?6001:0,name:'',adjacent:[ids[(i+1)%ids.length]]}));
const defs=[3,4,5,6].map((node,i)=>({...PROPERTY_CATALOG.properties[0],id:`p${node}`,name:`地块${node}`,nodeIds:[node],x:1016+i*8,y:1000,basePrice:100,upgradeCost:50,rents:[10,20,30,40,50,60]}));
function make(count=2,properties=defs){return new GameEngine(map,{gameId:'g1-test',seed:'group-one',rulesId:G1_RULES.id,characterIds:['a','b','c','d'].slice(0,count),initialFunds:30000},properties);}
function command(e:GameEngine,action:Action){const s=e.state;return{id:`c${s.revision}`,gameId:s.gameId,expectedRevision:s.revision,playerId:s.players[s.active].id,action};}
function send(e:GameEngine,action:Action){const c=command(e,action);expect(e.dispatch(c).ok,JSON.stringify(action)).toBe(true);return c;}
function tick(e:GameEngine,accept=true){const s=e.state,p=s.pending;
  if(s.phase==='idle')send(e,{type:'roll'});
  else if(s.phase==='turnEnd')send(e,{type:'endTurn'});
  else if(p?.kind==='property')send(e,{type:'property',decisionId:p.id,accept:p.operation==='rent'||accept});
  else if(p?.kind==='shop')send(e,{type:'leaveShop',decisionId:p.id});
  else if(p?.kind==='debt')send(e,{type:'settleDebt',decisionId:p.id});
  else if(p?.kind==='branch')send(e,{type:'choose',decisionId:p.id,node:p.choices[0]});
  else if(p)send(e,{type:'animationDone',token:p.id});
  else throw Error('unexpected phase '+s.phase);
}
function until(e:GameEngine,predicate:()=>boolean,accept=true){for(let i=0;i<5000&&!predicate();i++)tick(e,accept);expect(predicate()).toBe(true);}
function conserved(e:GameEngine){const s=e.state;for(const g of G1_GOODS)expect(s.g1!.supply[g.id]+Object.values(s.effects!.inventory).reduce((n,inv)=>n+(inv[g.id]??0),0)).toBe(g.supply);}
function replay(e:GameEngine,properties=defs){const copy=replayGame(map,JSON.parse(JSON.stringify(e.exportReplay())),properties);expect(copy.state).toEqual(e.state);expect(copy.events).toEqual(e.events);}
function activate(e:GameEngine,id:string,option:G1Option){const good=G1_GOODS.find(g=>g.id===id)!;send(e,{type:'item',action:{type:'begin',definitionId:good.effect}});return send(e,{type:'item',action:{type:'confirm',decisionId:e.state.pending!.id,target:option.target}});}
function fixture(){const s=make().state;s.players[0].node=3;s.players[0].previous=50;s.economy!.properties[0]={id:'p3',ownerId:'player-2',level:2};s.economy!.properties[1]={id:'p4',ownerId:'player-1',level:5};s.economy!.properties[2]={id:'p5',ownerId:null,level:1};return s;}

describe('G1 shared domain previews',()=>{
  it('prices current opponent land from base and level, requires cash alone, rejects self/unowned/non-land',()=>{
    const s=fixture(),options=()=>g1Options(s,map,defs,'card:03');expect(options()[0].transfer).toEqual({from:'player-1',to:'player-2',amount:200});
    expect(options()[0].changes[0].after).toEqual({id:'p3',ownerId:'player-1',level:2});
    s.economy!.balances['player-1'].cash=199;expect(options()).toEqual([]);s.economy!.balances['player-1'].cash=200;expect(options()).toHaveLength(1);
    for(const ownerId of ['player-1',null]){s.economy!.properties[0].ownerId=ownerId;expect(options()).toEqual([]);}
    s.players[0].node=50;expect(options()).toEqual([]);
  });
  it('swaps ownership separately from levels, accepts unowned/equal owners and excludes same/distant/facility',()=>{
    const s=fixture();const land=g1Options(s,map,defs,'card:04').find(o=>o.target.id==='p4')!;
    expect(land.changes.map(c=>c.after)).toEqual([{id:'p3',ownerId:'player-1',level:2},{id:'p4',ownerId:'player-2',level:5}]);
    const house=g1Options(s,map,defs,'card:05').find(o=>o.target.id==='p4')!;
    expect(house.changes.map(c=>c.after)).toEqual([{id:'p3',ownerId:'player-2',level:5},{id:'p4',ownerId:'player-1',level:2}]);
    expect(g1Options(s,map,defs,'card:04').some(o=>o.target.id==='p5')).toBe(true);
    for(const id of ['card:04','card:05'])expect(g1Options(s,map,[...defs,{...defs[0],id:'far',x:9000}],id).some(o=>['p3','far'].includes(o.target.id))).toBe(false);
    s.economy!.properties[1].ownerId='player-2';expect(g1Options(s,map,defs,'card:04')[0].detail).toContain('仍消耗');
    s.economy!.properties[1].level=2;expect(g1Options(s,map,defs,'card:05')[0].detail).toContain('仍消耗');
    expect(g1Options(s,map,defs.map(d=>({...d,kind:'facility'})),'card:05')).toEqual([]);
  });
  it('demolishes exactly one level, allows unowned buildings and refuses own or zero-level land',()=>{
    const s=fixture(),opts=g1Options(s,map,defs,'card:12');expect(opts.map(o=>o.target.id)).toEqual(['p3','p5']);
    expect(opts.map(o=>o.changes[0].after.level)).toEqual([1,0]);expect(opts[0].changes[0].after.ownerId).toBe('player-2');
  });
  it('turns self or nearby living players, flips facing and excludes the original previous edge',()=>{
    const s=fixture(),world=map.map(n=>n.id===3?{...n,adjacent:[50,4,5]}:n);s.players[1].node=4;
    let opts=g1Options(s,world,defs,'card:06');expect(opts).toHaveLength(2);expect(opts[0].turn!.candidates).toEqual([4,5]);
    s.g1!.facing['player-1']=7;expect(g1Options(s,world,defs,'card:06')[0].turn!.direction).toBe(3);
    s.finance!.eliminated=['player-2'];opts=g1Options(s,world,defs,'card:06');expect(opts.map(o=>o.target.id)).toEqual(['player-1']);
    expect(g1Options(s,map.map(n=>({...n,x:n.id===3?1000:9000})),defs,'card:06')).toHaveLength(1);
  });
  it('honors original node 78 forbidden slot and deterministic bounded draws including singleton',()=>{
    expect(g1Adjacent(nodes.find(n=>n.id===78)!)).toEqual([85,77]);
    for(const count of [1,2,3,4]){let state=42;const indices=new Set();for(let i=0;i<100;i++){const draw=g1Draw(state,count);expect(draw).toEqual(g1Draw(state,count));expect(draw.state).not.toBe(state);expect(draw.index).toBeLessThan(count);indices.add(draw.index);state=draw.state;}expect(indices.size).toBe(count);}
  });
  it('shares 15 card slots with both cash cards, excluding tools; checks funds and pools',()=>{
    expect(g1PurchaseReason({'card:03':4,'card:04':4,'card:05':4,'card:06':3},100,1,20)).toBe('卡片背包已满');
    expect(g1PurchaseReason({'card:01':1,'card:02':2,'tool:08':9},20,1,20)).toBe('');expect(g1PurchaseReason({},19,1,20)).toBe('点数不足');expect(g1PurchaseReason({},20,0,20)).toBe('暂时售罄');
  });
});

describe('G1 public-command integration',()=>{
  it.each([2,3,4])('acquires and resolves all five cards across %i players with unchanged unrelated assets and exact replay',count=>{
    const e=make(count),done=new Set<string>();expect(e.state.items!.fingerprint).toBe(G1_FINGERPRINT);
    for(const inv of Object.values(e.state.effects!.inventory))for(const good of G1_GOODS)expect(inv[good.id]).toBe(0);
    for(let i=0;i<6000&&done.size<5;i++){
      const s=e.state,player=s.players[s.active],inv=s.effects!.inventory[player.id];
      if(s.phase==='shop'){
        const good=G1_GOODS.find(g=>!done.has(g.id)&&!inv[g.id]&&s.g1!.supply[g.id]>0&&s.items!.points[player.id]>=g.price);
        if(good){send(e,{type:'buyItem',decisionId:s.pending!.id,itemId:good.id});conserved(e);continue;}
      }
      if(s.phase==='idle'){
        const good=G1_GOODS.find(g=>!done.has(g.id)&&inv[g.id]>0&&g1Options(s,map,defs,g.id).length);
        if(good){
          const options=g1Options(s,map,defs,good.id),option=options.find(o=>o.changes.some(c=>JSON.stringify(c.before)!==JSON.stringify(c.after)))??options[0];
          const before=e.state;activate(e,good.id,option);const after=e.state;done.add(good.id);conserved(e);
          expect(after.items).toEqual(before.items);expect(after.cards).toEqual(before.cards);expect(after.wealth).toEqual(before.wealth);expect(after.roadTools).toEqual(before.roadTools);expect(after.phase).toBe('idle');
          if(good.id!=='card:06'){expect(after.players).toEqual(before.players);expect(after.randomState).toBe(before.randomState);}else expect(after.randomState).not.toBe(before.randomState);
          if(option.transfer){const t=option.transfer;expect(after.economy!.balances[t.from].cash).toBe(before.economy!.balances[t.from].cash-t.amount);expect(after.economy!.balances[t.to].bank).toBe(before.economy!.balances[t.to].bank+t.amount);}else expect(after.economy!.balances).toEqual(before.economy!.balances);
          for(const c of option.changes)expect(after.economy!.properties.find(p=>p.id===c.after.id)).toEqual(c.after);
          continue;
        }
        // Free construction remains available and supplies actual buildings for demolition/exchange.
        if(inv['tool:09']>0){send(e,{type:'item',action:{type:'begin',definitionId:NEARBY_WORKER_EFFECT}});send(e,{type:'item',action:{type:'confirm',decisionId:e.state.pending!.id,target:{kind:'property',id:'p4'}}});continue;}
      }
      tick(e);
    }
    expect([...done].sort()).toEqual(G1_GOODS.map(g=>g.id).sort());replay(e);
    expect(e.events.filter(v=>v.type==='g1Resolved')).toHaveLength(5);
  });
  it('cancels without consumption and rejects invalid/empty/stale/duplicate/wrong actor/paused/extra-value commands atomically',()=>{
    const e=make();until(e,()=>e.state.phase==='shop'&&e.state.items!.points[e.state.players[e.state.active].id]>=20);const buyer=e.state.players[e.state.active].id;
    send(e,{type:'buyItem',decisionId:e.state.pending!.id,itemId:'card:06'});until(e,()=>e.state.phase==='idle'&&e.state.players[e.state.active].id===buyer);
    const begin=()=>send(e,{type:'item',action:{type:'begin',definitionId:G1_GOODS[3].effect}});begin();const old=e.state.pending!.id;
    send(e,{type:'item',action:{type:'cancel',decisionId:old}});expect(e.state.effects!.inventory[buyer]['card:06']).toBe(1);begin();
    const before=e.state,events=e.events;const confirm:Action={type:'item',action:{type:'confirm',decisionId:before.pending!.id,target:{kind:'player',id:buyer}}};
    for(const action of [{...confirm,value:6},{type:'item',action:{type:'confirm',decisionId:old,target:{kind:'player',id:buyer}}},{type:'item',action:{type:'confirm',decisionId:before.pending!.id,target:null}},{type:'item',action:{type:'confirm',decisionId:before.pending!.id,target:{kind:'property',id:'p3'}}},{type:'roll'}] as Action[])expect(e.dispatch(command(e,action)).ok).toBe(false);
    expect(e.dispatch({...command(e,confirm),playerId:e.state.players.find(p=>p.id!==buyer)!.id}).ok).toBe(false);expect(e.state).toEqual(before);expect(e.events).toEqual(events);
    send(e,{type:'pause',value:true});expect(e.dispatch(command(e,confirm)).ok).toBe(false);send(e,{type:'pause',value:false});const accepted=send(e,confirm);expect(e.dispatch(accepted).ok).toBe(false);conserved(e);replay(e);
    send(e,{type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}});send(e,{type:'item',value:1,action:{type:'confirm',decisionId:e.state.pending!.id,target:{kind:'player',id:buyer}}});expect(e.state.phase).toBe('rolling');
  });
  it('reverses the next real movement on a two-exit road and clears the facing override after entry',()=>{
    const world=map.map((n,i)=>({...n,adjacent:[map[(i+1)%map.length].id,map[(i+map.length-1)%map.length].id]}));
    const e=new GameEngine(world,{gameId:'reverse-route',seed:'g1-reverse',rulesId:G1_RULES.id,characterIds:['a','b'],initialFunds:30000},defs);
    until(e,()=>e.state.phase==='shop'&&e.state.items!.points[e.state.players[e.state.active].id]>=20);
    const buyer=e.state.players[e.state.active].id;send(e,{type:'buyItem',decisionId:e.state.pending!.id,itemId:'card:06'});
    until(e,()=>e.state.phase==='idle'&&e.state.players[e.state.active].id===buyer);
    const before=e.state.players[e.state.active];expect(before.previous).not.toBeNull();
    const option=g1Options(e.state,world,defs,'card:06').find(o=>o.target.id===buyer)!;activate(e,'card:06',option);
    expect(e.state.players[e.state.active].node).toBe(before.node);expect(e.state.g1!.facing[buyer]).toBe(option.turn!.direction);
    send(e,{type:'roll'});send(e,{type:'animationDone',token:e.state.pending!.id});
    expect(e.state.pending).toMatchObject({kind:'segment',from:before.node,to:before.previous});
    send(e,{type:'animationDone',token:e.state.pending!.id});expect(e.state.g1!.facing[buyer]).toBeUndefined();
    const copy=replayGame(world,e.exportReplay(),defs);expect(copy.state).toEqual(e.state);expect(copy.events).toEqual(e.events);
  });
  it('enforces the shared capacity through 15 actual purchases and rotates/rejects shop tokens',()=>{
    const e=make();until(e,()=>e.state.phase==='shop'&&e.state.items!.points[e.state.players[e.state.active].id]>=1000,false);
    const buyer=e.state.players[e.state.active].id,old=e.state.pending!.id;
    const accepted=send(e,{type:'buyItem',decisionId:old,itemId:'card:01'});
    expect(e.dispatch(accepted).ok).toBe(false);expect(e.dispatch(command(e,{type:'buyItem',decisionId:old,itemId:'card:03'})).ok).toBe(false);
    for(const [itemId,count] of [['card:02',2],['card:12',5],['card:05',4],['card:06',3]] as const)for(let n=0;n<count;n++)send(e,{type:'buyItem',decisionId:e.state.pending!.id,itemId});
    const before=e.state;expect(Object.entries(before.effects!.inventory[buyer]).filter(([id])=>id.startsWith('card:')).reduce((n,[,count])=>n+count,0)).toBe(15);
    expect(e.dispatch(command(e,{type:'buyItem',decisionId:before.pending!.id,itemId:'card:03'})).ok).toBe(false);expect(e.state).toEqual(before);conserved(e);replay(e);
  });
  it('returns all five unused card types at actual bankruptcy without sale proceeds, then completes the game',()=>{
    const properties=defs.map(d=>({...d,rents:Array(6).fill(100000)}));const e=make(3,properties);
    until(e,()=>e.state.phase==='shop'&&e.state.items!.points[e.state.players[e.state.active].id]>=115,false);
    const buyer=e.state.players[e.state.active].id;
    for(const g of G1_GOODS)send(e,{type:'buyItem',decisionId:e.state.pending!.id,itemId:g.id});
    until(e,()=>e.state.pending?.kind==='property'&&e.state.players[e.state.active].id!==buyer,false);
    send(e,{type:'property',decisionId:e.state.pending!.id,accept:true});
    until(e,()=>e.state.phase==='debt'&&e.state.players[e.state.active].id===buyer,false);send(e,{type:'settleDebt',decisionId:e.state.pending!.id});
    expect(e.state.effects!.inventory[buyer]).toEqual({});expect(e.state.items!.points[buyer]).toBe(0);
    for(const g of G1_GOODS)expect(e.state.g1!.supply[g.id]).toBe(g.supply);conserved(e);
    until(e,()=>e.state.phase==='finished');replay(e,properties);
  });
  it('preserves frozen v6 state and events and rejects a v7 fingerprint on old replay',()=>{
    const e=replayGame(nodes,v6 as Replay),hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
    expect(WEALTH_FINGERPRINT).toBe('410bc234');expect(hash(e.state)).toBe(golden.state);expect(hash(e.events)).toBe(golden.events);expect(e.state).not.toHaveProperty('g1');
    expect(()=>replayGame(nodes,{...v6,itemFingerprint:G1_FINGERPRINT} as Replay)).toThrow(/道具/);
  });
});
