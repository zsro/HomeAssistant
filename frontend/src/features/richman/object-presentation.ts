import type {Frame, MapNode} from './types';
import type {SessionSnapshot} from './game/session';
import {directionFor} from './traversal';

export type ObjectArt = {version: 1; profile: 'object-presentation-v1'; sourceHash: string;
  sprites: Record<string, Frame>; offsets: [number, number][]};
export function validObjectArt(value: unknown, width: number, height: number): value is ObjectArt {
  const a = value as ObjectArt | null;
  return !!a && a.version === 1 && a.profile === 'object-presentation-v1' &&
    a.sourceHash === 'c63023e815b1ad4bef172b6415d128c7f041f12b71b5d80dc3ff29240a0a1988' &&
    Array.isArray(a.offsets) && a.offsets.length === 8 && a.offsets.every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite)) &&
    !!a.sprites && Array.from({length: 120}, (_, i) => `god-${Math.floor(i / 8) + 1}-${i % 8}`).every(key => {
      const f = a.sprites[key];
      return f && Object.values(f).every(Number.isFinite) && f.width > 0 && f.height > 0 && f.x >= 0 && f.y >= 0 && f.x + f.width <= width && f.y + f.height <= height && Number.isFinite(f.anchorX) && Number.isFinite(f.anchorY);
    });
}

/** Project only the current public world. No timers, snapshots, queues or RNG. */
export function objectPoses(s: SessionSnapshot, nodes: ReadonlyMap<number, MapNode>, art: ObjectArt) {
  return [...(s.g6?.gods ?? []), ...(s.g6?.objects ?? [])].flatMap(g => {
    let x: number, y: number, direction: number;
    if (g.carrier) {
      const seat = s.participants.findIndex((_, i) => `player-${i + 1}` === g.carrier);
      const index = s.participants[seat], actor = s.actors[index];
      const mobility = s.g2?.players[g.carrier];
      if (!actor || s.eliminated.includes(index) || mobility?.travel || mobility?.prison || mobility?.hospital || s.g4?.hotel[g.carrier]) return [];
      const offset = art.offsets[actor.direction];
      if (!offset) return [];
      x = actor.x + offset[0]; y = actor.y + offset[1]; direction = (actor.direction + 4) % 8;
    } else {
      const node = nodes.get(g.node), adjacent = node && nodes.get(node.adjacent[0]);
      if (!node || !adjacent) return [];
      // Native place_object: first nonzero stored edge -> current node, not autonomous movement.
      x = node.x; y = node.y; direction = directionFor(node.x - adjacent.x, node.y - adjacent.y);
    }
    const key = `god-${g.type}-${direction}`;
    return art.sprites[key] ? [{id: g.id, key, x, y}] : [];
  });
}
