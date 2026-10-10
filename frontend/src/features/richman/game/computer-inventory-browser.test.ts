import {expect,it} from 'vitest';import {createHash} from 'node:crypto';
import {verifyComputerInventory} from '../../../../../scripts/richman/verify-computer-inventory';import type {ControlledReplay} from './computer';
const replays=import.meta.glob('./fixtures/computer-inventory-v44-*-replay.json',{eager:true,import:'default'}) as Record<string,ControlledReplay>;
const manifests=import.meta.glob('./fixtures/computer-inventory-v44-*-manifest.json',{eager:true,import:'default'}) as Record<string,Awaited<ReturnType<typeof verifyComputerInventory>>&{hashes:Record<string,string>;report:{normalSpeed:boolean;errors:string[];cleanup:unknown}} >;
for(const route of ['2','3','4','manual'])it(`actual inventory-v1 ${route}: legal acquisition, transfer/relationship, lifecycle and prefix/full replay`,async()=>{
 const r=replays[`./fixtures/computer-inventory-v44-${route}-replay.json`],m=manifests[`./fixtures/computer-inventory-v44-${route}-manifest.json`];expect(r).toBeDefined();expect(m).toBeDefined();const{state,events,...summary}=await verifyComputerInventory(r);
 for(const key of Object.keys(summary) as (keyof typeof summary)[])expect(summary[key]).toEqual(m[key]);const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');expect(hash(r)).toBe(m.hashes.replay);expect(hash(state)).toBe(m.hashes.state);expect(hash(events)).toBe(m.hashes.events);expect(m.report.normalSpeed).toBe(true);expect(m.report.errors).toEqual([]);expect(m.report.cleanup).toEqual({raf:0,canvas:0});
 if(route!=='manual')for(const item of ['card:13','card:29']){expect(summary.uses).toEqual(expect.arrayContaining([expect.objectContaining({ai:true,item})]));expect(summary.prefixes).toEqual(expect.arrayContaining([item+'-paused',item+'-resumed',item+'-confirm-before',item+'-confirm-after']));}
 else{expect(summary.cancellations).toEqual(expect.arrayContaining([expect.objectContaining({ai:false,item:'card:29'})]));expect(summary.uses).toEqual(expect.arrayContaining([expect.objectContaining({ai:false,item:'card:29'})]));}
 if(route==='2')expect(summary.prefixes).toEqual(expect.arrayContaining(['alliance-raw128-after','alliance-ended-after']));
 if(route==='4')expect(summary.clocks).toEqual(expect.arrayContaining([expect.objectContaining({type:'allianceChanged',remaining:0,reason:'敌对行为解除同盟'})]));
},240000);
