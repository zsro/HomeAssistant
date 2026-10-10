import { describe, expect, it } from 'vitest';
import nodes from '../japan-topology.fixture.json';
import { GameEngine, replayGame } from './engine';
import type { Action } from './engine';
import { ROAD_RULES, ROAD_GOODS, ROADBLOCK, ROADBLOCK_EFFECT, ROBOT, ROBOT_EFFECT, roadblockTargets, robotPath } from './road-tools';
import { REMOTE_EFFECT, REMOTE_DICE } from './items';
import { PROPERTY_CATALOG } from './economy';

const map = [1, 2, 20, 50].map((id, i, ids) => ({ id, x: 1000 + i * 10, y: 1000, name: '', kind: id === 50 ? 6001 : 0, adjacent: [ids[(i + 1) % ids.length]] }));
function make(count = 2) { return new GameEngine(map, { gameId: 'road', seed: 'road', rulesId: ROAD_RULES.id, characterIds: ['a', 'b', 'c', 'd'].slice(0, count) }, []); }
function command(e: GameEngine, action: Action) { const s = e.state; return { id: `c${s.revision}`, gameId: s.gameId, expectedRevision: s.revision, playerId: s.players[s.active].id, action }; }
function send(e: GameEngine, action: Action) { const c = command(e, action); expect(e.dispatch(c).ok).toBe(true); return c; }
function begin(e: GameEngine, definitionId: string) { send(e, { type: 'item', action: { type: 'begin', definitionId } }); }
function confirm(e: GameEngine, node?: number, value?: number): Action { return { type: 'item', value, action: { type: 'confirm', decisionId: e.state.pending!.id, target: node === undefined ? { kind: 'player', id: e.state.players[e.state.active].id } : { kind: 'node', id: String(node) } } }; }
function activate(e: GameEngine, definitionId: string, node?: number, value?: number) { begin(e, definitionId); send(e, confirm(e, node, value)); }
function move(e: GameEngine, value: number) { activate(e, REMOTE_EFFECT, undefined, value); while (['rolling', 'moving'].includes(e.state.phase)) send(e, { type: 'animationDone', token: e.state.pending!.id }); }
function conserved(e: GameEngine) {
  const s = e.state;
  for (const id of [ROBOT, ROADBLOCK]) {
    const counts = Object.values(s.effects!.inventory).map(inv => inv[id] ?? 0);
    expect(s.roadTools!.supply[id] + counts.reduce((a, b) => a + b, 0) + (id === ROADBLOCK ? s.roadTools!.blocks.length : 0)).toBe(10);
    expect(counts.every(n => n >= 0 && n <= 9)).toBe(true);
  }
}
function replay(e: GameEngine, world = map, definitions: typeof PROPERTY_CATALOG.properties = []) {
  const copy = replayGame(world, JSON.parse(JSON.stringify(e.exportReplay())), definitions);
  expect(copy.state).toEqual(e.state); expect(copy.events).toEqual(e.events);
}

describe('road tools candidate v4', () => {
  it.each([2, 3, 4])('initializes %i players with conserved independent pools', count => {
    const e = make(count); conserved(e);
    expect(e.state.roadTools!.supply).toEqual({ [ROBOT]: 10 - count, [ROADBLOCK]: 10 - count });
    replay(e);
  });
  it('cancels, rejects invalid targets, out-of-range nodes, stale tokens, wrong players and paused confirmations atomically', () => {
    const e = make(); const initial = e.state;
    begin(e, ROADBLOCK_EFFECT); const old = e.state.pending!.id;
    send(e, { type: 'item', action: { type: 'cancel', decisionId: old } });
    expect(e.state.effects!.inventory).toEqual(initial.effects!.inventory);
    expect(e.state.roadTools).toEqual(initial.roadTools);
    begin(e, ROADBLOCK_EFFECT); const before = e.state;
    for (const action of [confirm(e, 999), confirm(e), confirm(e, 2, 3), { type: 'roll' } as Action,
      { type: 'item', action: { type: 'cancel', decisionId: old } } as Action]) expect(e.dispatch(command(e, action)).ok).toBe(false);
    expect(e.dispatch({ ...command(e, confirm(e, 2)), playerId: 'player-2' }).ok).toBe(false);
    expect(e.state).toEqual(before);
    send(e, { type: 'pause', value: true }); expect(e.dispatch(command(e, confirm(e, 2))).ok).toBe(false);
    send(e, { type: 'pause', value: false }); const accepted = send(e, confirm(e, 2));
    expect(e.dispatch(accepted).ok).toBe(false); conserved(e);
    expect(e.state.roadTools!.supply[ROADBLOCK]).toBe(8);
    const targets = roadblockTargets(map[0], [...map, { ...map[0], id: 90, x: 9000 }], [2]);
    expect(targets).not.toContain(2); expect(targets).not.toContain(90);
  });
  it('stops on entry, discards extra steps, returns supply and settles a point landing once', () => {
    const e = make(); activate(e, ROADBLOCK_EFFECT, 20); move(e, 6);
    expect(e.state.players[0].node).toBe(20); expect(e.state.completed).toBe(1);
    expect(e.state.items!.points['player-1']).toBe(50);
    expect(e.events.filter(v => v.type === 'roadblockStopped')).toEqual([expect.objectContaining({ node: 20, discarded: 4 })]);
    expect(e.events.filter(v => v.type === 'landed')).toHaveLength(1);
    expect(e.state.roadTools!.blocks).toEqual([]); conserved(e); replay(e);
  });
  it('also consumes a roadblock on the final step and opens a landing bank exactly once', () => {
    const bankMap = map.map(n => ({ ...n, kind: n.id === 1 ? 6006 : n.kind }));
    const e = new GameEngine(bankMap, { gameId: 'bank', seed: 'road', rulesId: ROAD_RULES.id, characterIds: ['a', 'b'] }, []);
    activate(e, ROADBLOCK_EFFECT, 1); move(e, 4);
    expect(e.state.pending).toMatchObject({ kind: 'bank', arrival: 'landing', node: 1 });
    send(e, { type: 'leaveBank', decisionId: e.state.pending!.id });
    expect(e.events.filter(v => v.type === 'bankOffered')).toHaveLength(1);
    expect(e.events.filter(v => v.type === 'landed')).toHaveLength(1);
    expect(e.events.find(v => v.type === 'roadblockStopped')).toMatchObject({ discarded: 0 });
    conserved(e); replay(e, bankMap);
  });
  it('robot clears encountered blocks once across a loop and does not move players, award points or alter dice RNG', () => {
    const e = make(); activate(e, ROADBLOCK_EFFECT, 20); const before = e.state;
    begin(e, ROBOT_EFFECT); expect(e.dispatch(command(e, confirm(e, 2))).ok).toBe(false);
    send(e, confirm(e)); const after = e.state;
    expect(after.players).toEqual(before.players); expect(after.economy).toEqual(before.economy);
    expect(after.items).toEqual(before.items); expect(after.randomState).toBe(before.randomState);
    expect(after.completed).toBe(0); expect(after.phase).toBe('idle');
    expect(after.roadTools!.lastRobotPath).toEqual([2, 20, 50, 1, 2, 20, 50, 1, 2]);
    expect(e.events.filter(v => v.type === 'roadblockRemoved')).toHaveLength(1);
    expect(e.events.find(v => v.type === 'robotCleared')).toMatchObject({ cleared: [20] });
    expect(e.events.some(v => v.type === 'shopOffered' || v.type === 'landed')).toBe(false);
    conserved(e); replay(e);
  });
  it('uses an explicit stable branch policy, avoids previous and folds back at a dead end', () => {
    const branchMap = [ { ...map[0], id: 1, adjacent: [3, 2] }, { ...map[1], id: 2, adjacent: [1] }, { ...map[2], id: 3, adjacent: [1] } ];
    expect(robotPath(branchMap, 1, null)).toEqual([2, 1, 3, 1, 2, 1, 3, 1, 2]);
    expect(robotPath(branchMap, 1, 2)[0]).toBe(3);
  });
  it('buys both tools with points, refreshes the shop decision and rejects unsupported stock', () => {
    const e = make(); move(e, 2); send(e, { type: 'endTurn' }); move(e, 1); send(e, { type: 'endTurn' });
    send(e, { type: 'roll' }); // one-way ring: resolve until landing; choose seed-independent shop entry below
    for (let i = 0; i < 500 && !(e.state.phase === 'shop' && e.state.items!.points[e.state.players[e.state.active].id] >= 45); i++) {
      const s = e.state, p = s.pending;
      if (p?.kind === 'roll' || p?.kind === 'segment') send(e, { type: 'animationDone', token: p.id });
      else if (p?.kind === 'shop') send(e, { type: 'leaveShop', decisionId: p.id });
      else if (s.phase === 'turnEnd') send(e, { type: 'endTurn' });
      else send(e, { type: 'roll' });
    }
    expect(e.state.phase).toBe('shop'); const id = e.state.players[e.state.active].id, points = e.state.items!.points[id];
    const old = e.state.pending!.id;
    send(e, { type: 'buyItem', decisionId: old, itemId: ROBOT });
    expect(e.dispatch(command(e, { type: 'buyItem', decisionId: old, itemId: ROADBLOCK })).ok).toBe(false);
    send(e, { type: 'buyItem', decisionId: e.state.pending!.id, itemId: ROADBLOCK });
    expect(e.state.items!.points[id]).toBe(points - 45);
    const before = e.state;
    expect(e.dispatch(command(e, { type: 'buyItem', decisionId: e.state.pending!.id, itemId: 'tool:03' })).ok).toBe(false);
    expect(e.state).toEqual(before); conserved(e); replay(e);
  });
  it('rejects duplicate occupation while allowing cancellation and leaves blocks when their placer goes bankrupt', () => {
    const land = { ...PROPERTY_CATALOG.properties[0], id: 'test', nodeIds: [20], basePrice: 1, rents: Array(6).fill(100000) };
    const e = new GameEngine(map, { gameId: 'debt', seed: 'road', rulesId: ROAD_RULES.id, initialFunds: 30000, characterIds: ['a', 'b'] }, [land]);
    move(e, 2); send(e, { type: 'property', decisionId: e.state.pending!.id, accept: true }); send(e, { type: 'endTurn' });
    activate(e, ROADBLOCK_EFFECT, 50); move(e, 1);
    expect(e.state.phase).toBe('debt'); send(e, { type: 'settleDebt', decisionId: e.state.pending!.id });
    expect(e.state.roadTools!.blocks).toEqual([50]); expect(e.state.effects!.inventory['player-2']).toEqual({});
    conserved(e); replay(e, map, [land]);
    const live = make(); activate(live, ROADBLOCK_EFFECT, 1); move(live, 1); send(live, { type: 'endTurn' }); begin(live, ROADBLOCK_EFFECT);
    const before = live.state; expect(live.dispatch(command(live, confirm(live, 1))).ok).toBe(false); expect(live.state).toEqual(before);
    send(live, { type: 'item', action: { type: 'cancel', decisionId: live.state.pending!.id } }); conserved(live);
  });
  it('binds v4 replay to its own fingerprint and exports the original map consistently', () => {
    const e = new GameEngine(nodes, { gameId: 'real', seed: 'road', rulesId: ROAD_RULES.id, characterIds: ['a', 'b'] });
    const target = roadblockTargets(nodes[0], nodes, [])[1]; activate(e, ROADBLOCK_EFFECT, target); activate(e, ROBOT_EFFECT);
    replay(e, nodes, PROPERTY_CATALOG.properties);
    expect(() => replayGame(nodes, { ...e.exportReplay(), itemFingerprint: '18003b93' })).toThrow(/道具/);
  });
});

function playStep(engine: GameEngine, withTools = true) {
  const s = engine.state, p = s.pending, id = s.players[s.active].id;
  if (s.phase === 'idle') {
    if (s.effects!.inventory[id][ROBOT]) { activate(engine, ROBOT_EFFECT); return; }
    const target = roadblockTargets(nodes.find(n => n.id === s.players[s.active].node)!, nodes, s.roadTools!.blocks).find(n => n !== s.players[s.active].node);
    if (s.effects!.inventory[id][ROADBLOCK] && target) { activate(engine, ROADBLOCK_EFFECT, target); return; }
    if (withTools && s.effects!.inventory[id][REMOTE_DICE]) { activate(engine, REMOTE_EFFECT, undefined, s.turn % 6 + 1); }
    else send(engine, { type: 'roll' });
  } else if (s.phase === 'turnEnd') send(engine, { type: 'endTurn' });
  else if (p?.kind === 'branch') send(engine, { type: 'choose', decisionId: p.id, node: p.choices[(s.turn - 1) % p.choices.length] });
  else if (p?.kind === 'property') send(engine, { type: 'property', decisionId: p.id, accept: p.operation === 'rent' || s.economy!.balances[id].cash >= p.amount });
  else if (p?.kind === 'bank') {
    const amount = s.economy!.balances[id].bank;
    if (amount) send(engine, { type: 'bank', decisionId: p.id, operation: 'withdraw', amount });
    send(engine, { type: 'leaveBank', decisionId: engine.state.pending!.id });
  } else if (p?.kind === 'shop') {
    for (const good of ROAD_GOODS) {
      const current = engine.state;
      if (current.items!.points[id] >= good.price && current.roadTools!.supply[good.id] && (current.effects!.inventory[id][good.id] ?? 0) < 2)
        send(engine, { type: 'buyItem', decisionId: current.pending!.id, itemId: good.id });
    }
    if (engine.state.items!.points[id] >= 30 && s.items!.supply && (s.effects!.inventory[id][REMOTE_DICE] ?? 0) < 9) send(engine, { type: 'buyItem', decisionId: engine.state.pending!.id, itemId: REMOTE_DICE });
    send(engine, { type: 'leaveShop', decisionId: engine.state.pending!.id });
  } else if (p?.kind === 'debt') send(engine, { type: 'settleDebt', decisionId: p.id });
  else if (p) send(engine, { type: 'animationDone', token: p.id });
  else throw Error('Unexpected phase');
}

describe('v4 original Japan full games', () => {
  it.each([2, 3, 4])('conserves pools through purchases, use, bankruptcy and exact replay for %i players', count => {
    const e = new GameEngine(nodes, { gameId: `road-long-${count}`, seed: 's1-04-loop', rulesId: ROAD_RULES.id, initialFunds: 30000, characterIds: ['a', 'b', 'c', 'd'].slice(0, count) });
    for (let i = 0; i < 22000 && e.state.phase !== 'finished'; i++) { playStep(e); if (i % 50 === 0) conserved(e); }
    expect(e.state.phase).toBe('finished'); conserved(e);
    expect(e.state.finance!.eliminated).toHaveLength(count - 1);
    for (const id of e.state.finance!.eliminated) expect(e.state.effects!.inventory[id]).toEqual({});
    expect(e.events.some(v => v.type === 'roadblockStopped')).toBe(true);
    expect(e.events.some(v => v.type === 'robotCleared')).toBe(true);
    expect(e.events.some(v => v.type === 'itemBought' && v.itemId !== REMOTE_DICE)).toBe(true);
    replay(e, nodes, PROPERTY_CATALOG.properties);
  }, 30000);
});
