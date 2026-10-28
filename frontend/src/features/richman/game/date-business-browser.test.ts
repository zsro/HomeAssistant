import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {GameEngine,replayGame} from './engine';
import type {Replay} from './engine';
import {verifyDateBusiness} from '../../../../../scripts/richman/verify-date-business';
import nodes from '../../../../../shared/richman/japan-topology.fixture.json';
import manifest from './fixtures/date-business-v30-manifest.json';
const replays=import.meta.glob('./fixtures/date-business-v30-*-replay.json',{eager:true,import:'default'});
it.each(manifest)('preserves actual v30 browser route $route and independently accounts for calendar gifts, wealth and settlement',row=>{
 const replay=replays[`./fixtures/date-business-v30-${row.route}-replay.json`] as Replay,e=replayGame(nodes,replay);
 expect(replay.commands).toHaveLength(row.commands);expect(e.state.turn).toBe(row.turn);expect(e.state.calendar!.date).toBe(row.endDate);expect(e.state.calendar!.business!.priceIndex).toBe(2);
 for(const key of ['state','events'] as const)expect(createHash('sha256').update(JSON.stringify(e[key])).digest('hex')).toBe(row[key]);
 const engine=new GameEngine(nodes,replay.config),checks=new Set<string>();
 for(const command of replay.commands){const before=engine.state,r=engine.dispatch(command);expect(r.ok).toBe(true);if(r.ok)for(const c of verifyDateBusiness(before,engine.state,r.events))checks.add(c);}
 expect([...checks].some(c=>c.startsWith('Christmas'))).toBe(true);expect([...checks].some(c=>c.startsWith('New Year'))).toBe(true);expect([...checks].some(c=>c.startsWith('daily signed'))).toBe(true);expect(checks.has('all-company net enters bank before lottery and incoming loan; final balances reconciled')).toBe(true);
},20000);
