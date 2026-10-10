import { describe, expect, it } from 'vitest';
import nodes from '../japan-topology.fixture.json';
import type { Manifest } from '../types';
import { GameSession } from './session';

const manifest: Manifest = {
  version: 1, map: { name: '日本', width: 2304, height: 2304, nodes, scenery: [] }, sprites: {},
  characters: ['xiaomei', 'tuu', 'chyan', 'salonbus'].map((id) => ({ id, name: id, color: '#fff', idle: [], walk: [], walkFramesPerDirection: 10 })),
};
function session() {
  let id = 0;
  return new GameSession(manifest, { id: () => `game-${++id}`, seed: () => 'test-seed' });
}
function tick(model: GameSession, count: number) { for (let i = 0; i < count; i++) model.tick(50); }
function startSegment(model: GameSession) {
  model.roll(); tick(model, 13);
  if (model.state.phase === 'choosing') model.choose(model.state.choices[0]);
  expect(model.state.phase).toBe('moving');
}

describe('scene adapter and isolated sandbox', () => {
  it('interpolates pixels without changing the engine node until segment completion', () => {
    const model = session(); startSegment(model);
    const before = model.gameState!;
    const x = model.actor.x;
    tick(model, 2);
    expect(model.actor.x).not.toBe(x);
    expect(model.gameState).toEqual(before);
    model.pause(true);
    const paused = model.snapshot(); tick(model, 100);
    expect(model.snapshot()).toEqual(paused);
    model.pause(false);
    for (let i = 0; i < 100 && model.gameState!.players[0].node === 1; i++) tick(model, 1);
    expect(model.gameState!.players[0].node).not.toBe(1);
  });

  it('reset invalidates an in-flight animation and retains the deterministic seed', () => {
    const model = session(); startSegment(model); tick(model, 3);
    const previous = model.gameState!;
    model.reset(); tick(model, 200);
    expect(model.gameState!.gameId).not.toBe(previous.gameId);
    expect(model.state.completed).toBe(0);
    expect(model.actor.node).toBe(1);
    model.roll(); expect(model.state.dice).toBe(previous.dice);
  });

  it('turn mode ignores character switching and teleport; sandbox retains both', () => {
    const model = session(); const before = model.gameState;
    model.select(2); model.visitJunction();
    expect(model.gameState).toEqual(before);
    model.start({ mode: 'sandbox', characterIds: manifest.characters.map((c) => c.id), seed: 'sandbox' });
    model.select(2); model.visitJunction();
    expect(model.state.active).toBe(2);
    expect(model.actor.node).toBe(78);
    expect(model.exportReplay()).toBeNull();
  });

  it('maps a non-contiguous two-character roster to the correct sprite indices and rotates', () => {
    const model = session();
    model.start({ mode: 'turns', characterIds: ['tuu', 'salonbus'], seed: 'pair' });
    expect(model.state.participants).toEqual([1, 3]);
    expect(model.state.active).toBe(1);
    model.roll();
    for (let i = 0; i < 1500 && model.state.phase !== 'turnEnd'; i++) {
      if (model.state.phase === 'choosing') model.choose(model.state.choices[0]);
      model.tick(50);
    }
    expect(model.state.phase).toBe('turnEnd');
    expect(model.state.active).toBe(1);
    model.endTurn();
    expect(model.state.active).toBe(3);
    expect(model.state.turn).toBe(2);
  });

  it('preserves an existing game when replacement settings are invalid', () => {
    const model = session(); model.roll(); const before = model.gameState;
    expect(() => model.start({ mode: 'turns', characterIds: ['tuu'], seed: 'new' })).toThrow();
    expect(model.gameState).toEqual(before);
  });

  it('clamps background elapsed time and ignores invalid frame deltas', () => {
    const model = session(); startSegment(model);
    model.tick(60000);
    expect(model.actor.node).toBe(1);
    const before = model.snapshot();
    for (const elapsed of [NaN, Infinity, 0, -1]) model.tick(elapsed);
    expect(model.snapshot()).toEqual(before);
  });
});

describe('economic session projection', () => {
  it('waits at a property decision through frames and pause; reset restores funds and unowned land', () => {
    const model = session();
    model.start({ mode: 'economy', characterIds: ['tuu', 'salonbus'], seed: 'property-seed', initialFunds: 30000 });
    for (let turn = 0; turn < 12 && model.state.phase !== 'property'; turn++) {
      if (model.state.phase === 'turnEnd') model.endTurn();
      model.roll();
      for (let i = 0; i < 1500 && !['property', 'turnEnd'].includes(model.state.phase); i++) {
        if (model.state.phase === 'choosing') model.choose(model.state.choices[0]);
        tick(model, 1);
      }
    }
    expect(model.state.phase).toBe('property');
    const before = model.gameState; tick(model, 2000); expect(model.gameState).toEqual(before);
    const decision = model.state.decision!;
    expect(model.state.economy!.balances['player-1']).toEqual({ cash: 15000, bank: 15000 });
    model.pause(true); expect(model.decide(decision.id, true)?.ok).toBe(false);
    model.pause(false); expect(model.decide(decision.id, true)?.ok).toBe(true);
    expect(model.state.economy!.properties.some((p) => p.ownerId !== null)).toBe(true);
    model.reset();
    expect(model.state.economy!.properties.every((p) => p.ownerId === null && p.level === 0)).toBe(true);
    expect(model.state.economy!.balances['player-1'].cash).toBe(15000);
    expect(model.decide(decision.id, true)?.ok).toBe(false);
    expect(model.state.participants).toEqual([1, 3]);
  });
});

describe('finance session lifecycle', () => {
  it('pauses at a real bank, keeps steps frozen, and rejects bank callbacks after reset', () => {
    const model = session(); model.start({ mode: 'economy', characterIds: ['tuu', 'salonbus'], seed: 'bank-21', initialFunds: 10000 });
    for (let turn = 1; turn <= 2; turn++) {
      if (model.state.phase === 'turnEnd') model.endTurn(); model.roll();
      for (let i = 0; i < 1500 && !['property', 'bank', 'turnEnd'].includes(model.state.phase); i++) {
        if (model.state.phase === 'choosing') model.choose(turn === 1 ? 3 : 7);
        tick(model, 1);
      }
      if (model.state.decision) model.decide(model.state.decision.id, false);
    }
    expect(model.state.phase).toBe('bank');
    const bank = model.state.bankDecision!; const before = model.gameState;
    tick(model, 1000); expect(model.gameState).toEqual(before);
    model.pause(true); expect(model.transfer(bank.id, 'withdraw', 1)?.ok).toBe(false);
    model.pause(false); expect(model.transfer(bank.id, 'withdraw', 100)?.ok).toBe(true);
    model.reset();
    expect(model.leaveBank(bank.id)?.ok).toBe(false);
    expect(model.state.finance).toEqual({ eliminated: [], winnerId: null, round: 1 });
    expect(model.state.economy!.balances['player-2']).toEqual({ cash: 5000, bank: 5000 });
  });
});
