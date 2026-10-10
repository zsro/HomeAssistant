/** Validate exported UI commands and resume every meaningful boundary, then archive. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {GameEngine,replayGame,type Command,type GameState} from '../../frontend/src/features/richman/game/engine';
import {SURRENDER_FINGERPRINT} from '../../frontend/src/features/richman/game/surrender';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
const receipts=[];
for(const n of [2,3,4]){
 const path='/private/tmp/richman-surrender-ui-'+n,replay=JSON.parse(readFileSync(path+'/replay.json','utf8')),report=JSON.parse(readFileSync(path+'/results.json','utf8')),plan=JSON.parse(readFileSync('/private/tmp/surrender-'+n+'.json','utf8'));
 const normalize=(c:Command)=>{const a=structuredClone(c.action) as unknown as Record<string,unknown>;delete a.decisionId;delete a.token;if(a.action)delete(a.action as Record<string,unknown>).decisionId;return{playerId:c.playerId,action:a};};
 assert.deepEqual(replay.commands.filter((c:Command)=>c.action.type!=='pause').map(normalize),plan.replay.commands.map(normalize));assert.equal(replay.itemFingerprint,SURRENDER_FINGERPRINT);assert.deepEqual(report.errors,[]);assert.deepEqual(report.cleanup,{raf:0,canvas:0});
 const publicAtExit=new Map<string,number>();
 const e=new GameEngine(nodes,replay.config),prefixes:{index:number;kind:string}[]=[],facts:unknown[]=[];
 for(let i=0;i<replay.commands.length;i++){
  const c=replay.commands[i],s=e.state; if(c.action.type==='surrender')publicAtExit.set(c.playerId,s.news!.publicFund); const result=e.dispatch(c);assert.ok(result.ok);if(!result.ok)throw Error(result.reason);
  for(const ev of result.events){
   if(ev.type==='surrenderStarted'||ev.type==='surrenderSelection'||ev.type==='surrenderCompleted'||ev.type==='disposalCompleted'){facts.push(ev);prefixes.push({index:i+1,kind:ev.type});}
   if(ev.type==='surrenderSelection'){assert.ok(!e.state.finance!.disposal!.current);assert.ok(e.state.finance!.eliminated.includes(ev.decision.sourceId));assert.equal(e.state.calendar!.date,s.calendar!.date);}
   if(ev.type==='surrenderCompleted'&&ev.targetId){assert.equal(ev.outcome,'attached');assert.ok(e.state.g6!.gods.some(g=>g.carrier===ev.targetId&&g.type===15&&g.slot===ev.slot));assert.ok(Object.values(e.state.effects!.inventory[ev.targetId]).every(q=>q===0));}
   if(ev.type==='disposalCompleted'){assert.equal(e.state.news!.publicFund,publicAtExit.get(ev.receipt.payerId)!+ev.receipt.stocks.reduce((a,k)=>a+k.amount,0)+ev.receipt.auctions.reduce((a,k)=>a+k.amount,0)); for(const k of ev.receipt.stocks)assert.deepEqual(e.state.g6!.holdings[ev.receipt.payerId][k.stockId],{quantity:0,cost:0,average:0});assert.equal(ev.receipt.continuation,'surrender');assert.equal(ev.receipt.amount,0);assert.ok(e.state.finance!.eliminated.includes(ev.receipt.payerId));}
  }
 }
 if(n===2)assert.equal(e.state.phase,'finished');if(n===3)assert.ok(e.events.some(ev=>ev.type==='surrenderCompleted'&&ev.outcome==='cancelled'));
 if(n===4){assert.deepEqual(e.state.g6!.gods.filter(g=>g.type===15).map(g=>g.slot),[15,16]);const exits=e.events.filter(ev=>ev.type==='disposalCompleted');assert.equal(exits.length,2);assert.ok(exits.every(ev=>ev.receipt.auctions.length===3));assert.ok(exits.some(ev=>ev.receipt.stocks.length>0));}
 const actual=JSON.parse(JSON.stringify(e.state).replaceAll(e.state.gameId,plan.state.gameId)) as GameState,planned=structuredClone(plan.state);actual.revision=0;planned.revision=0;
 const stripEventCursor=(v:unknown):void=>{if(v&&typeof v==='object')for(const [k,x] of Object.entries(v)){if(k==='lastBoundary')(v as Record<string,unknown>)[k]=0;else stripEventCursor(x);}};stripEventCursor(actual);stripEventCursor(planned);assert.deepEqual(actual,planned);
 const full=replayGame(nodes,replay);assert.deepEqual(full.state,e.state);assert.deepEqual(full.events,e.events);
 for(const p of prefixes){const copy=replayGame(nodes,{...replay,commands:replay.commands.slice(0,p.index)});for(const c of replay.commands.slice(p.index))assert.ok(copy.dispatch(c).ok);assert.deepEqual(copy.state,e.state);assert.deepEqual(copy.events,e.events);}
 const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex'),receipt={...report,facts,prefixes,fullReplay:true,prefixReplay:true,commandsMatchLegalPlan:true,hashes:{replay:hash(replay),state:hash(e.state),events:hash(e.events)}};
 const file='frontend/src/features/richman/game/fixtures/surrender-v47-'+n;writeFileSync(file+'-replay.json',JSON.stringify(replay));writeFileSync(file+'-manifest.json',JSON.stringify(receipt,null,2)+'\n');receipts.push(receipt);console.log(n,report.commands,prefixes.length);
}
writeFileSync('/private/tmp/surrender-verified.json',JSON.stringify(receipts,null,2)+'\n');
