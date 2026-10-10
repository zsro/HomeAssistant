/** S2 effect foundation; domain handlers opt in through a versioned live rules profile.
 * The host owns command identity/revision, RNG, phase transitions and domain state.
 * Commit this returned draft ONLY together with successful domain intent handling.
 */
import { hashSeed } from './random';

export type Timing = 'beforeRoll' | 'reaction' | 'landing';
export type Target = { kind: 'player' | 'node' | 'property' | 'stock' | 'god' | 'object'; id: string };
export type Boundary = { sequence: number; kind: 'turnStart' | 'turnEnd' | 'dayStart' | 'playerEliminated'; playerId: string | null };
export type Duration = { boundary: Exclude<Boundary['kind'], 'playerEliminated'>; clock: 'global' | 'source' | 'target'; count: number };
export type EffectDefinition = {
  id: string; itemId: string; operation: string; timings: readonly Timing[];
  target: 'self' | 'player' | 'otherPlayer' | 'node' | 'property' | 'stock' | 'god' | 'entity'; consume: number;
  // null = immediate operation; duration and conflict are mandatory for persistent effects.
  status: null | { group: string; priority: number; conflict: 'reject' | 'replace' | 'stack';
    duration: Duration; sourceEliminated: 'keep' | 'remove' };
};
export type EffectContext = {
  gameId: string; playerId: string; timing: Timing; paused: boolean; finished: boolean;
  players: readonly { id: string; alive: boolean }[]; nodeIds: readonly string[]; propertyIds: readonly string[];
};
export type EffectInstance = {
  id: string; definitionId: string; sourceId: string; target: Target; order: number; remaining: number;
};
export type EffectState = {
  version: 1; gameId: string; catalogFingerprint: string; serial: number; lastBoundary: number;
  inventory: Record<string, Record<string, number>>;
  pending: null | { id: string; definitionId: string; playerId: string; timing: Timing };
  active: EffectInstance[];
};
export type EffectAction =
  | { type: 'begin'; definitionId: string }
  | { type: 'cancel'; decisionId: string }
  | { type: 'confirm'; decisionId: string; target: Target; destination?: Target };
export type EffectEvent =
  | { type: 'effectOffered'; decisionId: string; definitionId: string; playerId: string }
  | { type: 'effectCancelled'; decisionId: string }
  | { type: 'inventoryCleared'; playerId: string; items: Record<string, number> }
  | { type: 'effectConsumed'; playerId: string; itemId: string; amount: number }
  | { type: 'effectResolved'; definitionId: string; sourceId: string; target: Target }
  | { type: 'effectAdded'; instance: EffectInstance }
  | { type: 'effectRemoved'; instanceId: string; reason: 'replaced' | 'expired' | 'invalid-target' | 'source-eliminated' }
  | { type: 'effectTicked'; instanceId: string; remaining: number };
export type EffectIntent = { operation: string; sourceId: string; target: Target; definitionId: string };
export type EffectResult = { ok: false; reason: string } | { ok: true; state: EffectState; events: EffectEvent[]; intents: EffectIntent[] };
const reject = (reason: string): EffectResult => ({ ok: false, reason });
const integer = (n: number) => Number.isSafeInteger(n) && n >= 0;
const timingValues: readonly string[] = ['beforeRoll', 'reaction', 'landing'];

export function createEffectRegistry(definitions: readonly EffectDefinition[]) {
  const entries = structuredClone([...definitions]).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const byId = new Map<string, EffectDefinition>();
  for (const d of entries) {
    const status = d.status;
    if (!d.id || byId.has(d.id) || !d.itemId || !d.operation || !integer(d.consume) || d.consume === 0 ||
      !d.timings.length || d.timings.some(t => !timingValues.includes(t)) ||
      !['self', 'player', 'otherPlayer', 'node', 'property', 'stock', 'god', 'entity'].includes(d.target) ||
      (status && (!status.group || !Number.isSafeInteger(status.priority) ||
        !['reject', 'replace', 'stack'].includes(status.conflict) ||
        !['keep', 'remove'].includes(status.sourceEliminated) ||
        !['global', 'source', 'target'].includes(status.duration.clock) ||
        !['turnStart', 'turnEnd', 'dayStart'].includes(status.duration.boundary) ||
        !integer(status.duration.count) || status.duration.count === 0 ||
        (status.duration.clock === 'target' && ['node', 'property'].includes(d.target))))) throw new Error('Invalid effect definition');
    byId.set(d.id, d);
  }
  return { fingerprint: hashSeed(JSON.stringify(entries)).toString(16),
    get: (id: string): EffectDefinition | undefined => { const d = byId.get(id); return d ? structuredClone(d) : undefined; } };
}
export type EffectRegistry = ReturnType<typeof createEffectRegistry>;

export function createEffectState(gameId: string, playerIds: readonly string[], registry: EffectRegistry): EffectState {
  if (!gameId || !playerIds.length || new Set(playerIds).size !== playerIds.length || playerIds.some(id => !id)) throw new Error('Invalid effect roster');
  return { version: 1, gameId, catalogFingerprint: registry.fingerprint, serial: 0, lastBoundary: 0,
    inventory: Object.fromEntries(playerIds.map(id => [id, {}])), pending: null, active: [] };
}
function validObject(target: Target, context: EffectContext) {
  if (!target || typeof target !== 'object') return false;
  return target.kind === 'player' ? context.players.some(p => p.id === target.id && p.alive)
    : target.kind === 'node' ? context.nodeIds.includes(target.id)
      : target.kind === 'property' && context.propertyIds.includes(target.id);
}
function validTarget(d: EffectDefinition, target: Target, context: EffectContext) {
  if (!validObject(target, context)) return false;
  if (d.target === 'self') return target.kind === 'player' && target.id === context.playerId;
  if (d.target === 'otherPlayer') return target.kind === 'player' && target.id !== context.playerId;
  return target.kind === d.target;
}
function guard(state: EffectState, context: EffectContext, registry: EffectRegistry) {
  if (state.version !== 1 || state.catalogFingerprint !== registry.fingerprint) return 'incompatible-effects';
  if (state.gameId !== context.gameId) return 'wrong-game';
  if (context.finished) return 'finished';
  if (context.paused) return 'paused';
  return null;
}

export function reduceEffect(state: EffectState, context: EffectContext, action: EffectAction, registry: EffectRegistry): EffectResult {
  const blocked = guard(state, context, registry);
  if (blocked) return reject(blocked);
  if (!context.players.some(p => p.id === context.playerId && p.alive)) return reject('invalid-player');
  if (action.type === 'begin') {
    const d = registry.get(action.definitionId);
    if (state.pending) return reject('decision-pending');
    if (!d) return reject('unsupported-effect');
    if (!d.timings.includes(context.timing)) return reject('wrong-timing');
    const quantity = state.inventory[context.playerId]?.[d.itemId];
    if (!integer(quantity) || quantity < d.consume) return reject('insufficient-items');
    const next = structuredClone(state), id = `${state.gameId}:effect:${++next.serial}`;
    next.pending = { id, definitionId: d.id, playerId: context.playerId, timing: context.timing };
    return { ok: true, state: next, events: [{ type: 'effectOffered', decisionId: id, definitionId: d.id, playerId: context.playerId }], intents: [] };
  }
  const pending = state.pending;
  if (!pending || pending.id !== action.decisionId || pending.playerId !== context.playerId) return reject('invalid-decision');
  // Cancellation stays possible if a target or timing has since become invalid.
  if (action.type === 'cancel') {
    const next = structuredClone(state); next.pending = null;
    return { ok: true, state: next, events: [{ type: 'effectCancelled', decisionId: pending.id }], intents: [] };
  }
  if (action.type !== 'confirm') return reject('invalid-action');
  const d = registry.get(pending.definitionId)!;
  if (pending.timing !== context.timing || !d.timings.includes(context.timing)) return reject('wrong-timing');
  if (!validTarget(d, action.target, context)) return reject('invalid-target');
  const quantity = state.inventory[context.playerId]?.[d.itemId];
  if (!integer(quantity) || quantity < d.consume) return reject('insufficient-items');
  const collisions = d.status ? state.active.filter(e => registry.get(e.definitionId)?.status?.group === d.status!.group &&
    e.target.kind === action.target.kind && e.target.id === action.target.id) : [];
  if (collisions.length && d.status?.conflict === 'reject') return reject('effect-conflict');
  const next = structuredClone(state), events: EffectEvent[] = [];
  next.pending = null;
  next.inventory[context.playerId][d.itemId] -= d.consume;
  events.push({ type: 'effectConsumed', playerId: context.playerId, itemId: d.itemId, amount: d.consume });
  if (d.status?.conflict === 'replace') {
    const ids = new Set(collisions.map(e => e.id));
    next.active = next.active.filter(e => !ids.has(e.id));
    for (const id of ids) events.push({ type: 'effectRemoved', instanceId: id, reason: 'replaced' });
  }
  const target = structuredClone(action.target);
  const intent = { operation: d.operation, definitionId: d.id, sourceId: context.playerId, target };
  events.push({ type: 'effectResolved', definitionId: d.id, sourceId: context.playerId, target: structuredClone(target) });
  if (d.status) {
    const order = ++next.serial;
    const instance = { id: `${state.gameId}:effect:${order}`, definitionId: d.id, sourceId: context.playerId,
      target: structuredClone(target), order, remaining: d.status.duration.count };
    next.active.push(instance);
    next.active.sort((a, b) => registry.get(a.definitionId)!.status!.priority - registry.get(b.definitionId)!.status!.priority || a.order - b.order);
    events.push({ type: 'effectAdded', instance: structuredClone(instance) });
  }
  return { ok: true, state: next, events, intents: [intent] };
}

/** Host-only lifecycle hook. Sequence comes from the host event log, never UI input. */
export function advanceEffects(state: EffectState, context: EffectContext, boundary: Boundary, registry: EffectRegistry): EffectResult {
  const blocked = guard(state, context, registry);
  if (blocked) return reject(blocked);
  if (!integer(boundary.sequence) || boundary.sequence <= state.lastBoundary ||
    !['turnStart', 'turnEnd', 'dayStart', 'playerEliminated'].includes(boundary.kind) ||
    (boundary.kind !== 'dayStart' && boundary.playerId === null) ||
    (boundary.playerId !== null && !context.players.some(p => p.id === boundary.playerId))) return reject('invalid-boundary');
  const next = structuredClone(state), events: EffectEvent[] = [];
  next.lastBoundary = boundary.sequence;
  for (const player of context.players.filter(p => !p.alive)) {
    const items = next.inventory[player.id];
    if (items && Object.keys(items).length) {
      events.push({ type: 'inventoryCleared', playerId: player.id, items: structuredClone(items) });
      next.inventory[player.id] = {};
    }
  }
  if (next.pending && !context.players.some(p => p.id === next.pending!.playerId && p.alive)) {
    events.push({ type: 'effectCancelled', decisionId: next.pending.id }); next.pending = null;
  }
  next.active = next.active.filter(instance => {
    const status = registry.get(instance.definitionId)!.status!;
    const sourceAlive = context.players.some(p => p.id === instance.sourceId && p.alive);
    let reason: 'invalid-target' | 'source-eliminated' | 'expired' | null = !validObject(instance.target, context) ? 'invalid-target'
      : !sourceAlive && status.sourceEliminated === 'remove' ? 'source-eliminated' : null;
    const duration = status.duration;
    if (!reason && duration.boundary === boundary.kind && (duration.clock === 'global' ||
      boundary.playerId === (duration.clock === 'source' ? instance.sourceId : instance.target.id))) {
      instance.remaining--;
      events.push({ type: 'effectTicked', instanceId: instance.id, remaining: instance.remaining });
      if (instance.remaining === 0) reason = 'expired';
    }
    if (reason) events.push({ type: 'effectRemoved', instanceId: instance.id, reason });
    return !reason;
  });
  return { ok: true, state: next, events, intents: [] };
}
