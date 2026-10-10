import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {GameEngine,replayGame} from './engine';
import type {Replay} from './engine';
import {verifyDividends} from '../../../../../scripts/richman/verify-dividends';
import nodes from '../japan-topology.fixture.json';
import manifest from './fixtures/dividends-v26-manifest.json';
const replays=import.meta.glob('./fixtures/dividends-v26-*-replay.json',{eager:true,import:'default'});
it.each(manifest)('preserves actual v26 $players-player browser route with independent company/holding/bank accounting',row=>{
 const replay=replays[`./fixtures/dividends-v26-${row.route}-replay.json`] as Replay,e=replayGame(nodes,replay);
 expect(replay.commands).toHaveLength(row.commands);expect(e.state.turn).toBe(row.turn);expect(e.state.calendar!.date).toBe(row.endDate);expect(e.state.news!.business!.dividends).toEqual(row.dividends);
 for(const key of ['state','events'] as const)expect(createHash('sha256').update(JSON.stringify(e[key])).digest('hex')).toBe(row[key]);
 const engine=new GameEngine(nodes,replay.config),checks=new Set<string>();
 for(const command of replay.commands){const before=engine.state,r=engine.dispatch(command);expect(r.ok).toBe(true);if(r.ok)for(const c of verifyDividends(before,engine.state,r.events))checks.add(c);}
 expect(checks.has('original-map company news changes period and cumulative income')).toBe(true);
 expect(checks.has('all-company net enters bank before lottery and incoming loan; final balances reconciled')).toBe(true);
 if(row.route==='4')expect(checks.has('no-holder signed period and cumulative carried')).toBe(true);
},15000);
