/** Compare browser sprite instance IDs at legal G7 marks with the replayed public world. */
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import nodes from '../../shared/richman/japan-topology.fixture.json';
const root='/private/tmp/richman-presentation-ui-research-focused';
const replay=JSON.parse(readFileSync(root+'/replay.json','utf8'));
const report=JSON.parse(readFileSync(root+'/results.json','utf8'));
const checks=report.displayChecks.filter((x:{objectIds?:string[]})=>x.objectIds) as {index:number;objectIds:string[]}[];
const engine=new GameEngine(nodes,replay.config),results:{index:number;actual:string[];expected:string[]}[]=[],prefixes:number[]=[];
let index=0,mark=0;
const expected=()=>{
 const s=engine.state;
 return [...(s.g6?.gods??[]),...(s.g6?.objects??[])].filter(g=>{
  if(!g.carrier)return nodes.some(n=>n.id===g.node);
  const p=s.players.find(p=>p.id===g.carrier);
  const mobility=s.g2?.players[g.carrier];
  return !!p&&!s.finance?.eliminated.includes(g.carrier)&&!mobility?.travel&&!mobility?.prison&&!mobility?.hospital&&!s.g4?.hotel[g.carrier];
 }).map(g=>g.id).sort();
};
for(const command of replay.commands){
 const r=engine.dispatch(command);assert.ok(r.ok,JSON.stringify({index,command,r}));
 if(command.action.type!=='pause')index++;
 if(command.action.type==='pause'&&command.action.value===true){
  const actual=checks[mark]?.objectIds,want=expected();assert.ok(actual,`missing browser mark ${mark}`);assert.deepEqual(actual,want,`sprite IDs at ${index}`);
  results.push({index,actual,expected:want});
  prefixes.push(engine.exportReplay().commands.length);
  mark++;
 }
}
assert.equal(results.length,checks.length);
const full=replayGame(nodes,replay);assert.deepEqual(full.state,engine.state);assert.deepEqual(full.events,engine.events);
for(const end of prefixes){const resumed=replayGame(nodes,{...replay,commands:replay.commands.slice(0,end)});for(const c of replay.commands.slice(end))assert.ok(resumed.dispatch(c).ok);assert.deepEqual(resumed.state,engine.state);assert.deepEqual(resumed.events,engine.events)}
writeFileSync(root+'/sprite-verification.json',JSON.stringify({scope:'actual original-map browser sprite instances vs exact legal replay public world',checks:results,fullReplay:true,prefixReplays:prefixes.length},null,2));
console.log(JSON.stringify({checks:results}));
