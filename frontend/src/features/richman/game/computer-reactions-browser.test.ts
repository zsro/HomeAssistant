import {expect,it} from 'vitest';import {createHash} from 'node:crypto';
import {verifyComputerRent} from '../../../../../scripts/richman/verify-computer-rent';
import type {ControlledReplay} from './computer';
const replays=import.meta.glob('./fixtures/computer-rent-v44-*-replay.json',{eager:true,import:'default'}) as Record<string,ControlledReplay>;
const manifests=import.meta.glob('./fixtures/computer-rent-v44-*-manifest.json',{eager:true,import:'default'}) as Record<string,Awaited<ReturnType<typeof verifyComputerRent>>&{hashes:Record<string,string>;report:{normalSpeed:boolean;errors:string[];cleanup:unknown}}>;
for(const route of ['2','3a','payer'])it(`actual rent-v1 ${route}: legal acquisition, reaction/payer, ledgers and prefix/full replay`,async()=>{
 const r=replays[`./fixtures/computer-rent-v44-${route}-replay.json`],m=manifests[`./fixtures/computer-rent-v44-${route}-manifest.json`];expect(r).toBeDefined();expect(m).toBeDefined();const{state,events,...summary}=await verifyComputerRent(r);
 for(const key of Object.keys(summary) as (keyof typeof summary)[])expect(summary[key]).toEqual(m[key]);const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');expect(hash(r)).toBe(m.hashes.replay);expect(hash(state)).toBe(m.hashes.state);expect(hash(events)).toBe(m.hashes.events);expect(m.report.normalSpeed).toBe(true);expect(m.report.errors).toEqual([]);expect(m.report.cleanup).toEqual({raf:0,canvas:0});expect(summary.acquisitions.length).toBeGreaterThan(0);expect(summary.reactions.length).toBeGreaterThan(0);if(route==='payer'){expect(summary.payments.length).toBeGreaterThan(0);expect(summary.forced).toHaveLength(6);expect(summary.disposals).toHaveLength(1);}
},120000);
