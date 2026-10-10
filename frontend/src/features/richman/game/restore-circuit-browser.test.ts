import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import type {Replay} from './engine';
import {verifyRestoreCircuit} from '../../../../../scripts/richman/verify-restore-circuit';
import two from './fixtures/restore-circuit-v44-2-replay.json';
import tm from './fixtures/restore-circuit-v44-2-manifest.json';
import three from './fixtures/restore-circuit-v44-3-replay.json';
import thm from './fixtures/restore-circuit-v44-3-manifest.json';
import four from './fixtures/restore-circuit-v44-4-replay.json';
import fm from './fixtures/restore-circuit-v44-4-manifest.json';
for(const [replay,golden] of [[two,tm],[three,thm],[four,fm]] as const)it(`actual v44 ${golden.players}p legal research/time restore: world, protocol, subsequent departure and serial prefixes`,async()=>{
 const {state,events,...summary}=await verifyRestoreCircuit(replay as Replay);
 for(const key of Object.keys(summary) as (keyof typeof summary)[])expect(summary[key]).toEqual(golden[key]);
 const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
 expect(hash(replay)).toBe(golden.hashes.replay);expect(hash(state)).toBe(golden.hashes.state);expect(hash(events)).toBe(golden.hashes.events);
 expect(golden.report.normalSpeed).toBe(true);expect(golden.report.calendarCommon).toBe(true);expect(golden.report.circuitCommon).toBe(true);expect(golden.report.completed.some(x=>x.id==='tool:10')).toBe(true);expect(golden.report.errors).toEqual([]);expect(golden.report.cleanup).toEqual({raf:0,canvas:0});
 if(golden.players>2)for(const field of ['balances','holdings','research','date'])expect(golden.restores[0].changed).toContain(field);
},180000);
