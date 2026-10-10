import { createEffectRegistry } from './effects';
import { ITEM_EFFECTS, ITEM_FINGERPRINT, REMOTE_EFFECT } from './items';
import { hashSeed } from './random';
import type { PropertyDefinition, PropertyState } from './economy';

export const WORKER = 'tool:09';
export const WORKER_EFFECT = 'tool:09:build-current-land-v1';
// Deliberate supported subset, not the original viewport hit-test selector.
export const CONSTRUCTION_RULES = Object.freeze({ id: 'japan-tools-candidate-v2', handlerVersion: 1,
  worker: { initialPerPlayer: 1, capacity: 9, soldInShop: false, sharedPool: false,
    target: 'current-node-ordinary-land', ownership: 'any', maximumLevel: 5, cost: 0,
    invalidOrMaxLevel: 'reject-without-consuming', afterUse: 'before-roll' },
  evidence: 'R07-09-cross-version-candidate-and-explicit-web-subset' });
export const CONSTRUCTION_EFFECTS = createEffectRegistry([ITEM_EFFECTS.get(REMOTE_EFFECT)!, {
  id: WORKER_EFFECT, itemId: WORKER, operation: 'build-current-land', target: 'property', consume: 1,
  timings: ['beforeRoll'], status: null,
}]);
export const CONSTRUCTION_FINGERPRINT = hashSeed(JSON.stringify({ base: ITEM_FINGERPRINT,
  rules: CONSTRUCTION_RULES, effects: CONSTRUCTION_EFFECTS.fingerprint })).toString(16);
export function workerTarget(node: number, definitions: readonly PropertyDefinition[], properties: readonly PropertyState[]) {
  const definition = definitions.find(p => p.kind === 'land' && p.nodeIds.includes(node));
  const property = properties.find(p => p.id === definition?.id);
  return property && property.level < CONSTRUCTION_RULES.worker.maximumLevel ? property.id : null;
}
