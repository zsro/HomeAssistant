import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import type {Replay} from './engine';
import {verifyReactionCircuit} from '../../../../../scripts/richman/verify-reaction-circuit';
import attack from './fixtures/reaction-circuit-v44-attack-replay.json';
import am from './fixtures/reaction-circuit-v44-attack-manifest.json';
import waiver from './fixtures/reaction-circuit-v44-waiver-replay.json';
import wm from './fixtures/reaction-circuit-v44-waiver-manifest.json';
import debt from './fixtures/reaction-circuit-v44-debt-replay.json';
import dm from './fixtures/reaction-circuit-v44-debt-manifest.json';
for(const [replay,golden] of [[attack,am],[waiver,wm],[debt,dm]] as const)it(`actual v44 ${golden.players}p ${golden.kind}: reactions, payer/ledger/public receipts and serial prefixes`,async()=>{
 const {state,events,...summary}=await verifyReactionCircuit(replay as Replay,golden.kind);
 for(const key of Object.keys(summary) as (keyof typeof summary)[])expect(summary[key]).toEqual(golden[key]);
 const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
 expect(hash(replay)).toBe(golden.hashes.replay);expect(hash(state)).toBe(golden.hashes.state);expect(hash(events)).toBe(golden.hashes.events);
 expect(golden.report.reactionCommon).toBe(true);expect(golden.report.calendarCommon).toBe(true);expect(golden.report.reactionChecks.length).toBeGreaterThan(0);expect(golden.report.errors).toEqual([]);expect(golden.report.cleanup).toEqual({raf:0,canvas:0});
},180000);
