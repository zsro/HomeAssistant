import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {GameEngine,replayGame} from './engine';
import type {Replay} from './engine';
import {verifyInsurance} from '../../../../../scripts/richman/verify-insurance';
import nodes from '../../../../../shared/richman/japan-topology.fixture.json';
import manifest from './fixtures/insurance-v29-manifest.json';
const replays=import.meta.glob('./fixtures/insurance-v29-*-replay.json',{eager:true,import:'default'});
it.each(manifest)('preserves actual v29 browser route $route with independent policy/claim/premium/dividend accounting',row=>{
 const replay=replays[`./fixtures/insurance-v29-${row.route}-replay.json`] as Replay,e=replayGame(nodes,replay);
 expect(replay.commands).toHaveLength(row.commands);expect(e.state.turn).toBe(row.turn);expect(e.state.calendar!.date).toBe(row.endDate);
 for(const key of ['state','events'] as const)expect(createHash('sha256').update(JSON.stringify(e[key])).digest('hex')).toBe(row[key]);
 const engine=new GameEngine(nodes,replay.config),checks=new Set<string>();
 for(const command of replay.commands){const before=engine.state,r=engine.dispatch(command);expect(r.ok).toBe(true);if(r.ok)for(const c of verifyInsurance(before,engine.state,r.events))checks.add(c);}
 expect([...checks].some(c=>c.startsWith('policy:'))).toBe(true);
 if(row.route!=='ui'){expect([...checks].some(c=>c.startsWith('claim:'))).toBe(true);expect([...checks].some(c=>c.startsWith('premium:'))).toBe(true);expect(checks.has('all-company net enters bank before lottery and incoming loan; final balances reconciled')).toBe(true);}
},20000);
