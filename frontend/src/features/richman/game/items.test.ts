import { describe, expect, it } from 'vitest';
import nodes from '../../../../../shared/richman/japan-topology.fixture.json';
import { GameEngine, replayGame, TURN_RULES } from './engine';
import type { Action } from './engine';
import { ITEM_RULES, REMOTE_DICE, REMOTE_EFFECT } from './items';
import { FINANCE_RULES } from './finance';
import { ECONOMY_RULES } from './economy';

function make(count = 2) {
  return new GameEngine(nodes, { gameId: 'items', seed: 's1-04-loop', characterIds: ['a', 'b', 'c', 'd'].slice(0, count), rulesId: ITEM_RULES.id, initialFunds: 30000 });
}
function command(engine: GameEngine, action: Action) {
  const s = engine.state;
  return { id: `c${s.revision}`, gameId: s.gameId, expectedRevision: s.revision, playerId: s.players[s.active].id, action };
}
function send(engine: GameEngine, action: Action) {
  const c = command(engine, action); expect(engine.dispatch(c).ok).toBe(true); return c;
}
function begin(engine: GameEngine) { send(engine, { type: 'item', action: { type: 'begin', definitionId: REMOTE_EFFECT } }); }
function confirm(engine: GameEngine, value: number): Action {
  return { type: 'item', value, action: { type: 'confirm', decisionId: engine.state.pending!.id, target: { kind: 'player', id: engine.state.players[engine.state.active].id } } };
}
function conserved(engine: GameEngine) {
  const s = engine.state;
  expect(s.items!.supply + Object.values(s.effects!.inventory).reduce((sum, inv) => sum + (inv[REMOTE_DICE] ?? 0), 0)).toBe(10);
  for (const inv of Object.values(s.effects!.inventory)) expect(inv[REMOTE_DICE] ?? 0).toBeLessThanOrEqual(9);
  for (const id of s.finance!.eliminated) { expect(s.effects!.inventory[id]).toEqual({}); expect(s.items!.points[id]).toBe(0); }
}
// Public commands on the original map; no state injection or altered roads.
function step(engine: GameEngine, use = true) {
  const s = engine.state, p = s.pending, id = s.players[s.active].id;
  if (s.phase === 'idle') {
    if (use && s.effects!.inventory[id][REMOTE_DICE]) { begin(engine); send(engine, confirm(engine, s.turn % 6 + 1)); }
    else send(engine, { type: 'roll' });
  } else if (s.phase === 'turnEnd') send(engine, { type: 'endTurn' });
  else if (p?.kind === 'branch') send(engine, { type: 'choose', decisionId: p.id, node: p.choices[(s.turn - 1) % p.choices.length] });
  else if (p?.kind === 'property') send(engine, { type: 'property', decisionId: p.id, accept: p.operation === 'rent' || s.economy!.balances[id].cash >= p.amount });
  else if (p?.kind === 'bank') {
    const amount = s.economy!.balances[id].bank;
    if (amount) send(engine, { type: 'bank', decisionId: p.id, operation: 'withdraw', amount });
    send(engine, { type: 'leaveBank', decisionId: engine.state.pending!.id });
  } else if (p?.kind === 'shop') {
    if (s.items!.points[id] >= 30 && s.items!.supply && (s.effects!.inventory[id][REMOTE_DICE] ?? 0) < 9) send(engine, { type: 'buyItem', decisionId: p.id, itemId: REMOTE_DICE });
    send(engine, { type: 'leaveShop', decisionId: engine.state.pending!.id });
  } else if (p?.kind === 'debt') send(engine, { type: 'settleDebt', decisionId: p.id });
  else if (p) send(engine, { type: 'animationDone', token: p.id });
  else throw Error('Unexpected phase');
}

describe('S2-02 remote dice playable loop', () => {
  it.each([2, 3, 4])('initializes %i players with one tool, zero points and a conserved shared pool', count => {
    const engine = make(count); conserved(engine);
    expect(engine.state.items!.supply).toBe(10 - count);
    expect(Object.values(engine.state.items!.points)).toEqual(Array(count).fill(0));
    expect(Object.values(engine.state.effects!.inventory).map(i => i[REMOTE_DICE])).toEqual(Array(count).fill(1));
  });
  it('cancel and invalid confirmation preserve inventory, events and RNG; confirmation consumes once and bypasses RNG', () => {
    const engine = make(), initial = engine.state;
    begin(engine);
    const cancelId = engine.state.pending!.id;
    send(engine, { type: 'item', action: { type: 'cancel', decisionId: cancelId } });
    expect(engine.state.items).toEqual(initial.items);
    expect(engine.state.effects!.inventory).toEqual(initial.effects!.inventory);
    begin(engine);
    const before = engine.state, events = engine.events;
    for (const value of [0, 7, 1.5, NaN, Infinity]) expect(engine.dispatch(command(engine, confirm(engine, value))).ok).toBe(false);
    expect(engine.dispatch(command(engine, { type: 'roll' })).ok).toBe(false);
    expect(engine.dispatch(command(engine, { type: 'item', action: { type: 'cancel', decisionId: cancelId } })).ok).toBe(false);
    const wrongTarget = confirm(engine, 3);
    if (wrongTarget.type === 'item' && wrongTarget.action.type === 'confirm') wrongTarget.action.target.id = 'player-2';
    expect(engine.dispatch(command(engine, wrongTarget)).ok).toBe(false);
    expect(engine.dispatch({ ...command(engine, confirm(engine, 3)), playerId: 'player-2' }).ok).toBe(false);
    expect(engine.state).toEqual(before); expect(engine.events).toEqual(events);
    send(engine, { type: 'pause', value: true });
    expect(engine.dispatch(command(engine, confirm(engine, 3)))).toEqual({ ok: false, reason: 'paused' });
    send(engine, { type: 'pause', value: false });
    const c = send(engine, confirm(engine, 3));
    expect(engine.dispatch(c)).toEqual({ ok: false, reason: 'duplicate' });
    expect(engine.state.phase).toBe('rolling'); expect(engine.state.dice).toBe(3);
    expect(engine.state.randomState).toBe(initial.randomState);
    expect(engine.state.effects!.inventory['player-1'][REMOTE_DICE]).toBe(0);
    expect(engine.state.items!.supply).toBe(initial.items!.supply + 1);
    while (engine.state.completed === 0) step(engine);
    expect(engine.events.filter(e => e.type === 'nodeEntered')).toHaveLength(3);
    const replay = replayGame(nodes, JSON.parse(JSON.stringify(engine.exportReplay())));
    expect(replay.state).toEqual(engine.state); expect(replay.events).toEqual(engine.events);
    expect(() => replayGame(nodes, { ...engine.exportReplay(), itemFingerprint: 'wrong' })).toThrow(/道具/);
    const missing = engine.exportReplay(); delete missing.itemFingerprint;
    expect(() => replayGame(nodes, missing)).toThrow(/道具/);
  });
  it('rejects unavailable tools and leaves legacy profiles and their replay schema unchanged', () => {
    for (const rulesId of [TURN_RULES.id, ECONOMY_RULES.id, FINANCE_RULES.id]) {
      const engine = new GameEngine(nodes, { gameId: 'legacy', seed: 'old', characterIds: ['a', 'b'], rulesId });
      const before = engine.state;
      expect(engine.dispatch(command(engine, { type: 'item', action: { type: 'begin', definitionId: REMOTE_EFFECT } })).ok).toBe(false);
      expect(engine.state).toEqual(before); expect(engine.exportReplay()).not.toHaveProperty('itemFingerprint');
      expect(replayGame(nodes, engine.exportReplay()).state).toEqual(before);
    }
    const engine = make();
    expect(engine.dispatch(command(engine, { type: 'item', action: { type: 'begin', definitionId: 'card:01' } })).ok).toBe(false);
  });
  it('supports points → shop → buy → use and protects shop tokens, limits and point balances', () => {
    // Small unit fixture for capacity/stock boundaries; full-map games below validate actual routes.
    const map = [20, 50].map((id, i) => ({ ...nodes[0], id, kind: i ? 6001 : 0, adjacent: [i ? 20 : 50] }));
    const engine = new GameEngine(map, { gameId: 'shop', seed: 'shop', characterIds: ['a', 'b'], rulesId: ITEM_RULES.id }, []);
    let rejectedPoor = false, staleChecked = false, exhausted = false;
    for (let i = 0; i < 3000 && !exhausted; i++) {
      const s = engine.state, id = s.players[s.active].id;
      if (s.pending?.kind === 'shop') {
        const purchase: Action = { type: 'buyItem', decisionId: s.pending.id, itemId: REMOTE_DICE };
        if (s.items!.points[id] < 30) {
          expect(engine.dispatch(command(engine, purchase)).ok).toBe(false); expect(engine.state).toEqual(s); rejectedPoor = true;
        } else if (s.items!.supply === 0 || s.effects!.inventory[id][REMOTE_DICE] === 9) {
          expect(engine.dispatch(command(engine, purchase)).ok).toBe(false); expect(engine.state).toEqual(s); exhausted = true;
        } else {
          send(engine, purchase);
          expect(engine.state.items!.points[id]).toBe(s.items!.points[id] - 30);
          expect(engine.state.economy).toEqual(s.economy);
          const after = engine.state;
          expect(engine.dispatch(command(engine, purchase)).ok).toBe(false); expect(engine.state).toEqual(after); staleChecked = true;
        }
        send(engine, { type: 'leaveShop', decisionId: engine.state.pending!.id });
      } else step(engine, false);
      conserved(engine);
    }
    expect([rejectedPoor, staleChecked, exhausted]).toEqual([true, true, true]);
    const restored = replayGame(map, engine.exportReplay(), []);
    expect(restored.state).toEqual(engine.state);
    // Spending a bought item makes one unit available again.
    while (engine.state.phase !== 'idle') step(engine, false);
    const supply = engine.state.items!.supply;
    begin(engine); send(engine, confirm(engine, 1)); expect(engine.state.items!.supply).toBe(supply + 1);
  });
  it('only awards points and opens shops on landing, including after controlled rolls', () => {
    const map = [19, 20, 50, 51].map((id, i, ids) => ({ ...nodes[0], id, kind: id === 50 ? 6001 : 0, adjacent: [ids[(i + 1) % ids.length]] }));
    const engine = new GameEngine(map, { gameId: 'landing', seed: 'landing', characterIds: ['a', 'b'], rulesId: ITEM_RULES.id }, []);
    begin(engine); send(engine, confirm(engine, 3));
    while (engine.state.phase !== 'turnEnd') step(engine, false);
    expect(engine.state.players[0].node).toBe(51);
    expect(engine.state.items!.points['player-1']).toBe(0);
    expect(engine.events.some(e => e.type === 'shopOffered' || e.type === 'pointsAwarded')).toBe(false);
  });
  it('enforces the nine-tool holding limit independently of shared availability', () => {
    const map = [20, 50].map((id, i) => ({ ...nodes[0], id, kind: i ? 6001 : 0, adjacent: [i ? 20 : 50] }));
    const engine = new GameEngine(map, { gameId: 'cap', seed: 'cap', characterIds: ['a', 'b'], rulesId: ITEM_RULES.id }, []);
    let checked = false, secondSpent = false;
    for (let i = 0; i < 4000 && !checked; i++) {
      const s = engine.state, id = s.players[s.active].id;
      if (s.phase === 'idle' && id === 'player-2' && !secondSpent) {
        begin(engine); send(engine, confirm(engine, 1)); secondSpent = true;
      } else if (s.pending?.kind === 'shop') {
        if (id === 'player-1' && s.items!.points[id] >= 30) {
          const purchase: Action = { type: 'buyItem', decisionId: s.pending.id, itemId: REMOTE_DICE };
          if (s.effects!.inventory[id][REMOTE_DICE] === 9) {
            expect(s.items!.supply).toBe(1);
            expect(engine.dispatch(command(engine, purchase)).ok).toBe(false); expect(engine.state).toEqual(s); checked = true;
          } else send(engine, purchase);
        }
        send(engine, { type: 'leaveShop', decisionId: engine.state.pending!.id });
      } else step(engine, false);
    }
    expect(checked).toBe(true);
  });
  it('returns unused inventory to supply on bankruptcy without converting it to cash', () => {
    const engine = make();
    for (let i = 0; i < 10000 && engine.state.phase !== 'debt'; i++) step(engine, false);
    const before = engine.state, id = before.players[before.active].id;
    expect(before.pending?.kind).toBe('debt');
    const quantity = before.effects!.inventory[id][REMOTE_DICE];
    expect(quantity).toBeGreaterThan(0);
    step(engine, false);
    expect(engine.state.items!.supply).toBe(before.items!.supply + quantity);
    expect(engine.state.economy!.balances[id]).toEqual({ cash: 0, bank: 0 });
    expect(engine.state.effects!.inventory[id]).toEqual({}); conserved(engine);
    const settled = engine.events.slice().reverse().find(e => e.type === 'debtSettled');
    if (settled?.type !== 'debtSettled') throw Error('No settlement');
    expect(settled.amount).toBe(before.economy!.balances[id].cash + before.economy!.balances[id].bank);
  });
  it.each([2, 3, 4])('finishes an original-map %i-player game with purchases, effect cleanup and an exact replay', count => {
    const engine = make(count);
    for (let i = 0; i < 25000 && engine.state.phase !== 'finished'; i++) { step(engine); conserved(engine); }
    expect(engine.state.phase).toBe('finished');
    expect(engine.state.finance!.eliminated).toHaveLength(count - 1);
    for (const type of ['pointsAwarded', 'shopOffered', 'itemBought', 'effectConsumed', 'inventoryCleared']) expect(engine.events.some(e => e.type === type)).toBe(true);
    const restored = replayGame(nodes, engine.exportReplay());
    expect(restored.state).toEqual(engine.state); expect(restored.events).toEqual(engine.events);
  }, 30000);
});
