import { writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { GameEngine, replayGame } from './engine';
import type { Action } from './engine';
import { PROPERTY_CATALOG } from './economy';
import { G7_RULES, G7_FINGERPRINT, saveCheckpoint, restoreCheckpoint, timeAvailable, g7Options, applyG7 } from './g7';
import { RESEARCH_PRODUCTS } from './g5-catalog';
import { G7_GOODS } from './g7-catalog';
import { G6_FINGERPRINT } from './g6';
import { G5_FINGERPRINT, researchOptions, tickG5, reconcileResearch } from './g5';
import { G4_FINGERPRINT } from './g4';
import { G3_FINGERPRINT } from './g3';
const map = [20,21].map((id,i)=>({id,x:1000+i*8,y:1000,kind:0,name:'',adjacent:[i?20:21]})).concat([{id:55,x:5000,y:5000,kind:8001,name:'医院',adjacent:[20]}]);
const defs = [{...PROPERTY_CATALOG.properties.find(d=>d.kind==='facility')!,id:'lab',name:'研究所',nodeIds:[20,21],x:1000,y:1000,basePrice:100,upgradeCost:50}];
const make=()=>new GameEngine(map,{gameId:'g7-test',seed:'g7-time',rulesId:G7_RULES.id,characterIds:['a','b'],initialFunds:100000},defs);
const noop=()=>{};
function send(e:GameEngine,action:Action){const s=e.state,p=s.pending;const playerId=p?.kind==='reaction'?p.responderId:p?.kind==='property'||p?.kind==='debt'?(p.payerId??s.players[s.active].id):s.players[s.active].id;const result=e.dispatch({id:`c${s.revision}`,gameId:s.gameId,expectedRevision:s.revision,playerId,action});expect(result.ok,JSON.stringify(action)).toBe(true);return result;}
function tick(e:GameEngine){const s=e.state,p=s.pending;if(s.phase==='idle')send(e,{type:'roll'});else if(s.phase==='turnEnd')send(e,{type:'endTurn'});else if(p?.kind==='property')send(e,{type:'property',decisionId:p.id,accept:p.operation==='rent'||s.active===0,...(p.buildingChoices?{buildingType:4}:{})});else if(p?.kind==='roll'||p?.kind==='segment')send(e,{type:'animationDone',token:p.id});else if(p?.kind==='branch')send(e,{type:'choose',decisionId:p.id,node:p.choices[0]});else if(p?.kind==='reaction')send(e,{type:'reaction',decisionId:p.id,choice:'decline'});else throw Error(s.phase);}
function until(e:GameEngine,fn:()=>boolean){for(let i=0;i<6000&&!fn();i++)tick(e);expect(fn()).toBe(true);}
function use(e:GameEngine,id:string,target={kind:'player' as const,id:'player-1'},destination?:{kind:'node';id:string}){send(e,{type:'item',action:{type:'begin',definitionId:G7_GOODS.find(g=>g.id===id)!.effect}});send(e,{type:'item',action:{type:'confirm',decisionId:e.state.pending!.id,target,...(destination?{destination}:{})}});}
function prepare(){const s=make().state;s.effects!.inventory['player-1']['tool:10']=2;return s;}
it('freezes all prior group fingerprints and starts G7 with zero research-only tools',()=>{
 expect([G3_FINGERPRINT,G4_FINGERPRINT,G5_FINGERPRINT,G6_FINGERPRINT]).toEqual(['6be76c90','d9e59846','a23a792b','942f4ae7']);expect(G7_FINGERPRINT).toBe('7d7e7415');
 const s=make().state;for(const g of G7_GOODS)expect(s.effects!.inventory['player-1'][g.id]).toBe(0);expect(timeAvailable(s)).toBe(false);
});
it('restores coherent domain state but keeps RNG, command metadata and nonrecursive history; consumes historical inventory exactly once',()=>{
 const s=prepare();s.economy!.properties[0].ownerId='player-2';s.economy!.properties[0].level=3;s.economy!.properties[0].buildingType=4;s.economy!.properties[0].research={itemId:'tool:11',remaining:3,ownerId:'player-2'};
 s.g2!.players['player-2'].vehicle='tool:06';s.g6!.gods=[{id:'god-test',type:1,node:21,carrier:'player-2',remaining:4}];s.g5!.hazards=[{id:1,itemId:'tool:04',node:21,carrier:'player-2',remaining:17}];s.roadTools!.blocks=[20];
 saveCheckpoint(s);const saved=structuredClone(s.g7!.checkpoints['player-1']!.world);expect('g7' in saved).toBe(false);
 s.economy!.balances['player-2'].cash=1;s.economy!.properties[0].research=null;s.g6!.stocks[0].price=777;s.g6!.gods=[];s.g5!.hazards=[];s.roadTools!.blocks=[];s.g2!.players['player-2'].vehicle='foot';s.players[1].node=20;s.finance!.round=99;
 s.turn=80;s.revision=900;s.randomState=1234;s.serial=456;s.effects!.serial=500;s.effects!.inventory['player-1']['tool:10']=5;
 expect(restoreCheckpoint(s,noop)).toBe(true);expect(s.effects!.inventory['player-1']['tool:10']).toBe(1);
 for(const key of ['players','economy','finance','g2','g5','g6','roadTools'] as const)expect(s[key]).toEqual(saved[key]);
 expect(s).toMatchObject({turn:80,revision:900,randomState:1234,serial:456,phase:'idle',pending:null,remaining:0});expect(s.effects!.serial).toBe(500);expect(Object.values(s.g7!.checkpoints)).toEqual([null,null]);expect(restoreCheckpoint(s,noop)).toBe(false);
});
it('rejects missing historical tool or missing current tool without partial rollback',()=>{
 for(const missing of ['history','current']){const s=prepare();if(missing==='history')s.effects!.inventory['player-1']['tool:10']=0;saveCheckpoint(s);s.effects!.inventory['player-1']['tool:10']=missing==='current'?0:1;const before=structuredClone(s);expect(restoreCheckpoint(s,noop)).toBe(false);expect(s).toEqual(before);}
});
it.each([...RESEARCH_PRODUCTS,...G7_GOODS])('research $name requires its level, cancels on sealing and caps inventory at nine',g=>{
 const s=prepare(),q=s.economy!.properties[0];q.ownerId='player-1';q.buildingType=4;q.level=g.level-1;expect(researchOptions(s,defs).some(x=>x.itemId===g.id)).toBe(false);q.level=g.level;expect(researchOptions(s,defs).some(x=>x.itemId===g.id)).toBe(true);
 q.research={itemId:g.id,remaining:5,ownerId:'player-1'};s.effects!.inventory['player-1'][g.id]=8;for(let i=0;i<4;i++)tickG5(s,noop);expect(s.effects!.inventory['player-1'][g.id]).toBe(8);tickG5(s,noop);expect(s.effects!.inventory['player-1'][g.id]).toBe(9);
 q.research={itemId:g.id,remaining:1,ownerId:'player-1'};tickG5(s,noop);expect(s.effects!.inventory['player-1'][g.id]).toBe(9);q.research={itemId:g.id,remaining:5,ownerId:'player-1'};q.priceStatus=1;reconcileResearch(s,defs,noop);expect(q.research).toBeNull();
});
it('teleports other players with carried objects without ticking bombs or touching research pools',()=>{
 const s=prepare();s.effects!.inventory['player-1']['tool:11']=1;s.g5!.hazards=[{id:1,itemId:'tool:04',node:21,carrier:'player-2',remaining:17}];s.g6!.gods=[{id:'test',type:1,node:21,carrier:'player-2',remaining:3}];const option=g7Options(s,map,defs,'tool:11').find(o=>o.target.id==='player-2')!;
 const before=structuredClone(s);expect(applyG7(s,map,defs,'tool:11',option,{kind:'node',id:'999'},noop)).toBe(false);expect(s).toEqual(before);
 expect(applyG7(s,map,defs,'tool:11',option,{kind:'node',id:'20'},noop)).toBe(true);expect(s.players[1].node).toBe(20);expect(s.g5!.hazards[0]).toMatchObject({node:20,remaining:17});expect(s.g6!.gods[0]).toMatchObject({node:20,remaining:3});expect(s.effects!.inventory['player-1']['tool:11']).toBe(0);expect(s.phase).toBe('idle');
});
it('nuclear blast clears property/research/gods, returns finite objects and hospitalizes vehicle users',()=>{
 const s=prepare(),q=s.economy!.properties[0];s.effects!.inventory['player-1']['tool:13']=1;q.ownerId='player-2';q.level=4;q.buildingType=4;q.research={itemId:'tool:10',remaining:1,ownerId:'player-2'};s.g2!.players['player-2'].vehicle='tool:06';s.g6!.gods=[{id:'test',type:1,node:21,carrier:'player-2',remaining:3}];s.g5!.hazards=[{id:1,itemId:'tool:03',node:20,carrier:null,remaining:0}];s.roadTools!.blocks=[21];const pool=s.g5!.supply['tool:03'],vehicle=s.g2!.supply['tool:06'];
 expect(applyG7(s,map,defs,'tool:13',g7Options(s,map,defs,'tool:13')[0],undefined,noop)).toBe(true);expect(q).toMatchObject({ownerId:null,level:0,buildingType:0,research:null});expect(s.g6!.gods).toEqual([]);expect(s.g5!.hazards).toEqual([]);expect(s.roadTools!.blocks).toEqual([]);expect(s.g5!.supply['tool:03']).toBe(pool+1);expect(s.g2!.supply['tool:06']).toBe(vehicle+1);expect(s.g2!.players['player-2']).toMatchObject({vehicle:'foot',hospital:3});expect(s.phase).toBe('turnEnd');
});
it('legally builds a research facility, acquires all three tools, restores after trade, self-teleports and nukes with exact replay',()=>{
 const e=make();until(e,()=>e.state.active===0&&e.state.phase==='idle'&&e.state.economy!.properties[0].level===5);
 for(const g of G7_GOODS){until(e,()=>e.state.active===0&&e.state.phase==='idle'&&researchOptions(e.state,defs).some(o=>o.itemId===g.id));send(e,{type:'research',propertyId:'lab',itemId:g.id});until(e,()=>e.state.active===0&&e.state.phase==='idle'&&e.state.effects!.inventory['player-1'][g.id]>0);}
 // Move once more so every acquired product belongs to the departure snapshot.
 send(e,{type:'roll'});until(e,()=>e.state.active===0&&e.state.phase==='idle');const checkpoint=e.state.g7!.checkpoints['player-1']!;
 const stock=e.state.g6!.stocks.find(x=>x.quota>0)!;send(e,{type:'stockTrade',stockId:stock.id,side:'buy',quantity:1});const before=e.state;
 send(e,{type:'item',action:{type:'begin',definitionId:'tool:10:time-v1'}});send(e,{type:'item',action:{type:'cancel',decisionId:e.state.pending!.id}});expect(e.state.economy).toEqual(before.economy);expect(e.state.effects!.inventory).toEqual(before.effects!.inventory);
 send(e,{type:'item',action:{type:'begin',definitionId:'tool:10:time-v1'}});
 const decision=e.state.pending!.id;send(e,{type:'pause',value:true});
 const paused=e.state, rejected={id:`c${paused.revision}`,gameId:paused.gameId,expectedRevision:paused.revision,playerId:'player-1',action:{type:'item' as const,action:{type:'confirm' as const,decisionId:decision,target:{kind:'player' as const,id:'player-1'}}}};
 expect(e.dispatch(rejected)).toEqual({ok:false,reason:'paused'});expect(e.state).toEqual(paused);send(e,{type:'pause',value:false});
 const confirm={...rejected,id:`c${e.state.revision}`,expectedRevision:e.state.revision};expect(e.dispatch(confirm).ok).toBe(true);const restored=e.state;expect(e.dispatch(confirm)).toEqual({ok:false,reason:'duplicate'});expect(e.state).toEqual(restored);
 expect(e.state.economy).toEqual(checkpoint.world.economy);expect(e.state.g6).toEqual(checkpoint.world.g6);expect(e.state.effects!.inventory['player-1']['tool:10']).toBe(0);expect(e.state.randomState).toBe(before.randomState);
 use(e,'tool:11',{kind:'player',id:'player-1'},{kind:'node',id:e.state.players[0].node===20?'21':'20'});expect(e.state.phase).not.toBe('idle');until(e,()=>e.state.active===0&&e.state.phase==='idle');
 send(e,{type:'item',action:{type:'begin',definitionId:'tool:13:nuclear-v1'}});send(e,{type:'item',action:{type:'confirm',decisionId:e.state.pending!.id,target:{kind:'node',id:'20'}}});expect(e.state.g2!.players['player-1'].hospital).toBe(3);
 const copy=replayGame(map,e.exportReplay(),defs);expect(copy.state).toEqual(e.state);expect(copy.events).toEqual(e.events);
 const output=process.env.RICHMAN_G7_TEST_OUTPUT;
 if(output){mkdirSync(output,{recursive:true});writeFileSync(`${output}/replay.json`,JSON.stringify({map,definitions:defs,replay:e.exportReplay()},null,2));writeFileSync(`${output}/results.json`,JSON.stringify({scope:'custom-map legal engine commands; no injected state; not browser acceptance',commands:e.exportReplay().commands.length,turn:e.state.turn,fingerprint:G7_FINGERPRINT,researchCompleted:e.events.filter(x=>x.type==='g5Notice'&&x.message.startsWith('研究完成')),effects:e.events.filter(x=>x.type==='g7Notice'),stateHash:createHash('sha256').update(JSON.stringify(e.state)).digest('hex'),eventsHash:createHash('sha256').update(JSON.stringify(e.events)).digest('hex')},null,2));}
},30000);
