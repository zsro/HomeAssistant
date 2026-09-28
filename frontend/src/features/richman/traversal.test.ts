import { describe, expect, it } from 'vitest';
import nodes from './japan-topology.fixture.json';
import { directionFor, exits, Traversal } from './traversal';
import type { Manifest } from './types';

const manifest: Manifest = {
  version: 1, map: { name: '日本', width: 2304, height: 2304, nodes, scenery: [] }, sprites: {},
  characters: ['小美', '阿土伯', '钱夫人', '沙隆巴斯'].map((name) => ({ id: name, name, color: '#fff', idle: [], walk: [], walkFramesPerDirection: 9 })),
};
function tick(model: Traversal, count: number) { for (let i = 0; i < count; i++) model.tick(50); }
function finish(model: Traversal) {
  let count = 0;
  while (model.state.phase !== 'idle' && count++ < 3000) {
    if (model.state.phase === 'choosing') model.choose(model.state.choices[0]);
    model.tick(50);
  }
  expect(count).toBeLessThan(3000);
}

describe('original Japan map traversal', () => {
  it('covers all 110 nodes through real directed connections', () => {
    const model = new Traversal(manifest);
    const visited = new Set<number>();
    const pending = [1];
    while (pending.length) {
      const id = pending.pop()!;
      if (visited.has(id)) continue;
      visited.add(id);
      pending.push(...model.nodes.get(id)!.adjacent);
    }
    expect(visited.size).toBe(110);
    expect(exits(model.nodes.get(78)!, 77)).toEqual([85, 79]);
  });

  it('rejects repeated rolls and illegal branch choices without consuming extra steps', () => {
    const model = new Traversal(manifest);
    model.roll(6);
    model.roll(1);
    model.select(2);
    expect(model.state.dice).toBe(6);
    expect(model.state.active).toBe(0);
    tick(model, 13);
    expect(model.state.phase).toBe('choosing');
    const before = model.snapshot();
    model.choose(99);
    expect(model.snapshot()).toEqual(before);
    finish(model);
    expect(model.state.remaining).toBe(0);
    expect(model.state.completed).toBe(1);
  });

  it('never follows an absent edge in a long sequence, including junctions and returns', () => {
    const model = new Traversal(manifest);
    let last = model.actor.node;
    let transitions = 0;
    model.onChange = () => {
      const current = model.actor.node;
      if (current !== last) {
        expect(model.nodes.get(last)!.adjacent).toContain(current);
        last = current;
        transitions++;
      }
    };
    for (let i = 0; i < 80; i++) { model.roll(i % 6 + 1); finish(model); }
    expect(transitions).toBe(276);
    expect(model.state.completed).toBe(80);
  });

  it('pauses movement and reset discards a partially completed segment', () => {
    const model = new Traversal(manifest);
    model.roll(4); tick(model, 13); model.choose(model.state.choices[0]); tick(model, 3);
    model.pause(true);
    const paused = model.snapshot();
    tick(model, 300);
    expect(model.snapshot()).toEqual(paused);
    model.reset(); tick(model, 300);
    expect(model.state.phase).toBe('idle');
    expect(model.actor.node).toBe(1);
    expect(model.state.completed).toBe(0);
    expect(model.state.remaining).toBe(0);
  });

  it('supports a reproducible fork and preserves the rolled distance after choosing', () => {
    const model = new Traversal(manifest);
    model.visitJunction(); model.roll(2); tick(model, 13);
    expect(model.state.choices).toEqual([85, 77, 79]);
    model.choose(79);
    finish(model);
    expect(model.actor.node).toBe(80);
    expect(model.actor.previous).toBe(79);
  });

  it('uses the sampled original direction groups and rejects invalid dice values', () => {
    // N, NE, E, SE, S, SW, W, NW, verified against all four characters' sprite sheets.
    expect([[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]]
      .map(([dx, dy]) => directionFor(dx, dy))).toEqual([3, 2, 1, 0, 7, 6, 5, 4]);
    const model = new Traversal(manifest);
    for (const value of [0, 7, -1, 1.5, NaN]) model.roll(value);
    expect(model.state.phase).toBe('idle');
    expect(exits({ ...nodes[0], adjacent: [2] }, 2)).toEqual([2]);
  });
});
