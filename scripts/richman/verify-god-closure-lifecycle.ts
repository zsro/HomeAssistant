/** Small actual UI lifecycle replay; includes the computer's real roll command. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {GameEngine,replayGame,type Replay} from '../../frontend/src/features/richman/game/engine';
import nodes from '../../frontend/src/features/richman/japan-topology.fixture.json';
const path='/private/tmp/richman-god-closure-lifecycle',replay=JSON.parse(readFileSync(path+'/replay.json','utf8')),report=JSON.parse(readFileSync(path+'/results.json','utf8'));
assert.deepEqual(replay.config.humanIds,['player-1','player-3']);assert.equal(replay.control.policy,'research-v1');assert.deepEqual(replay.control.computerIds,['tuu']);
assert.deepEqual(replay.commands.map((c:Replay['commands'][number])=>[c.playerId,c.action.type]),[['player-1','surrender'],['player-1','chooseDeath'],['player-1','endTurn'],['player-2','pause'],['player-2','pause'],['player-2','roll'],['player-2','pause']]);
assert.deepEqual(report.cleanup,{raf:0,canvas:0});assert.deepEqual(report.errors,[]);
const e=new GameEngine(nodes,replay.config);for(const c of replay.commands)assert.ok(e.dispatch(c).ok);
assert.ok(e.state.finance!.eliminated.includes('player-1'));assert.equal(e.state.paused,true);assert.ok(e.state.g6!.gods.some(g=>g.type===15&&g.carrier==='player-2'&&g.slot===15&&g.remaining===12));
const prefixes=[];for(let i=1;i<=replay.commands.length;i++){const copy=replayGame(nodes,{...replay,commands:replay.commands.slice(0,i)});for(const c of replay.commands.slice(i))assert.ok(copy.dispatch(c).ok);assert.deepEqual(copy.state,e.state);assert.deepEqual(copy.events,e.events);prefixes.push(i);}
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex'),receipt={...report,prefixes,fullReplay:true,prefixReplay:true,hashes:{replay:hash(replay),state:hash(e.state),events:hash(e.events)}};
const out='frontend/src/features/richman/game/fixtures/god-closure-v47-lifecycle';writeFileSync(out+'-replay.json',JSON.stringify(replay));writeFileSync(out+'-manifest.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
