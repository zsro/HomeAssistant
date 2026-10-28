import { describe, expect, it } from 'vitest';
import { actorMode, actorSprite, roadToolPoses } from './actor-presentation';
import { GameSession } from './game/session';
import type { CharacterPose, Manifest } from './types';
import nodes from '../../../../shared/richman/japan-topology.fixture.json';

const pose = (name: string): CharacterPose => ({ idle: Array.from({ length: 8 }, (_, i) => `${name}-idle-${i}`),
  walk: Array.from({ length: 24 }, (_, i) => `${name}-walk-${i}`), walkFramesPerDirection: 3 });
const modes = ['motorcycle', 'car', 'engineer', 'dream', 'winter', 'hospital', 'prison'] as const;
const characters = ['xiaomei', 'tuu', 'chyan', 'salonbus'].map(id => ({ id, name: id, color: '#fff', ...pose(id),
  poses: Object.fromEntries(modes.map(mode => [mode, pose(`${id}-${mode}`)])) }));
const manifest: Manifest = { version: 1, presentationArtVersion: 1,
  map: { name: '日本', width: 2304, height: 2304, nodes, scenery: [] }, characters,
  sprites: Object.fromEntries(characters.flatMap(c => [c, ...Object.values(c.poses)].flatMap(p => [...p.idle, ...p.walk]))
    .map(key => [key, { x: 0, y: 0, width: 1, height: 1, anchorX: 0, anchorY: 0 }])) };
const map = new Map(nodes.map(n => [n.id, n]));
const create = () => new GameSession(manifest, { id: () => 'art', seed: () => 'art' }, 'surrender');

describe('actor and road-tool presentation', () => {
  it('uses seats for reordered characters and restores the equipped vehicle after statuses clear', () => {
    const s = create().snapshot(); s.participants = [3, 1];
    const m = s.g2!.players['player-1']; m.vehicle = 'tool:06';
    expect(actorMode(s, 3)).toBe('car');
    s.g5!.engineers['player-1'] = { remaining: 7, vehicle: 'tool:06', dice: 3, suspended: false };
    expect(actorMode(s, 3)).toBe('engineer');
    m.dream = 128; expect(actorMode(s, 3)).toBe('dream');
    m.winter = 2; expect(actorMode(s, 3)).toBe('winter');
    m.hospital = 2; expect(actorMode(s, 3)).toBe('hospital');
    m.prison = 128; expect(actorMode(s, 3)).toBe('prison');
    m.dream = m.winter = m.hospital = m.prison = 0;
    s.g5!.engineers['player-1'] = null; expect(actorMode(s, 3)).toBe('car');
    m.vehicle = 'tool:05'; expect(actorMode(s, 3)).toBe('motorcycle');
    m.vehicle = 'foot'; expect(actorMode(s, 3)).toBeNull();
  });
  it('selects all eight directions and animation frames without advancing state, RNG or replay', () => {
    const model = create(), s = model.snapshot(), replay = model.exportReplay();
    const index = s.participants[0]; s.active = index; s.phase = 'moving'; s.g2!.players['player-1'].vehicle = 'tool:06';
    for (let d = 0; d < 8; d++) {
      s.actors[index].direction = d;
      for (let tick = 0; tick < 6; tick++) expect(actorSprite(manifest, s, index, tick * 95)).toBe(`${characters[index].id}-car-walk-${d * 3 + tick % 3}`);
    }
    const before = structuredClone(s); actorSprite(manifest, s, index, 1000); roadToolPoses(s, map);
    expect(s).toEqual(before); expect(model.exportReplay()).toEqual(replay);
    s.phase = 'idle'; expect(actorSprite(manifest, s, index, 0)).toBe(`${characters[index].id}-car-idle-7`);
  });
  it('falls back to existing actor art if the pose or selected frame is absent', () => {
    const s = create().snapshot(), index = s.participants[0]; s.g2!.players['player-1'].vehicle = 'tool:06';
    const m = structuredClone(manifest); m.characters[index].poses = {};
    expect(actorSprite(m, s, index, 0)).toBe(m.characters[index].idle[s.actors[index].direction]);
    delete m.presentationArtVersion; expect(actorSprite(m, s, index, 0)).toBe(m.characters[index].idle[s.actors[index].direction]);
    const partial = structuredClone(manifest);
    delete partial.sprites[actorSprite(manifest, s, index, 0)];
    expect(actorSprite(partial, s, index, 0)).toBe(partial.characters[index].idle[s.actors[index].direction]);
  });
  it('projects placed tools and interpolated carriers, and removes expired tools without a queue', () => {
    const s = create().snapshot(); s.participants = [3, 1]; s.roadTools!.blocks = [1];
    s.g5!.hazards = [{ id: 1, itemId: 'tool:03', node: 2, carrier: null, remaining: 0 },
      { id: 2, itemId: 'tool:04', node: 1, carrier: 'player-1', remaining: 10 }];
    Object.assign(s.actors[3], { x: 100.5, y: 200.5, direction: 6 });
    const poses = roadToolPoses(s, map);
    expect(poses).toHaveLength(3);
    expect(poses[1]).toMatchObject({ key: 'tool-mine-0', x: nodes[1].x, y: nodes[1].y });
    expect(poses[2]).toMatchObject({ key: 'tool-bomb-6', x: 100.5, y: 155.5 });
    for (const status of ['travel', 'prison', 'hospital'] as const) {
      s.g2!.players['player-1'][status] = 1; expect(roadToolPoses(s, map)).toHaveLength(2); s.g2!.players['player-1'][status] = 0;
    }
    s.eliminated = [3]; expect(roadToolPoses(s, map)).toHaveLength(2); s.eliminated = [];
    s.g4!.hotel['player-1'] = 1; expect(roadToolPoses(s, map)).toHaveLength(2);
    s.roadTools!.blocks = []; s.g5!.hazards = []; expect(roadToolPoses(s, map)).toEqual([]);
  });
});
