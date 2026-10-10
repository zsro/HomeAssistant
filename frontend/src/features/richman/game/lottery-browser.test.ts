import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {GameEngine,replayGame} from './engine';
import type {Replay} from './engine';
import {verifyLottery} from '../../../../../scripts/richman/verify-lottery';
import nodes from '../japan-topology.fixture.json';
import manifest from './fixtures/lottery-v25-manifest.json';
const replays=import.meta.glob('./fixtures/lottery-v25-*-replay.json',{eager:true,import:'default'});
it.each(manifest)('preserves actual v25 $players-player browser route, draw and independent cash/shared-fund accounting',row=>{
 const replay=replays[`./fixtures/lottery-v25-${row.route}-replay.json`] as Replay,e=replayGame(nodes,replay);
 expect(replay.commands).toHaveLength(row.commands);expect(e.state.turn).toBe(row.turn);expect(e.state.calendar!.date).toBe(row.endDate);expect(e.state.lottery!.lastDraw).toEqual(row.draw);
 for(const key of ['state','events'] as const)expect(createHash('sha256').update(JSON.stringify(e[key])).digest('hex')).toBe(row[key]);
 const engine=new GameEngine(nodes,replay.config),checks=new Set<string>();
 for(const command of replay.commands){const before=engine.state,r=engine.dispatch(command);expect(r.ok).toBe(true);if(r.ok)for(const c of verifyLottery(before,engine.state,r.events))checks.add(c);}
 expect(checks.has('one unique number; fixed cash1000 into shared fund; no RNG/bank')).toBe(true);
 expect(checks.has(row.route==='3'?'unsold result carries tickets and entire fund':'winner gets complete shared fund in cash, all tickets cleared')).toBe(true);
},15000);
