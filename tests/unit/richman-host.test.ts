import { describe, expect, it } from 'vitest';
import { GameHost } from '../../shared/richman/host';
import type { Seat } from '../../shared/richman/host';
import { GameEngine } from '../../shared/richman/game/engine';
import { projectGame } from '../../shared/richman/projection';
import { SERVER_MANIFEST } from '../../shared/richman/content';
import { SURRENDER_RULES } from '../../shared/richman/game/surrender';
import { fixtureHost } from '../helpers/richman-host-fixture';
import { decideComputer, observeResearch } from '../../shared/richman/game/computer-research';

const seats: Seat[] = ['xiaomei', 'tuu'].map((characterId, i) =>
  ({ playerId: `player-${i + 1}`, userId: `user-${i + 1}`, characterId, policy: null }));
const create = (members = seats) => new GameHost({ gameId: 'host-test', seed: 'save03-0', rulesId: SURRENDER_RULES.id,
  characterIds: members.map(s => s.characterId), humanIds: members.filter(s => s.userId).map(s => s.playerId) }, members);
const online = new Set(['user-1', 'user-2']);
const roll = (host: GameHost) => host.input('user-1', { id: 'roll', expectedRevision: 0, action: { type: 'roll' } });

describe('NET-01 shared authoritative host', () => {
  it('owns dice and animation progression; rejected commands do not change RNG', () => {
    const host = create(), before = host.checkpoint();
    for (const action of [{ type: 'animationDone', token: 'host-test:1' }, { type: 'pause', value: true },
      { type: 'minigame', decisionId: 'x', input: { kind: 'tick' } }] as const) {
      expect(() => host.input('user-1', { id: 'forged', expectedRevision: 0, action })).toThrow('NET_INTERNAL_COMMAND');
    }
    expect(host.checkpoint()).toEqual(before);
    roll(host); expect(host.state.phase).toBe('rolling');
    host.advance(250, online); host.advance(250, online);
    expect(host.state.revision).toBe(1);
    host.advance(150, online); expect(host.state.revision).toBeGreaterThan(1);
  });
  it('rejects wrong seats, stale revisions and extra action fields', () => {
    const host = create();
    expect(() => host.input('outsider', { id: 'x', expectedRevision: 0, action: { type: 'roll' } })).toThrow('NET_NOT_MEMBER');
    expect(() => host.input('user-2', { id: 'x', expectedRevision: 0, action: { type: 'roll' } })).toThrow('NET_WRONG_PLAYER');
    expect(() => host.input('user-1', { id: 'x', expectedRevision: 0, action: { type: 'roll', dice: 6 } as never })).toThrow('NET_INVALID_COMMAND');
    roll(host);
    expect(() => host.input('user-1', { id: 'x', expectedRevision: 0, action: { type: 'endTurn' } })).toThrow('NET_STALE');
  });
  it('forks an isolated candidate and restores pending animation without wall-clock catch-up', () => {
    const host = create(); roll(host); host.advance(200, online);
    const fork = host.fork(); fork.advance(250, online); fork.advance(200, online);
    expect(host.state.revision).toBe(1); expect(fork.state.revision).toBe(2);
    const restored = GameHost.restore(host.checkpoint());
    expect(restored.checkpoint()).toEqual(host.checkpoint());
    restored.advance(0, online); expect(restored.state.revision).toBe(1);
    restored.advance(100_000, online); expect(restored.state.revision).toBe(1); // Max 250 ms per pulse.
  });
  it('schedules AI but never answers for a disconnected human', () => {
    const host = create([{ ...seats[0]!, userId: null, policy: 'research-v1' }, seats[1]!]);
    host.advance(250, new Set()); host.advance(250, new Set()); const steps = host.advance(100, new Set());
    expect(steps[0]?.command.action.type).toBe('roll');
    const restarted = GameHost.restore(host.checkpoint());
    expect(restarted.advance(250, new Set())).toEqual(host.advance(250, new Set()));
    expect(restarted.checkpoint()).toEqual(host.checkpoint());
    const human = create(), before = human.checkpoint();
    human.advance(1_000_000, new Set()); expect(human.checkpoint()).toEqual(before);
  });
  it.each([['surrender-v47-4', 395], ['surrender-v47-3', 4], ['presentation-v47-research-focused', 2286]] as const)(
    'preserves golden events, RNG and research memory after checkpoint: %s', (name, split) => {
    const { host, replay, index } = fixtureHost(name, (_state, i) => i === split);
    const restored = GameEngine.fromCheckpoint(SERVER_MANIFEST.map.nodes, host.checkpoint().engine);
    let memory = host.checkpoint().researchMemory, originalMemory = structuredClone(memory);
    if (name.includes('research')) expect(Object.keys(memory).length).toBeGreaterThan(0);
    const baseline = new GameEngine(SERVER_MANIFEST.map.nodes, replay.config);
    for (const command of replay.commands.slice(0, index)) expect(baseline.dispatch(command).ok).toBe(true);
    for (const command of replay.commands.slice(index)) {
      const a = restored.state, b = baseline.state, got = restored.dispatch(command), expected = baseline.dispatch(command);
      expect(got).toEqual(expected);
      if (!got.ok || !expected.ok) throw new Error('fixture rejected');
      memory = observeResearch(memory, a, command.action, restored.state, got.events);
      originalMemory = observeResearch(originalMemory, b, command.action, baseline.state, expected.events);
      expect(memory).toEqual(originalMemory);
      expect(restored.state).toEqual(baseline.state);
      expect(decideComputer(restored.state, SERVER_MANIFEST.map.nodes, 'research-v1', memory)).toEqual(
        decideComputer(baseline.state, SERVER_MANIFEST.map.nodes, 'research-v1', originalMemory));
    }
    expect(() => restored.exportReplay()).toThrow('持久命令日志');
  }, 30_000);
  it('binds non-active auction responders to their own accounts', () => {
    const { host } = fixtureHost('surrender-v47-4', state => state.pending?.kind === 'auction' &&
      state.pending.responderId !== state.players[state.active]?.id);
    const p = host.state.pending;
    if (p?.kind !== 'auction') throw new Error('missing auction');
    const action = { type: 'auction' as const, decisionId: p.id, increment: null };
    const activeUser = host.seats.find(s => s.playerId === host.state.players[host.state.active]!.id)!.userId!;
    const responding = host.seats.find(s => s.playerId === p.responderId)!.userId!;
    expect(() => host.input(activeUser, { id: 'wrong', expectedRevision: host.state.revision, action })).toThrow('NET_WRONG_PLAYER');
    expect(host.input(responding, { id: 'right', expectedRevision: host.state.revision, action }).command.playerId).toBe(p.responderId);
  });
  it('refuses incompatible checkpoints and duplicate/unknown seats', () => {
    const saved = create().checkpoint(); saved.engine.state.mapFingerprint = 'bad';
    expect(() => GameHost.restore(saved)).toThrow('不兼容');
    expect(() => create([seats[0]!, { ...seats[1]!, userId: seats[0]!.userId }])).toThrow('NET_INVALID_SEATS');
    expect(() => create([seats[0]!, { ...seats[1]!, characterId: 'unknown' }])).toThrow('NET_INVALID_SEATS');
  });
});

describe('NET-01 private projections and server minigame clock', () => {
  const mini = () => fixtureHost('presentation-v47-g7-changed-set', state => state.pending?.kind === 'minigame' && state.pending.stage === 'playing').host;
  it('keeps hidden treasure, seed, RNG, decks, checkpoints, memories and other inventories off the wire', () => {
    const host = mini(), active = host.state.players[host.state.active]!.id;
    const self = host.seats.find(s => s.playerId === active)!, other = host.seats.find(s => s.playerId !== active)!;
    const view = projectGame(host, self.userId!, online), json = JSON.stringify(view);
    for (const forbidden of ['randomState', '"seed"', 'checkpoints', 'researchMemory', '"order"', '"cursor"', 'humanIds', '"userId"']) expect(json).not.toContain(forbidden);
    expect(view.private.inventory).toEqual(host.state.effects!.inventory[self.playerId]);
    const opponent = projectGame(host, other.userId!, online);
    expect(opponent.private.inventory).toEqual(host.state.effects!.inventory[other.playerId]);
    expect(Object.keys(opponent.decision!)).toEqual(['id', 'kind', 'responderId']);
    expect(() => projectGame(host, 'stranger', online)).toThrow('NET_NOT_MEMBER');
  });
  it('masks every undug penguin treasure and trap in a real playable board', () => {
    const host = fixtureHost('presentation-v47-paid-upgrade-tuu', s =>
      s.pending?.kind === 'minigame' && s.pending.game === 'penguin' && s.pending.stage === 'playing').host;
    const p = host.state.pending;
    if (p?.kind !== 'minigame' || !p.penguin) throw new Error('missing penguin');
    expect(p.penguin.cells.some(n => n > 0)).toBe(true);
    const user = host.seats.find(s => s.playerId === host.state.players[host.state.active]!.id)!.userId!;
    const output = projectGame(host, user, online).decision as unknown as { penguin: { cells: (number | null)[] } };
    expect(output.penguin.cells).toEqual(p.penguin.cells.map(n => n < 0 ? -1 : null));
  }, 30_000);
  it('pauses minigame clock offline, resumes from checkpoint, and advances only host ticks', () => {
    const host = mini(), before = host.state;
    host.advance(250, new Set()); expect(host.state).toEqual(before);
    const restored = GameHost.restore(host.checkpoint());
    const steps = restored.advance(250, online);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.every(s => s.command.action.type === 'minigame' && s.command.action.input.kind === 'tick')).toBe(true);
    const repeat = GameHost.restore(host.checkpoint()); repeat.advance(250, online);
    expect(restored.checkpoint()).toEqual(repeat.checkpoint());
  });
  it('allows bounded delayed input in the same minigame, rejects future/old/other decisions', () => {
    const host = mini(), state = host.state, p = state.pending;
    if (p?.kind !== 'minigame') throw new Error('missing minigame');
    const user = host.seats.find(s => s.playerId === state.players[state.active]!.id)!.userId!;
    const action = { type: 'minigame' as const, decisionId: p.id, input: p.game === 'penguin' ?
      { kind: 'dig' as const, cell: 56 } : { kind: 'point' as const, x: 200, y: 200 } };
    host.advance(200, online);
    expect(() => host.input(user, { id: 'future', expectedRevision: host.state.revision + 1, action })).toThrow('NET_STALE');
    expect(() => host.input(user, { id: 'old', expectedRevision: 0, action })).toThrow('NET_STALE');
    expect(() => host.input(user, { id: 'wrong-decision', expectedRevision: state.revision, action: { ...action, decisionId: 'old' } })).toThrow('NET_STALE');
    const step = host.input(user, { id: 'input', expectedRevision: state.revision, action });
    expect(step.command.expectedRevision).toBeGreaterThan(state.revision);
  });
});
