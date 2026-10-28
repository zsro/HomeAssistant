import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {GameEngine,replayGame} from './engine';
import type {Replay} from './engine';
import {verifyFortune} from '../../../../../scripts/richman/verify-fortune';
import nodes from '../../../../../shared/richman/japan-topology.fixture.json';
import manifest from './fixtures/fortune-v20-manifest.json';
const replays=import.meta.glob('./fixtures/fortune-v20-*-replay.json',{eager:true,import:'default'});
it.each(manifest)('preserves actual v20 $players-player browser route $route and independent fortune arithmetic',row=>{
 const replay=replays[`./fixtures/fortune-v20-${row.route}-replay.json`] as Replay,e=replayGame(nodes,replay);
 expect(replay.commands).toHaveLength(row.commands);expect(e.state.turn).toBe(row.turn);expect(e.state.phase).toBe('turnEnd');
 for(const key of ['state','events'] as const)expect(createHash('sha256').update(JSON.stringify(e[key])).digest('hex')).toBe(row[key]);
 const engine=new GameEngine(nodes,replay.config),seen:number[]=[];
 for(const command of replay.commands){const before=engine.state,r=engine.dispatch(command);expect(r.ok).toBe(true);if(r.ok){const c=verifyFortune(before,engine.state,r.events);if(c)seen.push(c.fortuneId);}}
 expect(seen).toEqual(row.fortune);
},15000);
