import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {GameEngine,replayGame} from './engine';
import type {Replay} from './engine';
import {verifyDisposal} from '../../../../../scripts/richman/verify-disposal';
import nodes from '../japan-topology.fixture.json';
import replay from './fixtures/disposal-v33-3-replay.json';
import manifest from './fixtures/disposal-v33-manifest.json';
it('actual original-map v33 long journey preserves hashes and independent deferred disposal accounting',()=>{const e=replayGame(nodes,replay as Replay),row=manifest[0];expect(replay.commands).toHaveLength(row.commands);expect(e.state.turn).toBe(row.turn);for(const key of ['state','events'] as const)expect(createHash('sha256').update(JSON.stringify(e[key])).digest('hex')).toBe(row[key]);const engine=new GameEngine(nodes,(replay as Replay).config),checks=new Set<string>();for(const command of (replay as Replay).commands){const before=engine.state,r=engine.dispatch(command);expect(r.ok).toBe(true);if(r.ok)for(const c of verifyDisposal(before,engine.state,r.events))checks.add(c);}expect([...checks]).toEqual(row.checks);expect(e.state.finance!.disposal!.last).toEqual(row.receipt);},20000);
