import { createEffectRegistry } from './effects';
import { NEARBY_EFFECTS, NEARBY_FINGERPRINT, NEARBY_WORKER_EFFECT, projectWorkerAnchor } from './nearby-construction';
import { REMOTE_EFFECT } from './items';
import { hashSeed } from './random';
import type { MapNode } from '../types';

export const ROBOT = 'tool:01';
export const ROADBLOCK = 'tool:02';
export const ROBOT_EFFECT = 'tool:01:clear-nine-v1';
export const ROADBLOCK_EFFECT = 'tool:02:place-anchor-v1';
export const ROAD_GOODS = [
  { id: ROBOT, name: '机器娃娃', price: 15, effect: ROBOT_EFFECT },
  { id: ROADBLOCK, name: '路障', price: 30, effect: ROADBLOCK_EFFECT },
] as const;
export const ROAD_RULES = Object.freeze({ id: 'japan-tools-candidate-v4', handlerVersion: 1,
  initialPerPlayer: 1, supply: 10, capacity: 9, robotSteps: 9,
  robotBranch: 'smallest-id-excluding-previous-dead-end-return', robotRandom: 'no-draw',
  target: 'empty-road-anchor-in-440-view', center: 'active-player', orientation: 0,
  settlement: 'atomic-nine-steps-no-player-landings', bankruptcy: 'return-inventory-keep-world-blocks' });
export const ROAD_EFFECTS = createEffectRegistry([
  NEARBY_EFFECTS.get(REMOTE_EFFECT)!, NEARBY_EFFECTS.get(NEARBY_WORKER_EFFECT)!,
  { id: ROBOT_EFFECT, itemId: ROBOT, operation: 'clear-nine', target: 'self', consume: 1, timings: ['beforeRoll'], status: null },
  { id: ROADBLOCK_EFFECT, itemId: ROADBLOCK, operation: 'place-roadblock', target: 'node', consume: 1, timings: ['beforeRoll'], status: null },
]);
export const ROAD_FINGERPRINT = hashSeed(JSON.stringify({ base: NEARBY_FINGERPRINT, rules: ROAD_RULES,
  goods: ROAD_GOODS, effects: ROAD_EFFECTS.fingerprint })).toString(16);
export type RoadToolsState = { supply: Record<string, number>; blocks: number[]; lastRobotPath: number[] };
export function roadblockTargets(center: MapNode, nodes: readonly MapNode[], blocks: readonly number[]): number[] {
  return nodes.filter(node => {
    const point = projectWorkerAnchor(center, node);
    return node.id > 0 && node.id < 2000 && !blocks.includes(node.id) && point !== null && point.x >= 0 && point.y >= 0 && point.x < 440 && point.y < 440;
  }).map(node => node.id);
}
/** Explicit Web branch policy. Preview and authoritative resolution share this function. */
export function robotPath(nodes: readonly MapNode[], start: number, previous: number | null): number[] {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const path: number[] = [];
  let node = start;
  for (let i = 0; i < ROAD_RULES.robotSteps; i++) {
    const adjacent = byId.get(node)!.adjacent;
    const onward = adjacent.filter(id => id !== previous);
    const to = Math.min(...(onward.length ? onward : adjacent));
    path.push(to); previous = node; node = to;
  }
  return path;
}
