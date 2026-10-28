import { describe, expect, it } from 'vitest';
import { propertyContains, propertyOutline, roadSegments } from './map-geometry';
import topology from '../../../../shared/richman/japan-topology.fixture.json';
import { PROPERTY_CATALOG } from './game/economy';

describe('Japan ground overlays', () => {
  it('uses ground-aligned squares for horizontal and vertical lots and larger facilities', () => {
    expect(propertyOutline({ kind: 'land', direction: 0 })).toEqual([-22, -22, 22, -22, 22, 22, -22, 22]);
    expect(propertyContains(21, 21, { kind: 'land', direction: 6 })).toBe(true);
    expect(propertyContains(45, 45, { kind: 'facility', direction: 0 })).toBe(true);
    expect(propertyContains(47, 0, { kind: 'facility', direction: 0 })).toBe(false);
  });
  it('keeps every displayed corner pickable for all catalog orientations', () => {
    for (const property of PROPERTY_CATALOG.properties) {
      const outline = propertyOutline(property);
      for (let i = 0; i < outline.length; i += 2) {
        expect(propertyContains(outline[i], outline[i + 1], property)).toBe(true);
        expect(propertyContains(outline[i] * 1.1, outline[i + 1] * 1.1, property)).toBe(false);
      }
    }
  });
  it('covers every road edge once, including special points and the entire prison approach', () => {
    const segments = roadSegments(topology);
    const keys = segments.map(({ from, to }) => [from.id, to.id].sort((a, b) => a - b).join(':'));
    expect(new Set(keys).size).toBe(keys.length);
    for (const node of topology) for (const id of node.adjacent) {
      expect(keys).toContain([node.id, id].sort((a, b) => a - b).join(':'));
    }
    for (let id = 78; id < 84; id++) expect(keys).toContain(`${id}:${id + 1}`);
    expect(keys).toContain('54:55');
    expect(keys).toContain('55:56');
  });
  it('preserves one-way edges without inventing missing connections', () => {
    expect(roadSegments([
      { id: 1, x: 0, y: 0, adjacent: [], kind: 0, name: '' },
      { id: 2, x: 10, y: 0, adjacent: [1], kind: 8002, name: '' },
    ]).map(({ from, to }) => [from.id, to.id])).toEqual([[2, 1]]);
  });
});
