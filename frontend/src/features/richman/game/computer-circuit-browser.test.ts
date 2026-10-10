import {expect,it} from 'vitest';import {createHash} from 'node:crypto';
import type {ControlledReplay} from './computer';
import {verifyComputerCircuit} from '../../../../../scripts/richman/verify-computer-circuit';
const replays=import.meta.glob('./fixtures/computer-circuit-v44-*-replay.json',{eager:true,import:'default'}) as Record<string,ControlledReplay>;
const goldens=import.meta.glob('./fixtures/computer-circuit-v44-*-manifest.json',{eager:true,import:'default'}) as Record<string,Awaited<ReturnType<typeof verifyComputerCircuit>>&{hashes:Record<string,string>;report:{normalSpeed:boolean;errors:string[];cleanup:unknown}}>;
for(const route of ['terminal-2','terminal-3','terminal-4','attack','debt','liquidation','auction'])it(`actual mixed-seat ${route}: actor, ledger, public receipts, prefixes and complete replay`,async()=>{
 const replay=replays[`./fixtures/computer-circuit-v44-${route}-replay.json`],golden=goldens[`./fixtures/computer-circuit-v44-${route}-manifest.json`];expect(replay).toBeDefined();expect(golden).toBeDefined();const {state,events,...summary}=await verifyComputerCircuit(replay,route.startsWith('terminal'));
 for(const k of Object.keys(summary) as (keyof typeof summary)[])expect(summary[k]).toEqual(golden[k]);const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');expect(hash(replay)).toBe(golden.hashes.replay);expect(hash(state)).toBe(golden.hashes.state);expect(hash(events)).toBe(golden.hashes.events);expect(golden.report.normalSpeed).toBe(true);expect(golden.report.errors).toEqual([]);expect(golden.report.cleanup).toEqual({raf:0,canvas:0});
},180000);
