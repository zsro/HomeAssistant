import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {replayGame,type Replay} from './engine';
import nodes from '../../../../../shared/richman/japan-topology.fixture.json';
const files=import.meta.glob('./fixtures/god-lifecycle-v44-*.json',{eager:true,import:'default'}) as Record<string,Replay & {hashes:Record<string,string>}>;
for(const n of [2,3,4])it(`${n} seats preserves accepted god presentation UI replay`,()=>{
 const load=(suffix:string)=>files[`./fixtures/god-lifecycle-v44-${n}-${suffix}.json`];
 const receipt=load('manifest'),replay=load('replay') as Replay,e=replayGame(nodes,replay);
 const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
 expect(hash(replay)).toBe(receipt.hashes.replay);expect(hash(e.state)).toBe(receipt.hashes.state);expect(hash(e.events)).toBe(receipt.hashes.events);
 expect(replay.itemFingerprint).toBe('f9dbb7e9');
});
