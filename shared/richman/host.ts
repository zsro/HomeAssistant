import { GameEngine } from './game/engine';
import type { Action, Command, EngineCheckpoint, GameConfig, GameEvent } from './game/engine';
import { COMPUTER_DELAY, decisionPlayer } from './game/computer';
import type { ComputerPolicy } from './game/computer';
import { decideComputer, observeResearch } from './game/computer-research';
import type { ResearchMemory } from './game/computer-research';
import { validCommand } from './game/save-validation';
import { SURRENDER_RULES } from './game/surrender';
import { SERVER_MANIFEST, CHARACTER_IDS } from './content';

export type Seat = { playerId: string; userId: string | null; characterId: string; policy: ComputerPolicy | null };
export type HostCheckpoint = {
  hostVersion: 1; engine: EngineCheckpoint; seats: Seat[]; researchMemory: ResearchMemory;
  clock: { key: string; elapsed: number };
};
export type Intent = { id: string; expectedRevision: number; action: Action };
export type CommittedStep = { command: Command; events: GameEvent[]; source: 'player' | 'host' };
export class HostError extends Error {
  constructor(readonly code: string) { super(code); this.name = 'HostError'; }
}
const policies: ComputerPolicy[] = ['basic-v1', 'tools-v1', 'rent-v1', 'defense-v1', 'estate-v1', 'cash-v1', 'status-v1',
  'inventory-v1', 'commerce-v1', 'area-v1', 'roads-v1', 'mobility-v1', 'gods-v1', 'capital-v1', 'research-v1'];
export function validateSeats(seats: Seat[]) {
  if (!Array.isArray(seats) || seats.length < 2 || seats.length > 4 ||
    new Set(seats.map(s => s.characterId)).size !== seats.length ||
    new Set(seats.flatMap(s => s.userId ? [s.userId] : [])).size !== seats.filter(s => s.userId).length ||
    !seats.some(s => s.userId) || seats.some((s, i) => s.playerId !== `player-${i + 1}` ||
      !CHARACTER_IDS.includes(s.characterId as typeof CHARACTER_IDS[number]) ||
      (s.userId ? typeof s.userId !== 'string' || s.policy !== null : !policies.includes(s.policy!)))) {
    throw new HostError('NET_INVALID_SEATS');
  }
}
/** No browser APIs, network or database. Only the service may commit a candidate. */
export class GameHost {
  private engine: GameEngine;
  private memory: ResearchMemory = {};
  private clock = { key: '', elapsed: 0 };
  readonly seats: Seat[];
  constructor(config: GameConfig, seats: Seat[]) {
    validateSeats(seats);
    this.seats = structuredClone(seats);
    if (config.rulesId !== SURRENDER_RULES.id || config.characterIds.join() !== seats.map(s => s.characterId).join() ||
      (config.humanIds ?? []).join() !== seats.filter(s => s.userId).map(s => s.playerId).join()) throw new HostError('NET_INVALID_CONFIG');
    this.engine = new GameEngine(SERVER_MANIFEST.map.nodes, config);
  }
  static restore(checkpoint: HostCheckpoint) {
    if (checkpoint.hostVersion !== 1 || !Number.isFinite(checkpoint.clock.elapsed) ||
      checkpoint.clock.elapsed < 0 || checkpoint.clock.elapsed > 60_000) throw new HostError('NET_INVALID_CHECKPOINT');
    const host = new GameHost(checkpoint.engine.config, checkpoint.seats);
    host.engine = GameEngine.fromCheckpoint(SERVER_MANIFEST.map.nodes, checkpoint.engine);
    host.memory = structuredClone(checkpoint.researchMemory);
    host.clock = { ...checkpoint.clock };
    return host;
  }
  get state() { return this.engine.state; }
  checkpoint(): HostCheckpoint { return { hostVersion: 1, engine: this.engine.checkpoint(), seats: structuredClone(this.seats),
    researchMemory: structuredClone(this.memory), clock: { ...this.clock } }; }
  fork() { return GameHost.restore(this.checkpoint()); }
  private apply(action: Action, playerId: string, source: CommittedStep['source']): CommittedStep {
    const before = this.engine.state;
    const command: Command = { id: `net-${before.revision + 1}`, gameId: before.gameId,
      expectedRevision: before.revision, playerId, action: structuredClone(action) };
    const result = this.engine.dispatch(command);
    if (!result.ok) throw new HostError(`NET_${result.reason.toUpperCase().replaceAll('-', '_')}`);
    if (this.seats.some(s => s.policy === 'research-v1')) {
      this.memory = observeResearch(this.memory, before, action, this.engine.state, result.events);
    }
    return { command, events: result.events, source };
  }
  input(userId: string, intent: Intent): CommittedStep {
    const seat = this.seats.find(s => s.userId === userId);
    if (!seat) throw new HostError('NET_NOT_MEMBER');
    const state = this.state;
    if (!validCommand({ id: intent.id, gameId: state.gameId, expectedRevision: intent.expectedRevision,
      playerId: seat.playerId, action: intent.action })) throw new HostError('NET_INVALID_COMMAND');
    const action = intent.action;
    if (action.type === 'animationDone' || action.type === 'pause' ||
      (action.type === 'minigame' && action.input.kind === 'tick')) throw new HostError('NET_INTERNAL_COMMAND');
    // Rebase bounded live input/quit in the very same active minigame.
    // Decisions that spend money or settle points always require an exact revision.
    const liveInput = action.type === 'minigame' && ['point', 'dig', 'quit'].includes(action.input.kind) &&
      state.pending?.kind === 'minigame' && state.pending.stage === 'playing' && action.decisionId === state.pending.id;
    if (intent.expectedRevision !== state.revision && !(liveInput && intent.expectedRevision <= state.revision &&
      intent.expectedRevision >= Math.max(0, state.revision - 40))) throw new HostError('NET_STALE');
    const step = this.apply(action, seat.playerId, 'player');
    // Pointer input does not reset the server's next tick deadline.
    if (!liveInput) this.clock = { key: '', elapsed: 0 };
    return step;
  }
  /** Monotonic elapsed time from the server, bounded catch-up; never accepts browser time. */
  advance(elapsed: number, online: ReadonlySet<string>): CommittedStep[] {
    if (!Number.isFinite(elapsed) || elapsed < 0) throw new HostError('NET_INVALID_CLOCK');
    const steps: CommittedStep[] = [];
    let remaining = Math.min(elapsed, 250);
    for (let i = 0; i < 8; i++) {
      const state = this.state, p = state.pending, responder = decisionPlayer(state);
      const seat = this.seats.find(s => s.playerId === responder)!;
      if (state.paused || state.phase === 'finished') { this.clock = { key: '', elapsed: 0 }; break; }
      let action: Action | null = null, delay = 0, key = '';
      if (p?.kind === 'roll' || p?.kind === 'segment') {
        action = { type: 'animationDone', token: p.id }; key = p.id;
        if (p.kind === 'roll') delay = 650;
        else {
          const a = SERVER_MANIFEST.map.nodes.find(n => n.id === p.from)!, b = SERVER_MANIFEST.map.nodes.find(n => n.id === p.to)!;
          delay = Math.max(240, Math.hypot(b.x - a.x, b.y - a.y) / 115 * 1000);
        }
      } else if (p?.kind === 'minigame' && p.stage === 'playing' && seat.userId) {
        if (!online.has(seat.userId)) { this.clock = { key: '', elapsed: 0 }; break; }
        action = { type: 'minigame', decisionId: p.id, input: { kind: 'tick' } };
        key = p.id; delay = p.game === 'sky' ? 50 : 100;
      } else if (!seat.userId) {
        const decision = decideComputer(state, SERVER_MANIFEST.map.nodes, seat.policy!, this.memory);
        if (!decision) throw new HostError('NET_AI_UNAVAILABLE');
        action = decision.action; delay = COMPUTER_DELAY; key = `ai:${state.revision}`;
      } else { this.clock = { key: '', elapsed: 0 }; break; }
      if (this.clock.key !== key) this.clock = { key, elapsed: 0 };
      const used = Math.min(remaining, Math.max(0, delay - this.clock.elapsed));
      this.clock.elapsed += used; remaining -= used;
      if (this.clock.elapsed < delay) break;
      steps.push(this.apply(action, responder, 'host'));
      this.clock = { key, elapsed: 0 };
      if (remaining <= 0) break;
    }
    return steps;
  }
}
