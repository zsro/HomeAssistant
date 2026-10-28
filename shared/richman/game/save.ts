import type { Manifest } from '../types';
import { replayGame } from './engine';
import type { GameEngine, GameState, Pending, Replay } from './engine';
import { observeResearch } from './computer-research';
import type { ResearchMemory } from './computer-research';
import type { ComputerPolicy } from './computer';
import { SURRENDER_RULES } from './surrender';
import { integer, oneOf, record, shape, strings, text, validCommand } from './save-validation';

export const SAVE_LIMITS = Object.freeze({ bytes: 8 * 1024 * 1024, commands: 20000, restoreMs: 30000 });
export type SaveErrorCode = 'unsupported-version' | 'invalid-save' | 'incompatible-content' |
  'unsafe-point' | 'limit-exceeded' | 'invalid-replay' | 'digest-mismatch' | 'closed-session' | 'cancelled';
export class SaveError extends Error {
  constructor(readonly code: SaveErrorCode, message: string) { super(message); this.name = 'SaveError'; }
}
export type SavedControl = {
  mode: 'surrender'; computerIds: string[]; computerPolicy: ComputerPolicy; commandSerial: number;
};
export type SaveEnvelopeV1 = {
  formatVersion: 1; sessionVersion: 1; mapId: 'japan'; assetVersion: number;
  gameId: string; revision: number; replay: Replay; session: SavedControl; stateDigest: string;
};
export type RestoredSave = { engine: GameEngine; control: SavedControl; researchMemory: ResearchMemory; assetVersion: number };
export type SavePoint = { ok: true } | { ok: false; reason: 'unsupported-mode' | 'animation' | 'minigame-playing' | 'unknown-state' };

/** Fail closed on new phases/substages until their restoration contract is audited. */
export function savePoint(state: GameState): SavePoint {
  if (state.rulesId !== SURRENDER_RULES.id) return { ok: false, reason: 'unsupported-mode' };
  const pending = state.pending;
  if (state.phase === 'rolling' || state.phase === 'moving' || pending?.kind === 'roll' || pending?.kind === 'segment') {
    return { ok: false, reason: 'animation' };
  }
  if (pending?.kind === 'minigame' && pending.stage === 'playing') return { ok: false, reason: 'minigame-playing' };
  if (!pending) return ['idle', 'turnEnd', 'finished'].includes(state.phase) ? { ok: true } : { ok: false, reason: 'unknown-state' };
  if (pending.kind === 'minigame') return state.phase === 'minigame' && ['ready', 'result'].includes(pending.stage) ? { ok: true } : { ok: false, reason: 'unknown-state' };
  if (pending.kind === 'magic') return state.phase === 'magic' && ['draw', 'choose', 'result', 'build'].includes(pending.stage) ? { ok: true } : { ok: false, reason: 'unknown-state' };
  const phases: Partial<Record<Pending['kind'], GameState['phase']>> = {
    branch: 'choosing', property: 'property', bank: 'bank', debt: 'debt', shop: 'shop', effect: 'effect',
    reaction: 'reaction', auction: 'auction', news: 'news', fortune: 'fortune', lottery: 'lottery',
    company: 'company', construction: 'commerce', subscription: 'commerce', insurance: 'commerce', facility: 'facility', surrender: 'surrender',
  };
  // Insurance uses its own pending kind but shares the commerce phase.
  return phases[pending.kind] === state.phase ? { ok: true } : { ok: false, reason: 'unknown-state' };
}

const policies = oneOf('basic-v1', 'tools-v1', 'rent-v1', 'defense-v1', 'estate-v1', 'cash-v1', 'status-v1',
  'inventory-v1', 'commerce-v1', 'area-v1', 'roads-v1', 'mobility-v1', 'gods-v1', 'capital-v1', 'research-v1');
const nonnegative = (v: unknown) => integer(v) && (v as number) >= 0;
const configShape = shape({ gameId: text, seed: text, characterIds: strings, rulesId: text },
  { initialFunds: integer, startDate: text, humanIds: strings });
const replayShape = shape({ version: oneOf(1), rulesId: text, mapFingerprint: text, config: configShape,
  commands: v => Array.isArray(v) && v.length <= SAVE_LIMITS.commands && v.every(validCommand) },
{ catalogFingerprint: text, itemFingerprint: text });
const controlShape = shape({ mode: oneOf('surrender'), computerIds: strings, computerPolicy: policies, commandSerial: nonnegative });
const envelopeShape = shape({ formatVersion: oneOf(1), sessionVersion: oneOf(1), mapId: oneOf('japan'),
  assetVersion: nonnegative, gameId: text, revision: nonnegative, replay: replayShape, session: controlShape,
  stateDigest: v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v) });

// Canonical JSON semantics: omit undefined object fields, retain array order,
// sort keys, and reject non-finite state instead of silently hashing it as null.
export function canonicalSaveJSON(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalSaveJSON).join(',') + ']';
  if (record(value)) return '{' + Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([k, v]) => JSON.stringify(k) + ':' + canonicalSaveJSON(v)).join(',') + '}';
  throw new SaveError('invalid-save', '存档状态不是有效 JSON 数据');
}
async function digest(state: GameState, memory: ResearchMemory, control: SavedControl): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalSaveJSON({ state, researchMemory: memory, control }));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), n => n.toString(16).padStart(2, '0')).join('');
}
function checkSize(serialized: string) {
  if (serialized.length > SAVE_LIMITS.bytes || new TextEncoder().encode(serialized).byteLength > SAVE_LIMITS.bytes) {
    throw new SaveError('limit-exceeded', '存档超过 8 MiB 上限');
  }
}
export function parseSave(serialized: string): SaveEnvelopeV1 {
  if (typeof serialized !== 'string') throw new SaveError('invalid-save', '存档必须为 JSON 字符串');
  checkSize(serialized);
  let value: unknown;
  try { value = JSON.parse(serialized); } catch { throw new SaveError('invalid-save', '存档 JSON 已损坏'); }
  if (!record(value)) throw new SaveError('invalid-save', '存档结构无效');
  const object = value as Partial<SaveEnvelopeV1>;
  if (object.formatVersion !== 1 || object.sessionVersion !== 1 || object.replay?.rulesId !== SURRENDER_RULES.id) {
    throw new SaveError('unsupported-version', '只支持格式 1、会话 1 与 v47 存档');
  }
  if (Array.isArray(object.replay?.commands) && object.replay.commands.length > SAVE_LIMITS.commands) {
    throw new SaveError('limit-exceeded', '存档超过 20000 条命令上限');
  }
  if (!envelopeShape(value)) throw new SaveError('invalid-save', '存档字段或命令结构无效');
  const save = value as SaveEnvelopeV1;
  const { replay, session } = save, config = replay.config;
  if (save.gameId !== config.gameId || config.rulesId !== replay.rulesId || save.revision !== replay.commands.length ||
    config.seed !== config.seed.trim() || config.seed.length > 64 || config.characterIds.length < 2 ||
    session.commandSerial >= Number.MAX_SAFE_INTEGER || session.computerIds.some(id => !config.characterIds.includes(id))) {
    throw new SaveError('invalid-save', '存档身份、版本或控制配置不一致');
  }
  const humans = config.characterIds.flatMap((id, i) => session.computerIds.includes(id) ? [] : [`player-${i + 1}`]);
  if (canonicalSaveJSON(config.humanIds ?? config.characterIds.map((_, i) => `player-${i + 1}`)) !== canonicalSaveJSON(humans)) {
    throw new SaveError('invalid-save', '电脑座位与原始人类座位不一致');
  }
  let serial = 0;
  for (const [i, command] of replay.commands.entries()) {
    const match = /^command-([1-9]\d*)$/.exec(command.id), next = match ? Number(match[1]) : NaN;
    if (!Number.isSafeInteger(next) || next <= serial || command.gameId !== save.gameId || command.expectedRevision !== i ||
      !config.characterIds.some((_, index) => command.playerId === `player-${index + 1}`)) {
      throw new SaveError('invalid-save', '存档命令身份、序号或 revision 无效');
    }
    serial = next;
  }
  if (session.commandSerial < serial) throw new SaveError('invalid-save', '会话命令序号落后于历史');
  return save;
}

/** Capture before the first await so AI/ticks during hashing cannot mix revisions. */
export async function createSave(manifest: Manifest, engine: GameEngine, control: SavedControl, memory: ResearchMemory): Promise<string> {
  const state = engine.state;
  if (!savePoint(state).ok) throw new SaveError('unsafe-point', '当前状态不能保存，请等待稳定决策点');
  const envelope: SaveEnvelopeV1 = { formatVersion: 1, sessionVersion: 1, mapId: 'japan', assetVersion: manifest.version,
    gameId: state.gameId, revision: state.revision, replay: engine.exportReplay(), session: structuredClone(control), stateDigest: '' };
  if (envelope.replay.commands.length > SAVE_LIMITS.commands) throw new SaveError('limit-exceeded', '存档超过 20000 条命令上限');
  envelope.stateDigest = await digest(state, structuredClone(memory), envelope.session);
  const serialized = JSON.stringify(envelope);
  parseSave(serialized); // Writer and reader must agree, including encoded size.
  return serialized;
}

export type RestoreOptions = { signal?: AbortSignal; progress?: (completed: number, total: number) => void };
export async function restoreSave(manifest: Manifest, serialized: string, maxDurationMs: number = SAVE_LIMITS.restoreMs, options: RestoreOptions = {}): Promise<RestoredSave> {
  if (!Number.isFinite(maxDurationMs) || maxDurationMs <= 0 || maxDurationMs > SAVE_LIMITS.restoreMs) {
    throw new SaveError('limit-exceeded', '恢复时间预算无效');
  }
  const started = performance.now();
  const budget = () => {
    if (options.signal?.aborted) throw new SaveError('cancelled', '已取消读取，当前对局保持不变');
    if (performance.now() - started > maxDurationMs) throw new SaveError('limit-exceeded', '存档恢复超时');
  };
  budget();
  const save = parseSave(serialized), { replay, session: control } = save;
  if (replay.config.characterIds.some(id => !manifest.characters.some(c => c.id === id))) {
    throw new SaveError('incompatible-content', '当前资源缺少存档角色');
  }
  let engine: GameEngine;
  try { engine = replayGame(manifest.map.nodes, { ...replay, commands: [] }); }
  catch { throw new SaveError('incompatible-content', '存档地图、规则指纹或开局配置不兼容'); }
  let researchMemory: ResearchMemory = {};
  options.progress?.(0, replay.commands.length);
  for (let i = 0; i < replay.commands.length; i++) {
    budget();
    const command = replay.commands[i];
    // v47 observeResearch only changes memory on rolled events or confirmed
    // items (time machine / self teleport). Capturing two full world copies for
    // every animation tick made server restoration needlessly expensive.
    const research = control.computerPolicy === 'research-v1';
    const observes = command.action.type === 'roll' ||
      (command.action.type === 'item' && command.action.action.type === 'confirm');
    const before = research && observes ? engine.state : null;
    try {
      const result = engine.dispatch(command);
      if (!result.ok) throw new Error(result.reason);
      if (before) researchMemory = observeResearch(researchMemory, before, command.action, engine.state, result.events);
      else if (research && result.events.some(event => event.type === 'rolled')) {
        // Fail closed if a future rule adds a new source of research observations.
        throw new Error('unsupported research observation command');
      }
    } catch { throw new SaveError('invalid-replay', `存档第 ${i + 1} 条命令无法恢复`); }
    // Yield to paint/cancel/navigation between bounded batches; no live callbacks.
    if ((i + 1) % 32 === 0) {
      options.progress?.(i + 1, replay.commands.length);
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
  }
  const state = engine.state;
  if (!savePoint(state).ok) throw new SaveError('unsafe-point', '存档不在可恢复的稳定决策点');
  if (await digest(state, researchMemory, control) !== save.stateDigest) throw new SaveError('digest-mismatch', '存档状态或电脑记忆校验失败');
  budget();
  options.progress?.(replay.commands.length, replay.commands.length);
  return { engine, control, researchMemory, assetVersion: save.assetVersion };
}
