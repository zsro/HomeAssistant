import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {verifyStrategyCircuit} from '../../../../../scripts/richman/verify-strategy-circuit';
import type {ControlledReplay} from './computer';

const replays=import.meta.glob('./fixtures/strategy-circuit-v44-*-replay.json',{eager:true,import:'default'}) as Record<string,ControlledReplay>;
const manifests=import.meta.glob('./fixtures/strategy-circuit-v44-*-manifest.json',{eager:true,import:'default'}) as Record<string,Awaited<ReturnType<typeof verifyStrategyCircuit>>&{hashes:Record<string,string>;report:{normalSpeed:boolean;errors:string[];cleanup:unknown;lifecycle:string[];crossChecks:{computer:boolean;kind:string}[]}} >;
for(const route of ['terminal-2','terminal-3','terminal-4','restore-3','liquidation'])it(`actual research-v1 ${route}: mixed responders, receipts, observation and exact prefix/full replay`,async()=>{
 const base=`./fixtures/strategy-circuit-v44-${route}`,r=replays[base+'-replay.json'],m=manifests[base+'-manifest.json'];expect(r).toBeDefined();expect(m).toBeDefined();
 // Archive verifies every prefix once. Only skip duplicate prefix work after matching archive hashes.
 const {state,events,...summary}=await verifyStrategyCircuit(r,route.startsWith('terminal'),process.env.RICHMAN_SKIP_REPEATED_PREFIXES!=='1');
 for(const key of Object.keys(summary) as (keyof typeof summary)[])expect(summary[key]).toEqual(m[key]);
 const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');expect(hash(r)).toBe(m.hashes.replay);expect(hash(state)).toBe(m.hashes.state);expect(hash(events)).toBe(m.hashes.events);
 expect(m.report.normalSpeed).toBe(true);expect(m.report.errors).toEqual([]);expect(m.report.cleanup).toEqual({raf:0,canvas:0});expect(m.report.lifecycle).toEqual(expect.arrayContaining(['pause stops waiting','reset','replace with humans','exit cleanup']));
 if(route.startsWith('terminal')){expect(state.phase).toBe('finished');expect(state.finance!.eliminated).toHaveLength(r.config.characterIds.length-1);expect(summary.exits).toHaveLength(r.config.characterIds.length-1);}
 if(route==='liquidation'){
  expect(summary.forced).toHaveLength(1);expect(summary.publicAuctions).toBe(1600);expect(summary.negativeChecks).toBeGreaterThan(0);expect(m.report.crossChecks).toContainEqual(expect.objectContaining({computer:true,kind:'auction'}));
  const exits=events.filter(x=>x.type==='disposalCompleted');expect(exits).toHaveLength(1);if(exits[0].type!=='disposalCompleted')throw Error();const receipt=exits[0].receipt;expect(receipt.payerId).toBe('player-2');expect(receipt.amount).toBe(7927);expect(receipt.unpaid).toBe(4073);expect(receipt.auctions.reduce((n,x)=>n+x.amount,0)).toBe(1600);expect(state.finance!.eliminated).toContain(receipt.payerId);
 }
 if(route==='restore-3'){
  expect(summary.restores).toHaveLength(1);expect(summary.trades.length).toBeGreaterThan(0);expect(summary.productions.length).toBeGreaterThan(0);expect(summary.memory).toEqual({});expect(state.turn).toBe(328);expect(state.calendar!.date>'1998-04-15').toBe(true);expect(summary.prefixes).toEqual(expect.arrayContaining(['time-before','time-after','date-after-restore-done']));
 }
},900000);
