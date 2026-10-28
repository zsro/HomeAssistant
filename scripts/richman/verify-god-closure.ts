/** Verify real UI exports against legal plans, concrete transitions and resumable prefixes. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {GameEngine,replayGame,type Command,type GameState} from '../../frontend/src/features/richman/game/engine';
import {SURRENDER_FINGERPRINT} from '../../frontend/src/features/richman/game/surrender';
import {shopSupply} from '../../frontend/src/features/richman/game/shop-acquisition';
import nodes from '../../shared/richman/japan-topology.fixture.json';
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const normalize=(c:Command)=>{const a=structuredClone(c.action) as unknown as Record<string,unknown>;delete a.decisionId;delete a.token;if(a.action)delete(a.action as Record<string,unknown>).decisionId;return{playerId:c.playerId,action:a};};
const receipts=[];
for(const route of (process.env.RICHMAN_ROUTE?[process.env.RICHMAN_ROUTE]:['car','research'])){
 const path='/private/tmp/richman-god-closure-ui-'+route,plan=JSON.parse(readFileSync('/private/tmp/god-closure-'+route+'.json','utf8'));
 const replay=JSON.parse(readFileSync(path+'/replay.json','utf8')),report=JSON.parse(readFileSync(path+'/results.json','utf8'));
 assert.deepEqual(replay.commands.filter((c:Command)=>c.action.type!=='pause').map(normalize),plan.replay.commands.map(normalize));
 assert.equal(replay.itemFingerprint,SURRENDER_FINGERPRINT);assert.deepEqual(report.errors,[]);assert.deepEqual(report.cleanup,{raf:0,canvas:0});
 if(route==='research'){assert.deepEqual(replay.control,plan.replay.control);assert.ok(report.computerCommands>0);}
 const e=new GameEngine(nodes,replay.config),prefixes:{index:number;kind:string}[]=[],facts:unknown[]=[],duration:{index:number;turn:number;before:number;after:number;type:string}[]=[];
 const death=(s:GameState)=>s.g6!.gods.find(g=>g.type===15&&g.carrier==='player-2');
 const timeProduction:{turn:number;remaining:number}[]=[];let business=0,exited=false,expired=false,restored=false,researchStarted=false,produced=false;
 for(let i=0;i<replay.commands.length;i++){
  const c=replay.commands[i] as Command,s=e.state,d=death(s),result=e.dispatch(c);assert.ok(result.ok,JSON.stringify({i,c,result}));if(!result.ok)throw Error(result.reason);const t=e.state,after=death(t);
  if(c.action.type!=='pause')business++;
  const marks=plan.marks.filter((m:{index:number})=>m.index===business);
  if(c.action.type!=='pause')for(const mark of marks)prefixes.push({index:i+1,kind:mark.kind});
  if(c.action.type==='surrender'){
   exited=true;assert.equal(c.playerId,'player-1');assert.ok(t.finance!.eliminated.includes('player-1'));assert.deepEqual(t.economy!.balances['player-1'],{cash:0,bank:0});assert.ok(Object.values(t.g7!.checkpoints).every(x=>!x));
   facts.push({kind:'exit-barrier',index:i+1,turn:t.turn,checkpointsCleared:true,sourceFunds:t.economy!.balances['player-1'],publicFund:t.news!.publicFund});
  }
  if(c.action.type==='chooseDeath'){
   assert.equal(c.playerId,'player-1');assert.equal(c.action.targetId,'player-2');assert.ok(exited);assert.ok(t.finance!.eliminated.includes('player-1'));assert.deepEqual(t.economy!.balances,s.economy!.balances);assert.deepEqual(t.items!.points,s.items!.points);
   assert.equal(after!.slot,15);assert.equal(after!.remaining,13);assert.equal(t.g5!.engineers['player-2'],null);assert.deepEqual(t.g2!.players['player-2'],{...s.g2!.players['player-2'],vehicle:'foot',savedVehicle:'foot',diceCount:1,savedDice:1});assert.ok(Object.values(t.effects!.inventory['player-2']).every(q=>q===0));assert.deepEqual(t.g3!.slots['player-2'],[]);
   if(route==='car')assert.equal(s.g2!.players['player-2'].vehicle,'tool:06');else assert.ok(s.g5!.engineers['player-2']&&!s.g5!.engineers['player-2']!.suspended);
   const pools=[];for(let k=1;k<=8;k++){const id='tool:'+String(k).padStart(2,'0'),before=shopSupply(s,id),value=shopSupply(t,id),bag=s.effects!.inventory['player-2'][id]??0,equipped=s.g2!.players['player-2'].vehicle===id?1:0;assert.equal(value,before+bag+equipped,id);pools.push({id,before,after:value,bag,equipped});}
   for(const id of ['tool:09','tool:10','tool:11','tool:12','tool:13'])assert.equal(shopSupply(t,id),shopSupply(s,id),id+' research must not mint finite pool');
   facts.push({kind:'equipment-cleared',index:i+1,before:{mobility:s.g2!.players['player-2'],engineer:s.g5!.engineers['player-2'],inventory:s.effects!.inventory['player-2']},after:{mobility:t.g2!.players['player-2'],engineer:t.g5!.engineers['player-2'],inventory:t.effects!.inventory['player-2'],god:after},pools,noRefund:true});
  }
  if(c.action.type==='research'&&c.action.itemId==='tool:10'){assert.ok(exited);assert.equal(c.playerId,'player-3');const q=s.economy!.properties.find(q=>q.id===c.action.propertyId)!;assert.equal(q.ownerId,c.playerId);assert.equal(q.buildingType,4);assert.ok(q.level>=2);researchStarted=true;assert.equal(t.economy!.properties.find(p=>p.id===q.id)!.research!.remaining,5);timeProduction.push({turn:t.turn,remaining:5});facts.push({kind:'post-exit-time-research-start',index:i+1,turn:t.turn,property:q});}
  if(researchStarted&&!produced){const before=s.economy!.properties.find(q=>q.research?.itemId==='tool:10'&&q.ownerId==='player-3');if(before){const remaining=t.economy!.properties.find(q=>q.id===before.id)!.research?.remaining??0;if(remaining!==before.research!.remaining){assert.equal(remaining,before.research!.remaining-1);assert.equal(t.players[t.active].id,'player-3');timeProduction.push({turn:t.turn,remaining});}}}
  if(exited&&!produced&&t.effects!.inventory['player-3']['tool:10']>0){assert.ok(researchStarted);produced=true;facts.push({kind:'post-exit-time-produced',index:i+1,turn:t.turn,inventory:t.effects!.inventory['player-3']});}
  if(result.events.some(ev=>ev.type==='g7Notice'&&ev.message.startsWith('时光机：'))){
   assert.ok(exited&&produced);const cp=s.g7!.checkpoints[c.playerId]!;assert.ok(cp.world.finance!.eliminated.includes('player-1'));assert.deepEqual(t.g6,cp.world.g6);assert.deepEqual(t.g2,cp.world.g2);assert.equal(t.g5!.engineers['player-2'],null);assert.equal(t.randomState,s.randomState);assert.equal(t.turn,s.turn);assert.equal(t.revision,s.revision+1);assert.ok(Object.values(t.g7!.checkpoints).every(x=>!x));
   assert.equal(t.effects!.inventory[c.playerId]['tool:10'],cp.world.effects!.inventory[c.playerId]['tool:10']-1);for(const key of ['economy','finance','items','roadTools','cards','wealth','g1','g3','g4','news','fortune','calendar','lottery','magic','siteServices'] as const)assert.deepEqual(t[key],cp.world[key],key+' saved world');assert.equal(t.economy!.balances['player-1'].cash,0);assert.ok(t.finance!.eliminated.includes('player-1'));assert.ok(after!.remaining>d!.remaining);assert.equal(t.g2!.players['player-2'].vehicle,'foot');
   restored=true;facts.push({kind:'time-restored-post-exit-world',index:i+1,checkpointTurn:cp.turn,executionTurn:t.turn,beforeRemaining:d!.remaining,savedRemaining:cp.world.g6!.gods.find(g=>g.type===15)!.remaining,afterRemaining:after!.remaining,checkpointEliminated:cp.world.finance!.eliminated,randomBefore:s.randomState,randomAfter:t.randomState,dateBefore:s.calendar!.date,dateSaved:cp.world.calendar!.date,dateAfter:t.calendar!.date,sourceStillExited:true,inventoryTool10:t.effects!.inventory[c.playerId]['tool:10']});
  }
  if(d&&d.remaining!==(after?.remaining??0)){duration.push({index:i+1,turn:t.turn,before:d.remaining,after:after?.remaining??0,type:c.action.type});if(after&&after.remaining<d.remaining){assert.equal(after.remaining,d.remaining-1);assert.equal(t.players[t.active].id,'player-2');}}
  if(d&&!after){assert.ok(result.events.some(ev=>ev.type==='g6Notice'&&ev.message==='玩家2的神仙期限结束。'));assert.equal(d.remaining,1);expired=true;facts.push({kind:'natural-expiry',index:i+1,turn:t.turn,remainingBefore:1});}
  if(exited){assert.ok(t.finance!.eliminated.includes('player-1'));assert.deepEqual(t.economy!.balances['player-1'],{cash:0,bank:0});}
 }
 assert.ok(expired);assert.equal(duration.filter(d=>d.after<d.before).length,13+(route==='research'?duration.reduce((n,d)=>n+Math.max(0,d.after-d.before),0):0));if(route==='research'){assert.ok(restored&&researchStarted&&produced);assert.deepEqual(timeProduction.map(p=>p.remaining),[5,4,3,2,1,0]);}
 const actual=JSON.parse(JSON.stringify(e.state).replaceAll(e.state.gameId,plan.state.gameId)) as GameState,planned=structuredClone(plan.state);actual.revision=planned.revision=0;
 const strip=(v:unknown):void=>{if(v&&typeof v==='object')for(const [k,x] of Object.entries(v)){if(k==='lastBoundary')(v as Record<string,unknown>)[k]=0;else strip(x);}};strip(actual);strip(planned);assert.deepEqual(actual,planned);
 const full=replayGame(nodes,replay);assert.deepEqual(full.state,e.state);assert.deepEqual(full.events,e.events);
 for(const index of new Set(prefixes.map(p=>p.index))){const copy=replayGame(nodes,{...replay,commands:replay.commands.slice(0,index)});for(const c of replay.commands.slice(index))assert.ok(copy.dispatch(c).ok);assert.deepEqual(copy.state,e.state);assert.deepEqual(copy.events,e.events);}
 const receipt={...report,finalTurn:e.state.turn,finalDate:e.state.calendar!.date,monthRefreshes:e.events.filter(ev=>ev.type==='specialObjectsRefreshed'),facts,duration,timeProduction,prefixes,uniquePrefixes:new Set(prefixes.map(p=>p.index)).size,fullReplay:true,prefixReplay:true,commandsMatchLegalPlan:true,hashes:{replay:hash(replay),state:hash(e.state),events:hash(e.events)}};
 const file='frontend/src/features/richman/game/fixtures/god-closure-v47-'+route;writeFileSync(file+'-replay.json',JSON.stringify(replay));writeFileSync(file+'-manifest.json',JSON.stringify(receipt,null,2)+'\n');receipts.push(receipt);console.log(route,report.commands,receipt.uniquePrefixes);
}
writeFileSync('/private/tmp/god-closure-verified'+(process.env.RICHMAN_ROUTE?'-'+process.env.RICHMAN_ROUTE:'')+'.json',JSON.stringify(receipts,null,2)+'\n');
