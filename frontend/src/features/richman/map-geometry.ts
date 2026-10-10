import type { PropertyDefinition } from './game/economy';
import type { MapNode } from './types';

export type LandShape = Pick<PropertyDefinition, 'kind' | 'direction'>;

/** Japan's ground art uses square lots, rotated with the street (not isometric diamonds). */
export function propertyOutline(property: LandShape): number[] {
  const half = property.kind === 'facility' ? 46 : 22;
  const angle = property.direction * Math.PI / 4;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return [-half, -half, half, -half, half, half, -half, half].map((value, i, points) =>
    i % 2 === 0 ? value * cos - points[i + 1] * sin : points[i - 1] * sin + value * cos);
}

export function propertyContains(x: number, y: number, property: LandShape): boolean {
  const half = property.kind === 'facility' ? 46 : 22;
  const angle = property.direction * Math.PI / 4;
  return Math.abs(x * Math.cos(angle) + y * Math.sin(angle)) <= half + 1e-8 &&
    Math.abs(-x * Math.sin(angle) + y * Math.cos(angle)) <= half + 1e-8;
}

/** Keep every traversable edge, including kind=0 approach roads and detention exits. */
export function roadSegments(nodes: readonly MapNode[]): { from: MapNode; to: MapNode }[] {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const seen = new Set<string>();
  return nodes.flatMap(from => from.adjacent.flatMap(id => {
    const key = [from.id, id].sort((a, b) => a - b).join(':');
    const to = byId.get(id);
    if (!to || seen.has(key)) return [];
    seen.add(key);
    return [{ from, to }];
  }));
}
