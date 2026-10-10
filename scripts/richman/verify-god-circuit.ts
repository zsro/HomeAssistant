/** Archive only exported browser commands, never planner output as UI evidence. */
import {readFileSync,writeFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import {shopSupply} from '../../frontend/src/features/richman/game/shop-acquisition';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
const receipts=[];
for(const route of (process.env.RICHMAN_VERIFY_ROUTES??'pair,full-known,restore').split(',')){
 const dir='/private/tmp/richman-god-circuit-ui-'+route,replay=JSON.parse(readFileSync(dir+'/replay.json','utf8')),report=JSON.parse(readFileSync(dir+'/results.json','utf8')),plan=JSON.parse(readFileSync('/private/tmp/god-circuit-'+route+'.json','utf8'));
 const normalize=(c:{playerId:string;action:Record<string,unknown>})=>{const action=structuredClone(c.action);delete action.decisionId;delete action.token;if(action.action)delete(action.action as Record<string,unknown>).decisionId;return{playerId:c.playerId,action};};
 assert.deepEqual(replay.commands.filter((c:{action:{type:string}})=>c.action.type!=='pause').map(normalize),plan.replay.commands.map(normalize));
 assert.equal(replay.itemFingerprint,'249e82f7');assert.deepEqual(report.errors,[]);assert.deepEqual(report.cleanup,{raf:0,canvas:0});
 const e=new GameEngine(nodes,replay.config),prefixes:{index:number;kind:string}[]=[],facts:unknown[]=[];let restored=false,plannedIndex=0;
 for(let i=0;i<replay.commands.length;i++){
  const c=replay.commands[i],before=e.state,checkpoint=structuredClone(before.g7?.checkpoints[c.playerId]),r=e.dispatch(c);assert.ok(r.ok);
  if(c.action.type!=='pause')plannedIndex++;
  for(const mark of plan.marks??[])if(c.action.type!=='pause'&&mark.index===plannedIndex)prefixes.push({index:i+1,kind:mark.kind});
  for(const ev of r.events){
   if(ev.type==='specialObjectResolved'||ev.type==='specialObjectsRefreshed')facts.push(ev);
   if(ev.type==='specialObjectResolved'&&ev.outcome==='full'){assert.equal(ev.before,9);assert.equal(ev.after,9);assert.notEqual(e.state.randomState,before.randomState);assert.ok(ev.itemId);assert.equal(shopSupply(e.state,ev.itemId),shopSupply(before,ev.itemId));assert.ok(!e.state.g6!.objects!.some(g=>g.type===13));facts.push({type:'verifiedFullReceipt',itemId:ev.itemId,supplyUnchanged:shopSupply(e.state,ev.itemId),bagUnchanged:9,objectRemoved:true,rngAdvanced:true});}
   if(ev.type==='specialObjectResolved'&&ev.objectType===11&&ev.outcome==='vehicle'){assert.notEqual(before.g2!.players[ev.targetId].vehicle,'foot');assert.ok(!e.state.g6!.objects!.some(g=>g.type===11));assert.ok(e.state.g6!.gods.some(g=>g.type===12));assert.equal(e.state.g2!.players[ev.targetId].hospital,before.g2!.players[ev.targetId].hospital);}
   if(ev.type==='g6Notice'&&(/附身土地公|11号槽出现在/.test(ev.message)))facts.push(ev);
   if(ev.type==='g7Notice'&&ev.message.startsWith('时光机：')){
    assert.ok(checkpoint);assert.notDeepEqual(before.g6!.objects,checkpoint.world.g6!.objects);assert.deepEqual(e.state.g6,checkpoint.world.g6);assert.equal(e.state.randomState,before.randomState);
    assert.equal(e.state.effects!.inventory[c.playerId]['tool:10'],checkpoint.world.effects!.inventory[c.playerId]['tool:10']-1);
    facts.push({type:'verifiedG7Restore',before:before.g6!.objects,after:e.state.g6!.objects,rngUnchanged:true,worldGodsAndSpecialsRestored:true,historicalTimeConsumed:1});restored=true;
   }
  }
 }
 if(route==='restore')assert.ok(restored);else assert.ok(e.events.some(ev=>ev.type==='specialObjectResolved'&&ev.outcome===(route==='pair'?'vehicle':'full')));
 if(route==='pair'){assert.ok(e.events.some(ev=>ev.type==='g6Notice'&&ev.message.includes('附身土地公')));assert.ok(e.events.some(ev=>ev.type==='g6Notice'&&ev.message.includes('11号槽出现在')));}
 const planned=structuredClone(plan.state),actual=JSON.parse(JSON.stringify(e.state).replaceAll(e.state.gameId,plan.state.gameId));for(const v of [planned,actual])delete v.revision;assert.deepEqual(actual,planned);
 const full=replayGame(nodes,replay);assert.deepEqual(full.state,e.state);assert.deepEqual(full.events,e.events);
 for(const k of prefixes){const p=replayGame(nodes,{...replay,commands:replay.commands.slice(0,k.index)});for(const c of replay.commands.slice(k.index))assert.ok(p.dispatch(c).ok);assert.deepEqual(p.state,e.state);assert.deepEqual(p.events,e.events);}
 const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex'),base='frontend/src/features/richman/game/fixtures/god-circuit-v46-'+route;
 const receipt={...report,facts,prefixes,fullReplay:true,prefixReplay:true,commandsMatchLegalPlan:true,hashes:{replay:hash(replay),state:hash(e.state),events:hash(e.events)}};
 writeFileSync(base+'-replay.json',JSON.stringify(replay));writeFileSync(base+'-manifest.json',JSON.stringify(receipt,null,2)+'\n');receipts.push(receipt);
 console.log(route,report.commands,'commands',prefixes.length,'prefixes verified');
}
writeFileSync('/private/tmp/god-circuit-verified.json',JSON.stringify(receipts,null,2)+'\n');
