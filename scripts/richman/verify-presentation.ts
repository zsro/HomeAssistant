/** Actual UI exports only; independently reconstruct full state and resumable prefixes. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {GameEngine,replayGame,type Command} from '../../frontend/src/features/richman/game/engine';
import {eventAudio} from '../../frontend/src/features/richman/audio-events';
import nodes from '../../shared/richman/japan-topology.fixture.json';
const routes:Record<string,string>={special2:'special-objects-2',special3:'special-objects-3',special4:'special-objects-4',pair:'god-circuit-pair',full:'god-circuit-full',research:'god-closure-research',car:'god-closure-car'};
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const normalize=(c:Command)=>{const action=structuredClone(c.action) as unknown as Record<string,unknown>;delete action.decisionId;delete action.token;if(action.action)delete (action.action as Record<string,unknown>).decisionId;return {playerId:c.playerId,action};};
for(const route of (process.env.RICHMAN_ROUTES??'special2,pair,full,research').split(',')){
 const dir='/private/tmp/richman-presentation-ui-'+route,read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
 const replay=read(dir+'/replay.json'),report=read(dir+'/results.json'),plan=read('/private/tmp/'+routes[route]+'.json');
 assert.deepEqual(replay.commands.filter((c:Command)=>c.action.type!=='pause').map(normalize),plan.replay.commands.map(normalize));
 const e=new GameEngine(nodes,replay.config),prefixes=new Map<number,string>(),facts:unknown[]=[],expectedVoices=new Set<string>();let business=0;
 for(let i=0;i<replay.commands.length;i++){
  const command=replay.commands[i],before=e.state,r=e.dispatch(command);assert.ok(r.ok,JSON.stringify({i,command,r}));if(!r.ok)throw Error(r.reason);
  if(command.action.type!=='pause')business++;
  for(const mark of plan.marks??[])if(command.action.type!=='pause'&&mark.index===business)prefixes.set(i+1,mark.kind);
  for(const cue of eventAudio(before,e.state,r.events))if(cue.channel==='voice')expectedVoices.add(cue.id);
  for(const ev of r.events){
   if(ev.type==='specialObjectResolved'||ev.type==='specialObjectsRefreshed'||ev.type==='g6Notice'&&/附身|期限结束/.test(ev.message)||ev.type==='g7Notice'&&ev.message.startsWith('时光机：')){
    facts.push({index:i+1,event:ev});if(prefixes.size<8)prefixes.set(i+1,ev.type);
   }
   if(ev.type==='g7Notice'&&ev.message.startsWith('时光机：')){assert.deepEqual(e.state.g6,before.g7!.checkpoints[command.playerId]!.world.g6);assert.equal(e.state.randomState,before.randomState);prefixes.set(i+1,'G7 current world restored');}
  }
 }
 const full=replayGame(nodes,replay);assert.deepEqual(full.state,e.state);assert.deepEqual(full.events,e.events);
 for(const [index] of prefixes){const p=replayGame(nodes,{...replay,commands:replay.commands.slice(0,index)});for(const c of replay.commands.slice(index))assert.ok(p.dispatch(c).ok);assert.deepEqual(p.state,e.state);assert.deepEqual(p.events,e.events);}
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.cleanup,{raf:0,canvas:0});assert.ok(report.media.released);
 const media=read(dir+'/media.json'),playedVoices=[...new Set<string>(media.events.filter((x:{type:string;src:string})=>x.type==='playing'&&x.src.includes('/voice-')).map((x:{src:string})=>x.src.match(/voice-(\d+)/)![1]))];
 for(const id of playedVoices)assert.ok(expectedVoices.has(id),'unexpected voice '+id);
 const receipt={...report,prefixes:[...prefixes].map(([index,kind])=>({index,kind})),facts,expectedVoices:[...expectedVoices],playedVoices,fullReplay:true,prefixReplay:true,commandsMatchLegalPlan:true,hashes:{replay:hash(replay),state:hash(e.state),events:hash(e.events)}};
 const file='frontend/src/features/richman/game/fixtures/presentation-'+replay.rulesId.split('-').at(-1)+'-'+route;
 writeFileSync(file+'-replay.json',JSON.stringify(replay));writeFileSync(file+'-manifest.json',JSON.stringify(receipt,null,2)+'\n');writeFileSync(dir+'/verified.json',JSON.stringify(receipt,null,2)+'\n');console.log(route,replay.commands.length,prefixes.size,'prefixes',playedVoices.length,'voices');
}
