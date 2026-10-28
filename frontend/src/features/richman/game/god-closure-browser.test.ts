/** Golden real-browser exports: command replay, not a new browser invocation. */
import {it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {replayGame,type Replay} from './engine';
import {SURRENDER_FINGERPRINT} from './surrender';
import nodes from '../../../../../shared/richman/japan-topology.fixture.json';
const files=import.meta.glob('./fixtures/god-closure-v47-*.json',{eager:true,import:'default'}) as Record<string,Replay & {hashes:Record<string,string>}>;
it.each(['car','research','lifecycle'])('preserves %s equipped surrender / expiry original-map UI export',route=>{const replay=files[`./fixtures/god-closure-v47-${route}-replay.json`],receipt=files[`./fixtures/god-closure-v47-${route}-manifest.json`],e=replayGame(nodes,replay),hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');expect(hash(replay)).toBe(receipt.hashes.replay);expect(hash(e.state)).toBe(receipt.hashes.state);expect(hash(e.events)).toBe(receipt.hashes.events);expect(replay.itemFingerprint).toBe(SURRENDER_FINGERPRINT);expect(e.state.finance!.eliminated).toContain('player-1');expect(e.state.g6!.gods.some(g=>g.type===15)).toBe(route==='lifecycle');},30000);
