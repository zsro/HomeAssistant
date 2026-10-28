import { describe, expect, it } from 'vitest';
import nodes from '../../../../../shared/richman/japan-topology.fixture.json';
import { GameEngine, replayGame } from './engine';
import type { Action, Replay } from './engine';
import { PROPERTY_CATALOG } from './economy';
import { CONSTRUCTION_FINGERPRINT, CONSTRUCTION_RULES, WORKER, WORKER_EFFECT } from './construction';
import { REMOTE_DICE, REMOTE_EFFECT, ITEM_FINGERPRINT } from './items';
import { NEARBY_RULES, NEARBY_FINGERPRINT, NEARBY_WORKER_EFFECT, nearbyWorkerTargets, projectWorkerAnchor } from './nearby-construction';
import legacy from './fixtures/tools-v2-replay.json';

const center = { x: 1024, y: 1024 };
const map = nodes.slice(0, 4).map((n, i) => ({ ...n, id: i + 1, kind: 0, ...center, adjacent: [i === 0 ? 2 : 1] }));
const base = PROPERTY_CATALOG.properties.find(p => p.kind === 'land')!;
const definitions = [
  { ...base, id: 'near', nodeIds: [3, 4], x: 1056, y: 1024 },
  { ...base, id: 'far', nodeIds: [1], x: 2048, y: 2048 },
  { ...PROPERTY_CATALOG.properties.find(p => p.kind === 'facility')!, id: 'facility', nodeIds: [2], ...center },
];
function make(rulesId: string = NEARBY_RULES.id) { return new GameEngine(map, { gameId: 'nearby', seed: 'nearby', rulesId, characterIds: ['a', 'b'] }, definitions); }
function command(e: GameEngine, action: Action) {
  const s = e.state;
  return { id: `cmd-${s.revision}`, gameId: s.gameId, expectedRevision: s.revision, playerId: s.players[s.active].id, action };
}
function send(e: GameEngine, action: Action) { const c = command(e, action); expect(e.dispatch(c).ok).toBe(true); return c; }
function begin(e: GameEngine) { send(e, { type: 'item', action: { type: 'begin', definitionId: NEARBY_WORKER_EFFECT } }); }
function confirm(e: GameEngine, id = 'near'): Action { return { type: 'item', action: { type: 'confirm', decisionId: e.state.pending!.id, target: { kind: 'property', id } } }; }

describe('S2-02c reference projection and explicit nearby candidate', () => {
  it('matches reference cardinal cells and separately rounded subcell products', () => {
    expect(projectWorkerAnchor(center, center)).toEqual({ x: 220, y: 220 });
    expect(projectWorkerAnchor(center, { x: 1056, y: 1024 })).toEqual({ x: 254, y: 209 });
    expect(projectWorkerAnchor(center, { x: 1024, y: 1056 })).toEqual({ x: 234, y: 245 });
    expect(projectWorkerAnchor(center, { x: 1025, y: 1025 })).toEqual({ x: 223, y: 221 });
    expect(projectWorkerAnchor(center, { x: 1039, y: 1047 })).toEqual({ x: 247, y: 233 });
    expect(projectWorkerAnchor({ x: 1039, y: 1047 }, { x: 1039, y: 1047 })).toEqual({ x: 220, y: 220 });
    expect(projectWorkerAnchor(center, { x: 1024 + 15 * 32, y: 1024 })).toBeNull();
    expect(projectWorkerAnchor(center, { x: NaN, y: 1024 })).toBeNull();
    expect(projectWorkerAnchor(center, { x: 1024.5, y: 1024 })).toBeNull();
  });
  it('uses half-open viewport edges and excludes full-level/facility targets regardless of owner', () => {
    const defs = [[760, 1191], [761, 1191], [1107, 1299], [1108, 1299]].map(([x, y], i) => ({ ...base, id: String(i), x, y }));
    const states = defs.map(p => ({ id: p.id, ownerId: null, level: 0 }));
    expect(nearbyWorkerTargets(center, defs, states)).toEqual(['1', '2']);
    states[1].level = 5; expect(nearbyWorkerTargets(center, defs, states)).toEqual(['2']);
    defs[2].kind = 'facility'; expect(nearbyWorkerTargets(center, defs, states)).toEqual([]);
    defs[2].kind = 'land';
    for (const ownerId of [null, 'player-1', 'player-2']) {
      expect(nearbyWorkerTargets(center, defs, states.map(p => ({ ...p, ownerId })))).toEqual(['2']);
    }
  });
  it('offers multi-node land once and changes candidates when the authoritative center changes', () => {
    const states = definitions.map(p => ({ id: p.id, ownerId: null, level: 0 }));
    expect(nearbyWorkerTargets(center, definitions, states)).toEqual(['near']);
    expect(nearbyWorkerTargets({ x: 2048, y: 2048 }, definitions, states)).toEqual(['far']);
  });
  it('rejects out-of-view/current land, facility, missing ID, wrong actor/value/phase/token without mutation', () => {
    const e = make(); begin(e);
    const old = e.state.pending!.id;
    send(e, { type: 'item', action: { type: 'cancel', decisionId: old } });
    expect(e.state.effects!.inventory['player-1'][WORKER]).toBe(1);
    begin(e); const before = e.state, events = e.events;
    for (const id of ['far', 'facility', 'missing']) expect(e.dispatch(command(e, confirm(e, id))).ok).toBe(false);
    expect(e.dispatch(command(e, { ...confirm(e), value: 2 } as Action)).ok).toBe(false);
    expect(e.dispatch(command(e, { type: 'roll' })).ok).toBe(false);
    expect(e.dispatch(command(e, { type: 'item', action: { type: 'cancel', decisionId: old } })).ok).toBe(false);
    expect(e.dispatch({ ...command(e, confirm(e)), playerId: 'player-2' }).ok).toBe(false);
    expect(e.state).toEqual(before); expect(e.events).toEqual(events);
    send(e, { type: 'pause', value: true });
    expect(e.dispatch(command(e, confirm(e)))).toEqual({ ok: false, reason: 'paused' });
    send(e, { type: 'pause', value: false });
    const accepted = send(e, confirm(e));
    expect(e.dispatch(accepted)).toEqual({ ok: false, reason: 'duplicate' });
    expect(e.state.economy!.properties[0].level).toBe(1);
    expect(e.state.items).toEqual(before.items); expect(e.state.randomState).toBe(before.randomState);
    expect(e.state.players).toEqual(before.players); expect(e.state.economy!.balances).toEqual(before.economy!.balances);
    expect(e.state.effects!.inventory['player-1']).toEqual({ [WORKER]: 0, [REMOTE_DICE]: 1 });
    expect(e.state.phase).toBe('idle');
    expect(e.dispatch(command(e, { type: 'item', action: { type: 'begin', definitionId: NEARBY_WORKER_EFFECT } })).ok).toBe(false);
  });
  it('builds a non-current land then uses remote dice without RNG, preserving exact replay', () => {
    const e = make(); begin(e); send(e, confirm(e));
    const rng = e.state.randomState;
    send(e, { type: 'item', action: { type: 'begin', definitionId: REMOTE_EFFECT } });
    send(e, { type: 'item', value: 3, action: { type: 'confirm', decisionId: e.state.pending!.id, target: { kind: 'player', id: 'player-1' } } });
    expect(e.state.dice).toBe(3); expect(e.state.randomState).toBe(rng); expect(e.state.items!.supply).toBe(9);
    const replay = replayGame(map, JSON.parse(JSON.stringify(e.exportReplay())), definitions);
    expect(replay.state).toEqual(e.state); expect(replay.events).toEqual(e.events);
    for (const itemFingerprint of [ITEM_FINGERPRINT, CONSTRUCTION_FINGERPRINT, 'changed']) {
      expect(() => replayGame(map, { ...e.exportReplay(), itemFingerprint }, definitions)).toThrow(/道具/);
    }
  });
  it('requires actual candidates before beginning and isolates v2/v3 effect IDs', () => {
    const far = definitions.map(p => ({ ...p, x: 2048, y: 2048 }));
    const e = new GameEngine(map, { gameId: 'far', seed: 'far', rulesId: NEARBY_RULES.id, characterIds: ['a', 'b'] }, far);
    const before = e.state;
    expect(e.dispatch(command(e, { type: 'item', action: { type: 'begin', definitionId: NEARBY_WORKER_EFFECT } })).ok).toBe(false);
    expect(e.state).toEqual(before);
    const v2 = make(CONSTRUCTION_RULES.id), v3 = make();
    expect(v2.dispatch(command(v2, { type: 'item', action: { type: 'begin', definitionId: NEARBY_WORKER_EFFECT } })).ok).toBe(false);
    expect(v3.dispatch(command(v3, { type: 'item', action: { type: 'begin', definitionId: WORKER_EFFECT } })).ok).toBe(false);
    expect(v3.state.items!.fingerprint).toBe(NEARBY_FINGERPRINT);
  });
  it('replays the pre-change real v2 browser game with its unchanged fingerprint and built ownership', () => {
    expect(CONSTRUCTION_FINGERPRINT).toBe('3c91b7f0');
    const e = replayGame(nodes, legacy as Replay);
    expect(e.events.filter(e => e.type === 'propertyBuilt')).toMatchObject([{ propertyId: 'japan:land:19', ownerId: 'player-1', fromLevel: 0, level: 1 }]);
    expect(e.events.filter(e => e.type === 'effectConsumed').map(e => e.type === 'effectConsumed' && e.itemId)).toEqual(['tool:08', 'tool:08', 'tool:09', 'tool:08']);
    expect(e.state.effects!.inventory['player-3'][WORKER]).toBe(0);
  });
});
