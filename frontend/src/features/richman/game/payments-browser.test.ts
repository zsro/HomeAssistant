import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {GameEngine,replayGame} from './engine';
import type {Replay} from './engine';
import manifest from './fixtures/payments-v34-manifest.json';
import nodes from '../../../../../shared/richman/japan-topology.fixture.json';
import {verifyPayments} from '../../../../../scripts/richman/verify-payments';
const replays=import.meta.glob('./fixtures/payments-v34-*-replay.json',{eager:true,import:'default'});
for(const route of manifest)it(`actual original-map v34 ${route.route} browser route preserves hashes and independent callback accounting`,()=>{
 const replay=replays[`./fixtures/payments-v34-${route.route}-replay.json`] as Replay,e=replayGame(nodes,replay),engine=new GameEngine(nodes,replay.config),checks=new Set<string>();
 for(const key of ['state','events'] as const)expect(createHash('sha256').update(JSON.stringify(e[key])).digest('hex')).toBe(route[key]);
 for(const command of replay.commands){const before=engine.state,result=engine.dispatch(command);expect(result.ok).toBe(true);if(result.ok)for(const check of verifyPayments(before,engine.state,result.events))checks.add(check);}
 expect([...checks]).toEqual(route.checks);expect(e.state.finance!.payments!.last).toEqual(route.payment);expect(e.state.finance!.disposal!.last).toEqual(route.disposal);
},30000);
