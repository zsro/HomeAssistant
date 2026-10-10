import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import type {ControlledReplay} from './computer';
import {verifyComputer} from '../../../../../scripts/richman/verify-computer';
const replays=import.meta.glob('./fixtures/computer-v44-*-replay.json',{eager:true,import:'default'}) as Record<string,ControlledReplay>;
const manifests=import.meta.glob('./fixtures/computer-v44-*-manifest.json',{eager:true,import:'default'}) as Record<string,Awaited<ReturnType<typeof verifyComputer>>&{report:{normalSpeed:boolean;errors:string[];cleanup:unknown};hashes:Record<string,string>}>;
for(const n of [2,3,4])it(`actual ${n}p mixed-seat UI: computer actor/actions, prefix continuation and frozen full replay`,async()=>{
 const replay=replays[`./fixtures/computer-v44-${n}-replay.json`],golden=manifests[`./fixtures/computer-v44-${n}-manifest.json`];expect(replay).toBeDefined();expect(golden).toBeDefined();const {state,events,...summary}=await verifyComputer(replay);
 for(const key of Object.keys(summary) as (keyof typeof summary)[])expect(summary[key]).toEqual(golden[key]);
 const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');expect(hash(replay)).toBe(golden.hashes.replay);expect(hash(state)).toBe(golden.hashes.state);expect(hash(events)).toBe(golden.hashes.events);expect(golden.report.normalSpeed).toBe(true);expect(golden.report.errors).toEqual([]);expect(golden.report.cleanup).toEqual({raf:0,canvas:0});
},60000);
