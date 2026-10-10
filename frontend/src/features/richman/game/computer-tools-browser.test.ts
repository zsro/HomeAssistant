import {expect,it} from 'vitest';import {createHash} from 'node:crypto';
import {verifyComputerTools} from '../../../../../scripts/richman/verify-computer-tools';
import type {ControlledReplay} from './computer';
const replays=import.meta.glob('./fixtures/computer-tools-v44-*-replay.json',{eager:true,import:'default'}) as Record<string,ControlledReplay>;
const manifests=import.meta.glob('./fixtures/computer-tools-v44-*-manifest.json',{eager:true,import:'default'}) as Record<string,Awaited<ReturnType<typeof verifyComputerTools>>&{hashes:Record<string,string>;report:{normalSpeed:boolean;errors:string[];cleanup:unknown}}>;
for(const route of ['2','3','4','refill'])it(`actual tools-v1 ${route}: autonomous use, legal inventory, fees, prefixes/full replay`,async()=>{
 const r=replays[`./fixtures/computer-tools-v44-${route}-replay.json`],m=manifests[`./fixtures/computer-tools-v44-${route}-manifest.json`];expect(r).toBeDefined();expect(m).toBeDefined();const{state,events,...summary}=await verifyComputerTools(r);
 for(const k of Object.keys(summary) as (keyof typeof summary)[])expect(summary[k]).toEqual(m[k]);const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');expect(hash(r)).toBe(m.hashes.replay);expect(hash(state)).toBe(m.hashes.state);expect(hash(events)).toBe(m.hashes.events);expect(m.report.normalSpeed).toBe(true);expect(m.report.errors).toEqual([]);expect(m.report.cleanup).toEqual({raf:0,canvas:0});if(route==='refill'){expect(summary.bought.length).toBeGreaterThan(0);expect(summary.used['tool:08']).toBeGreaterThanOrEqual(2);}
},120000);
