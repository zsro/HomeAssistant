import type { SessionSnapshot } from './game/session';
import type { Manifest, MapNode, PresentationMode } from './types';

/** Presentation only: read the existing status clock, including its 128 expiry marker. */
export function actorMode(state: SessionSnapshot, index: number): PresentationMode | null {
  const seat = state.participants.indexOf(index), id = `player-${seat + 1}`;
  const mobility = state.g2?.players[id];
  if (mobility?.prison) return 'prison';
  if (mobility?.hospital) return 'hospital';
  if (mobility?.winter) return 'winter';
  if (mobility?.dream) return 'dream';
  const engineer = state.g5?.engineers[id];
  if (engineer && !engineer.suspended) return 'engineer';
  return mobility?.vehicle === 'tool:05' ? 'motorcycle' : mobility?.vehicle === 'tool:06' ? 'car' : null;
}

export function actorSprite(manifest: Manifest, state: SessionSnapshot, index: number, elapsed: number) {
  const character = manifest.characters[index], actor = state.actors[index];
  const mode = actorMode(state, index);
  const pose = (manifest.presentationArtVersion === 1 && mode && character.poses?.[mode]) || character;
  const moving = index === state.active && state.phase === 'moving';
  const key = moving
    ? pose.walk[actor.direction * pose.walkFramesPerDirection + Math.floor(elapsed / 95) % pose.walkFramesPerDirection]
    : pose.idle[actor.direction];
  // Older/partial packs keep the established walking sprite, never an empty actor.
  return manifest.sprites[key] ? key : character.idle[actor.direction];
}

export function roadToolPoses(state: SessionSnapshot, nodes: ReadonlyMap<number, MapNode>) {
  const poses: { id: string; key: string; x: number; y: number; z: number }[] = [];
  for (const id of state.roadTools?.blocks ?? []) {
    const node = nodes.get(id);
    if (node) poses.push({ id: `block:${id}`, key: 'tool-block-0', x: node.x, y: node.y, z: node.y + 0.3 });
  }
  for (const hazard of state.g5?.hazards ?? []) {
    const seat = state.participants.findIndex((_, i) => `player-${i + 1}` === hazard.carrier);
    const index = state.participants[seat], actor = state.actors[index];
    const mobility = hazard.carrier ? state.g2?.players[hazard.carrier] : undefined;
    if (hazard.carrier && (!actor || state.eliminated.includes(index) || mobility?.travel || mobility?.prison || mobility?.hospital || state.g4?.hotel[hazard.carrier])) continue;
    const position = hazard.carrier ? actor : nodes.get(hazard.node);
    if (!position) continue;
    poses.push({ id: `hazard:${hazard.id}`, key: `tool-${hazard.itemId === 'tool:03' ? 'mine' : 'bomb'}-${hazard.carrier ? actor.direction : 0}`,
      x: position.x, y: position.y - (hazard.carrier ? 45 : 0), z: position.y + 0.75 });
  }
  return poses;
}
