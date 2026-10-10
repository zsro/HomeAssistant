import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import type {Replay} from './engine';
import manifest from './fixtures/batches-v35-manifest.json';
import {verifyBatchReplay} from '../../../../../scripts/richman/verify-batches';
const replays=import.meta.glob('./fixtures/batches-v35-*-replay.json',{eager:true,import:'default'});
it.each(manifest)('actual original-Japan $route browser commands preserve exact state/events and independent batch accounting',row=>{
 const replay=replays[`./fixtures/batches-v35-${row.route}-replay.json`] as Replay;
 const {engine,checks}=verifyBatchReplay(replay);
 expect(replay.commands).toHaveLength(row.commands);
 for(const key of ['state','events'] as const)expect(createHash('sha256').update(JSON.stringify(engine[key])).digest('hex')).toBe(row[key]);
 expect(checks).toEqual(row.checks);expect(JSON.parse(JSON.stringify(engine.state.finance!.batches!.last))).toEqual(row.batch);
 expect(engine.state.finance!.batches!.current).toBeNull();expect(engine.state.finance!.batches!.day).toBeNull();expect(engine.state.items!.fingerprint).toBe('a37c797f');
},20000);
