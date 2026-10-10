import {GameEngine} from './engine';
import type {Replay} from './engine';
import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {verifyFinanceStress} from '../../../../../scripts/richman/verify-finance-stress';
import rent from './fixtures/finance-stress-v44-rent-replay.json';
import rm from './fixtures/finance-stress-v44-rent-manifest.json';
import dividend from './fixtures/finance-stress-v44-dividend-replay.json';
import dm from './fixtures/finance-stress-v44-dividend-manifest.json';
import loan from './fixtures/finance-stress-v44-loan-replay.json';
import lm from './fixtures/finance-stress-v44-loan-manifest.json';
void GameEngine;
for(const[replay,golden]of [[rent,rm],[dividend,dm],[loan,lm]]as const)it(`actual v44 ${golden.players}p ${golden.kind}: actual receipts, independent stock/cash/public accounting and serialized prefixes`,async()=>{
 const{state,events,...summary}=await verifyFinanceStress(replay as Replay,golden.kind);
 for(const key of Object.keys(summary) as (keyof typeof summary)[])expect(summary[key]).toEqual(golden[key]);
 const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');expect(hash(state)).toBe(golden.hashes.state);expect(hash(events)).toBe(golden.hashes.events);expect(hash(replay)).toBe(golden.hashes.replay);expect(golden.report.calendarCommon).toBe(true);expect(golden.report.errors).toEqual([]);expect(golden.report.cleanup).toEqual({raf:0,canvas:0});
},120000);
