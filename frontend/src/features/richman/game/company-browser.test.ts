import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {GameEngine,replayGame} from './engine';
import type {Replay} from './engine';
import {verifyCompany} from '../../../../../scripts/richman/verify-company';
import nodes from '../../../../../shared/richman/japan-topology.fixture.json';
import manifest from './fixtures/company-v27-manifest.json';
const replays=import.meta.glob('./fixtures/company-v27-*-replay.json',{eager:true,import:'default'});
it.each(manifest)('preserves actual v27 $players-player browser route with independent services/holdings/dividend accounting',row=>{
 const replay=replays[`./fixtures/company-v27-${row.route}-replay.json`] as Replay,e=replayGame(nodes,replay);
 expect(replay.commands).toHaveLength(row.commands);expect(e.state.turn).toBe(row.turn);expect(e.state.calendar!.date).toBe(row.endDate);expect(e.state.news!.business!.dividends).toEqual(row.dividends);
 for(const key of ['state','events'] as const)expect(createHash('sha256').update(JSON.stringify(e[key])).digest('hex')).toBe(row[key]);
 const engine=new GameEngine(nodes,replay.config),checks=new Set<string>();
 for(const command of replay.commands){const before=engine.state,r=engine.dispatch(command);expect(r.ok).toBe(true);if(r.ok)for(const c of verifyCompany(before,engine.state,r.events))checks.add(c);}
 for(const check of ['legal market purchase/sale changes real holdings and bank','Toyota actual vehicle/dice fee cash-bank into company','SEGA actual elapsed-days fee cash-bank into company','all-company net enters bank before lottery and incoming loan; final balances reconciled','distributed signed period clears; cumulative retained'])expect(checks.has(check)).toBe(true);
 expect(e.events.some(ev=>ev.type==='itemBought'&&ev.itemId==='tool:05')).toBe(true);
 expect(e.events.some(ev=>ev.type==='effectConsumed'&&ev.itemId==='tool:05')).toBe(true);
 for(const id of ['japan:company:2','japan:company:5']){const c=row.dividends!.companies.find(c=>c.companyId===id)!;expect(c.funds).toBeGreaterThan(0);expect(c.shares).toBeGreaterThan(0);expect(c.after).toBe(0);}
},20000);
