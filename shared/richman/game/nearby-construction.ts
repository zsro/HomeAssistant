import { createEffectRegistry } from './effects';
import { CONSTRUCTION_FINGERPRINT, WORKER } from './construction';
import { ITEM_EFFECTS, REMOTE_EFFECT } from './items';
import { hashSeed } from './random';
import type { PropertyDefinition, PropertyState } from './economy';
import projection from './worker-projection.json';

export const NEARBY_WORKER_EFFECT = 'tool:09:build-nearby-anchor-v1';
export const NEARBY_RULES = Object.freeze({ id: 'japan-tools-candidate-v3', handlerVersion: 1,
  target: 'ordinary-land-anchor-in-reference-view', orientation: 0, center: 'active-player-node',
  hitTest: 'anchor-only-no-pixel-occlusion', maximumLevel: 5,
  evidence: 'R07-09-reference-projection-with-explicit-web-selection' });
export const NEARBY_EFFECTS = createEffectRegistry([ITEM_EFFECTS.get(REMOTE_EFFECT)!, {
  id: NEARBY_WORKER_EFFECT, itemId: WORKER, operation: 'build-nearby-land', target: 'property', consume: 1,
  timings: ['beforeRoll'], status: null,
}]);
export const NEARBY_FINGERPRINT = hashSeed(JSON.stringify({ base: CONSTRUCTION_FINGERPRINT,
  rules: NEARBY_RULES, projection, effects: NEARBY_EFFECTS.fingerprint })).toString(16);

type Point = { x: number; y: number };
/** Reference fcn_00409a23 / fcn_00407a2c, orientation 0, view Y excludes the 40px toolbar. */
export function projectWorkerAnchor(center: Point, target: Point): Point | null {
  if (![center.x, center.y, target.x, target.y].every(n => Number.isSafeInteger(n) && n >= 0)) return null;
  const cell = projection.cellSize, halfGrid = (projection.gridSize - 1) / 2;
  const x = Math.floor(target.x / cell) - Math.floor(center.x / cell) + halfGrid;
  const y = Math.floor(target.y / cell) - Math.floor(center.y / cell) + halfGrid;
  if (x < 0 || y < 0 || x >= projection.gridSize || y >= projection.gridSize) return null;
  const [a, b, c, d] = projection.coefficients;
  // Each product is shifted separately in the source (floor also for negatives).
  const fraction = (p: Point) => ({
    x: Math.floor(a * (p.x % cell) / cell) + Math.floor(c * (p.y % cell) / cell),
    y: Math.floor(b * (p.x % cell) / cell) + Math.floor(d * (p.y % cell) / cell),
  });
  const origin = fraction(center), offset = fraction(target);
  const [dy, dx] = projection.yx[y * projection.gridSize + x];
  return { x: projection.width / 2 + origin.x + dx - offset.x,
    y: projection.width / 2 + origin.y + dy - offset.y };
}

/** Deliberate candidate rule, NOT the original sprite/pixel hit map. Camera has no input here. */
export function nearbyWorkerTargets(center: Point, definitions: readonly PropertyDefinition[], properties: readonly PropertyState[]): string[] {
  return definitions.filter(definition => {
    const state = properties.find(p => p.id === definition.id);
    if (definition.kind !== 'land' || !state || state.level >= (state.buildingType === 1 ? 1 : NEARBY_RULES.maximumLevel)) return false;
    const point = projectWorkerAnchor(center, definition);
    return point !== null && point.x >= 0 && point.y >= 0 && point.x < projection.width && point.y < projection.width;
  }).map(p => p.id);
}
