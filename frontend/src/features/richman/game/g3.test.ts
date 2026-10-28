import { it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { replayGame } from './engine';
import type { Replay } from './engine';
import nodes from '../../../../../shared/richman/japan-topology.fixture.json';
import replay from './fixtures/tools-v8-replay.json';
import golden from './fixtures/tools-v8-golden.json';

it('preserves the accepted v8 actual browser replay state and events exactly', () => {
  const engine = replayGame(nodes, replay as Replay);
  expect(engine.state.items?.fingerprint).toBe('717e58c0');
  for (const key of ['state', 'events'] as const) {
    expect(createHash('sha256').update(JSON.stringify(engine[key])).digest('hex')).toBe(golden[key]);
  }
});

import { consumeCardSlot, receiveCardSlot } from './card-slots';

it('card consumption removes the first matching slot and compacts without reordering', () => {
  const slots = ['card:21', 'card:14', 'card:21', 'card:13'];
  expect(consumeCardSlot(slots, 'card:21')).toEqual(['card:14', 'card:21', 'card:13']);
  expect(consumeCardSlot(slots, 'card:29')).toBeNull();
  expect(slots).toEqual(['card:21', 'card:14', 'card:21', 'card:13']);
});
it('receiving appends to the tail and full bags drop the first cheapest card', () => {
  const prices = { 'card:14': 20, 'card:18': 20, 'card:21': 25, 'card:01': 200 };
  const slots = ['card:21', 'card:18', 'card:14', ...Array<string>(12).fill('card:01')];
  expect(receiveCardSlot(slots, 'card:21', prices)).toEqual({ slots: ['card:21', 'card:14', ...Array<string>(12).fill('card:01'), 'card:21'], discarded: 'card:18' });
  expect(receiveCardSlot(['card:21'], 'card:14', prices)).toEqual({ slots: ['card:21', 'card:14'], discarded: null });
  expect(slots).toHaveLength(15);
});
it('slot proposals reject unsupported IDs and oversized state without altering input', () => {
  expect(receiveCardSlot([], 'tool:01', {'tool:01':15})).toBeNull();
  expect(receiveCardSlot(['card:14'], 'card:99', {'card:14':20})).toBeNull();
  expect(receiveCardSlot(Array<string>(16).fill('card:14'), 'card:14', {'card:14':20})).toBeNull();
});

import { GameEngine } from './engine';
import type { Action, GameState, EventPayload } from './engine';
import { G3_RULES, G3_GOODS, g3Options, syncCardSlots, applyG3, startAttack, offerRent, reactG3, tickAlliance, hostility } from './g3';
import { G2_GOODS, g2Options } from './g2';
import { G1_GOODS } from './g1';
import { PROPERTY_CATALOG } from './economy';
const ids = [20,50,31,107,84,55,3,4];
const map = ids.map((id,i) => ({id,x:1000+i*8,y:1000,kind:[50,107].includes(id)?6001:id===84?8002:id===55?8001:0,name:'',adjacent:[ids[(i+1)%ids.length]]}));
const defs = [3,4].map((node,i) => ({...PROPERTY_CATALOG.properties[0],id:`p${node}`,name:`地${node}`,nodeIds:[node],x:1048+i*8,y:1000,basePrice:100,upgradeCost:50,rents:[2000,2200,2400,2600,2800,3000]}));
const goods = [...G3_GOODS,...G2_GOODS,...G1_GOODS];
function make(count=3) { return new GameEngine(map,{gameId:'g3',seed:'g3-tests',rulesId:G3_RULES.id,characterIds:['a','b','c','d'].slice(0,count),initialFunds:100000},defs); }
function command(e:GameEngine, action:Action, playerId?:string) {
  const s=e.state,p=s.pending;
  const responder=action.type==='reaction'&&p?.kind==='reaction'?p.responderId:(action.type==='property'||action.type==='settleDebt')&&(p?.kind==='property'||p?.kind==='debt')?p.payerId:undefined;
  return {id:`c${s.revision}`,gameId:s.gameId,expectedRevision:s.revision,playerId:playerId??responder??s.players[s.active].id,action};
}
function send(e:GameEngine, action:Action) { const c=command(e,action); const r=e.dispatch(c); expect(r.ok,JSON.stringify(c)).toBe(true); return r; }
function tick(e:GameEngine, buy=false) { const s=e.state,p=s.pending;
  if(s.phase==='idle')send(e,{type:'roll'});else if(s.phase==='turnEnd')send(e,{type:'endTurn'});
  else if(p?.kind==='property')send(e,{type:'property',decisionId:p.id,accept:p.operation==='rent'||buy});
  else if(p?.kind==='shop')send(e,{type:'leaveShop',decisionId:p.id});
  else if(p?.kind==='bank')send(e,{type:'leaveBank',decisionId:p.id});
  else if(p?.kind==='debt')send(e,{type:'settleDebt',decisionId:p.id});
  else if(p?.kind==='branch')send(e,{type:'choose',decisionId:p.id,node:p.choices[0]});
  else if(p?.kind==='reaction')send(e,{type:'reaction',decisionId:p.id,choice:'decline'});
  else if(p?.kind==='roll'||p?.kind==='segment')send(e,{type:'animationDone',token:p.id});
  else throw Error('Unexpected '+s.phase);
}
function until(e:GameEngine, done:()=>boolean, buy=false) { for(let i=0;i<12000&&!done();i++)tick(e,buy); expect(done()).toBe(true); }
function acquire(e:GameEngine, wanted:string[], playerId='player-1') {
  for(let i=0;i<15000;i++) {
    const s=e.state,inv=s.effects!.inventory[playerId];
    if(wanted.every(id=>inv[id]>0)&&s.players[s.active].id===playerId&&s.phase==='idle')return;
    const g=s.phase==='shop'&&s.players[s.active].id===playerId&&goods.find(g=>wanted.includes(g.id)&&!inv[g.id]&&s.items!.points[playerId]>=g.price);
    if(g)send(e,{type:'buyItem',decisionId:s.pending!.id,itemId:g.id});else tick(e);
  } throw Error('Acquire timeout');
}
function use(e:GameEngine,id:string,targetId='player-2',stolenItemId?:string) {
  send(e,{type:'item',action:{type:'begin',definitionId:goods.find(g=>g.id===id)!.effect}});
  send(e,{type:'item',action:{type:'confirm',decisionId:e.state.pending!.id,target:{kind:'player',id:targetId}},...(stolenItemId?{stolenItemId}:{})});
}
function exact(e:GameEngine){const clone=replayGame(map,e.exportReplay(),defs);expect(clone.state).toEqual(e.state);expect(clone.events).toEqual(e.events);}
function conserved(s:GameState){
  for(const g of goods.filter(g=>g.id.startsWith('card:'))){const pool=g.id in s.g3!.supply?s.g3!.supply[g.id]:g.id in s.g2!.supply?s.g2!.supply[g.id]:s.g1!.supply[g.id];expect(pool+Object.values(s.effects!.inventory).reduce((n,i)=>n+(i[g.id]??0),0),g.id).toBe(g.supply);}
  for(const [id,slots] of Object.entries(s.g3!.slots)){expect(slots.length).toBeLessThanOrEqual(15);for(const g of goods.filter(g=>g.id.startsWith('card:')))expect(slots.filter(x=>x===g.id).length).toBe(s.effects!.inventory[id][g.id]??0);}
}
function setupState(){const s=make(4).state;const events:EventPayload[]=[];let serial=0;return {s,events,emit:(e:EventPayload)=>{events.push(e);},token:()=>`test-${++serial}`};}
function give(s:GameState,id:string,items:string[]){for(const item of items){s.effects!.inventory[id][item]=(s.effects!.inventory[id][item]??0)+1;const g=goods.find(g=>g.id===item)!;if(g.id in s.g3!.supply)s.g3!.supply[item]--;else if(g.id in s.g2!.supply)s.g2!.supply[item]--;else s.g1!.supply[item]--;syncCardSlots(s);}}

it('legally buys all six; ally and theft move real inventory and preserve deterministic replay',()=>{
 const e=make();acquire(e,G3_GOODS.map(g=>g.id));expect(e.state.g3!.slots['player-1']).toHaveLength(6);conserved(e.state);
 use(e,'card:29');expect(e.state.g3!.allies['player-1']).toEqual({partner:'player-2',remaining:7});
 const inv=e.state.effects!.inventory;use(e,'card:13','player-2','tool:08');
 expect(e.state.effects!.inventory['player-1']['tool:08']).toBe(inv['player-1']['tool:08']+1);expect(e.state.effects!.inventory['player-2']['tool:08']).toBe(0);
 expect(e.state.g3!.allies['player-1']).toBeNull();expect(e.state.g3!.allies['player-2']).toBeNull();conserved(e.state);exact(e);
});
it('immune first, then optional redirect, then automatic revenge through legal commands',()=>{
 const e=make();acquire(e,['card:21','card:19','card:18'],'player-2');acquire(e,['card:16','card:17']);
 use(e,'card:16');expect(e.state.phase).toBe('idle');expect(e.state.g2!.players['player-2'].dream).toBe(0);expect(e.state.effects!.inventory['player-2']['card:21']).toBe(0);
 use(e,'card:17');expect(e.state.phase).toBe('reaction');const p=e.state.pending!;if(p.kind!=='reaction')throw Error('missing');expect(p.responderId).toBe('player-2');expect(p.targets).toEqual(['player-1','player-3']);
 const before=e.state;expect(e.dispatch(command(e,{type:'reaction',decisionId:p.id,choice:'decline'},'player-1'))).toEqual({ok:false,reason:'wrong-player'});expect(e.state).toEqual(before);
 send(e,{type:'pause',value:true});expect(e.dispatch(command(e,{type:'reaction',decisionId:p.id,choice:'decline'}))).toEqual({ok:false,reason:'paused'});send(e,{type:'pause',value:false});
 const c=command(e,{type:'reaction',decisionId:p.id,choice:'decline'});expect(e.dispatch(c).ok).toBe(true);expect(e.dispatch(c)).toEqual({ok:false,reason:'duplicate'});
 expect(e.state.effects!.inventory['player-2']['card:19']).toBe(1);expect(e.state.effects!.inventory['player-2']['card:18']).toBe(0);expect(e.state.g2!.players['player-1'].prison).toBe(5);expect(e.state.g2!.players['player-2'].prison).toBe(5);expect(e.state.phase).toBe('turnEnd');conserved(e.state);exact(e);
});
it('redirect can target a remote detained third player without recursive immune/revenge, and self-attacker uses four',()=>{
 for(const target of ['player-1','player-3']){
  const {s,emit,token}=setupState();give(s,'player-2',['card:19','card:18']);give(s,'player-3',['card:21','card:18']);s.g2!.players['player-3'].prison=3;s.players[2].node=84;
  startAttack(s,map,{kind:'attack',itemId:'card:17',sourceId:'player-1',originalId:'player-2'},token,emit);expect(s.pending?.kind).toBe('reaction');
  expect(reactG3(s,map,'use',target,token,emit)).toBe(true);expect(s.g2!.players[target].prison).toBe(target==='player-1'?4:8);expect(s.g2!.players['player-2'].prison).toBe(0);
  expect(s.effects!.inventory['player-2']['card:18']).toBe(1);expect(s.effects!.inventory['player-3']['card:21']).toBe(1);conserved(s);
 }
});
it('winter gates original dream before protections; redirected dream bypasses winter; vehicles suspend',()=>{
 const {s,emit,token}=setupState();give(s,'player-2',['card:21','card:19']);s.g2!.players['player-2'].winter=2;
 startAttack(s,map,{kind:'attack',itemId:'card:16',sourceId:'player-1',originalId:'player-2'},token,emit);expect(s.effects!.inventory['player-2']['card:21']).toBe(1);expect(s.pending).toBeNull();
 s.g2!.players['player-2'].winter=0;s.effects!.inventory['player-2']['card:21']=0;syncCardSlots(s);s.g2!.players['player-3'].winter=4;s.g2!.players['player-3'].vehicle='tool:06';s.g2!.players['player-3'].diceCount=3;
 startAttack(s,map,{kind:'attack',itemId:'card:16',sourceId:'player-1',originalId:'player-2'},token,emit);reactG3(s,map,'use','player-3',token,emit);
 expect(s.g2!.players['player-3']).toMatchObject({winter:4,dream:5,vehicle:'foot',savedVehicle:'tool:06'});expect(s.effects!.inventory['player-3']['tool:06']).toBe(1);
});
it('full bag transfers before consuming robbery, discards first cheapest and may discard the robbery itself',()=>{
 for(const attackCheapest of [false,true]){
  const {s,emit}=setupState();
  const bag=attackCheapest?['card:13',...Array<string>(4).fill('card:19'),...Array<string>(3).fill('card:21'),...Array<string>(3).fill('card:20'),'card:29','card:29','card:30','card:30']:['card:18','card:14','card:13',...Array<string>(4).fill('card:19'),...Array<string>(3).fill('card:21'),...Array<string>(3).fill('card:20'),'card:29','card:30'];
  give(s,'player-1',bag);give(s,'player-2',['card:21']);applyG3(s,'card:13','player-2','card:21',emit);syncCardSlots(s);
  expect(s.g3!.slots['player-1']).toHaveLength(attackCheapest?15:14);expect(s.g3!.slots['player-1'].at(-1)).toBe('card:21');expect(s.effects!.inventory['player-1']['card:13']).toBe(0);
  if(!attackCheapest)expect(s.g3!.slots['player-1'][0]).toBe('card:14');conserved(s);
 }
});
it('stealing a tenth tool loses it from victim but returns pool instead of exceeding cap',()=>{
 const {s,emit,events}=setupState();give(s,'player-1',['card:13']);s.effects!.inventory['player-1']['tool:08']=9;
 const pool=s.items!.supply;applyG3(s,'card:13','player-2','tool:08',emit);expect(s.effects!.inventory['player-1']['tool:08']).toBe(9);expect(s.effects!.inventory['player-2']['tool:08']).toBe(0);expect(s.items!.supply).toBe(pool+1);expect(events.find(e=>e.type==='inventoryTransferred')).toMatchObject({received:false});
});
it('alliance replaces both old pairs, expires bilaterally and only positive hostility breaks it',()=>{
 const {s,emit}=setupState();give(s,'player-1',['card:29']);give(s,'player-3',['card:29']);applyG3(s,'card:29','player-2',undefined,emit);s.active=2;applyG3(s,'card:29','player-4',undefined,emit);give(s,'player-2',['card:29']);s.active=1;applyG3(s,'card:29','player-3',undefined,emit);
 expect(s.g3!.allies['player-1']).toBeNull();expect(s.g3!.allies['player-4']).toBeNull();hostility(s,'player-4','player-2',emit);expect(s.g3!.allies['player-2']).not.toBeNull();
 for(let i=0;i<7;i++)tickAlliance(s,'player-2',emit);expect(s.g3!.allies['player-2']!.remaining).toBe(128);tickAlliance(s,'player-2',emit);expect(s.g3!.allies['player-2']).toBeNull();expect(s.g3!.allies['player-3']).toBeNull();conserved(s);
});
it('ordinary rent only opens at threshold or insolvency; free first, decline to redirect, self-owner avoids transfer',()=>{
 const {s,emit,token}=setupState();give(s,'player-1',['card:20','card:19']);
 const rent={kind:'rent' as const,sourceId:'player-1',decision:{kind:'property' as const,id:'r',propertyId:'p3',operation:'rent' as const,amount:1999,recipientId:'player-2',lines:[]}};
 offerRent(s,rent,'player-1',token,emit);expect(s.phase).toBe('property');
 rent.decision.amount=2000;offerRent(s,rent,'player-1',token,emit);expect(s.pending).toMatchObject({kind:'reaction',stage:'free'});
 reactG3(s,map,'decline',undefined,token,emit);expect(s.pending).toMatchObject({kind:'reaction',stage:'redirect'});expect(s.effects!.inventory['player-1']['card:20']).toBe(1);
 reactG3(s,map,'use','player-2',token,emit);expect(s.phase).toBe('turnEnd');expect(s.effects!.inventory['player-1']['card:19']).toBe(0);
 s.economy!.balances['player-1']={cash:1,bank:0};rent.decision.amount=2;offerRent(s,rent,'player-1',token,emit);expect(s.phase).toBe('reaction');const before=structuredClone(s.economy!.balances);reactG3(s,map,'use',undefined,token,emit);expect(s.economy!.balances).toEqual(before);expect(s.effects!.inventory['player-1']['card:20']).toBe(0);conserved(s);
});
it('legal free/redirect rent chain charges third party; exact replay retains original turn actor',()=>{
 const e=make();acquire(e,['card:20','card:19']);
 until(e,()=>e.state.pending?.kind==='reaction',true);let p=e.state.pending!;expect(p).toMatchObject({stage:'free'});send(e,{type:'reaction',decisionId:p.id,choice:'use'});expect(e.state.phase).toBe('turnEnd');
 until(e,()=>e.state.pending?.kind==='reaction',true);p=e.state.pending!;if(p.kind!=='reaction'||p.continuation.kind!=='rent')throw Error('rent');const recipient=p.continuation.decision.recipientId!;const target=p.targets.find(id=>id!==recipient)!;const before=e.state;send(e,{type:'reaction',decisionId:p.id,choice:'use',targetId:target});
 const debt=e.state.pending!;expect(debt.kind).toBe('property');if(debt.kind!=='property')throw Error('property');expect(debt.payerId).toBe(target);expect(e.state.active).toBe(before.active);
 expect(e.dispatch(command(e,{type:'property',decisionId:debt.id,accept:true},'player-1')).ok).toBe(false);
 send(e,{type:'property',decisionId:debt.id,accept:true});expect(e.state.economy!.balances[target].cash).toBe(before.economy!.balances[target].cash-debt.amount);expect(e.state.economy!.balances['player-1']).toEqual(before.economy!.balances['player-1']);conserved(e.state);exact(e);
});
it('invalid item/reaction values, inactive passive use and cancelled/stale selection are atomic',()=>{
 const e=make();acquire(e,['card:13','card:29','card:18']);expect(e.dispatch(command(e,{type:'item',action:{type:'begin',definitionId:G3_GOODS[1].effect}})).ok).toBe(false);
 send(e,{type:'item',action:{type:'begin',definitionId:G3_GOODS[0].effect}});const before=e.state,p=before.pending!.id;
 for(const stolenItemId of ['card:99','tool:06']){expect(e.dispatch(command(e,{type:'item',action:{type:'confirm',decisionId:p,target:{kind:'player',id:'player-2'}},stolenItemId})).ok).toBe(false);expect(e.state).toEqual(before);}
 send(e,{type:'item',action:{type:'cancel',decisionId:p}});expect(e.state.effects!.inventory['player-1']['card:13']).toBe(1);
 expect(e.dispatch(command(e,{type:'reaction',decisionId:p,choice:'use',targetId:'player-2'})).ok).toBe(false);exact(e);
 expect(g3Options(e.state,map,'card:29').length).toBe(2);expect(g2Options(e.state,map,'card:16').length).toBe(2);
});
it('redirected debt bankrupts the substitute, cleans inventory and continues original actor', ()=>{
 const expensive=defs.map(d=>({...d,rents:Array<number>(6).fill(500000)}));
 const e=new GameEngine(map,{gameId:'g3-debt',seed:'g3-debt-2',rulesId:G3_RULES.id,characterIds:['a','b','c','d'],initialFunds:100000},expensive);
 acquire(e,['card:19']);acquire(e,['card:18','card:29'],'player-3');use(e,'card:29','player-4');
 // All players acquired through normal movement/shop commands; only player 2 buys the expensive land.
 for(let i=0;i<10000&&e.state.pending?.kind!=='reaction';i++){
   const s=e.state,p=s.pending;
   if(p?.kind==='property'&&p.operation==='buy')send(e,{type:'property',decisionId:p.id,accept:s.active===1});
   else if(p?.kind==='debt'&&s.active!==0)throw Error('unexpected payer before requested rent');else tick(e);
 }
 const pending=e.state.pending!;expect(pending).toMatchObject({kind:'reaction',responderId:'player-1'});
 send(e,{type:'reaction',decisionId:pending.id,choice:'use',targetId:'player-3'});expect(e.state.pending).toMatchObject({kind:'debt',payerId:'player-3'});
 const before=e.state;send(e,{type:'settleDebt',decisionId:e.state.pending!.id});
 expect(e.state.active).toBe(0);expect(e.state.finance!.eliminated).toEqual(['player-3']);expect(e.state.economy!.balances['player-1']).toEqual(before.economy!.balances['player-1']);
 expect(e.state.g3!.allies['player-3']).toBeNull();expect(e.state.g3!.allies['player-4']).toBeNull();expect(e.state.g3!.slots['player-3']).toEqual([]);conserved(e.state);
 send(e,{type:'endTurn'});expect(e.state.active).toBe(1);const copy=replayGame(map,e.exportReplay(),expensive);expect(copy.state).toEqual(e.state);expect(copy.events).toEqual(e.events);
});
it('G1 purchase/demolition hostility breaks allies without consuming their defensive cards',()=>{
 const e=make();acquire(e,['card:29','card:03','card:12']);acquire(e,['card:21','card:19','card:18'],'player-2');
 until(e,()=>e.state.active===0&&e.state.phase==='idle'&&e.state.economy!.properties.some(p=>p.ownerId==='player-2'),true);
 use(e,'card:29');const before=e.state.effects!.inventory['player-2'];
 // The ordinary demolition selector is based on owned, built nearby land.
 const property=e.state.economy!.properties.find(p=>p.ownerId==='player-2'&&p.level>0);
 if(!property){until(e,()=>e.state.active===0&&e.state.phase==='idle'&&e.state.economy!.properties.some(p=>p.ownerId==='player-2'&&p.level>0),true);acquire(e,['card:29']);use(e,'card:29');}
 const target=e.state.economy!.properties.find(p=>p.ownerId==='player-2'&&p.level>0)!;
 send(e,{type:'item',action:{type:'begin',definitionId:G1_GOODS.find(g=>g.id==='card:12')!.effect}});
 send(e,{type:'item',action:{type:'confirm',decisionId:e.state.pending!.id,target:{kind:'property',id:target.id}}});
 expect(e.state.g3!.allies['player-1']).toBeNull();expect(e.state.effects!.inventory['player-2']).toEqual(before);conserved(e.state);exact(e);
});
