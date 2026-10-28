import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {replayGame,type Replay} from './engine';
import nodes from '../../../../../shared/richman/japan-topology.fixture.json';
const files=import.meta.glob('./fixtures/god-circuit-v46-*.json',{eager:true,import:'default'}) as Record<string,Replay & {hashes:Record<string,string>}>;
for(const route of ['pair','full-known','restore'])it(`preserves original-map ${route} UI circuit`,()=>{
 const receipt=files[`./fixtures/god-circuit-v46-${route}-manifest.json`],replay=files[`./fixtures/god-circuit-v46-${route}-replay.json`] as Replay,e=replayGame(nodes,replay);
 const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
 expect(hash(replay)).toBe(receipt.hashes.replay);expect(hash(e.state)).toBe(receipt.hashes.state);expect(hash(e.events)).toBe(receipt.hashes.events);
 expect(replay.itemFingerprint).toBe('249e82f7');
},60000);
