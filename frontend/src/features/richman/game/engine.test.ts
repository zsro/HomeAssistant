import { describe, expect, it } from 'vitest';
import nodes from '../japan-topology.fixture.json';
import { GameEngine, replayGame, TURN_RULES } from './engine';
import type { Action, Command } from './engine';

function make(count = 4, seed = 'japan-s1-02', gameId = 'test-game') {
  return new GameEngine(nodes, { gameId, seed, characterIds: ['xiaomei', 'tuu', 'chyan', 'salonbus'].slice(0, count) });
}
function envelope(engine: GameEngine, action: Action): Command {
  const state = engine.state;
  return { id: `command-${state.revision}`, gameId: state.gameId, expectedRevision: state.revision,
    playerId: state.players[state.active].id, action };
}
function send(engine: GameEngine, action: Action) {
  const command = envelope(engine, action);
  expect(engine.dispatch(command).ok).toBe(true);
  return command;
}
function finish(engine: GameEngine) {
  let iterations = 0;
  while (engine.state.phase !== 'turnEnd' && iterations++ < 30) {
    const pending = engine.state.pending!;
    if (pending.kind === 'branch') send(engine, { type: 'choose', decisionId: pending.id, node: pending.choices[0] });
    else send(engine, { type: 'animationDone', token: pending.id });
  }
  expect(engine.state.phase).toBe('turnEnd');
}

describe('S1-02 authoritative turn engine', () => {
  it.each([2, 3, 4])('rotates exactly %i players without advancing before confirmation', (count) => {
    const engine = make(count);
    for (let turn = 0; turn < count * 2; turn++) {
      expect(engine.state.active).toBe(turn % count);
      send(engine, { type: 'roll' }); finish(engine);
      expect(engine.state.active).toBe(turn % count);
      expect(engine.state.completed).toBe(turn + 1);
      send(engine, { type: 'endTurn' });
      expect(engine.state.turn).toBe(turn + 2);
      expect(engine.state.phase).toBe('idle');
    }
  });

  it('rejects invalid rosters and maps, and keeps unresolved economics disabled', () => {
    expect(() => make(1)).toThrow();
    expect(() => new GameEngine(nodes, { gameId: 'g', seed: 's', characterIds: ['a', 'a'] })).toThrow();
    expect(() => new GameEngine([{ ...nodes[0], adjacent: [999] }], { gameId: 'g', seed: 's', characterIds: ['a', 'b'] })).toThrow();
    expect(() => make(2, ' '.repeat(3))).toThrow();
    expect(TURN_RULES.capabilities.economy).toBe(false);
    expect(TURN_RULES.initialFunds).toBeNull();
    expect(TURN_RULES.interestRate).toBeNull();
  });

  it('rejects duplicate, stale, wrong-player and wrong-game commands without consuming randomness', () => {
    const engine = make();
    const roll = envelope(engine, { type: 'roll' });
    for (const patch of [{ playerId: 'player-2' }, { gameId: 'old-game' }, { expectedRevision: 99 }]) {
      const before = engine.state;
      expect(engine.dispatch({ ...roll, ...patch }).ok).toBe(false);
      expect(engine.state).toEqual(before);
    }
    expect(engine.dispatch(roll).ok).toBe(true);
    const after = engine.state;
    expect(engine.dispatch(roll)).toEqual({ ok: false, reason: 'duplicate' });
    expect(engine.dispatch({ ...roll, id: 'stale' })).toEqual({ ok: false, reason: 'stale' });
    expect(engine.dispatch(envelope(engine, { type: 'roll' })).ok).toBe(false);
    expect(engine.state).toEqual(after);
    expect(engine.exportReplay().commands).toHaveLength(1);
  });

  it('requires the live branch decision and live segment token, and emits one arrival per edge', () => {
    const engine = make();
    send(engine, { type: 'roll' });
    send(engine, { type: 'animationDone', token: engine.state.pending!.id });
    const branch = engine.state.pending!;
    expect(branch.kind).toBe('branch');
    if (branch.kind !== 'branch') throw new Error('Expected initial fork');
    const before = engine.state;
    for (const action of [
      { type: 'choose', decisionId: 'stale-choice', node: branch.choices[0] },
      { type: 'choose', decisionId: branch.id, node: 99 },
      { type: 'animationDone', token: branch.id },
    ] as Action[]) expect(engine.dispatch(envelope(engine, action)).ok).toBe(false);
    expect(engine.state).toEqual(before);
    send(engine, { type: 'choose', decisionId: branch.id, node: branch.choices[0] });
    expect(engine.state.remaining).toBe(before.remaining);
    const token = engine.state.pending!.id;
    send(engine, { type: 'animationDone', token });
    const arrived = engine.state;
    expect(engine.dispatch(envelope(engine, { type: 'animationDone', token })).ok).toBe(false);
    expect(engine.state).toEqual(arrived);
    expect(engine.events.filter((e) => e.type === 'nodeEntered')).toHaveLength(1);
  });

  it('pause rejects movement and roll commands and resumes the same pending animation', () => {
    const engine = make();
    send(engine, { type: 'roll' });
    const token = engine.state.pending!.id;
    send(engine, { type: 'pause', value: true });
    const paused = engine.state;
    expect(engine.dispatch(envelope(engine, { type: 'animationDone', token }))).toEqual({ ok: false, reason: 'paused' });
    expect(engine.state).toEqual(paused);
    send(engine, { type: 'pause', value: false });
    expect(engine.state.pending!.id).toBe(token);
    send(engine, { type: 'animationDone', token });
  });

  it('replays 120 turns from serialized commands with identical states, RNG and event order', () => {
    const engine = make(3);
    let totalSteps = 0;
    for (let i = 0; i < 120; i++) {
      send(engine, { type: 'roll' }); totalSteps += engine.state.dice;
      finish(engine); send(engine, { type: 'endTurn' });
    }
    const replay = JSON.parse(JSON.stringify(engine.exportReplay()));
    const restored = replayGame(nodes, replay);
    expect(restored.state).toEqual(engine.state);
    expect(restored.events).toEqual(engine.events);
    expect(restored.events.filter((e) => e.type === 'nodeEntered')).toHaveLength(totalSteps);
    expect(restored.events.filter((e) => e.type === 'landed')).toHaveLength(120);
    expect(restored.events.map((e) => e.sequence)).toEqual(restored.events.map((_, i) => i + 1));
    for (const event of restored.events) if (event.type === 'segmentStarted') {
      expect(nodes.find((n) => n.id === event.from)!.adjacent).toContain(event.to);
    }
  });

  it('detects mismatched replay map/rules and corrupted command revisions', () => {
    const engine = make(); send(engine, { type: 'roll' });
    expect(() => replayGame(nodes, { ...engine.exportReplay(), rulesId: 'unverified-economy' })).toThrow();
    expect(() => replayGame(nodes.slice().reverse(), engine.exportReplay())).toThrow(/地图/);
    const corrupt = engine.exportReplay(); corrupt.commands[0].expectedRevision++;
    expect(() => replayGame(nodes, corrupt)).toThrow(/stale/);
  });

  it('protects authoritative state and configuration from mutated snapshots and callers', () => {
    const ids = ['a', 'b'];
    const engine = new GameEngine(nodes, { gameId: 'g', seed: 's', characterIds: ids });
    ids.reverse();
    const state = engine.state; state.players[0].node = 999;
    expect(engine.state.players[0].characterId).toBe('a');
    expect(engine.state.players[0].node).toBe(1);
    const replay = engine.exportReplay(); replay.config.seed = 'modified';
    expect(engine.exportReplay().config.seed).toBe('s');
  });

  it('allows a dead-end return without inventing reverse connections', () => {
    const map = [
      { ...nodes[0], id: 1, adjacent: [2] },
      { ...nodes[1], id: 2, adjacent: [3] },
      { ...nodes[2], id: 3, adjacent: [2] },
    ];
    const engine = new GameEngine(map, { gameId: 'g', seed: 's', characterIds: ['a', 'b'] });
    for (let i = 0; i < 10; i++) { send(engine, { type: 'roll' }); finish(engine); send(engine, { type: 'endTurn' }); }
    for (const event of engine.events) if (event.type === 'segmentStarted') {
      expect(map.find((n) => n.id === event.from)!.adjacent).toContain(event.to);
    }
  });
});
