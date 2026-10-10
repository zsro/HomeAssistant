import { describe, expect, it } from 'vitest';
import nodes from '../japan-topology.fixture.json';
import { GameEngine, replayGame } from './engine';
import type { Action, Command } from './engine';
import { ECONOMY_RULES, PROPERTY_CATALOG, paymentSplit, rentLines, validateProperties } from './economy';
import type { PropertyDefinition } from './economy';

const road = [1, 2].map((id) => ({ id, x: id * 20, y: 0, adjacent: [3 - id], name: '测试', kind: 0 }));
const lot: PropertyDefinition = { id: 'test:land:1', kind: 'land', name: '街道', nodeIds: [1, 2],
  x: 0, y: 0, direction: 0, basePrice: 500, upgradeCost: 100, rents: [100, 200, 300, 400, 500, 600] };
function game(definition = lot) { return new GameEngine(road, { gameId: 'economy-test', seed: 'fixed',
  characterIds: ['a', 'b'], rulesId: ECONOMY_RULES.id, initialFunds: 10000 }, [definition]); }
function command(engine: GameEngine, action: Action): Command {
  const state = engine.state;
  return { id: `c-${state.revision}`, gameId: state.gameId, playerId: state.players[state.active].id, expectedRevision: state.revision, action };
}
function send(engine: GameEngine, action: Action) { const result = engine.dispatch(command(engine, action)); expect(result.ok).toBe(true); return result; }
function land(engine: GameEngine) {
  if (engine.state.phase === 'turnEnd') send(engine, { type: 'endTurn' });
  send(engine, { type: 'roll' });
  for (let i = 0; i < 8 && engine.state.phase !== 'property' && engine.state.phase !== 'turnEnd'; i++) {
    send(engine, { type: 'animationDone', token: engine.state.pending!.id });
  }
}
function decide(engine: GameEngine, accept = true) { return send(engine, { type: 'property', decisionId: engine.state.pending!.id, accept }); }
function total(engine: GameEngine) { return Object.values(engine.state.economy!.balances).reduce((sum, p) => sum + p.cash + p.bank, 0); }

describe('candidate residential economy', () => {
  it('binds all original parcels independently, including shared facility nodes and the Sendai price exception', () => {
    const defs = PROPERTY_CATALOG.properties;
    expect(() => validateProperties(nodes, defs)).not.toThrow();
    expect(defs.filter((p) => p.kind === 'land')).toHaveLength(49);
    expect(defs.filter((p) => p.kind === 'facility')).toHaveLength(5);
    expect(defs.find((p) => p.nodeIds.includes(46))).toBe(defs.find((p) => p.nodeIds.includes(47)));
    expect(defs.find((p) => p.id === 'japan:land:6')!.basePrice).toBe(500);
    expect(new Set(defs.map((p) => p.id)).size).toBe(54);
    expect(() => validateProperties(road, [lot, { ...lot, id: 'different' }])).toThrow();
    expect(() => validateProperties(road, [{ ...lot, rents: [NaN] }])).toThrow();
  });

  it('initializes empty properties and split funds; buys once and credits rent to bank while conserving total money', () => {
    const engine = game();
    expect(engine.state.economy!.balances['player-1']).toEqual({ cash: 5000, bank: 5000 });
    expect(engine.state.economy!.properties).toEqual([{ id: lot.id, ownerId: null, level: 0 }]);
    land(engine);
    const buy = command(engine, { type: 'property', decisionId: engine.state.pending!.id, accept: true });
    expect(engine.dispatch(buy).ok).toBe(true);
    const bought = engine.state;
    expect(engine.dispatch(buy)).toEqual({ ok: false, reason: 'duplicate' });
    expect(engine.state).toEqual(bought);
    expect(bought.economy!.balances['player-1']).toEqual({ cash: 4500, bank: 5000 });
    expect(bought.economy!.properties[0]).toEqual({ id: lot.id, ownerId: 'player-1', level: 0 });
    land(engine); const beforeRent = total(engine); decide(engine);
    expect(engine.state.economy!.balances).toEqual({ 'player-1': { cash: 4500, bank: 5100 }, 'player-2': { cash: 4900, bank: 5000 } });
    expect(total(engine)).toBe(beforeRent);
  });

  it('offers one upgrade per landing, caps at five and replays every money change identically', () => {
    const engine = game(); land(engine); decide(engine);
    for (let level = 1; level <= 5; level++) {
      land(engine); decide(engine); land(engine);
      expect(engine.state.pending).toMatchObject({ operation: 'upgrade', amount: 100 });
      decide(engine);
      expect(engine.state.economy!.properties[0].level).toBe(level);
      expect(engine.dispatch(command(engine, { type: 'property', decisionId: 'old', accept: true })).ok).toBe(false);
    }
    land(engine); decide(engine); land(engine);
    expect(engine.state.phase).toBe('turnEnd');
    const replay = replayGame(road, engine.exportReplay(), [lot]);
    expect(replay.state).toEqual(engine.state); expect(replay.events).toEqual(engine.events);
    expect(() => replayGame(road, engine.exportReplay(), [{ ...lot, upgradeCost: 200 }])).toThrow('地产配置');
    const record = engine.exportReplay(); record.rulesId = 'japan-turns-prototype-v1';
    expect(() => replayGame(road, record, [lot])).toThrow('规则');
  });

  it('decline, pause, old decision IDs, forged animation completion and premature endTurn never charge money', () => {
    const engine = game(); land(engine); const decisionId = engine.state.pending!.id;
    send(engine, { type: 'pause', value: true }); const paused = engine.state;
    expect(engine.dispatch(command(engine, { type: 'property', decisionId, accept: true })).ok).toBe(false);
    expect(engine.state).toEqual(paused); send(engine, { type: 'pause', value: false });
    for (const action of [{ type: 'animationDone', token: decisionId }, { type: 'endTurn' },
      { type: 'property', decisionId: 'wrong', accept: true }] as Action[]) {
      const before = engine.state; expect(engine.dispatch(command(engine, action)).ok).toBe(false); expect(engine.state).toEqual(before);
    }
    decide(engine, false); expect(total(engine)).toBe(20000);
    land(engine); const before = engine.state;
    expect(engine.dispatch(command(engine, { type: 'property', decisionId, accept: true })).ok).toBe(false);
    expect(engine.state).toEqual(before); decide(engine); land(engine);
    expect(engine.dispatch(command(engine, { type: 'property', decisionId: engine.state.pending!.id, accept: false })).ok).toBe(false);
  });

  it('uses cash only for construction; supports exact balance and leaves insufficient payments atomic', () => {
    const exact = game({ ...lot, basePrice: 5000 }); land(exact); decide(exact);
    expect(exact.state.economy!.balances['player-1'].cash).toBe(0);
    land(exact); decide(exact); land(exact); const beforeUpgrade = exact.state;
    expect(exact.dispatch(command(exact, { type: 'property', decisionId: exact.state.pending!.id, accept: true }))).toEqual({ ok: false, reason: 'insufficient-funds' });
    expect(exact.state).toEqual(beforeUpgrade); decide(exact, false);
    const poor = game({ ...lot, basePrice: 5001 }); land(poor); const before = poor.state;
    expect(poor.dispatch(command(poor, { type: 'property', decisionId: poor.state.pending!.id, accept: true })).ok).toBe(false);
    expect(poor.state).toEqual(before); decide(poor, false);
  });

  it.each([5001, 10000, 10001])('pays rent %i with cash then bank or retains an unpaid decision without partial transfer', (rent) => {
    const engine = game({ ...lot, rents: Array(6).fill(rent) }); land(engine); decide(engine); land(engine);
    const before = engine.state; const sum = total(engine);
    const result = engine.dispatch(command(engine, { type: 'property', decisionId: engine.state.pending!.id, accept: true }));
    if (rent > 10000) {
      expect(result).toEqual({ ok: false, reason: 'insufficient-funds' }); expect(engine.state).toEqual(before);
      expect(engine.dispatch(command(engine, { type: 'endTurn' })).ok).toBe(false);
    } else {
      expect(result.ok).toBe(true); expect(total(engine)).toBe(sum);
      expect(engine.state.economy!.balances['player-2']).toEqual({ cash: 0, bank: 10000 - rent });
      expect(engine.events.at(-1)).toMatchObject({ paid: { cash: 5000, bank: rent - 5000 }, recipientId: 'player-1' });
    }
  });

  it('aggregates actual per-lot rent tiers only for same name AND owner; never merges ownership', () => {
    const defs = PROPERTY_CATALOG.properties;
    const owned = defs.map((p) => ({ id: p.id, ownerId: [10, 11, 12, 13, 19].map((n) => `japan:land:${n}`).includes(p.id) ? 'player-1' : null, level: 0 }));
    owned.find((p) => p.id === 'japan:land:11')!.level = 3;
    owned.find((p) => p.id === 'japan:land:13')!.ownerId = 'player-2';
    const lines = rentLines(defs.find((p) => p.id === 'japan:land:10')!, owned, defs);
    expect(lines).toEqual([{ propertyId: 'japan:land:10', level: 0, amount: 500 }, { propertyId: 'japan:land:11', level: 3, amount: 7500 }, { propertyId: 'japan:land:12', level: 0, amount: 500 }]);
  });

  it('reserves one state for a multi-node facility without applying house prices or rents', () => {
    const facility = { ...lot, kind: 'facility', rents: [1, 2, 3, 4, 5] };
    const engine = game(facility); land(engine);
    expect(engine.state.phase).toBe('turnEnd'); expect(engine.state.economy!.properties).toHaveLength(1);
    expect(total(engine)).toBe(20000);
  });

  it('replays 120 actual Japan turns including purchases, upgrades and rent without losing assets', () => {
    const engine = new GameEngine(nodes, { gameId: 'japan-loop', seed: 's1-03-loop',
      characterIds: ['a', 'b', 'c', 'd'], rulesId: ECONOMY_RULES.id, initialFunds: 300000 });
    for (let turn = 0; turn < 120; turn++) {
      if (engine.state.phase === 'turnEnd') send(engine, { type: 'endTurn' });
      send(engine, { type: 'roll' });
      for (let guard = 0; engine.state.phase !== 'turnEnd' && guard < 30; guard++) {
        const pending = engine.state.pending!;
        if (pending.kind === 'property') decide(engine);
        else if (pending.kind === 'branch') send(engine, { type: 'choose', decisionId: pending.id,
          node: pending.choices[turn % pending.choices.length] });
        else send(engine, { type: 'animationDone', token: pending.id });
      }
      expect(engine.state.phase).toBe('turnEnd');
    }
    for (const operation of ['buy', 'upgrade', 'rent']) expect(engine.events.some((e) => e.type === 'propertySettled' && e.operation === operation)).toBe(true);
    const restored = replayGame(nodes, engine.exportReplay());
    expect(restored.state).toEqual(engine.state); expect(restored.events).toEqual(engine.events);
    for (const balance of Object.values(engine.state.economy!.balances)) {
      expect(Number.isSafeInteger(balance.cash) && balance.cash >= 0).toBe(true);
      expect(Number.isSafeInteger(balance.bank) && balance.bank >= 0).toBe(true);
    }
  });

  it('rejects unsupported funds/profile and preserves purchase affordability independent of deposits', () => {
    expect(() => new GameEngine(road, { gameId: 'x', seed: 'x', characterIds: ['a', 'b'], rulesId: ECONOMY_RULES.id, initialFunds: 1 }, [lot])).toThrow();
    expect(paymentSplit({ cash: 50, bank: 1000 }, 51, false)).toBeNull();
    expect(paymentSplit({ cash: 50, bank: 1000 }, 51, true)).toEqual({ cash: 50, bank: 1 });
  });
});
