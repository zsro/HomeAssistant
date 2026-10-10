import { describe, expect, it } from 'vitest';
import { advanceEffects, createEffectRegistry, createEffectState, reduceEffect } from './effects';
import type { Boundary, EffectAction, EffectContext, EffectDefinition, EffectResult, EffectState } from './effects';

// These synthetic definitions prove the contract, not any Richman card behavior.
const mark: EffectDefinition = { id: 'fixture:mark', itemId: 'fixture:item', operation: 'fixture:mark-player',
  target: 'otherPlayer', consume: 1, timings: ['beforeRoll'], status: { group: 'fixture:movement', priority: 20,
    conflict: 'reject', sourceEliminated: 'remove', duration: { boundary: 'turnEnd', clock: 'target', count: 2 } } };
const replace: EffectDefinition = { ...mark, id: 'fixture:replace', status: { ...mark.status!, conflict: 'replace', priority: 10 } };
const stack: EffectDefinition = { ...mark, id: 'fixture:stack', status: { ...mark.status!, conflict: 'stack' } };
const instant: EffectDefinition = { ...mark, id: 'fixture:instant', target: 'node', status: null };
const registry = createEffectRegistry([mark, replace, stack, instant]);
const context: EffectContext = { gameId: 'game', playerId: 'p1', timing: 'beforeRoll', paused: false, finished: false,
  players: [{ id: 'p1', alive: true }, { id: 'p2', alive: true }, { id: 'p3', alive: true }], nodeIds: ['1', '2'], propertyIds: ['land:1'] };
const target = { kind: 'player', id: 'p2' } as const;
function initial() { const state = createEffectState('game', ['p1', 'p2', 'p3'], registry); state.inventory.p1['fixture:item'] = 6; return state; }
function success(result: EffectResult) { if (!result.ok) throw new Error(result.reason); return result; }
function begin(state: EffectState, definitionId = mark.id) { return success(reduceEffect(state, context, { type: 'begin', definitionId }, registry)).state; }
function apply(state: EffectState, definitionId = mark.id) {
  const offered = begin(state, definitionId);
  return success(reduceEffect(offered, context, { type: 'confirm', decisionId: offered.pending!.id, target }, registry));
}
function unchanged(state: EffectState, action: EffectAction, ctx = context, reason?: string) {
  const copy = structuredClone(state), result = reduceEffect(state, ctx, action, registry);
  expect(result.ok).toBe(false); if (reason) expect(result).toEqual({ ok: false, reason });
  expect(state).toEqual(copy);
}

describe('staged effect kernel (no production card enabled)', () => {
  it('selects without spending, cancels, rejects old tokens and consumes exactly once on confirm', () => {
    const original = initial(), selected = begin(original);
    expect(original.pending).toBeNull(); expect(selected.inventory).toEqual(original.inventory);
    unchanged(selected, { type: 'begin', definitionId: mark.id }, context, 'decision-pending');
    const cancelled = success(reduceEffect(selected, context, { type: 'cancel', decisionId: selected.pending!.id }, registry));
    expect(cancelled.state.inventory).toEqual(original.inventory); expect(cancelled.intents).toEqual([]);
    const next = begin(cancelled.state);
    unchanged(next, { type: 'confirm', decisionId: selected.pending!.id, target });
    const action: EffectAction = { type: 'confirm', decisionId: next.pending!.id, target };
    const committed = success(reduceEffect(next, context, action, registry));
    expect(committed.state.inventory.p1['fixture:item']).toBe(5);
    expect(committed.state.active[0].remaining).toBe(2);
    expect(committed.intents).toEqual([{ operation: mark.operation, sourceId: 'p1', target, definitionId: mark.id }]);
    unchanged(committed.state, action);
  });

  it('rejects pause, terminal, wrong game, unknown effects, empty inventory, wrong timing and invalid targets atomically', () => {
    const original = initial(), action: EffectAction = { type: 'begin', definitionId: mark.id };
    for (const ctx of [{ ...context, paused: true }, { ...context, finished: true }, { ...context, gameId: 'old' }, { ...context, timing: 'landing' as const }]) unchanged(original, action, ctx);
    unchanged(original, { type: 'begin', definitionId: 'card:30' }, context, 'unsupported-effect');
    unchanged(createEffectState('game', ['p1', 'p2'], registry), action, context, 'insufficient-items');
    const selected = begin(original);
    for (const bad of [{ kind: 'player', id: 'p1' }, { kind: 'player', id: 'missing' }, { kind: 'node', id: '1' }] as const) unchanged(selected, { type: 'confirm', decisionId: selected.pending!.id, target: bad });
    const dead = { ...context, players: context.players.map(p => ({ ...p, alive: p.id !== 'p2' })) };
    unchanged(selected, { type: 'confirm', decisionId: selected.pending!.id, target }, dead, 'invalid-target');
    unchanged(selected, { type: 'cancel', decisionId: selected.pending!.id }, { ...context, playerId: 'p2' });
    const empty = structuredClone(selected); empty.inventory.p1 = {};
    unchanged(empty, { type: 'confirm', decisionId: empty.pending!.id, target }, context, 'insufficient-items');
    const cancelled = success(reduceEffect(selected, { ...dead, timing: 'landing' }, { type: 'cancel', decisionId: selected.pending!.id }, registry));
    expect(cancelled.state.pending).toBeNull();
  });

  it('keeps the host draft untouched if a domain operation fails, and supports immediate intents without a status', () => {
    const state = begin(initial(), instant.id), before = structuredClone(state);
    const action: EffectAction = { type: 'confirm', decisionId: state.pending!.id, target: { kind: 'node', id: '1' } };
    const proposal = success(reduceEffect(state, context, action, registry));
    // A host domain validator may reject this intent; discarding proposal must discard its item debit too.
    expect(state).toEqual(before); expect(state.inventory.p1['fixture:item']).toBe(6);
    expect(success(reduceEffect(state, context, action, registry))).toEqual(proposal);
    expect(proposal.state.active).toEqual([]); expect(proposal.state.inventory.p1['fixture:item']).toBe(5);
    proposal.intents[0].target.id = 'mutated'; expect(state).toEqual(before);
  });

  it('applies explicit conflict policies only to the same group and target; orders priority then creation', () => {
    const state = apply(initial()).state, offered = begin(state);
    unchanged(offered, { type: 'confirm', decisionId: offered.pending!.id, target }, context, 'effect-conflict');
    const stacked = apply(state, stack.id).state;
    expect(stacked.active.map(e => e.definitionId)).toEqual([mark.id, stack.id]);
    const replaced = apply(stacked, replace.id);
    expect(replaced.state.active).toHaveLength(1);
    expect(replaced.events.filter(e => e.type === 'effectRemoved')).toHaveLength(2);
    const other = begin(replaced.state);
    const added = success(reduceEffect(other, context, { type: 'confirm', decisionId: other.pending!.id, target: { kind: 'player', id: 'p3' } }, registry));
    expect(added.state.active.map(e => e.definitionId)).toEqual([replace.id, mark.id]);
  });

  it('ticks only the specified clock/boundary, rejects duplicate boundaries and expires exactly once', () => {
    let state = apply(initial()).state;
    for (const boundary of [{ sequence: 1, kind: 'turnEnd', playerId: 'p1' }, { sequence: 2, kind: 'dayStart', playerId: null }] as Boundary[]) {
      state = success(advanceEffects(state, context, boundary, registry)).state;
      expect(state.active[0].remaining).toBe(2);
    }
    const boundary: Boundary = { sequence: 3, kind: 'turnEnd', playerId: 'p2' };
    const paused = advanceEffects(state, { ...context, paused: true }, boundary, registry);
    expect(paused).toEqual({ ok: false, reason: 'paused' });
    state = success(advanceEffects(state, context, boundary, registry)).state;
    expect(state.active[0].remaining).toBe(1);
    expect(advanceEffects(state, context, boundary, registry)).toEqual({ ok: false, reason: 'invalid-boundary' });
    const expired = success(advanceEffects(state, context, { ...boundary, sequence: 4 }, registry));
    expect(expired.state.active).toEqual([]);
    expect(expired.events.filter(e => e.type === 'effectRemoved')).toEqual([{ type: 'effectRemoved', instanceId: state.active[0].id, reason: 'expired' }]);
  });

  it('clears eliminated inventory and pending actions, invalidates dead targets and obeys source removal policy', () => {
    const state = begin(apply(initial()).state);
    const deadSource = { ...context, players: context.players.map(p => ({ ...p, alive: p.id !== 'p1' })) };
    const boundary: Boundary = { sequence: 1, kind: 'playerEliminated', playerId: 'p1' };
    const result = success(advanceEffects(state, deadSource, boundary, registry));
    expect(result.state.inventory.p1).toEqual({}); expect(result.state.pending).toBeNull(); expect(result.state.active).toEqual([]);
    expect(result.events.some(e => e.type === 'effectRemoved' && e.reason === 'source-eliminated')).toBe(true);
    const deadTarget = { ...context, players: context.players.map(p => ({ ...p, alive: p.id !== 'p2' })) };
    const removed = success(advanceEffects(state, deadTarget, { ...boundary, playerId: 'p2' }, registry));
    expect(removed.state.active).toEqual([]); expect(removed.state.pending).not.toBeNull();
    expect(removed.events.some(e => e.type === 'effectRemoved' && e.reason === 'invalid-target')).toBe(true);
  });

  it.each(['source', 'global'] as const)('supports the %s clock and an explicit keep-on-source-elimination policy', (clock) => {
    const definition: EffectDefinition = { ...mark, target: 'property', status: { ...mark.status!,
      sourceEliminated: 'keep', duration: { boundary: 'dayStart', clock, count: 2 } } };
    const local = createEffectRegistry([definition]);
    let state = createEffectState('game', ['p1', 'p2', 'p3'], local); state.inventory.p1['fixture:item'] = 1;
    state = success(reduceEffect(state, context, { type: 'begin', definitionId: mark.id }, local)).state;
    const action: EffectAction = { type: 'confirm', decisionId: state.pending!.id, target: { kind: 'property', id: 'land:1' } };
    expect(reduceEffect(state, context, { ...action, target: { kind: 'property', id: 'missing' } }, local).ok).toBe(false);
    state = success(reduceEffect(state, context, action, local)).state;
    state = success(advanceEffects(state, context, { sequence: 1, kind: 'dayStart', playerId: 'p2' }, local)).state;
    expect(state.active[0].remaining).toBe(clock === 'global' ? 1 : 2);
    const dead = { ...context, players: context.players.map(p => ({ ...p, alive: p.id !== 'p1' })) };
    state = success(advanceEffects(state, dead, { sequence: 2, kind: 'playerEliminated', playerId: 'p1' }, local)).state;
    expect(state.active).toHaveLength(1);
    // A source clock stops if its source no longer receives boundaries. A definition
    // requiring expiration after source death must use a global clock or remove policy.
    const missingLand = { ...dead, propertyIds: [] };
    expect(success(advanceEffects(state, missingLand, { sequence: 3, kind: 'dayStart', playerId: null }, local)).state.active).toEqual([]);
  });

  it('replays serialized action and host-boundary traces deterministically without an animation clock or random draw', () => {
    const trace: ({ action: EffectAction } | { boundary: Boundary })[] = [
      { action: { type: 'begin', definitionId: mark.id } },
      { action: { type: 'confirm', decisionId: 'game:effect:1', target } },
      { boundary: { sequence: 1, kind: 'turnEnd', playerId: 'p2' } },
      { boundary: { sequence: 2, kind: 'turnEnd', playerId: 'p2' } },
    ];
    const run = (steps: typeof trace) => {
      let state = initial(); const events = [], intents = [];
      for (const step of steps) {
        const result = success('action' in step ? reduceEffect(state, context, step.action, registry) : advanceEffects(state, context, step.boundary, registry));
        state = result.state; events.push(...result.events); intents.push(...result.intents);
      }
      return { state, events, intents };
    };
    expect(run(JSON.parse(JSON.stringify(trace)))).toEqual(run(trace));
    expect(run(trace).state.active).toEqual([]);
  });

  it('isolates registry data and fingerprints semantics; rejects incompatible state and malformed definitions', () => {
    const copy = registry.get(mark.id)!; copy.consume = 99;
    expect(registry.get(mark.id)!.consume).toBe(1);
    expect(createEffectRegistry([instant, stack, replace, mark]).fingerprint).toBe(registry.fingerprint);
    const changed = createEffectRegistry([{ ...mark, consume: 2 }]);
    expect(reduceEffect(initial(), context, { type: 'begin', definitionId: mark.id }, changed)).toEqual({ ok: false, reason: 'incompatible-effects' });
    for (const d of [{ ...mark, consume: 0 }, { ...mark, status: { ...mark.status!, duration: { ...mark.status!.duration, count: 0 } } }, { ...mark, target: 'node' as const }]) expect(() => createEffectRegistry([d])).toThrow();
    expect(() => createEffectRegistry([mark, mark])).toThrow();
  });
});
