import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GameEngine,replayGame} from '../../frontend/src/features/richman/game/engine';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
const dir='/private/tmp/richman-polish-navigation';
const rows=[];
for(const name of ['desktop','touch390']){
 const replay=JSON.parse(readFileSync(`${dir}/${name}-replay.json`,'utf8'));
 assert.equal(replay.rulesId,'japan-events-candidate-v47');assert.equal(replay.commands.length,6);
 const engine=new GameEngine(nodes,replay.config),initial=engine.state;
 for(const c of replay.commands)assert.ok(engine.dispatch(c).ok);
 assert.deepEqual(engine.state.effects!.inventory,initial.effects!.inventory);
 assert.deepEqual(engine.state.economy,initial.economy);
 assert.equal(engine.state.phase,'idle');assert.equal(engine.state.effects!.pending,null);
 assert.ok(!engine.events.some(e=>e.type==='effectConsumed'));
 const full=replayGame(nodes,replay);assert.deepEqual(full.state,engine.state);assert.deepEqual(full.events,engine.events);
 for(const n of [1,3,4]){const partial=replayGame(nodes,{...replay,commands:replay.commands.slice(0,n)});for(const c of replay.commands.slice(n))assert.ok(partial.dispatch(c).ok);assert.deepEqual(partial.state,engine.state);assert.deepEqual(partial.events,engine.events)}
 const sha256=createHash('sha256').update(JSON.stringify(replay)).digest('hex');
 rows.push({name,commands:6,prefixes:[1,3,4],fullReplay:true,inventoryAndEconomyUnchanged:true,consumed:0,sha256});
 writeFileSync(`frontend/src/features/richman/game/fixtures/polish-v47-navigation-${name}-replay.json`,JSON.stringify(replay));
}
{
 const name='ownership',replay=JSON.parse(readFileSync(`${dir}/${name}-replay.json`,'utf8'));
 assert.equal(replay.rulesId,'japan-events-candidate-v47');assert.equal(replay.commands.length,17);
 assert.deepEqual(replay.control,{version:1,policy:'tools-v1',computerIds:['xiaomei','tuu']});
 const engine=new GameEngine(nodes,replay.config);for(const c of replay.commands)assert.ok(engine.dispatch(c).ok);
 assert.equal(engine.state.paused,true);assert.equal(engine.state.effects!.pending!.definitionId,'tool:09:build-nearby-anchor-v1');
 assert.ok(engine.state.economy!.properties.some(p=>p.ownerId));
 assert.equal(engine.state.effects!.inventory[engine.state.effects!.pending!.playerId]['tool:09'],1);
 const full=replayGame(nodes,replay);assert.deepEqual(full.state,engine.state);assert.deepEqual(full.events,engine.events);
 for(const n of [8,15,16]){const partial=replayGame(nodes,{...replay,commands:replay.commands.slice(0,n)});for(const c of replay.commands.slice(n))assert.ok(partial.dispatch(c).ok);assert.deepEqual(partial.state,engine.state);assert.deepEqual(partial.events,engine.events)}
 rows.push({name,commands:17,prefixes:[8,15,16],fullReplay:true,legalPurchaseBeforeWorker:true,pausedPendingWorkerUnconsumed:true,sha256:createHash('sha256').update(JSON.stringify(replay)).digest('hex')});
 writeFileSync(`frontend/src/features/richman/game/fixtures/polish-v47-navigation-${name}-replay.json`,JSON.stringify(replay));
}
writeFileSync(dir+'/verified.json',JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify(rows));
