import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {verifyComputerDefense} from '../../../../../scripts/richman/verify-computer-defense';
import type {ControlledReplay} from './computer';
const replays=import.meta.glob('./fixtures/computer-defense-v44-*-replay.json',{eager:true,import:'default'}) as Record<string,ControlledReplay>;
const manifests=import.meta.glob('./fixtures/computer-defense-v44-*-manifest.json',{eager:true,import:'default'}) as Record<string,Awaited<ReturnType<typeof verifyComputerDefense>>&{hashes:Record<string,string>;report:{normalSpeed:boolean;errors:string[];cleanup:unknown}} >;
for(const route of ['2','3','4'])it(`actual defense-v1 ${route}: legal acquisition, non-current redirect and prefix/full replay`,async()=>{
 const r=replays[`./fixtures/computer-defense-v44-${route}-replay.json`],m=manifests[`./fixtures/computer-defense-v44-${route}-manifest.json`];expect(r).toBeDefined();expect(m).toBeDefined();
 const{state,events,...summary}=await verifyComputerDefense(r);
 for(const key of Object.keys(summary) as (keyof typeof summary)[])expect(summary[key]).toEqual(m[key]);
 const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');expect(hash(r)).toBe(m.hashes.replay);expect(hash(state)).toBe(m.hashes.state);expect(hash(events)).toBe(m.hashes.events);
 expect(m.report.normalSpeed).toBe(true);expect(m.report.errors).toEqual([]);expect(m.report.cleanup).toEqual({raf:0,canvas:0});
 expect(summary.acquisitions).toEqual(expect.arrayContaining([expect.objectContaining({ai:true,item:'card:19'})]));expect(summary.reactions).toEqual(expect.arrayContaining([expect.objectContaining({ai:true,choice:'use',turns:4,item:route==='3'?'card:16':'card:17'})]));expect(summary.prefixes).toEqual(expect.arrayContaining(['defense-paused','defense-resumed','reaction-before','reaction-after']));
},120000);
