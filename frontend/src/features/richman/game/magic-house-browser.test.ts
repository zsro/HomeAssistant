import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import type {Replay} from './engine';
import replay from './fixtures/magic-v36-replay.json';
import golden from './fixtures/magic-v36-manifest.json';
import {verifyMagic} from '../../../../../scripts/richman/verify-magic';
it('actual Japan normal-speed six-effect browser replay preserves exact state/events and independent before/after accounting',()=>{
 const result=verifyMagic(replay as Replay);expect(result.commands).toBe(golden.commands);expect(result.effects).toEqual(golden.effects);expect(result.nodes).toEqual(golden.nodes);
 for(const key of ['state','events'] as const)expect(createHash('sha256').update(JSON.stringify(result[key])).digest('hex')).toBe(golden.hashes[key]);
 expect(createHash('sha256').update(JSON.stringify(replay)).digest('hex')).toBe(golden.hashes.replay);
 expect(result.state.items!.fingerprint).toBe('62bff609');
},20000);
