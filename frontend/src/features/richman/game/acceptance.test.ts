import { describe, expect, it } from 'vitest';
import { GameEngine, replayGame } from './engine';
import type { Action } from './engine';
import { FINANCE_RULES } from './finance';
import { PROPERTY_CATALOG } from './economy';
import nodes from '../../../../../shared/richman/japan-topology.fixture.json';

// Original 110-node Japan topology and real property catalog: never shorten the roads.
describe('S1 complete Japan games', () => {
  it.each([2, 3, 4])('%i players finish with an auditable ledger, surviving turn order and exact replay', (count) => {
    const engine = new GameEngine(nodes, { gameId: `acceptance-${count}`, seed: 's1-04-loop',
      characterIds: ['xiaomei', 'tuu', 'chyan', 'salonbus'].slice(0, count),
      rulesId: FINANCE_RULES.id, initialFunds: 30000 });
    const ledger = structuredClone(engine.state.economy!.balances);
    const releasedBuilt = new Set<string>();
    const arrivals = new Set<string>();
    let repurchases = 0, eliminatedTurns = 0;
    function send(action: Action) {
      const before = engine.state, actor = before.players[before.active].id;
      const command = { id: `c${before.revision}`, gameId: before.gameId,
        expectedRevision: before.revision, playerId: actor, action };
      const result = engine.dispatch(command);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.reason);
      const after = engine.state;
      for (const event of result.events) {
        if (event.type === 'bankTransferred') {
          const signed = event.operation === 'deposit' ? event.amount : -event.amount;
          ledger[actor].cash -= signed; ledger[actor].bank += signed;
        } else if (event.type === 'propertySettled' || event.type === 'debtSettled') {
          expect(event.paid.cash + event.paid.bank).toBe(event.amount);
          ledger[actor].cash -= event.paid.cash; ledger[actor].bank -= event.paid.bank;
          if (event.recipientId) ledger[event.recipientId].bank += event.amount;
          if (event.type === 'propertySettled' && event.operation === 'buy' && releasedBuilt.has(event.propertyId)) {
            const old = before.economy!.properties.find((p) => p.id === event.propertyId)!;
            const definition = PROPERTY_CATALOG.properties.find((p) => p.id === old.id)!;
            expect(event.level).toBe(old.level);
            expect(event.amount).toBe(definition.basePrice + old.level * definition.upgradeCost);
            repurchases++; releasedBuilt.delete(old.id);
          }
        } else if (event.type === 'bankrupt') {
          const owned = before.economy!.properties.filter((p) => p.ownerId === actor);
          expect(event.released).toEqual(owned.map((p) => p.id));
          for (const old of owned) {
            expect(after.economy!.properties.find((p) => p.id === old.id)).toEqual({ ...old, ownerId: null });
            if (old.level > 0) releasedBuilt.add(old.id);
          }
        } else if (event.type === 'bankOffered') arrivals.add(event.decision.arrival);
      }
      expect(after.economy!.balances).toEqual(ledger);
      for (const balance of Object.values(ledger)) {
        expect(Number.isSafeInteger(balance.cash) && balance.cash >= 0).toBe(true);
        expect(Number.isSafeInteger(balance.bank) && balance.bank >= 0).toBe(true);
      }
      expect(after.economy!.properties.some((p) => p.ownerId && after.finance!.eliminated.includes(p.ownerId))).toBe(false);
      if (action.type === 'endTurn') {
        let next = before.active;
        do { next = (next + 1) % count; } while (before.finance!.eliminated.includes(before.players[next].id));
        expect(after.active).toBe(next);
        expect(after.turn).toBe(before.turn + 1);
        expect(after.finance!.round).toBe(before.finance!.round + Number(next <= before.active));
        if (before.finance!.eliminated.length) eliminatedTurns++;
      }
      // Reusing an accepted settlement must never move funds or alter the log twice.
      if (['bank', 'property', 'settleDebt'].includes(action.type)) {
        expect(engine.dispatch(command)).toEqual({ ok: false, reason: 'duplicate' });
        expect(engine.state).toEqual(after);
      }
    }
    for (let guard = 0; guard < 20000 && engine.state.phase !== 'finished'; guard++) {
      const state = engine.state, pending = state.pending;
      if (state.phase === 'idle') send({ type: 'roll' });
      else if (state.phase === 'turnEnd') send({ type: 'endTurn' });
      else if (pending?.kind === 'branch') send({ type: 'choose', decisionId: pending.id, node: pending.choices[(state.turn - 1) % pending.choices.length] });
      else if (pending?.kind === 'property') send({ type: 'property', decisionId: pending.id,
        accept: pending.operation === 'rent' || ledger[state.players[state.active].id].cash >= pending.amount });
      else if (pending?.kind === 'bank') {
        const amount = ledger[state.players[state.active].id].bank;
        if (amount) send({ type: 'bank', decisionId: pending.id, operation: 'withdraw', amount });
        send({ type: 'leaveBank', decisionId: engine.state.pending!.id });
      } else if (pending?.kind === 'debt') send({ type: 'settleDebt', decisionId: pending.id });
      else if (pending) send({ type: 'animationDone', token: pending.id });
      else throw new Error(`Unhandled phase ${state.phase}`);
    }
    const state = engine.state;
    expect(state.phase).toBe('finished');
    expect(state.finance!.eliminated).toHaveLength(count - 1);
    expect(state.players.filter((p) => !state.finance!.eliminated.includes(p.id)).map((p) => p.id)).toEqual([state.finance!.winnerId]);
    expect(engine.events.filter((e) => e.type === 'gameEnded')).toHaveLength(1);
    if (count > 2) expect(eliminatedTurns).toBeGreaterThan(0);
    if (count === 4) {
      expect(repurchases).toBeGreaterThan(0);
      expect(arrivals).toEqual(new Set(['passing', 'landing']));
    }
    const restored = replayGame(nodes, engine.exportReplay());
    expect(restored.state).toEqual(state); expect(restored.events).toEqual(engine.events);
    {
      const result = engine.dispatch({ id: 'after-finish', gameId: state.gameId, expectedRevision: state.revision,
        playerId: state.players[state.active].id, action: { type: 'endTurn' } });
      expect(result.ok).toBe(false); expect(engine.state).toEqual(state);
    }
  }, 30000);
});
