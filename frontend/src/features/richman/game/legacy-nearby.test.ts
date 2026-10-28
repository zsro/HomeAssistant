import { expect, it } from 'vitest';
import nodes from '../../../../../shared/richman/japan-topology.fixture.json';
import { replayGame } from './engine';
import type { Replay } from './engine';
import { NEARBY_FINGERPRINT } from './nearby-construction';
import legacy from './fixtures/tools-v3-replay.json';

it('preserves the pre-fourth-batch real v3 replay and fingerprint', () => {
  expect(NEARBY_FINGERPRINT).toBe('18003b93');
  expect(legacy.itemFingerprint).toBe(NEARBY_FINGERPRINT);
  const e = replayGame(nodes, legacy as Replay);
  expect(e.state.rulesId).toBe('japan-tools-candidate-v3');
  expect(e.events.filter(e => e.type === 'propertyBuilt')).toMatchObject([{ propertyId: 'japan:land:16', fromLevel: 0, level: 1, ownerId: null }]);
  expect(e.events.filter(e => e.type === 'effectConsumed').map(e => e.type === 'effectConsumed' && e.itemId)).toEqual(['tool:09', 'tool:08']);
  expect(e.state.effects!.inventory['player-1']).toEqual({ 'tool:09': 0, 'tool:08': 0 });
});
