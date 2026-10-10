import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {GameEngine,replayGame} from './engine';
import type {Replay} from './engine';
import {verifyCommerce} from '../../../../../scripts/richman/verify-commerce';
import nodes from '../japan-topology.fixture.json';
import manifest from './fixtures/commerce-v28-manifest.json';
const replays=import.meta.glob('./fixtures/commerce-v28-*-replay.json',{eager:true,import:'default'});
it.each(manifest)('preserves actual v28 browser route $route with independent construction/subscription/payment accounting',row=>{
 const replay=replays[`./fixtures/commerce-v28-${row.route}-replay.json`] as Replay,e=replayGame(nodes,replay);
 expect(replay.commands).toHaveLength(row.commands);expect(e.state.turn).toBe(row.turn);expect(e.state.calendar!.date).toBe(row.endDate);expect(e.state.news!.business!.dividends).toEqual(row.dividends);
 for(const key of ['state','events'] as const)expect(createHash('sha256').update(JSON.stringify(e[key])).digest('hex')).toBe(row[key]);
 const engine=new GameEngine(nodes,replay.config),checks=new Set<string>();
 for(const command of replay.commands){const before=engine.state,r=engine.dispatch(command);expect(r.ok).toBe(true);if(r.ok)for(const c of verifyCommerce(before,engine.state,r.events))checks.add(c);}
 for(const check of ['owner builds twice with caps for free','visitor builds once before payment','onsite cash subscription independent pool, unchanged market and company income','onsite subscription changes company operator by holdings'])expect(checks.has(check)).toBe(true);
 if(row.route!=='ui')for(const check of ['visitor cancellation charges1000 before modifiers','Nissan actual fee cash-bank enters period and cumulative only','all-company net enters bank before lottery and incoming loan; final balances reconciled'])expect(checks.has(check)).toBe(true);
},20000);
