import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { GameEngine, replayGame } from './engine';
import type { Action, Replay } from './engine';
import { G2_RULES, G2_GOODS, G2_FINGERPRINT, emptyMobility, tickMobility, g2Options, applyG2, enterDetention, g2PurchaseReason, actionLocked } from './g2';
import { REMOTE_EFFECT } from './items';
import { WEALTH_EFFECT } from './wealth';
import { G1_FINGERPRINT } from './g1';
import { PROPERTY_CATALOG } from './economy';
import { drawDice } from './random';
import nodes from '../../../../../shared/richman/japan-topology.fixture.json';
import v7 from './fixtures/tools-v7-replay.json';
import golden from './fixtures/tools-v7-golden.json';

const ids=[20,50,31,107,84,55,3,4];
const map=ids.map((id,i)=>({id,x:1000+i*8,y:1000,kind:[50,107].includes(id)?6001:id===84?8002:id===55?8001:0,name:'',adjacent:[ids[(i+1)%ids.length]]}));
const defs=[3,4].map((node,i)=>({...PROPERTY_CATALOG.properties[0],id:`p${node}`,name:`地${node}`,nodeIds:[node],x:1048+i*8,y:1000,basePrice:100,upgradeCost:50,rents:[10,20,30,40,50,60]}));
function make(count=2,seed="group-two"){return new GameEngine(map,{gameId:'g2',seed,rulesId:G2_RULES.id,characterIds:['a','b','c','d'].slice(0,count),initialFunds:100000},defs);}
function command(e:GameEngine,action:Action){const s=e.state;return {id:`c${s.revision}`,gameId:s.gameId,expectedRevision:s.revision,playerId:s.players[s.active].id,action};}
function send(e:GameEngine,action:Action){const c=command(e,action),r=e.dispatch(c);expect(r.ok,JSON.stringify(c)).toBe(true);return r;}
function tick(e:GameEngine,accept=true){const s=e.state,p=s.pending;
 if(s.phase==='idle')send(e,{type:'roll'});else if(s.phase==='turnEnd')send(e,{type:'endTurn'});
 else if(p?.kind==='shop')send(e,{type:'leaveShop',decisionId:p.id});
 else if(p?.kind==='property')send(e,{type:'property',decisionId:p.id,accept:p.operation==='rent'||accept});
 else if(p?.kind==='branch')send(e,{type:'choose',decisionId:p.id,node:p.choices[0]});
 else if(p?.kind==='bank')send(e,{type:'leaveBank',decisionId:p.id});
 else if(p?.kind==='debt')send(e,{type:'settleDebt',decisionId:p.id});
 else if(p)send(e,{type:'animationDone',token:p.id});else throw Error('Unexpected '+s.phase);
}
function until(e:GameEngine,done:()=>boolean){for(let i=0;i<12000&&!done();i++)tick(e);expect(done()).toBe(true);}
function use(e:GameEngine,id:string,targetId?:string){const g=G2_GOODS.find(g=>g.id===id)!,o=g2Options(e.state,map,id).find(o=>!targetId||o.target.id===targetId)!;expect(o).toBeDefined();send(e,{type:'item',action:{type:'begin',definitionId:g.effect}});send(e,{type:'item',action:{type:'confirm',decisionId:e.state.pending!.id,target:o.target}});}
function acquire(e:GameEngine,wanted:string[],playerId='player-1',accept=true){
 for(let i=0;i<12000;i++){
  const s=e.state,inv=s.effects!.inventory[playerId];if(wanted.every(id=>inv[id]>0)&&s.players[s.active].id===playerId&&s.phase==='idle')return;
  const g=s.phase==='shop'&&s.players[s.active].id===playerId&&[...G2_GOODS,{id:'card:01',price:200}].find(g=>wanted.includes(g.id)&&!inv[g.id]&&s.items!.points[playerId]>=g.price&&(g.id==='card:01'?s.wealth!.supply:s.g2!.supply[g.id])>0);
  if(g)send(e,{type:'buyItem',itemId:g.id,decisionId:s.pending!.id});else tick(e,accept);
 }throw Error('acquire timeout');
}
function conserved(e:GameEngine){const s=e.state;for(const g of G2_GOODS){const sum=Object.values(s.effects!.inventory).reduce((n,inv)=>n+(inv[g.id]??0),0)+Object.values(s.g2!.players).filter(m=>m.vehicle===g.id).length;expect(sum+s.g2!.supply[g.id],g.id).toBe(g.supply);}}
function exact(e:GameEngine){const copy=replayGame(map,e.exportReplay(),defs);expect(copy.state).toEqual(e.state);expect(copy.events).toEqual(e.events);}

describe('G2 evidence and clocks',()=>{
 it('freezes real v7 UI replay state/events and original fingerprint',()=>{const e=replayGame(nodes,v7 as Replay);expect(e.state.items!.fingerprint).toBe(G1_FINGERPRINT);for(const key of ['state','events'] as const)expect(createHash('sha256').update(JSON.stringify(e[key])).digest('hex')).toBe(golden[key]);expect(e.state.g2).toBeUndefined();});
 it('raw expiry marker lasts through final action, with distinct self stop/turtle counts',()=>{const m=emptyMobility();m.stop=128;m.turtle=2;expect(m.stop).toBeTruthy();tickMobility(m,{});expect([m.stop,m.turtle]).toEqual([0,1]);tickMobility(m,{});expect(m.turtle).toBe(128);tickMobility(m,{});expect(m.turtle).toBe(0);
  m.winter=5;for(const expected of [4,3,2,1,128,0]){tickMobility(m,{});expect(m.winter).toBe(expected);}
 });
 it('detention freezes sleep/turtle but not stop; releases on sixth opportunity and restores dream vehicle later',()=>{const m={...emptyMobility(),prison:2,winter:4,dream:2,turtle:1,stop:1};tickMobility(m,{});expect([m.prison,m.winter,m.dream,m.turtle,m.stop]).toEqual([1,4,2,1,128]);tickMobility(m,{});expect(m.prison).toBe(128);expect(tickMobility(m,{})).toBe('prison');expect([m.winter,m.dream,m.turtle]).toEqual([3,1,128]);
  const inv={'tool:05':1};m.dream=128;m.savedVehicle='tool:05';m.savedDice=2;tickMobility(m,inv);expect([m.vehicle,m.diceCount,inv['tool:05']]).toEqual(['tool:05',2,0]);
 });
 it('dream loses unavailable saved vehicle, winter cancels restoration, and target sets differ from wealth',()=>{
  const s=make(4).state;s.g2!.players['player-2'].prison=1;s.g2!.players['player-3'].winter=2;
  expect(g2Options(s,map,'card:16').map(o=>o.target.id)).toEqual(['player-3','player-4']);
  expect(g2Options(s,map,'card:15')[0].playerIds).toEqual(['player-3','player-4']);
  const o=g2Options(s,map,'card:16')[0];applyG2(s,map,'card:16',o);expect(s.g2!.players['player-3'].dream).toBe(0);
  const m=s.g2!.players['player-4'];m.dream=128;m.savedVehicle='tool:06';tickMobility(m,{});expect(m.vehicle).toBe('foot');
  m.dream=3;m.savedVehicle='tool:06';applyG2(s,map,'card:15',g2Options(s,map,'card:15')[0]);expect([m.dream,m.savedVehicle,m.winter]).toEqual([0,'foot',5]);
  s.finance!.eliminated.push('player-4');expect(g2Options(s,map,'card:14').map(o=>o.target.id)).toEqual(['player-1','player-3']);
  expect(g2Options(s,map.map(n=>n.id===s.players[2].node?{...n,x:9000}:n),'card:16')).toEqual([]);
 });
 it('prison/hospital placement is mutually exclusive, additive low7 timer and no asset mutation',()=>{const s=make().state,before=structuredClone(s.economy);enterDetention(s,map,'player-2','hospital',3);expect(s.players[1]).toMatchObject({node:55,previous:null});enterDetention(s,map,'player-2','prison',5);expect(s.players[1].node).toBe(84);expect(s.g2!.players['player-2']).toMatchObject({hospital:0,prison:5});enterDetention(s,map,'player-2','prison',5);expect(s.g2!.players['player-2'].prison).toBe(10);expect(s.economy).toEqual(before);expect(()=>enterDetention(s,[], 'player-2','prison',5)).toThrow();});
 it('shares 15 slots across 12 cards and limits held vehicles without counting the equipped one',()=>{expect(g2PurchaseReason({'card:01':1,'card:03':4,'card:14':4,'card:15':2,'card:16':4},100,1,'card:17',20)).toBe('卡片背包已满');expect(g2PurchaseReason({'tool:05':9},100,1,'tool:05',80)).toBe('已达到持有上限');expect(g2PurchaseReason({},79,1,'tool:05',80)).toBe('点数不足');expect(g2PurchaseReason({},80,0,'tool:05',80)).toBe('暂时售罄');});
});

describe('G2 legal-command integration',()=>{
 it.each([2,3,4])('acquires all seven, applies real changes, restores clocks and exactly replays %i players',count=>{
  const e=make(count);acquire(e,G2_GOODS.map(g=>g.id));expect(e.state.items!.fingerprint).toBe(G2_FINGERPRINT);conserved(e);
  use(e,'tool:05');expect(e.state.g2!.players['player-1'].diceCount).toBe(2);use(e,'tool:06');expect(e.state.effects!.inventory['player-1']['tool:05']).toBe(1);conserved(e);
  use(e,'card:30','player-1');use(e,'card:14','player-1');let before=e.state;send(e,{type:'roll'});expect(e.state.players).toEqual(before.players);expect(e.state.randomState).toBe(before.randomState);expect(e.events.at(-1)?.type).toBe('turnSkipped');
  until(e,()=>e.state.active===0&&e.state.phase==='idle');before=e.state;send(e,{type:'roll'});expect(e.state.dice).toBe(1);expect(e.state.randomState).toBe(before.randomState);
  until(e,()=>e.state.active===0&&e.state.phase==='idle');use(e,'card:16','player-2');expect(e.state.g2!.players['player-2'].dream).toBe(5);
  until(e,()=>e.state.active===0&&e.state.phase==='idle'&&!e.state.g2!.players['player-2'].dream);use(e,'card:17','player-2');expect(e.state.players[1].node).toBe(84);
  until(e,()=>e.state.active===0&&e.state.phase==='idle'&&!e.state.g2!.players['player-2'].prison);use(e,'card:15');expect(e.state.g2!.players['player-2'].winter).toBe(5);
  until(e,()=>e.state.active===0&&e.state.phase==='idle'&&!e.state.g2!.players['player-2'].winter);conserved(e);exact(e);
  expect(e.events.filter(x=>x.type==='g2Resolved')).toHaveLength(7);
 });
 it('vehicle dice use independent draws; remote chooses total without RNG; swapping and dismount conserve pools',()=>{
  const e=make();acquire(e,['tool:05','tool:06']);use(e,'tool:06');const before=e.state;let rng=before.randomState;const values=[];for(let i=0;i<3;i++){const r=drawDice(rng);rng=r.state;values.push(r.value);}send(e,{type:'roll'});expect(e.state.g2!.lastDice).toEqual(values);expect(e.state.randomState).toBe(rng);expect(e.state.dice).toBe(values.reduce((a,b)=>a+b));
  until(e,()=>e.state.active===0&&e.state.phase==='idle');send(e,{type:'traffic',diceCount:2});expect(e.state.g2!.players['player-1'].diceCount).toBe(2);const random=e.state.randomState;send(e,{type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}});send(e,{type:'item',value:6,action:{type:'confirm',decisionId:e.state.pending!.id,target:{kind:'player',id:'player-1'}}});expect(e.state.dice).toBe(6);expect(e.state.randomState).toBe(random);
  until(e,()=>e.state.active===0&&e.state.phase==='idle');use(e,'tool:05');send(e,{type:'traffic',diceCount:1,dismount:true});conserved(e);expect(e.state.g2!.players['player-1'].vehicle).toBe('foot');exact(e);
 });
 it('dream suspends and restores a legally acquired equipped vehicle after five target turns',()=>{const e=make();acquire(e,['tool:06'],'player-2');use(e,'tool:06');acquire(e,['card:16']);use(e,'card:16','player-2');expect(e.state.g2!.players['player-2']).toMatchObject({vehicle:'foot',savedVehicle:'tool:06',dream:5});expect(e.state.effects!.inventory['player-2']['tool:06']).toBe(1);conserved(e);
  until(e,()=>e.state.active===1&&e.state.phase==='idle'&&!e.state.g2!.players['player-2'].dream);expect(e.state.g2!.players['player-2']).toMatchObject({vehicle:'tool:06',diceCount:3});expect(e.state.effects!.inventory['player-2']['tool:06']).toBe(0);conserved(e);exact(e);
 });
 it('rejects malformed targets/value, stale/repeated/paused commands and preserves inventory on cancellation',()=>{const e=make();acquire(e,['card:17','card:14']);send(e,{type:'item',action:{type:'begin',definitionId:G2_GOODS[3].effect}});let s=e.state;const pending=s.pending!.id;
  for(const action of [{type:'item',action:{type:'confirm',decisionId:pending,target:{kind:'player',id:'player-1'}}},{type:'item',value:3,action:{type:'confirm',decisionId:pending,target:{kind:'player',id:'player-2'}}}] as Action[]){expect(e.dispatch(command(e,action)).ok).toBe(false);expect(e.state).toEqual(s);}
  send(e,{type:'pause',value:true});s=e.state;expect(e.dispatch(command(e,{type:'item',action:{type:'cancel',decisionId:pending}}))).toEqual({ok:false,reason:'paused'});expect(e.state).toEqual(s);send(e,{type:'pause',value:false});send(e,{type:'item',action:{type:'cancel',decisionId:pending}});expect(e.state.effects!.inventory['player-1']['card:17']).toBe(1);
  const stale=command(e,{type:'roll'});send(e,{type:'item',action:{type:'begin',definitionId:G2_GOODS[0].effect}});expect(e.dispatch(stale).ok).toBe(false);const c=command(e,{type:'item',action:{type:'confirm',decisionId:e.state.pending!.id,target:{kind:'player',id:'player-1'}}});expect(e.dispatch(c).ok).toBe(true);expect(e.dispatch(c)).toEqual({ok:false,reason:'duplicate'});
  expect(e.dispatch(command(e,{type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}})).ok).toBe(false);
  expect(e.dispatch(command(e,{type:'traffic',diceCount:4})).ok).toBe(false);conserved(e);
 });
 it('dream locks all items/traffic; incoming detained turn cannot roll; wealth keeps detained participants',()=>{const e=make();acquire(e,['card:16','card:17','card:01']);use(e,'card:16','player-2');until(e,()=>e.state.active===1&&e.state.phase==='idle');expect(actionLocked(e.state.g2!.players['player-2'])).toBe(true);for(const action of [{type:'traffic',diceCount:1},{type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}}] as Action[])expect(e.dispatch(command(e,action)).ok).toBe(false);
  until(e,()=>e.state.active===0&&e.state.phase==='idle');use(e,'card:17','player-2');until(e,()=>e.state.active===1);expect(e.state.phase).toBe('turnEnd');expect(e.dispatch(command(e,{type:'roll'})).ok).toBe(false);
  until(e,()=>e.state.active===0&&e.state.phase==='idle');const before=e.state.economy!.balances;expect(e.state.g2!.players['player-2'].prison).toBeTruthy();
  send(e,{type:'item',action:{type:'begin',definitionId:WEALTH_EFFECT}});send(e,{type:'item',action:{type:'confirm',decisionId:e.state.pending!.id,target:{kind:'player',id:'player-1'}}});const avg=Math.floor((before['player-1'].cash+before['player-2'].cash)/2);expect(e.state.economy!.balances['player-2'].cash).toBe(avg);expect(e.state.economy!.balances['player-1'].cash).toBe(avg);expect(e.state.economy!.balances['player-2'].bank).toBe(before['player-2'].bank);exact(e);
 });
});

it.each([{seed:'group-two',waived:true},{seed:'g2-rent',waived:false}])('dream gates landing interactions and rent collection ($seed)',({seed,waived})=>{
 const e=make(2,seed);acquire(e,['card:16','card:15','card:17']);const start=e.events.length;use(e,'card:16','player-2');
 until(e,()=>e.state.active===0&&e.state.phase==='idle'&&!e.state.g2!.players['player-2'].dream);
 const events=e.events.slice(start),dreamTurns=new Set(events.filter(x=>x.type==='turnStarted'&&x.playerId==='player-2').slice(0,5).map(x=>x.turn));
 const asleepEvents=events.filter(x=>x.playerId==='player-2'&&dreamTurns.has(x.turn));expect(asleepEvents.filter(x=>x.type==='landed')).toHaveLength(5);
 expect(asleepEvents.some(x=>x.type==='pointsAwarded'||x.type==='shopOffered'||x.type==='bankOffered'||(x.type==='propertyOffered'&&x.decision.operation!=='rent'))).toBe(false);
 if(waived)expect(events.some(x=>x.type==='rentWaived')).toBe(true);else expect(asleepEvents.some(x=>x.type==='propertySettled'&&x.operation==='rent')).toBe(true);
 use(e,'card:15');until(e,()=>e.state.active===0&&e.state.phase==='idle'&&!e.state.g2!.players['player-2'].winter);use(e,'card:17','player-2');until(e,()=>e.state.active===0&&e.state.phase==='idle'&&!e.state.g2!.players['player-2'].prison);exact(e);
});
it('bankruptcy returns held plus equipped vehicles, clears statuses and preserves pool conservation',()=>{
 const expensive=defs.map(d=>({...d,rents:[500000,500000,500000,500000,500000,500000]}));
 const e=new GameEngine(map,{gameId:'debt-g2',seed:'group-two',rulesId:G2_RULES.id,characterIds:['a','b','c'],initialFunds:100000},expensive);
 acquire(e,['tool:05','tool:06','card:14','card:30'],'player-1',false);use(e,'tool:06');
 for(let i=0;i<10000;i++){
  const s=e.state,p=s.pending;if(s.phase==='debt'&&s.active===0)break;
  if(p?.kind==='property'&&p.operation==='buy')send(e,{type:'property',decisionId:p.id,accept:s.active!==0});else tick(e,false);
 }
 expect(e.state.phase).toBe('debt');expect(e.state.active).toBe(0);send(e,{type:'settleDebt',decisionId:e.state.pending!.id});conserved(e);expect(e.state.g2!.players['player-1']).toEqual(emptyMobility());expect(Object.values(e.state.effects!.inventory['player-1']).every(n=>n===0)).toBe(true);
 const copy=replayGame(map,e.exportReplay(),expensive);expect(copy.state).toEqual(e.state);expect(copy.events).toEqual(e.events);
});
