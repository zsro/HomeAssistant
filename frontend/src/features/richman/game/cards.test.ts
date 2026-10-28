import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { GameEngine, replayGame } from './engine';
import type { Action, Replay } from './engine';
import { CARD_RULES, CARD_FINGERPRINT, EQUAL_CASH, EQUAL_CASH_EFFECT, cardCount, cardPurchaseReason, equalCashPreview, equalCashTargets } from './cards';
import { ROAD_RULES, ROAD_FINGERPRINT, ROADBLOCK, ROADBLOCK_EFFECT, ROBOT_EFFECT } from './road-tools';
import { REMOTE_EFFECT } from './items';
import { NEARBY_WORKER_EFFECT } from './nearby-construction';
import { PROPERTY_CATALOG } from './economy';
import nodes from '../../../../../shared/richman/japan-topology.fixture.json';
import v4 from './fixtures/tools-v4-replay.json';
import golden from './fixtures/tools-v4-golden.json';

const map = [20, 50, 1, 3].map((id, i, ids) => ({ id, x: 1000 + i * 10, y: 1000, adjacent: [ids[(i + 1) % ids.length]], kind: id === 50 ? 6001 : id === 1 ? 6006 : 0, name: '' }));
function make(count = 2, definitions: typeof PROPERTY_CATALOG.properties = []) { return new GameEngine(map, { gameId: 'cards', seed: 'cards-six', rulesId: CARD_RULES.id, initialFunds: 30000, characterIds: ['a','b','c','d'].slice(0,count) }, definitions); }
function cmd(e: GameEngine, action: Action) { const s=e.state; return {id:`c${s.revision}`,gameId:s.gameId,expectedRevision:s.revision,playerId:s.players[s.active].id,action}; }
function send(e: GameEngine, action: Action) { const c=cmd(e,action); expect(e.dispatch(c).ok).toBe(true); return c; }
function tick(e: GameEngine, accept = false) {
  const s=e.state,p=s.pending;
  if(s.phase==='idle')send(e,{type:'roll'});
  else if(s.phase==='turnEnd')send(e,{type:'endTurn'});
  else if(p?.kind==='bank')send(e,{type:'leaveBank',decisionId:p.id});
  else if(p?.kind==='shop')send(e,{type:'leaveShop',decisionId:p.id});
  else if(p?.kind==='property')send(e,{type:'property',decisionId:p.id,accept:p.operation==='rent'||accept});
  else if(p?.kind==='debt')send(e,{type:'settleDebt',decisionId:p.id});
  else if(p?.kind==='branch')send(e,{type:'choose',decisionId:p.id,node:p.choices[0]});
  else if(p)send(e,{type:'animationDone',token:p.id});
  else throw Error('Unexpected state');
}
function until(e: GameEngine, predicate:()=>boolean, accept=false) { for(let i=0;i<3000&&!predicate();i++)tick(e,accept);expect(predicate()).toBe(true); }
function acquire(e: GameEngine, count=1) {
  until(e,()=>e.state.phase==='shop'&&e.state.items!.points[e.state.players[e.state.active].id]>=200*count);
  const buyer=e.state.players[e.state.active].id;
  for(let i=0;i<count;i++)send(e,{type:'buyItem',decisionId:e.state.pending!.id,itemId:EQUAL_CASH});
  return buyer;
}
function ready(e: GameEngine, buyer: string) { until(e,()=>e.state.phase==='idle'&&e.state.players[e.state.active].id===buyer); }
function begin(e: GameEngine) { return send(e,{type:'item',action:{type:'begin',definitionId:EQUAL_CASH_EFFECT}}); }
function confirm(e: GameEngine,targetId=e.state.players.find(p=>p.id!==e.state.players[e.state.active].id)!.id): Action {
  return {type:'item',action:{type:'confirm',decisionId:e.state.pending!.id,target:{kind:'player',id:targetId}}};
}
function conserved(e: GameEngine) { expect(e.state.cards!.supply+Object.values(e.state.effects!.inventory).reduce((n,i)=>n+(i[EQUAL_CASH]??0),0)).toBe(2); }
function replay(e: GameEngine,definitions:typeof PROPERTY_CATALOG.properties=[]) { const copy=replayGame(map,JSON.parse(JSON.stringify(e.exportReplay())),definitions);expect(copy.state).toEqual(e.state);expect(copy.events).toEqual(e.events); }

describe('sixth batch equal-cash card',()=>{
  it.each([2,3,4])('starts %i players without fabricated cards and retains all four tools', count=>{
    const e=make(count);conserved(e);expect(e.state.cards!.supply).toBe(2);expect(e.state.items!.fingerprint).toBe(CARD_FINGERPRINT);
    for(const inventory of Object.values(e.state.effects!.inventory))expect(inventory).toEqual({'tool:01':1,'tool:02':1,'tool:08':1,'tool:09':1,[EQUAL_CASH]:0});
    expect(e.dispatch(cmd(e,{type:'item',action:{type:'begin',definitionId:EQUAL_CASH_EFFECT}})).ok).toBe(false);
  });
  it('counts 15 shared card slots separately from tools and distinguishes full, empty and unaffordable shops',()=>{
    const inventory={'card:02':2,'card:03':13,[ROADBLOCK]:9};expect(cardCount(inventory)).toBe(15);
    expect(cardPurchaseReason(inventory,1000,2)).toBe('卡片背包已满');
    expect(cardPurchaseReason({'card:02':2,[ROADBLOCK]:9},200,1)).toBe('');
    expect(cardPurchaseReason({},199,2)).toBe('点数不足');expect(cardPurchaseReason({},200,0)).toBe('均贫卡已售罄');
  });
  it('handles even/odd, equal, zero and safe-integer-edge cash without touching deposits or inventing a remainder recipient',()=>{
    expect(equalCashPreview(30001,40000)).toEqual({average:35000,discarded:1});
    expect(equalCashPreview(1,1)).toEqual({average:1,discarded:0});expect(equalCashPreview(0,0)).toEqual({average:0,discarded:0});
    expect(equalCashPreview(0,1)).toEqual({average:0,discarded:1});expect(equalCashPreview(9,3)).toEqual({average:6,discarded:0});
    expect(equalCashPreview(Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER)).toEqual({average:Number.MAX_SAFE_INTEGER,discarded:0});
    for(const value of [-1,0.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])expect(equalCashPreview(value,5)).toBeNull();
  });
  it('limits targets to nearby solvent opponents, excluding self and unreachable anchors',()=>{
    const players=[{id:'self',node:20},{id:'near',node:50},{id:'out',node:99},{id:'bankrupt',node:1}];
    expect(equalCashTargets(players,0,['bankrupt'],[...map,{...map[0],id:99,x:9000}])).toEqual(['near']);
    expect(equalCashTargets(players,0,['self'],map)).toEqual([]);
  });
  it('purchases from the finite pool, rotates shop tokens, rejects shortages/unsupported cards and rejects stale or paused purchases',()=>{
    const e=make();until(e,()=>e.state.phase==='shop');const poor=e.state;
    expect(e.dispatch(cmd(e,{type:'buyItem',decisionId:poor.pending!.id,itemId:EQUAL_CASH})).ok).toBe(false);expect(e.state).toEqual(poor);
    const buyer=acquire(e,2);const state=e.state;expect(state.cards!.supply).toBe(0);expect(state.effects!.inventory[buyer][EQUAL_CASH]).toBe(2);
    for(const itemId of [EQUAL_CASH,'card:01'])expect(e.dispatch(cmd(e,{type:'buyItem',decisionId:state.pending!.id,itemId})).ok).toBe(false);
    const purchases=e.events.filter(v=>v.type==='itemBought');expect(purchases).toHaveLength(2);expect(purchases.every(v=>v.type==='itemBought'&&v.cost===200)).toBe(true);
    const accepted=e.exportReplay().commands.find(c=>c.action.type==='buyItem')!;
    expect(e.dispatch(accepted)).toEqual({ok:false,reason:'duplicate'});
    expect(e.dispatch(cmd(e,{type:'buyItem',decisionId:(accepted.action as {decisionId:string}).decisionId,itemId:EQUAL_CASH})).ok).toBe(false);
    send(e,{type:'pause',value:true});expect(e.dispatch(cmd(e,{type:'buyItem',decisionId:e.state.pending!.id,itemId:EQUAL_CASH}))).toEqual({ok:false,reason:'paused'});
    send(e,{type:'pause',value:false});conserved(e);replay(e);
  });
  it('cancels and rejects self/missing/node targets, invalid values, wrong players, stale decisions and duplicate confirmations atomically',()=>{
    const e=make(),buyer=acquire(e);ready(e,buyer);const inventory=e.state.effects!.inventory;
    begin(e);const old=e.state.pending!.id;send(e,{type:'item',action:{type:'cancel',decisionId:old}});expect(e.state.effects!.inventory).toEqual(inventory);
    begin(e);const before=e.state,events=e.events;
    for(const action of [confirm(e,buyer),confirm(e,'missing'),{...confirm(e),value:1} as Action,{type:'roll'} as Action,
      {type:'item',action:{type:'confirm',decisionId:before.pending!.id,target:{kind:'node',id:'50'}}} as Action,
      {type:'item',action:{type:'confirm',decisionId:before.pending!.id,target:null}} as unknown as Action,
      {type:'item',action:{type:'cancel',decisionId:old}} as Action])expect(e.dispatch(cmd(e,action)).ok).toBe(false);
    expect(e.dispatch({...cmd(e,confirm(e)),playerId:e.state.players.find(p=>p.id!==buyer)!.id}).ok).toBe(false);
    expect(e.state).toEqual(before);expect(e.events).toEqual(events);
    send(e,{type:'pause',value:true});expect(e.dispatch(cmd(e,confirm(e))).ok).toBe(false);send(e,{type:'pause',value:false});
    const accepted=send(e,confirm(e));expect(e.dispatch(accepted).ok).toBe(false);expect(e.state.phase).toBe('idle');conserved(e);replay(e);
  });
  it('averages odd cash from real bank commands, preserves every unrelated asset, and then permits existing tools and a controlled roll',()=>{
    const land={...PROPERTY_CATALOG.properties[0],id:'local',nodeIds:[3],x:1000,y:1000};
    const e=make(2,[land]);until(e,()=>e.state.phase==='bank');
    send(e,{type:'bank',decisionId:e.state.pending!.id,operation:'deposit',amount:1});
    const buyer=acquire(e);ready(e,buyer);begin(e);const before=e.state;
    send(e,confirm(e));const after=e.state;
    expect(Object.values(after.economy!.balances).map(b=>b.cash)).toEqual([14999,14999]);
    for(const id of Object.keys(before.economy!.balances))expect(after.economy!.balances[id].bank).toBe(before.economy!.balances[id].bank);
    expect(after.economy!.properties).toEqual(before.economy!.properties);expect(after.items).toEqual(before.items);expect(after.roadTools).toEqual(before.roadTools);
    expect(after.players).toEqual(before.players);expect(after.randomState).toBe(before.randomState);expect(after.turn).toBe(before.turn);expect(after.completed).toBe(before.completed);
    expect(e.events.find(v=>v.type==='cashEqualized')).toMatchObject({average:14999,discarded:1});
    for(const definitionId of [ROBOT_EFFECT,ROADBLOCK_EFFECT,NEARBY_WORKER_EFFECT,REMOTE_EFFECT]){
      send(e,{type:'item',action:{type:'begin',definitionId}});send(e,{type:'item',action:{type:'cancel',decisionId:e.state.pending!.id}});
    }
    send(e,{type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}});
    send(e,{type:'item',value:2,action:{type:'confirm',decisionId:e.state.pending!.id,target:{kind:'player',id:buyer}}});
    expect(e.state.phase).toBe('rolling');conserved(e);replay(e,[land]);
  });
  it('returns cards after use so a later shop can sell them again',()=>{
    const e=make(),buyer=acquire(e);ready(e,buyer);begin(e);send(e,confirm(e));expect(e.state.cards!.supply).toBe(2);
    acquire(e);expect(e.state.cards!.supply).toBe(1);conserved(e);replay(e);
  });
  it('returns an unused card at bankruptcy without removing world blocks or silently selling it for points',()=>{
    const land={...PROPERTY_CATALOG.properties[0],id:'debt-land',nodeIds:[3],basePrice:1,rents:Array(6).fill(100000)};
    const e=make(3,[land]);const buyer=acquire(e);ready(e,buyer);
    send(e,{type:'item',action:{type:'begin',definitionId:ROADBLOCK_EFFECT}});
    send(e,{type:'item',action:{type:'confirm',decisionId:e.state.pending!.id,target:{kind:'node',id:'20'}}});
    until(e,()=>e.state.pending?.kind==='property'&&e.state.players[e.state.active].id!==buyer);
    send(e,{type:'property',decisionId:e.state.pending!.id,accept:true});
    until(e,()=>e.state.phase==='debt'&&e.state.players[e.state.active].id===buyer);
    send(e,{type:'settleDebt',decisionId:e.state.pending!.id});
    expect(e.state.effects!.inventory[buyer]).toEqual({});expect(e.state.items!.points[buyer]).toBe(0);expect(e.state.cards!.supply).toBe(2);
    expect(e.events.filter(v=>v.type==='cardSupplyChanged').at(-1)).toMatchObject({amount:1,supply:2});conserved(e);replay(e,[land]);
  });
  it('preserves the frozen pre-sixth-batch v4 state/events exactly and rejects v5 fingerprints in old replays',()=>{
    const old=replayGame(nodes,v4 as Replay),hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
    expect(ROAD_FINGERPRINT).toBe('dde79d34');expect(hash(old.state)).toBe(golden.state);expect(hash(old.events)).toBe(golden.events);
    expect(old.state).not.toHaveProperty('cards');expect(old.state.rulesId).toBe(ROAD_RULES.id);
    expect(()=>replayGame(nodes,{...v4,itemFingerprint:CARD_FINGERPRINT} as Replay)).toThrow(/道具/);
  });
});
