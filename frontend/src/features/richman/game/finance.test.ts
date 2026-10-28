import { describe, expect, it } from 'vitest';
import { GameEngine, replayGame, TURN_RULES } from './engine';
import type { Action, Command } from './engine';
import { ECONOMY_RULES, PROPERTY_CATALOG } from './economy';
import type { PropertyDefinition } from './economy';
import { bankTransfer, FINANCE_RULES, nextSolventIndex } from './finance';
import nodes from '../../../../../shared/richman/japan-topology.fixture.json';
import { drawDice, hashSeed } from './random';

const road = [10, 20, 30].map((id, i) => ({ id, x: i * 30, y: 0, adjacent: [[20], [30], [10]][i], name: '测试', kind: 0 }));
const lot: PropertyDefinition = { id: 'test:land:1', kind: 'land', name: '街道', nodeIds: [10, 20, 30],
  x: 0, y: 0, direction: 0, basePrice: 500, upgradeCost: 100, rents: [10001, 20000, 30000, 40000, 50000, 60000] };
function game(definitions = [lot], count = 3, seed = 'finance') {
  return new GameEngine(road, { gameId: 'finance-test', seed, characterIds: ['a', 'b', 'c'].slice(0, count),
    rulesId: FINANCE_RULES.id, initialFunds: 10000 }, definitions);
}
function command(engine: GameEngine, action: Action): Command {
  const s = engine.state;
  return { id: `c-${s.revision}`, gameId: s.gameId, expectedRevision: s.revision, playerId: s.players[s.active].id, action };
}
function send(engine: GameEngine, action: Action) { const cmd = command(engine, action); expect(engine.dispatch(cmd).ok).toBe(true); return cmd; }
function arrive(engine: GameEngine) {
  if (engine.state.phase === 'turnEnd') send(engine, { type: 'endTurn' });
  send(engine, { type: 'roll' });
  for (let i = 0; i < 30 && ['rolling', 'moving', 'choosing'].includes(engine.state.phase); i++) {
    const p = engine.state.pending!;
    if (p.kind === 'branch') send(engine, { type: 'choose', decisionId: p.id, node: p.choices[0] });
    else send(engine, { type: 'animationDone', token: p.id });
  }
}
function buy(engine: GameEngine) { return send(engine, { type: 'property', decisionId: engine.state.pending!.id, accept: true }); }
function settle(engine: GameEngine) { return send(engine, { type: 'settleDebt', decisionId: engine.state.pending!.id }); }
function total(engine: GameEngine) { return Object.values(engine.state.economy!.balances).reduce((sum, b) => sum + b.cash + b.bank, 0); }
function unchanged(engine: GameEngine, action: Action) {
  const state = engine.state, events = engine.events, record = engine.exportReplay();
  expect(engine.dispatch(command(engine, action)).ok).toBe(false);
  expect(engine.state).toEqual(state); expect(engine.events).toEqual(events); expect(engine.exportReplay()).toEqual(record);
}
const bankRoad = [2, 1, 3].map((id, i) => ({ id, x: i * 30, y: 0, adjacent: [[1], [3], [2]][i], name: '不按名称匹配', kind: id === 1 ? 6006 : 0 }));
function bankGame(dice: number, rulesId: string = FINANCE_RULES.id) {
  let seed = 0;
  while (drawDice(hashSeed(String(seed))).value !== dice) seed++;
  return new GameEngine(bankRoad, { gameId: 'bank', seed: String(seed), characterIds: ['a', 'b'], rulesId, initialFunds: 10000 }, []);
}

describe('bank and elimination profile', () => {
  it.each([1, 2])('opens the bank once on entry with dice %i, then resumes the existing roll without duplicating landing', (dice) => {
    const engine = bankGame(dice); arrive(engine);
    expect(engine.state.pending).toMatchObject({ kind: 'bank', node: 1, arrival: dice === 1 ? 'landing' : 'passing' });
    const before = engine.state, id = before.pending!.id;
    unchanged(engine, { type: 'animationDone', token: id }); unchanged(engine, { type: 'endTurn' });
    send(engine, { type: 'leaveBank', decisionId: id });
    while (engine.state.phase === 'moving') send(engine, { type: 'animationDone', token: engine.state.pending!.id });
    expect(engine.state.phase).toBe('turnEnd'); expect(engine.state.remaining).toBe(0);
    expect(engine.state.players[0].node).toBe(dice === 1 ? 1 : 3);
    expect(engine.events.filter((e) => e.type === 'bankOffered')).toHaveLength(1);
    expect(engine.events.filter((e) => e.type === 'landed')).toHaveLength(1);
    expect(engine.events.filter((e) => e.type === 'rolled')).toHaveLength(1);
    expect(engine.state.randomState).toBe(before.randomState);
    expect(replayGame(bankRoad, engine.exportReplay(), []).state).toEqual(engine.state);
  });

  it('transfers whole balances in both directions atomically, and consumes decision IDs as well as command IDs', () => {
    const engine = bankGame(2); arrive(engine);
    const id = engine.state.pending!.id;
    const cmd = send(engine, { type: 'bank', decisionId: id, operation: 'deposit', amount: 5000 });
    expect(engine.state.economy!.balances['player-1']).toEqual({ cash: 0, bank: 10000 });
    const after = engine.state; expect(engine.dispatch(cmd).ok).toBe(false); expect(engine.state).toEqual(after);
    unchanged(engine, { type: 'bank', decisionId: id, operation: 'deposit', amount: 1 });
    unchanged(engine, { type: 'leaveBank', decisionId: id });
    send(engine, { type: 'bank', decisionId: engine.state.pending!.id, operation: 'withdraw', amount: 10000 });
    expect(engine.state.economy!.balances['player-1']).toEqual({ cash: 10000, bank: 0 }); expect(total(engine)).toBe(20000);
  });

  it('rejects zero, fractions, negative, unsafe, nonfinite, wrong business, oversized and paused bank operations', () => {
    const engine = bankGame(2); arrive(engine);
    const id = engine.state.pending!.id;
    for (const amount of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, 5001]) {
      unchanged(engine, { type: 'bank', decisionId: id, operation: 'withdraw', amount });
    }
    expect(bankTransfer({ cash: 20, bank: 30 }, 'invalid' as 'deposit', 1)).toBeNull();
    send(engine, { type: 'pause', value: true });
    unchanged(engine, { type: 'bank', decisionId: id, operation: 'deposit', amount: 10 });
    unchanged(engine, { type: 'leaveBank', decisionId: id });
    send(engine, { type: 'pause', value: false });
    send(engine, { type: 'leaveBank', decisionId: id });
    unchanged(engine, { type: 'bank', decisionId: id, operation: 'deposit', amount: 10 });
  });

  it('keeps old economic and turn profiles free of new bank decisions', () => {
    const old = bankGame(1, ECONOMY_RULES.id); arrive(old);
    expect(old.state.phase).toBe('turnEnd'); expect(old.state.finance).toBeUndefined();
    const turn = new GameEngine(bankRoad, { gameId: 'legacy', seed: '1', characterIds: ['a', 'b'], rulesId: TURN_RULES.id });
    arrive(turn); expect(turn.state.phase).toBe('turnEnd');
    expect(replayGame(bankRoad, old.exportReplay(), []).state).toEqual(old.state);
  });

  it('insufficient rent enters debt before any money moves; settling pays available money once, skips eliminated players and ends at one survivor', () => {
    const engine = game(); arrive(engine); buy(engine); arrive(engine);
    expect(engine.state.phase).toBe('debt');
    expect(engine.state.pending).toMatchObject({ available: 10000, amount: 10001, shortfall: 1, recipientId: 'player-1' });
    expect(engine.state.economy!.balances['player-2']).toEqual({ cash: 5000, bank: 5000 });
    const id = engine.state.pending!.id;
    for (const action of [{ type: 'endTurn' }, { type: 'property', decisionId: id, accept: false }, { type: 'animationDone', token: id }] as Action[]) unchanged(engine, action);
    send(engine, { type: 'pause', value: true }); unchanged(engine, { type: 'settleDebt', decisionId: id }); send(engine, { type: 'pause', value: false });
    const sum = total(engine), cmd = settle(engine);
    expect(total(engine)).toBe(sum); expect(engine.state.finance!.eliminated).toEqual(['player-2']);
    expect(engine.state.economy!.balances['player-2']).toEqual({ cash: 0, bank: 0 });
    expect(engine.state.economy!.balances['player-1']).toEqual({ cash: 4500, bank: 15000 });
    const after = engine.state; expect(engine.dispatch(cmd).ok).toBe(false); expect(engine.state).toEqual(after);
    unchanged(engine, { type: 'settleDebt', decisionId: id });
    arrive(engine); expect(engine.state.active).toBe(2); settle(engine);
    expect(engine.state.finance).toEqual({ eliminated: ['player-2', 'player-3'], winnerId: 'player-1', round: 1 });
    expect(engine.state.phase).toBe('finished'); expect(engine.state.pending).toBeNull();
    for (const action of [{ type: 'roll' }, { type: 'endTurn' }, { type: 'pause', value: true }, { type: 'settleDebt', decisionId: id }] as Action[]) unchanged(engine, action);
    const restored = replayGame(road, engine.exportReplay(), [lot]); expect(restored.state).toEqual(engine.state); expect(restored.events).toEqual(engine.events);
  });

  it('exact total funds can pay rent without bankruptcy, even at zero balance', () => {
    const engine = game([{ ...lot, rents: Array(6).fill(10000) }], 2);
    arrive(engine); buy(engine); arrive(engine); expect(engine.state.phase).toBe('property'); buy(engine);
    expect(engine.state.economy!.balances['player-2']).toEqual({ cash: 0, bank: 0 });
    expect(engine.state.finance!.eliminated).toEqual([]); expect(engine.state.phase).toBe('turnEnd');
  });

  it('settles a zero-funds debt without creating money and tracks rounds through elimination', () => {
    const engine = game([{ ...lot, rents: [10000, 20000, 30000, 40000, 50000, 60000] }]);
    arrive(engine); buy(engine); arrive(engine); buy(engine); arrive(engine); buy(engine);
    arrive(engine); expect(engine.state.finance!.round).toBe(2); buy(engine);
    arrive(engine); expect(engine.state.pending).toMatchObject({ kind: 'debt', available: 0, shortfall: 20000 });
    const sum = total(engine); settle(engine); expect(total(engine)).toBe(sum);
    send(engine, { type: 'endTurn' }); expect(engine.state.active).toBe(2); expect(engine.state.finance!.round).toBe(2);
  });

  it('keeps stable roster indices, skips a middle eliminated player and increments rounds on wrap', () => {
    const engine = game([{ ...lot, rents: Array(6).fill(10001) }]); arrive(engine); buy(engine); arrive(engine); settle(engine);
    send(engine, { type: 'endTurn' }); expect(engine.state.active).toBe(2);
    // Utility used by engine and session agrees even after the first player is eliminated.
    expect(nextSolventIndex(['a', 'b', 'c', 'd'], ['a', 'c'], 3)).toBe(1);
    expect(nextSolventIndex(['a', 'b', 'c', 'd'], ['b', 'c'], 0)).toBe(3);
    expect(nextSolventIndex(['a'], ['a'], 0)).toBe(-1);
  });

  it('releases debtor-owned buildings without resetting tiers, and can sell them again at their built value', () => {
    const definitions = road.map((n, i) => ({ ...lot, id: `test:land:${i+1}`, name: `street-${i}`, nodeIds: [n.id],
      basePrice: 100, upgradeCost: 100, rents: [10, 50000, 50000, 50000, 50000, 50000] }));
    let evidence = false;
    for (let seed = 0; seed < 30 && !evidence; seed++) {
      const engine = game(definitions, 3, String(seed));
      for (let turn = 0; turn < 80 && engine.state.phase !== 'finished'; turn++) {
        arrive(engine);
        const pending = engine.state.pending;
        if (pending?.kind === 'property') {
          const old = engine.state.economy!.properties.find((p) => p.id === pending.propertyId)!;
          if (old.ownerId === null && old.level > 0) {
            const d = definitions.find((d) => d.id === old.id)!;
            expect(pending.amount).toBe(d.basePrice + old.level * d.upgradeCost); evidence = true;
          }
          buy(engine);
        } else if (pending?.kind === 'debt') {
          const id = engine.state.players[engine.state.active].id;
          const owned = engine.state.economy!.properties.filter((p) => p.ownerId === id);
          settle(engine);
          for (const p of owned) expect(engine.state.economy!.properties.find((x) => x.id === p.id)).toEqual({ ...p, ownerId: null });
        }
      }
    }
    expect(evidence).toBe(true);
  });

  it('plays actual Japan finance turns with bank visits and deterministic full replay', () => {
    const engine = new GameEngine(nodes, { gameId: 'real', seed: 's1-04-loop', characterIds: ['a', 'b', 'c', 'd'], rulesId: FINANCE_RULES.id, initialFunds: 30000 });
    for (let turn = 0; turn < 1000 && engine.state.phase !== 'finished'; turn++) {
      arrive(engine);
      for (let guard = 0; !['turnEnd', 'finished'].includes(engine.state.phase) && guard < 40; guard++) {
        const p = engine.state.pending!;
        if (p.kind === 'bank') {
          const balance = engine.state.economy!.balances[engine.state.players[engine.state.active].id];
          if (balance.bank) send(engine, { type: 'bank', decisionId: p.id, operation: 'withdraw', amount: balance.bank });
          send(engine, { type: 'leaveBank', decisionId: engine.state.pending!.id });
        } else if (p.kind === 'debt') settle(engine);
        else if (p.kind === 'property') send(engine, { type: 'property', decisionId: p.id,
          accept: p.operation === 'rent' || engine.state.economy!.balances[engine.state.players[engine.state.active].id].cash >= p.amount });
        else if (p.kind === 'branch') send(engine, { type: 'choose', decisionId: p.id, node: p.choices[turn % p.choices.length] });
        else send(engine, { type: 'animationDone', token: p.id });
      }
    }
    expect(engine.events.some((e) => e.type === 'bankTransferred')).toBe(true);
    expect(engine.state.phase).toBe('finished');
    expect(engine.state.finance!.eliminated).toHaveLength(3);
    expect(engine.events.filter((e) => e.type === 'gameEnded')).toHaveLength(1);
    const restored = replayGame(nodes, engine.exportReplay(), PROPERTY_CATALOG.properties);
    expect(restored.state).toEqual(engine.state); expect(restored.events).toEqual(engine.events);
    expect(Object.values(engine.state.economy!.balances).every((b) => b.cash >= 0 && b.bank >= 0)).toBe(true);
  });
});
