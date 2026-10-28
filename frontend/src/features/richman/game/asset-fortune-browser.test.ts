import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {GameEngine,replayGame} from './engine';
import type {Replay} from './engine';
import {verifyAssetFortune} from '../../../../../scripts/richman/verify-asset-fortune';
import nodes from '../../../../../shared/richman/japan-topology.fixture.json';
import manifest from './fixtures/asset-fortune-v21-manifest.json';
const replays=import.meta.glob('./fixtures/asset-fortune-v21-*-replay.json',{eager:true,import:'default'});
it.each(manifest)('preserves actual v21 $players-player browser route $route and independent asset arithmetic',row=>{
 const replay=replays[`./fixtures/asset-fortune-v21-${row.route}-replay.json`] as Replay,e=replayGame(nodes,replay);
 expect(replay.commands).toHaveLength(row.commands);expect(e.state.turn).toBe(row.turn);expect(e.state.phase).toBe('turnEnd');
 for(const key of ['state','events'] as const)expect(createHash('sha256').update(JSON.stringify(e[key])).digest('hex')).toBe(row[key]);
 const engine=new GameEngine(nodes,replay.config),seen:number[]=[];
 for(const command of replay.commands){const before=engine.state,r=engine.dispatch(command);expect(r.ok).toBe(true);if(r.ok){const c=verifyAssetFortune(before,engine.state,r.events);if(c.assets&&c.fortuneId!==undefined)seen.push(c.fortuneId);}}
 expect(seen).toEqual(row.fortune);
},15000);
