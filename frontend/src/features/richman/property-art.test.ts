import { describe, expect, it } from 'vitest';
import { PROPERTY_CATALOG } from './game/economy';
import { propertyAppearance, propertySprite, requiredPropertySprites, validMapArt } from './property-art';
import type { Manifest } from './types';
import topology from '../../../../shared/richman/japan-topology.fixture.json';
import audit from '../../../../docs/richman/japan-map-audit.json';

function artManifest(): Manifest {
  const sprites = Object.fromEntries([...requiredPropertySprites(), ...Array.from({ length: 17 }, (_, i) => `road-${i + 1}`), 'scenery']
    .map(key => [key, { x: 0, y: 0, width: 1, height: 1, anchorX: 0, anchorY: 0 }]));
  return { version: 1, mapArtVersion: 1, propertyArtVersion: 2, characters: [], sprites,
    map: { name: '日本', width: 2304, height: 2304, nodes: topology,
      scenery: Array.from({ length: 22 }, () => ({ x: 0, y: 0, sprite: 'scenery', name: '' })),
      roadTiles: audit.nodes.filter(n => n.word22).map(n => ({ nodeId: n.id, x: n.x, y: n.y, sprite: `road-${n.word22}` })),
      propertyDirections: { 'japan:facility:2': 7 } } };
}

describe('map and property artwork', () => {
  it('uses a type-specific sprite for every supported building and level', () => {
    const land = PROPERTY_CATALOG.properties[0], facility = PROPERTY_CATALOG.properties.find(p => p.kind === 'facility')!;
    const state = { id: land.id, ownerId: null, level: 0 };
    expect(propertySprite(state, land)).toBeNull();
    expect(propertySprite({ ...state, level: 1 }, land)).toBe('house-1-2');
    expect(propertySprite({ ...state, level: 1, buildingType: 1 }, land)).toBe('chain-2');
    for (const [buildingType, cap] of [1, 5, 5, 1, 5].entries()) for (let level = 1; level <= cap; level++) {
      expect(requiredPropertySprites()).toContain(propertySprite({ ...state, level, buildingType }, facility));
    }
    expect(new Set(requiredPropertySprites()).size).toBe(184);
  });
  it('fixes rotated facility art without mutating the catalog used by historical replays', () => {
    const definition = PROPERTY_CATALOG.properties.find(p => p.id === 'japan:facility:2')!;
    expect(propertyAppearance(definition, artManifest()).direction).toBe(7);
    expect(definition.direction).toBe(0);
  });
  it('rejects partial, stale or wrongly positioned artwork packages', () => {
    expect(validMapArt(artManifest())).toBe(true);
    for (const mutate of [
      (m: Manifest) => { m.mapArtVersion = undefined; },
      (m: Manifest) => { m.map.roadTiles!.pop(); },
      (m: Manifest) => { m.map.roadTiles![0].x++; },
      (m: Manifest) => { delete m.sprites['road-3']; },
      (m: Manifest) => { delete m.sprites['facility-4-5-7']; },
      (m: Manifest) => { m.map.scenery.pop(); },
    ]) {
      const manifest = artManifest(); mutate(manifest); expect(validMapArt(manifest)).toBe(false);
    }
  });
});
