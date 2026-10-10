import { describe, expect, it } from 'vitest';
import { atlasMask, pickMapTarget, pointerToWorld, spriteContains } from './map-picking';
import type { PickLayer } from './map-picking';

const mask = { width: 4, height: 2, alpha: Uint8Array.from([0, 255, 0, 0, 255, 0, 1, 0]) };
const sprite: Extract<PickLayer, { kind: 'sprite' }> = { kind: 'sprite', target: 'a', x: 100, y: 80,
  frame: { x: 0, y: 0, width: 4, height: 2, anchorX: 2, anchorY: 1 } };
const land: PickLayer = { kind: 'land', target: 'b', x: 100, y: 80, shape: { kind: 'land', direction: 0 } };

describe('Web map picking using actual sprite opacity and draw order', () => {
  it('extracts alpha rather than treating RGB black or bounding boxes as opaque', () => {
    expect(atlasMask(2, 1, new Uint8ClampedArray([255, 20, 1, 0, 0, 0, 0, 255])).alpha).toEqual(Uint8Array.from([0, 255]));
    expect(() => atlasMask(2, 1, new Uint8ClampedArray(4))).toThrow(/尺寸/);
  });
  it('handles anchor offsets, fractional pixels, transparent holes and half-open frame boundaries', () => {
    expect(spriteContains({ x: 99.9, y: 79 }, sprite, mask)).toBe(true);
    expect(spriteContains({ x: 98, y: 79 }, sprite, mask)).toBe(false);
    expect(spriteContains({ x: 98, y: 80 }, sprite, mask)).toBe(true);
    expect(spriteContains({ x: 100, y: 80 }, sprite, mask)).toBe(true); // nonzero, not only alpha=255
    expect(spriteContains({ x: 102, y: 80 }, sprite, mask)).toBe(false);
    expect(spriteContains({ x: 100, y: 81 }, sprite, mask)).toBe(false);
    expect(spriteContains({ x: 97.999, y: 80 }, sprite, mask)).toBe(false);
    expect(spriteContains({ x: 100, y: 80 }, { ...sprite, frame: { ...sprite.frame, x: 4 } }, mask)).toBe(false);
  });
  it('passes transparent pixels to the back layer and resolves opaque overlap in draw order', () => {
    expect(pickMapTarget({ x: 98, y: 79 }, [land, sprite], mask, ['a', 'b'])).toBe('b');
    expect(pickMapTarget({ x: 99, y: 79 }, [land, sprite], mask, ['a', 'b'])).toBe('a');
    expect(pickMapTarget({ x: 99, y: 79 }, [sprite, land], mask, ['a', 'b'])).toBe('b');
  });
  it('does not click through a character, scenery, facility, capped or out-of-range foreground target', () => {
    for (const target of [null, 'facility', 'capped', 'far']) {
      expect(pickMapTarget({ x: 99, y: 79 }, [land, { ...sprite, target }], mask, ['b'])).toBeNull();
    }
    expect(pickMapTarget({ x: 98, y: 79 }, [land, { ...sprite, target: null }], mask, ['b'])).toBe('b');
    expect(pickMapTarget({ x: 100, y: 80 }, [land], mask, [])).toBeNull();
  });
  it('matches the ground lot including its corners and rotated boundaries', () => {
    expect(pickMapTarget({ x: 122, y: 102 }, [land], mask, ['b'])).toBe('b');
    expect(pickMapTarget({ x: 100, y: 102 }, [land], mask, ['b'])).toBe('b');
    expect(pickMapTarget({ x: 127, y: 93 }, [land], mask, ['b'])).toBeNull();
    const rotated: PickLayer = { ...land, kind: 'land', shape: { kind: 'land', direction: 7 } };
    expect(pickMapTarget({ x: 130, y: 80 }, [rotated], mask, ['b'])).toBe('b');
    expect(pickMapTarget({ x: 122, y: 102 }, [rotated], mask, ['b'])).toBeNull();
    expect(pickMapTarget({ x: NaN, y: 80 }, [land], mask, ['b'])).toBeNull();
  });
  it('converts CSS-sized canvas coordinates after zoom/pan and rejects outside pointer-capture releases', () => {
    const rect = { left: 10, top: 20, width: 200, height: 100 }, screen = { width: 400, height: 200 }, world = { x: -50, y: 30, zoom: 2 };
    expect(pointerToWorld({ x: 110, y: 70 }, rect, screen, world)).toEqual({ x: 125, y: 35 });
    for (const p of [{ x: 9, y: 40 }, { x: 210, y: 40 }, { x: 50, y: 120 }, { x: 50, y: 19 }]) expect(pointerToWorld(p, rect, screen, world)).toBeNull();
    expect(pointerToWorld({ x: 20, y: 40 }, rect, screen, { ...world, zoom: 0 })).toBeNull();
  });
});
