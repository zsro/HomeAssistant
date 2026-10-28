import { describe, expect, it } from 'vitest';
import nodes from '../../../../../shared/richman/japan-topology.fixture.json';
import { GameEngine, replayGame } from './engine';
import type { Action } from './engine';
import { PROPERTY_CATALOG } from './economy';
import { ITEM_RULES, REMOTE_DICE, REMOTE_EFFECT, ITEM_FINGERPRINT } from './items';
import { CONSTRUCTION_RULES, WORKER, WORKER_EFFECT } from './construction';
import legacyReplay from './fixtures/tools-v1-replay.json';
import type { Replay } from './engine';

const map = [1, 2, 3, 4].map((id, i) => ({ ...nodes[i], id, kind: 0, adjacent: [id === 1 ? 2 : 1] }));
const land = { ...PROPERTY_CATALOG.properties[0], id: 'land-a', kind: 'land', nodeIds: [1, 2] };
const other = { ...land, id: 'land-b', nodeIds: [3] };
const facility = { ...PROPERTY_CATALOG.properties.find(p => p.kind === 'facility')!, nodeIds: [4] };
const definitions = [land, other, facility];
function make(count = 2) {
  return new GameEngine(map, { gameId: 'worker', seed: 'worker', rulesId: CONSTRUCTION_RULES.id, characterIds: ['a', 'b', 'c', 'd'].slice(0, count) }, definitions);
}
function command(engine: GameEngine, action: Action) {
  const s = engine.state;
  return { id: `cmd-${s.revision}`, expectedRevision: s.revision, gameId: s.gameId, playerId: s.players[s.active].id, action };
}
function send(engine: GameEngine, action: Action) { const c = command(engine, action); expect(engine.dispatch(c).ok).toBe(true); return c; }
function begin(engine: GameEngine) { send(engine, { type: 'item', action: { type: 'begin', definitionId: WORKER_EFFECT } }); }
function confirm(engine: GameEngine, target = 'land-a'): Action { return { type: 'item', action: { type: 'confirm', decisionId: engine.state.pending!.id, target: { kind: 'property', id: target } } }; }
function landAfterRoll(engine: GameEngine) {
  send(engine, { type: 'roll' });
  for (let i = 0; i < 10 && ['rolling', 'moving'].includes(engine.state.phase); i++) send(engine, { type: 'animationDone', token: engine.state.pending!.id });
}

describe('S2-02b versioned current-land worker', () => {
  it.each([2, 3, 4])('grants exactly one worker to %i players without taking from the remote dice pool', count => {
    const s = make(count).state;
    expect(s.items!.supply).toBe(10 - count);
    for (const inventory of Object.values(s.effects!.inventory)) expect(inventory).toEqual({ [WORKER]: 1, [REMOTE_DICE]: 1 });
  });
  it('cancels without charge and rejects wrong target, phase, stale token and paused confirmation atomically', () => {
    const engine = make(); begin(engine);
    const old = engine.state.pending!.id;
    send(engine, { type: 'item', action: { type: 'cancel', decisionId: old } });
    begin(engine);
    const before = engine.state, events = engine.events;
    for (const target of ['land-b', facility.id, 'unknown']) expect(engine.dispatch(command(engine, confirm(engine, target))).ok).toBe(false);
    expect(engine.dispatch(command(engine, { ...confirm(engine), value: 3 } as Action)).ok).toBe(false);
    expect(engine.dispatch(command(engine, { type: 'roll' })).ok).toBe(false);
    expect(engine.dispatch(command(engine, { type: 'item', action: { type: 'cancel', decisionId: old } })).ok).toBe(false);
    expect(engine.dispatch({ ...command(engine, confirm(engine)), playerId: 'player-2' }).ok).toBe(false);
    expect(engine.state).toEqual(before); expect(engine.events).toEqual(events);
    send(engine, { type: 'pause', value: true });
    expect(engine.dispatch(command(engine, confirm(engine)))).toEqual({ ok: false, reason: 'paused' });
    send(engine, { type: 'pause', value: false });
    const c = send(engine, confirm(engine));
    expect(engine.dispatch(c)).toEqual({ ok: false, reason: 'duplicate' });
    expect(engine.state.economy!.properties[0].level).toBe(1);
    expect(engine.state.effects!.inventory['player-1'][WORKER]).toBe(0);
    expect(engine.state.items).toEqual(before.items);
    expect(engine.state.randomState).toBe(before.randomState);
    expect(engine.state.turn).toBe(before.turn);
    expect(engine.state.players).toEqual(before.players);
    expect(engine.state.phase).toBe('idle');
    expect(engine.dispatch(command(engine, { type: 'item', action: { type: 'begin', definitionId: WORKER_EFFECT } })).ok).toBe(false);
  });
  it('builds vacant land, preserves ownership, affects subsequent purchase and rent, then allows remote dice', () => {
    const engine = make(); const balances = engine.state.economy!.balances;
    begin(engine); send(engine, confirm(engine));
    expect(engine.state.economy!.balances).toEqual(balances);
    expect(engine.state.economy!.properties[0]).toEqual({ id: 'land-a', ownerId: null, level: 1 });
    landAfterRoll(engine);
    const buy = engine.state.pending!;
    if (buy.kind !== 'property') throw Error('Expected property');
    expect(buy.amount).toBe(land.basePrice + land.upgradeCost);
    send(engine, { type: 'property', decisionId: buy.id, accept: true }); send(engine, { type: 'endTurn' });
    begin(engine); send(engine, confirm(engine)); // player 2 builds another player's same multi-node property
    expect(engine.state.economy!.properties[0]).toEqual({ id: 'land-a', ownerId: 'player-1', level: 2 });
    send(engine, { type: 'item', action: { type: 'begin', definitionId: REMOTE_EFFECT } });
    const rng = engine.state.randomState;
    send(engine, { type: 'item', value: 1, action: { type: 'confirm', decisionId: engine.state.pending!.id, target: { kind: 'player', id: 'player-2' } } });
    expect(engine.state.randomState).toBe(rng);
    while (engine.state.phase !== 'property') send(engine, { type: 'animationDone', token: engine.state.pending!.id });
    const rent = engine.state.pending!;
    if (rent.kind !== 'property') throw Error('Expected rent');
    expect(rent.operation).toBe('rent'); expect(rent.amount).toBe(land.rents[2]);
    send(engine, { type: 'property', decisionId: rent.id, accept: true });
    const replay = replayGame(map, JSON.parse(JSON.stringify(engine.exportReplay())), definitions);
    expect(replay.state).toEqual(engine.state); expect(replay.events).toEqual(engine.events);
  });
  it('rejects facilities and reaches level 5 without consuming a worker at the cap', () => {
    const engine = make(4);
    landAfterRoll(engine);
    send(engine, { type: 'property', decisionId: engine.state.pending!.id, accept: true });
    send(engine, { type: 'endTurn' }); landAfterRoll(engine);
    send(engine, { type: 'property', decisionId: engine.state.pending!.id, accept: true });
    send(engine, { type: 'endTurn' }); landAfterRoll(engine);
    send(engine, { type: 'property', decisionId: engine.state.pending!.id, accept: true });
    send(engine, { type: 'endTurn' });
    expect(engine.state.players[3].node).toBe(4);
    expect(engine.dispatch(command(engine, { type: 'item', action: { type: 'begin', definitionId: WORKER_EFFECT } })).ok).toBe(false);
    // Advance through ordinary gameplay, owner upgrades each lap. No direct state mutation.
    for (let i = 0; i < 30 && engine.state.economy!.properties[0].level < 5; i++) {
      landAfterRoll(engine);
      if (engine.state.pending?.kind === 'property') send(engine, { type: 'property', decisionId: engine.state.pending.id, accept: true });
      send(engine, { type: 'endTurn' });
    }
    expect(engine.state.economy!.properties[0].level).toBe(5);
    const before = engine.state;
    expect(engine.dispatch(command(engine, { type: 'item', action: { type: 'begin', definitionId: WORKER_EFFECT } })).ok).toBe(false);
    expect(engine.state).toEqual(before);
  });
  it('does not sell workers or return their inventory into the remote dice pool at bankruptcy', () => {
    const shopMap = [{ ...map[0], id: 50, kind: 6001, adjacent: [50] }, { ...map[1], adjacent: [50] }];
    const shop = new GameEngine(shopMap, { gameId: 'shop', seed: 'shop', characterIds: ['a', 'b'], rulesId: CONSTRUCTION_RULES.id }, []);
    landAfterRoll(shop);
    const beforeShop = shop.state;
    expect(beforeShop.phase).toBe('shop');
    expect(shop.dispatch(command(shop, { type: 'buyItem', decisionId: beforeShop.pending!.id, itemId: WORKER })).ok).toBe(false);
    expect(shop.state).toEqual(beforeShop);
    const costly = [{ ...land, rents: Array(6).fill(100001) }, other, facility];
    const engine = new GameEngine(map, { gameId: 'debt', seed: 'debt', characterIds: ['a', 'b'], rulesId: CONSTRUCTION_RULES.id }, costly);
    landAfterRoll(engine); send(engine, { type: 'property', decisionId: engine.state.pending!.id, accept: true }); send(engine, { type: 'endTurn' });
    landAfterRoll(engine); expect(engine.state.phase).toBe('debt');
    const supply = engine.state.items!.supply;
    send(engine, { type: 'settleDebt', decisionId: engine.state.pending!.id });
    expect(engine.state.phase).toBe('finished');
    expect(engine.state.effects!.inventory['player-2']).toEqual({});
    expect(engine.state.items!.supply).toBe(supply + 1);
    expect(engine.events.filter(e => e.type === 'inventoryCleared')).toMatchObject([{ items: { [REMOTE_DICE]: 1, [WORKER]: 1 } }]);
    expect(replayGame(map, engine.exportReplay(), costly).state).toEqual(engine.state);
  });
  it('keeps a real first-batch replay fingerprint, inventory, controlled roll and rules unchanged', () => {
    expect(ITEM_FINGERPRINT).toBe(legacyReplay.itemFingerprint);
    const engine = replayGame(nodes, legacyReplay as Replay);
    expect(engine.state.rulesId).toBe(ITEM_RULES.id);
    expect(engine.state.dice).toBe(2);
    expect(engine.state.effects!.inventory['player-1']).toEqual({ [REMOTE_DICE]: 0 });
    expect(engine.state.effects!.inventory['player-2']).toEqual({ [REMOTE_DICE]: 1 });
    expect(engine.events.map(e => e.type)).toEqual(['effectOffered', 'effectConsumed', 'effectResolved', 'itemSupplyChanged', 'rolled']);
    const before = engine.state;
    expect(engine.dispatch(command(engine, { type: 'item', action: { type: 'begin', definitionId: WORKER_EFFECT } })).ok).toBe(false);
    expect(engine.state).toEqual(before);
    const v2 = make().exportReplay();
    expect(() => replayGame(map, { ...v2, itemFingerprint: ITEM_FINGERPRINT }, definitions)).toThrow(/道具/);
  });
});
