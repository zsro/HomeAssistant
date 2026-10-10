import {GameEngine} from './engine';
import type {Replay} from './engine';
import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {verifyStockCircuit} from '../../../../../scripts/richman/verify-stock-circuit';
import r2 from './fixtures/stock-circuit-v44-commerce-replay.json';
import m2 from './fixtures/stock-circuit-v44-commerce-manifest.json';
import r3 from './fixtures/stock-circuit-v44-fortune-replay.json';
import m3 from './fixtures/stock-circuit-v44-fortune-manifest.json';
import r4 from './fixtures/stock-circuit-v44-time-replay.json';
import m4 from './fixtures/stock-circuit-v44-time-manifest.json';
void GameEngine;
for(const [replay,golden]of[[r2,m2],[r3,m3],[r4,m4]]as const)it(`actual v44 ${golden.players}p ${golden.kind}: cash/bank/public ledger, company trends, dates, G7 and resumable prefixes`,()=>{
 const r=verifyStockCircuit(replay as Replay,golden.kind);
 for(const key of ['kind','players','commands','turn','trades','subscriptions','subscriptionPaid','forcedBank','forcedPublic','fortune','news','dates','quoteDays','companyTrends','research','restored','prefixes'] as const)expect(r[key]).toEqual(golden[key]);
 for(const key of ['state','events']as const)expect(createHash('sha256').update(JSON.stringify(r[key])).digest('hex')).toBe(golden.hashes[key]);
 expect(createHash('sha256').update(JSON.stringify(replay)).digest('hex')).toBe(golden.hashes.replay);expect(golden.report.circuitCommon).toBe(true);expect(golden.report.errors).toEqual([]);expect(golden.report.cleanup).toEqual({raf:0,canvas:0});
},90000);
