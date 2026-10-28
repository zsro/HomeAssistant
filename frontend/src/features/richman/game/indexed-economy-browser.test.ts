import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {GameEngine,replayGame} from './engine';
import type {Replay} from './engine';
import {verifyIndexedEconomy} from '../../../../../scripts/richman/verify-indexed-economy';
import nodes from '../../../../../shared/richman/japan-topology.fixture.json';
import manifest from './fixtures/indexed-economy-v31-manifest.json';
const replays=import.meta.glob('./fixtures/indexed-economy-v31-*-replay.json',{eager:true,import:'default'});
it.each(manifest)('actual v31 browser route $route preserves exact replay and independently reconciles index2 purchases/construction/rent/fortune',row=>{
 const replay=replays[`./fixtures/indexed-economy-v31-${row.route}-replay.json`] as Replay,e=replayGame(nodes,replay);
 expect(replay.commands).toHaveLength(row.commands);expect(e.state.turn).toBe(row.turn);expect(e.state.calendar!.date).toBe(row.endDate);
 for(const key of ['state','events'] as const)expect(createHash('sha256').update(JSON.stringify(e[key])).digest('hex')).toBe(row[key]);
 const engine=new GameEngine(nodes,replay.config),checks=new Set<string>();
 for(const command of replay.commands){const before=engine.state,r=engine.dispatch(command);expect(r.ok).toBe(true);if(r.ok)for(const c of verifyIndexedEconomy(before,engine.state,r.events))checks.add(c);}
 for(const operation of ['buy','upgrade','rent'])expect(checks.has(`property ${operation}: quote, debit, recipient and raw fields at index 2`)).toBe(true);
 expect(checks.has('rent aggregate and god order at index 2')).toBe(true);
 expect(checks.has('fortune 21: indexed fixed cash at index 2')).toBe(true);
},20000);
