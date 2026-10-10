import {expect,it} from 'vitest';import {createHash} from 'node:crypto';
import {verifyComputerEstate} from '../../../../../scripts/richman/verify-computer-estate';import type {ControlledReplay} from './computer';
const replays=import.meta.glob('./fixtures/computer-estate-v44-*-replay.json',{eager:true,import:'default'}) as Record<string,ControlledReplay>;
const manifests=import.meta.glob('./fixtures/computer-estate-v44-*-manifest.json',{eager:true,import:'default'}) as Record<string,Awaited<ReturnType<typeof verifyComputerEstate>>&{hashes:Record<string,string>;report:{normalSpeed:boolean;errors:string[];cleanup:unknown}} >;
for(const route of ['2','3','4'])it(`actual estate-v1 ${route}: legal inventory, property/cash receipts, cancellation and prefix/full replay`,async()=>{
 const r=replays[`./fixtures/computer-estate-v44-${route}-replay.json`],m=manifests[`./fixtures/computer-estate-v44-${route}-manifest.json`];expect(r).toBeDefined();expect(m).toBeDefined();const{state,events,...summary}=await verifyComputerEstate(r);
 for(const key of Object.keys(summary) as (keyof typeof summary)[])expect(summary[key]).toEqual(m[key]);const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');expect(hash(r)).toBe(m.hashes.replay);expect(hash(state)).toBe(m.hashes.state);expect(hash(events)).toBe(m.hashes.events);expect(m.report.normalSpeed).toBe(true);expect(m.report.errors).toEqual([]);expect(m.report.cleanup).toEqual({raf:0,canvas:0});
 for(const item of route==='2'?['card:03','card:04']:route==='3'?['card:05']:['card:12']){expect(summary.uses).toEqual(expect.arrayContaining([expect.objectContaining({ai:true,item})]));expect(summary.prefixes).toEqual(expect.arrayContaining([item+'-paused',item+'-resumed',item+'-confirm-before',item+'-confirm-after']));}
 if(route==='4')expect(summary.cancellations).toEqual(expect.arrayContaining([expect.objectContaining({ai:false})]));
},120000);
