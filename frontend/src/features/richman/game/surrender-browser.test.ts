/** Golden checks for actual UI exports, not synthetic engine fixtures. */
import {it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {replayGame,type Replay} from './engine';
import {SURRENDER_FINGERPRINT} from './surrender';
import nodes from '../../../../../shared/richman/japan-topology.fixture.json';
const files=import.meta.glob('./fixtures/surrender-v47-*.json',{eager:true,import:'default'}) as Record<string,Replay & {hashes:Record<string,string>}>;
it.each([2,3,4])('%i-person actual surrender UI replay remains exact',n=>{const replay=files[`./fixtures/surrender-v47-${n}-replay.json`],receipt=files[`./fixtures/surrender-v47-${n}-manifest.json`],e=replayGame(nodes,replay),hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');expect(hash(replay)).toBe(receipt.hashes.replay);expect(hash(e.state)).toBe(receipt.hashes.state);expect(hash(e.events)).toBe(receipt.hashes.events);expect(replay.itemFingerprint).toBe(SURRENDER_FINGERPRINT);},30000);
