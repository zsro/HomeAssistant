/** Verify the exported original-map G7 UI route and its exact browser boundary. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {GameEngine,replayGame,type Command} from '../../frontend/src/features/richman/game/engine';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';

const dir='/private/tmp/richman-presentation-ui-g7change-changed-set';
const read=(path:string)=>JSON.parse(readFileSync(path,'utf8'));
const plan=read('/private/tmp/presentation-v47-g7-change-2.json');
const replay=read(dir+'/replay.json');
const report=read(dir+'/results.json');
const normalize=(command:Command)=>{
  const action=structuredClone(command.action) as unknown as Record<string,unknown>;
  delete action.decisionId;delete action.token;
  if(action.action)delete (action.action as Record<string,unknown>).decisionId;
  return {playerId:command.playerId,action};
};
assert.deepEqual(replay.commands.filter((c:Command)=>c.action.type!=='pause').map(normalize),plan.replay.commands.map(normalize));
const engine=new GameEngine(nodes,replay.config);
for(const command of replay.commands)assert.ok(engine.dispatch(command).ok);
const full=replayGame(nodes,replay);
assert.deepEqual(full.state,engine.state);assert.deepEqual(full.events,engine.events);
const at=(index:number)=>report.displayChecks.find((entry:{index:number})=>entry.index===index);
const before=at(2102),after=at(2103);
assert.ok(before&&after);
const worldAt=(index:number)=>replayGame(nodes,{...replay,commands:replay.commands.slice(0,index)}).state;
const ids=(state:typeof engine.state)=>[...(state.g6?.gods??[]),...(state.g6?.objects??[])].map(object=>object.id).sort();
// The UI adds two pause/resume commands at the start; no pause at these focus marks.
assert.deepEqual(before.objectIds,ids(worldAt(2104)));
assert.deepEqual(after.objectIds,ids(worldAt(2105)));
assert.notDeepEqual(before.objectIds,after.objectIds);
assert.deepEqual(before.objectIds.filter((id:string)=>!after.objectIds.includes(id)),['god-19','god-20']);
assert.deepEqual(after.objectIds.filter((id:string)=>!before.objectIds.includes(id)),['god-16','god-17']);
const b=before.prePause.media,a=after.prePause.media;
assert.equal(b.ports.length,51);assert.equal(a.ports.length,51);
assert.equal(b.events.length,a.events.length);
for(const ports of [b.ports,a.ports]){
  assert.deepEqual(ports.filter((port:{id:number;paused:boolean;attribute:string|null})=>!port.paused||port.attribute).map((port:{id:number})=>port.id),[50]);
  assert.ok(ports.filter((port:{id:number})=>port.id!==50).every((port:{paused:boolean;attribute:string|null})=>port.paused&&!port.attribute));
}
assert.equal(b.ports[50].src,a.ports[50].src);
assert.equal(b.ports[50].paused,false);assert.equal(a.ports[50].paused,false);
assert.deepEqual(report.errors,[]);assert.deepEqual(report.cleanup,{raf:0,canvas:0});
const prefixes=[2104,2105,replay.commands.length];
for(const index of prefixes){
  const partial=replayGame(nodes,{...replay,commands:replay.commands.slice(0,index)});
  for(const command of replay.commands.slice(index))assert.ok(partial.dispatch(command).ok);
  assert.deepEqual(partial.state,engine.state);assert.deepEqual(partial.events,engine.events);
}
const sha256=createHash('sha256').update(JSON.stringify(replay)).digest('hex');
const receipt={route:'g7change',rulesId:replay.rulesId,actualCommands:replay.commands.length,businessCommands:plan.replay.commands.length,prefixes,fullReplay:true,prefixReplay:true,commandsMatchLegalPlan:true,worldBefore:before.objectIds,worldAfter:after.objectIds,removed:['god-19','god-20'],created:['god-16','god-17'],perPort:{before:b.ports,after:a.ports,eventsBetween:a.events.slice(b.events.length)},cleanup:report.cleanup,errors:report.errors,replaySHA256:sha256};
writeFileSync('frontend/src/features/richman/game/fixtures/presentation-v47-g7-changed-set-replay.json',JSON.stringify(replay));
writeFileSync('frontend/src/features/richman/game/fixtures/presentation-v47-g7-changed-set-manifest.json',JSON.stringify(receipt,null,2)+'\n');
writeFileSync(dir+'/verified.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({actualCommands:receipt.actualCommands,prefixes:receipt.prefixes,removed:receipt.removed,created:receipt.created,perPort:receipt.perPort.before.length,eventsBetween:receipt.perPort.eventsBetween.length,replaySHA256:sha256}));
