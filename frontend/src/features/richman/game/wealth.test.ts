import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { GameEngine, replayGame } from './engine';
import type { Action, Replay } from './engine';
import { WEALTH_RULES, WEALTH_CARD, WEALTH_EFFECT, WEALTH_FINGERPRINT, wealthPreview, wealthParticipants, wealthPurchaseReason } from './wealth';
import { CARD_FINGERPRINT, EQUAL_CASH, EQUAL_CASH_EFFECT, cardPurchaseReason } from './cards';
import { REMOTE_EFFECT } from './items';
import { ROADBLOCK_EFFECT, ROBOT_EFFECT } from './road-tools';
import { PROPERTY_CATALOG } from './economy';
import nodes from '../../../../../shared/richman/japan-topology.fixture.json';
import v5 from './fixtures/tools-v5-replay.json';
import golden from './fixtures/tools-v5-golden.json';
const map = [20, 50, 1, 3].map((id, i, ids) => ({ id, x: 1000 + i * 1000, y: 1000, adjacent: [ids[(i + 1) % ids.length]], kind: id === 50 ? 6001 : id === 1 ? 6006 : 0, name: '' }));
function make(count = 2, definitions: typeof PROPERTY_CATALOG.properties = []) { return new GameEngine(map, { gameId: 'cards', seed: 'cards-six', rulesId: WEALTH_RULES.id, initialFunds: 30000, characterIds: ['a','b','c','d'].slice(0,count) }, definitions); }
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
  for(let i=0;i<count;i++)send(e,{type:'buyItem',decisionId:e.state.pending!.id,itemId:WEALTH_CARD});
  return buyer;
}
function ready(e: GameEngine, buyer: string) { until(e,()=>e.state.phase==='idle'&&e.state.players[e.state.active].id===buyer); }
function begin(e: GameEngine) { return send(e,{type:'item',action:{type:'begin',definitionId:WEALTH_EFFECT}}); }
function confirm(e: GameEngine,targetId=e.state.players[e.state.active].id): Action {
  return {type:'item',action:{type:'confirm',decisionId:e.state.pending!.id,target:{kind:'player',id:targetId}}};
}
function conserved(e: GameEngine) { expect(e.state.wealth!.supply+Object.values(e.state.effects!.inventory).reduce((n,i)=>n+(i[WEALTH_CARD]??0),0)).toBe(1); }
function replay(e: GameEngine,definitions:typeof PROPERTY_CATALOG.properties=[]) { const copy=replayGame(map,JSON.parse(JSON.stringify(e.exportReplay())),definitions);expect(copy.state).toEqual(e.state);expect(copy.events).toEqual(e.events); }

describe('seventh batch wealth card',()=>{
  it.each([2,3,4])('buys, cancels, averages all %i distant players including source, returns stock and replays',count=>{
    const e=make(count);expect(e.state.items!.fingerprint).toBe(WEALTH_FINGERPRINT);
    expect(e.state.cards!.supply).toBe(2);conserved(e);
    for(const inv of Object.values(e.state.effects!.inventory))expect(inv).toEqual({'tool:01':1,'tool:02':1,'tool:08':1,'tool:09':1,'card:02':0,'card:01':0});
    until(e,()=>e.state.phase==='bank');send(e,{type:'bank',decisionId:e.state.pending!.id,operation:'deposit',amount:1});
    const buyer=acquire(e);ready(e,buyer);begin(e);const cancel=e.state.pending!.id;
    send(e,{type:'item',action:{type:'cancel',decisionId:cancel}});expect(e.state.effects!.inventory[buyer][WEALTH_CARD]).toBe(1);
    begin(e);const before=e.state;send(e,confirm(e));const after=e.state;
    expect(Object.values(after.economy!.balances).map(b=>b.cash)).toEqual(Array(count).fill(14999));
    expect(e.events.find(v=>v.type==='wealthEqualized')).toMatchObject({average:14999,discarded:count-1,participants:before.players.map(p=>({playerId:p.id,cash:before.economy!.balances[p.id].cash}))});
    for(const p of before.players)expect(after.economy!.balances[p.id].bank).toBe(before.economy!.balances[p.id].bank);
    for(const key of ['players','items','cards','roadTools','finance','randomState','turn','completed'] as const)expect(after[key]).toEqual(before[key]);
    expect(after.economy!.properties).toEqual(before.economy!.properties);expect(after.phase).toBe('idle');conserved(e);
    for(const definitionId of [ROBOT_EFFECT,ROADBLOCK_EFFECT,REMOTE_EFFECT]){send(e,{type:'item',action:{type:'begin',definitionId}});send(e,{type:'item',action:{type:'cancel',decisionId:e.state.pending!.id}});}
    acquire(e);conserved(e);replay(e);
  });
  it('uses all living roster entries regardless of distance or status-day fields',()=>{
    const players=[{id:'self',node:1,days_in_hospital:3},{id:'far',node:999,days_in_hotel:8},{id:'out',node:1,days_in_prison:0}];
    expect(wealthParticipants(players,['out'])).toEqual(['self','far']);
  });
  it('handles every remainder for 2–4 players, zero/equal cash and exact safe integer totals',()=>{
    for(const n of [2,3,4])for(let remainder=0;remainder<n;remainder++)expect(wealthPreview([n*17+remainder,...Array(n-1).fill(0)])).toEqual({average:17,discarded:remainder});
    expect(wealthPreview([0,0,0])).toEqual({average:0,discarded:0});
    expect(wealthPreview(Array(4).fill(Number.MAX_SAFE_INTEGER))).toEqual({average:Number.MAX_SAFE_INTEGER,discarded:0});
    for(const value of [-1,0.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])expect(wealthPreview([value,5])).toBeNull();expect(wealthPreview([])).toBeNull();
  });
  it('shares card capacity with equal-cash cards, excludes tools and respects independent pools',()=>{
    const inventory={[WEALTH_CARD]:1,[EQUAL_CASH]:14,'tool:08':9};
    expect(wealthPurchaseReason(inventory,999,1)).toBe('卡片背包已满');expect(cardPurchaseReason(inventory,999,2)).toBe('卡片背包已满');
    expect(wealthPurchaseReason({'tool:08':9},200,1)).toBe('');expect(wealthPurchaseReason({},199,1)).toBe('点数不足');expect(wealthPurchaseReason({},200,0)).toBe('均富卡已售罄');
    const e=make();until(e,()=>e.state.phase==='shop');const poor=e.state;expect(e.dispatch(cmd(e,{type:'buyItem',decisionId:poor.pending!.id,itemId:WEALTH_CARD})).ok).toBe(false);expect(e.state).toEqual(poor);
    acquire(e);expect(e.state.cards!.supply).toBe(2);const s=e.state;expect(e.dispatch(cmd(e,{type:'buyItem',decisionId:s.pending!.id,itemId:WEALTH_CARD})).ok).toBe(false);expect(e.state).toEqual(s);
    const bought=e.exportReplay().commands.find(c=>c.action.type==='buyItem')!;expect(e.dispatch(bought)).toEqual({ok:false,reason:'duplicate'});replay(e);
  });
  it('rejects forged participant targets, wrong actor, stale/duplicate tokens, extra values and paused commands atomically',()=>{
    const e=make(),buyer=acquire(e);ready(e,buyer);begin(e);const old=e.state.pending!.id;send(e,{type:'item',action:{type:'cancel',decisionId:old}});begin(e);
    const before=e.state,events=e.events;
    for(const action of [confirm(e,'missing'),confirm(e,e.state.players.find(p=>p.id!==buyer)!.id),{...confirm(e),value:1} as Action,{type:'roll'} as Action,
      {type:'item',action:{type:'confirm',decisionId:before.pending!.id,target:{kind:'node',id:'50'}}} as Action,
      {type:'item',action:{type:'confirm',decisionId:before.pending!.id,target:null}} as unknown as Action,
      {type:'item',action:{type:'cancel',decisionId:old}} as Action])expect(e.dispatch(cmd(e,action)).ok).toBe(false);
    expect(e.dispatch({...cmd(e,confirm(e)),playerId:e.state.players.find(p=>p.id!==buyer)!.id}).ok).toBe(false);expect(e.state).toEqual(before);expect(e.events).toEqual(events);
    send(e,{type:'pause',value:true});expect(e.dispatch(cmd(e,confirm(e))).ok).toBe(false);send(e,{type:'pause',value:false});const accepted=send(e,confirm(e));expect(e.dispatch(accepted).ok).toBe(false);conserved(e);replay(e);
  });
  it('returns a bankrupt holder’s card, excludes them from the participant list and completes the game',()=>{
    const land={...PROPERTY_CATALOG.properties[0],id:'debt-land',nodeIds:[3],basePrice:1,rents:Array(6).fill(100000)};
    const e=make(3,[land]),buyer=acquire(e);ready(e,buyer);
    until(e,()=>e.state.pending?.kind==='property'&&e.state.players[e.state.active].id!==buyer);send(e,{type:'property',decisionId:e.state.pending!.id,accept:true});
    until(e,()=>e.state.phase==='debt'&&e.state.players[e.state.active].id===buyer);send(e,{type:'settleDebt',decisionId:e.state.pending!.id});
    expect(e.state.effects!.inventory[buyer]).toEqual({});expect(e.state.wealth!.supply).toBe(1);expect(e.state.items!.points[buyer]).toBe(0);
    expect(wealthParticipants(e.state.players,e.state.finance!.eliminated)).not.toContain(buyer);
    until(e,()=>e.state.phase==='finished',true);expect(e.state.finance!.eliminated).toContain(buyer);conserved(e);replay(e,[land]);
  });
  it('settles only survivors after an actual bankruptcy, leaving eliminated cash at zero',()=>{
    const land={...PROPERTY_CATALOG.properties[0],id:'owned-land',nodeIds:[3],basePrice:1,rents:Array(6).fill(100000)};
    const e=make(4,[land]),buyer=acquire(e);
    until(e,()=>e.state.pending?.kind==='property'&&e.state.players[e.state.active].id===buyer);send(e,{type:'property',decisionId:e.state.pending!.id,accept:true});
    until(e,()=>e.state.finance!.eliminated.length>0);ready(e,buyer);
    const eliminated=e.state.finance!.eliminated;expect(eliminated.length).toBeGreaterThan(0);
    begin(e);const before=e.state;send(e,confirm(e));
    const event=e.events.find(v=>v.type==='wealthEqualized');expect(event?.type).toBe('wealthEqualized');
    if(event?.type!=='wealthEqualized')throw Error('missing event');
    expect(event.participants.map(p=>p.playerId)).toEqual(before.players.filter(p=>!eliminated.includes(p.id)).map(p=>p.id));
    for(const id of eliminated)expect(e.state.economy!.balances[id]).toEqual({cash:0,bank:0});
    conserved(e);replay(e,[land]);
  });
  it('combines both purchased cards and a controlled roll without mixing pools or RNG',()=>{
    const nearMap=map.map(node=>({...node,x:1000}));
    const e=new GameEngine(nearMap,{gameId:'combo',seed:'combo',rulesId:WEALTH_RULES.id,initialFunds:30000,characterIds:['a','b','c']},[]);
    until(e,()=>e.state.phase==='shop'&&e.state.items!.points[e.state.players[e.state.active].id]>=400);
    const buyer=e.state.players[e.state.active].id;
    for(const itemId of [WEALTH_CARD,EQUAL_CASH])send(e,{type:'buyItem',decisionId:e.state.pending!.id,itemId});
    ready(e,buyer);begin(e);send(e,confirm(e));expect(e.state.wealth!.supply).toBe(1);expect(e.state.cards!.supply).toBe(1);
    send(e,{type:'item',action:{type:'begin',definitionId:EQUAL_CASH_EFFECT}});
    send(e,{type:'item',action:{type:'confirm',decisionId:e.state.pending!.id,target:{kind:'player',id:e.state.players.find(p=>p.id!==buyer)!.id}}});
    expect(e.state.cards!.supply).toBe(2);expect(e.events.some(v=>v.type==='cashEqualized')).toBe(true);
    const random=e.state.randomState;send(e,{type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}});
    send(e,{type:'item',value:2,action:{type:'confirm',decisionId:e.state.pending!.id,target:{kind:'player',id:buyer}}});
    expect(e.state.phase).toBe('rolling');expect(e.state.randomState).toBe(random);conserved(e);
    const copy=replayGame(nearMap,e.exportReplay(),[]);expect(copy.state).toEqual(e.state);expect(copy.events).toEqual(e.events);
  });
  it('retains v5 byte-for-byte state/events and rejects v6 fingerprints on old replays',()=>{
    const old=replayGame(nodes,v5 as Replay),hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
    expect(CARD_FINGERPRINT).toBe('4df2b87b');expect(hash(old.state)).toBe(golden.state);expect(hash(old.events)).toBe(golden.events);expect(old.state).not.toHaveProperty('wealth');
    expect(()=>replayGame(nodes,{...v5,itemFingerprint:WEALTH_FINGERPRINT} as Replay)).toThrow(/道具/);
  });
});
