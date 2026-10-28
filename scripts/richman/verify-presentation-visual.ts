import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {replayGame} from '../../frontend/src/features/richman/game/engine';
import nodes from '../../shared/richman/japan-topology.fixture.json';
const dir='/private/tmp/richman-presentation-visual',replay=JSON.parse(readFileSync(dir+'/replay.json','utf8')),report=JSON.parse(readFileSync(dir+'/results.json','utf8'));
const e=replayGame(nodes,replay);assert.equal(replay.rulesId,'japan-events-candidate-v47');assert.ok(e.state.g6!.gods.some(g=>g.type===15&&g.carrier==='player-2'));assert.equal(e.state.phase,'moving');assert.equal(e.state.paused,true);
for(const k of [2,3,6]){const p=replayGame(nodes,{...replay,commands:replay.commands.slice(0,k)});for(const c of replay.commands.slice(k))assert.ok(p.dispatch(c).ok);assert.deepEqual(p.state,e.state);assert.deepEqual(p.events,e.events);}
const prefix='frontend/src/features/richman/game/fixtures/presentation-v47-visual';writeFileSync(prefix+'-replay.json',JSON.stringify(replay));writeFileSync(prefix+'-manifest.json',JSON.stringify({...report,prefixes:[2,3,6],fullReplay:true,prefixReplay:true},null,2));console.log('visual9 commands;3 prefixes; actual moving pause verified');
