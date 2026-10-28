import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {GameEngine,replayGame} from './engine';
import type {Replay} from './engine';
import {verifyCalendar} from '../../../../../scripts/richman/verify-calendar';
import manifest from './fixtures/calendar-v24-manifest.json';
import nodes from '../../../../../shared/richman/japan-topology.fixture.json';
const replays=import.meta.glob('./fixtures/calendar-v24-*-replay.json',{eager:true,import:'default'});
it.each(manifest)('preserves actual v24 $players-player $route browser world and independently checks calendar/bank transitions',row=>{
 const replay=replays[`./fixtures/calendar-v24-${row.route}-replay.json`] as Replay,e=replayGame(nodes,replay);
 expect(replay.commands).toHaveLength(row.commands);expect(e.state.turn).toBe(row.turn);expect(e.state.calendar!.date).toBe(row.endDate);expect(e.state.calendar!.elapsedDays).toBe(row.elapsedDays);
 for(const key of ['state','events'] as const)expect(createHash('sha256').update(JSON.stringify(e[key])).digest('hex')).toBe(row[key]);
 const engine=new GameEngine(nodes,replay.config),checks=new Set<string>();
 for(const command of replay.commands){const before=engine.state,r=engine.dispatch(command);expect(r.ok).toBe(true);if(r.ok)for(const c of verifyCalendar(before,engine.state,r.events))checks.add(c);}
 expect(checks.has('monthly interest all solvent seats, debt gate and integer truncation')).toBe(true);expect(checks.has('actual trade occurs on open day')).toBe(true);
 if(row.route==='loan'){expect(checks.has('maturity bank-first then cash; clear principal and due')).toBe(true);const days=e.events.filter(e=>e.type==='loanNotice').map(e=>e.notice.days);expect(days).toEqual([3,2,1,0]);}
},20000);
