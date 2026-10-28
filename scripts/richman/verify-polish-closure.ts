import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import nodes from '../../shared/richman/japan-topology.fixture.json';
const rows=[];
const specs=[...['desktop','touch390'].flatMap(view=>['before-reset','after-reset','after-new'].map(part=>({name:view+'-'+part,dir:'/private/tmp/richman-polish-closure',prefixes:part==='before-reset'?[1,3,8]:[1],length:part==='before-reset'?9:2}))),...['auction','reaction'].map(name=>({name,dir:'/private/tmp/richman-polish-responders',prefixes:name==='auction'?[20,26,28]:[200,282,283],length:name==='auction'?30:284}))];
for(const spec of specs){
 const replay=JSON.parse(readFileSync(`${spec.dir}/${spec.name}-replay.json`,'utf8'));
 assert.equal(replay.commands.length,spec.length);
 const engine=new GameEngine(nodes,replay.config),initial=engine.state;for(const c of replay.commands)assert.ok(engine.dispatch(c).ok);
 if(spec.name==='auction'||spec.name==='reaction'){
  const plan=JSON.parse(readFileSync(`/private/tmp/s3-05c-${spec.name}-plan.json`,'utf8')).replay;
  assert.equal(replay.rulesId,plan.rulesId);assert.equal(replay.mapFingerprint,plan.mapFingerprint);
  const canonical=(v:unknown,id:string)=>JSON.stringify(v).split(id).join('GAME');
  assert.equal(canonical(replay.commands,replay.config.gameId),canonical(plan.commands,plan.config.gameId));
  const old=replayGame(nodes,plan);assert.equal(canonical(engine.state,replay.config.gameId),canonical(old.state,plan.config.gameId));assert.equal(canonical(engine.events,replay.config.gameId),canonical(old.events,plan.config.gameId));
 }else{
  assert.equal(replay.rulesId,'japan-events-candidate-v47');assert.deepEqual(engine.state.economy,initial.economy);assert.deepEqual(engine.state.effects!.inventory,initial.effects!.inventory);assert.ok(!engine.events.some(e=>e.type==='effectConsumed'));
  assert.equal(engine.state.phase,spec.name.endsWith('before-reset')?'effect':'idle');assert.equal(engine.state.paused,false);
 }
 const full=replayGame(nodes,replay);assert.deepEqual(full.state,engine.state);assert.deepEqual(full.events,engine.events);
 for(const n of spec.prefixes){const partial=replayGame(nodes,{...replay,commands:replay.commands.slice(0,n)});for(const c of replay.commands.slice(n))assert.ok(partial.dispatch(c).ok);assert.deepEqual(partial.state,engine.state);assert.deepEqual(partial.events,engine.events)}
 const fixture=`frontend/src/features/richman/game/fixtures/polish-closure-${spec.name}-replay.json`;
 writeFileSync(fixture,JSON.stringify(replay));rows.push({name:spec.name,rulesId:replay.rulesId,commands:replay.commands.length,prefixes:spec.prefixes,fullExportReplay:true,originalPlanExact:spec.dir.includes('responders'),sha256:createHash('sha256').update(JSON.stringify(replay)).digest('hex'),fixture});
}
writeFileSync('/private/tmp/s3-05c-verified.json',JSON.stringify(rows,null,2));console.log(JSON.stringify(rows));
