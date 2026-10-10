import {SPECIAL_OBJECT_FINGERPRINT} from '../../frontend/src/features/richman/game/special-objects-rules';
import {readFileSync,writeFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
const result=[];
for(const n of [2,3,4]) {
 const dir=`/private/tmp/richman-special-objects-ui-${n}`,replay=JSON.parse(readFileSync(dir+'/replay.json','utf8')),report=JSON.parse(readFileSync(dir+'/results.json','utf8')),plan=JSON.parse(readFileSync(`/private/tmp/special-objects-${n}.json`,'utf8'));
 const normalize=(c:{playerId:string;action:Record<string,unknown>})=>{const a=structuredClone(c.action);delete a.decisionId;delete a.token;if(a.action)delete(a.action as Record<string,unknown>).decisionId;return{playerId:c.playerId,action:a};};
 assert.deepEqual(replay.commands.filter((c:{action:{type:string}})=>c.action.type!=='pause').map(normalize),plan.replay.commands.map(normalize));
 assert.equal(replay.itemFingerprint,SPECIAL_OBJECT_FINGERPRINT);assert.deepEqual(report.errors,[]);assert.deepEqual(report.cleanup,{raf:0,canvas:0});
 const e=new GameEngine(nodes,replay.config),prefixes:number[]=[];
 for(let i=0;i<replay.commands.length;i++){const c=replay.commands[i],r=e.dispatch(c);assert.ok(r.ok);if(r.events.some(ev=>ev.type==='specialObjectResolved'||ev.type==='specialObjectsRefreshed'||ev.type==='g6Notice'&&/附身|期限结束|配对补位/.test(ev.message)))prefixes.push(i+1);}
 assert.ok(e.events.some(ev=>ev.type==='specialObjectsRefreshed'));assert.ok(e.events.some(ev=>ev.type==='specialObjectResolved'&&ev.objectType===(n===2?13:n===3?14:11)));
 const planned=structuredClone(plan.state),actual=JSON.parse(JSON.stringify(e.state).replaceAll(e.state.gameId,plan.state.gameId));for(const v of [planned,actual])delete v.revision;assert.deepEqual(actual,planned);
 const full=replayGame(nodes,replay);assert.deepEqual(full.state,e.state);assert.deepEqual(full.events,e.events);
 for(const k of prefixes){const p=replayGame(nodes,{...replay,commands:replay.commands.slice(0,k)});for(const c of replay.commands.slice(k))assert.ok(p.dispatch(c).ok);assert.deepEqual(p.state,e.state);assert.deepEqual(p.events,e.events);}
 const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
 const base=`frontend/src/features/richman/game/fixtures/special-objects-v46-${n}`;
 const receipt={...report,specialReceipts:e.events.filter(ev=>ev.type==='specialObjectResolved'||ev.type==='specialObjectsRefreshed'),pairNotices:e.events.filter(ev=>ev.type==='g6Notice'&&ev.message.startsWith('配对补位：')),prefixes,fullReplay:true,prefixReplay:true,commandsMatchPriorLegalRoute:true,hashes:{replay:hash(replay),state:hash(e.state),events:hash(e.events)}};
 writeFileSync(base+'-replay.json',JSON.stringify(replay));writeFileSync(base+'-manifest.json',JSON.stringify(receipt,null,2)+'\n');result.push(receipt);
}
writeFileSync('/private/tmp/special-objects-verified.json',JSON.stringify(result,null,2)+'\n');console.log(result.map(x=>({players:x.players,commands:x.commands,prefixes:x.prefixes.length})));
