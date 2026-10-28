import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createConnection } from 'mysql2/promise';
import type { Connection, RowDataPacket } from 'mysql2/promise';
import { Op, Transaction } from 'sequelize';
import type { AppContext } from '../../app-context';
import { AppError } from '../../lib/app-error';
import { GameHost, HostError } from '../../../shared/richman/host';
import type { CommittedStep, HostCheckpoint, Intent, Seat } from '../../../shared/richman/host';
import { projectGame } from '../../../shared/richman/projection';
import { canonicalSaveJSON } from '../../../shared/richman/game/save';
import { SURRENDER_RULES } from '../../../shared/richman/game/surrender';
import type { RichmanGame, CommandReceipt } from '../../database/models/richman-game';

const sha = (text: string) => createHash('sha256').update(text).digest('hex');
const MAX_GAMES = 32, CHECKPOINT_BYTES = 8 * 1024 * 1024, PRESENCE_MS = 15_000;
type Cached = { host: GameHost; at: number; fault: string | null };
type Sources = { now: () => number; id: () => string; seed: () => string };
const defaultSources: Sources = { now: () => performance.now(), id: randomUUID, seed: () => randomBytes(24).toString('hex') };
/** Single scheduler + durable CAS journal. In-memory entries are discardable caches, never a database mode. */
export class GameService {
  private games = new Map<string, Cached>();
  private tails = new Map<string, Promise<unknown>>();
  private queued = new Map<string, number>();
  private presence = new Map<string, number>();
  private inputTimes = new Map<string, number>();
  private lock: Connection | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private pumping: Promise<void> | null = null;
  private stopping = false;
  private healthy = false;
  private readonly lockName: string;
  constructor(private readonly context: AppContext, private readonly sources: Sources = defaultSources) {
    this.lockName = `${context.config.database.name}:richman-host-v1`;
  }
  get available() { return this.healthy && !this.stopping; }
  private requireAvailable() {
    if (!this.available) throw new AppError(503, 'NET_HOST_UNAVAILABLE', '联机对局宿主暂不可用');
  }
  async start(automatic = true) {
    if (this.lock) throw new Error('host already started');
    const d = this.context.config.database;
    this.lock = await createConnection({ host: d.host, port: d.port, user: d.user, password: d.password, database: d.name });
    this.lock.on('error', () => { this.healthy = false; });
    try {
      const [rows] = await this.lock.execute<RowDataPacket[]>('SELECT GET_LOCK(?, 0) AS owned', [this.lockName]);
      if (rows[0]?.owned !== 1) throw new Error('另一个联机宿主已占用数据库调度锁');
      const active = await this.context.models.RichmanGame.findAll({ where: { status: 'active' }, limit: MAX_GAMES + 1 });
      if (active.length > MAX_GAMES) throw new Error('联机宿主容量超过限制');
      for (const row of active) this.games.set(row.id, await this.decode(row));
      this.stopping = false; this.healthy = true;
      if (automatic) this.timer = setInterval(() => { void this.pulse().catch(() => { this.healthy = false; }); }, 50);
    } catch (error) { await this.lock.end(); this.lock = null; this.games.clear(); throw error; }
  }
  private async leadership() {
    this.requireAvailable();
    const [rows] = await this.lock!.execute<RowDataPacket[]>('SELECT IS_USED_LOCK(?) = CONNECTION_ID() AS owned', [this.lockName]);
    if (rows[0]?.owned !== 1) { this.healthy = false; throw new AppError(503, 'NET_HOST_UNAVAILABLE', '联机宿主调度权已失效'); }
  }
  async stop() {
    this.stopping = true; this.healthy = false;
    if (this.timer) clearInterval(this.timer);
    await this.pumping?.catch(() => {});
    await Promise.allSettled([...this.tails.values()]);
    await this.lock?.end().catch(() => {});
    this.lock = null; this.games.clear(); this.presence.clear(); this.inputTimes.clear();
  }
  private async decode(row: RichmanGame): Promise<Cached> {
    if (Buffer.byteLength(row.checkpoint) > CHECKPOINT_BYTES || sha(row.checkpoint) !== row.checkpointHash) {
      throw new AppError(503, 'NET_CHECKPOINT_INVALID', '服务端对局检查点损坏，已停止推进');
    }
    try {
      const host = GameHost.restore(JSON.parse(row.checkpoint) as HostCheckpoint);
      if (host.state.gameId !== row.id || host.state.revision !== row.revision ||
        (host.state.phase === 'finished' ? 'finished' : 'active') !== row.status) throw new Error('revision mismatch');
      const seats = await this.context.models.RichmanGameSeat.findAll({ where: { gameId: row.id }, order: [['playerId', 'ASC']] });
      if (canonicalSaveJSON(host.seats) !== canonicalSaveJSON(seats.map(s => ({
        playerId: s.playerId, userId: s.userId, characterId: s.characterId, policy: s.policy,
      })))) throw new Error('seat mismatch');
      return { host, at: this.sources.now(), fault: null };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(503, 'NET_CHECKPOINT_INVALID', '服务端对局版本或座位不兼容，已停止推进');
    }
  }
  private pack(host: GameHost) {
    const checkpoint = canonicalSaveJSON(host.checkpoint());
    if (Buffer.byteLength(checkpoint) > CHECKPOINT_BYTES) throw new AppError(503, 'NET_CAPACITY', '对局检查点超过当前容量');
    return { checkpoint, checkpointHash: sha(checkpoint) };
  }
  private serial<T>(id: string, run: () => Promise<T>): Promise<T> {
    this.requireAvailable();
    const count = this.queued.get(id) ?? 0;
    if (count >= 8 || [...this.queued.values()].reduce((a, b) => a + b, 0) >= 64) {
      throw new AppError(503, 'NET_BUSY', '对局请求繁忙，请保留请求编号重试');
    }
    this.queued.set(id, count + 1);
    const task = (this.tails.get(id) ?? Promise.resolve()).catch(() => {}).then(() => {
      this.requireAvailable(); return run();
    });
    this.tails.set(id, task);
    void task.finally(() => {
      const left = (this.queued.get(id) ?? 1) - 1;
      if (left) this.queued.set(id, left); else this.queued.delete(id);
      if (this.tails.get(id) === task) this.tails.delete(id);
    }).catch(() => {});
    return task;
  }
  private online(gameId: string) {
    const now = this.sources.now(), online = new Set<string>();
    for (const [key, time] of this.presence) {
      if (time <= now) this.presence.delete(key);
      else if (key.startsWith(`${gameId}/`)) online.add(key.slice(gameId.length + 1));
    }
    return online;
  }
  isOnline(gameId: string, userId: string) { return this.online(gameId).has(userId); }
  disconnect(gameId: string, userId: string, controllerId?: string) {
    return this.serial(gameId, async () => {
      const seat = await this.member(gameId, userId);
      if (seat.controllerId && seat.controllerId !== controllerId) return;
      this.presence.delete(`${gameId}/${userId}`);
      // Retire this controller as well as its lease: late packets cannot revive it.
      if (seat.controllerId) await seat.update({ controllerId: randomUUID() });
    });
  }
  private touch(gameId: string, userId: string) { this.presence.set(`${gameId}/${userId}`, this.sources.now() + PRESENCE_MS); }
  private async member(gameId: string, userId: string) {
    const seat = await this.context.models.RichmanGameSeat.findOne({ where: { gameId, userId } });
    if (!seat) throw new AppError(404, 'NET_NOT_FOUND', '找不到本人参与的对局');
    return seat;
  }
  private async current(gameId: string): Promise<Cached> {
    const cached = this.games.get(gameId);
    if (cached) return cached;
    const row = await this.context.models.RichmanGame.findByPk(gameId);
    if (!row) throw new AppError(404, 'NET_NOT_FOUND', '对局不存在');
    const decoded = await this.decode(row);
    if (row.status === 'active') this.games.set(gameId, decoded);
    return decoded;
  }
  /** Room metadata, seats and the initial game commit atomically under the creation queue. */
  async provision<T>(run: (transaction: Transaction, create: (seats: Seat[], funds?: number, startDate?: string) => Promise<string>) => Promise<T>) {
    return this.serial('$create', async () => {
      await this.leadership();
      return this.context.sequelize.transaction(async transaction => run(transaction, async (seats, initialFunds, startDate) => {
        if (await this.context.models.RichmanGame.count({ where: { status: 'active' }, transaction }) >= MAX_GAMES) {
          throw new AppError(503, 'NET_CAPACITY', '对局容量已满');
        }
        const users = seats.flatMap(s => s.userId ? [s.userId] : []);
        if (await this.context.models.User.count({ where: { id: { [Op.in]: users }, status: 'active' }, transaction }) !== users.length) {
          throw new AppError(400, 'NET_INVALID_SEATS', '座位账号不可用');
        }
        const id = this.sources.id(), host = new GameHost({ gameId: id, seed: this.sources.seed(), rulesId: SURRENDER_RULES.id,
          characterIds: seats.map(s => s.characterId), humanIds: seats.filter(s => s.userId).map(s => s.playerId), ...(initialFunds === undefined ? {} : { initialFunds }), ...(startDate === undefined ? {} : { startDate }) }, seats);
        const now = new Date();
        await this.context.models.RichmanGame.create({ id, revision: 0, status: 'active', ...this.pack(host), createdAt: now, updatedAt: now }, { transaction });
        await this.context.models.RichmanGameSeat.bulkCreate(seats.map(s => ({ gameId: id, ...s })), { transaction });
        // No cache publication before commit. The next read or scheduler pulse loads committed rows.
        return id;
      }));
    });
  }
  async create(seats: Seat[], options: { initialFunds?: number; startDate?: string } = {}) {
    return this.provision((_transaction, create) => create(seats, options.initialFunds, options.startDate));
  }
  async claim(gameId: string, userId: string, controllerId: string) {
    return this.serial(gameId, async () => {
      await this.leadership();
      await this.member(gameId, userId);
      await this.context.models.RichmanGameSeat.update({ controllerId }, { where: { gameId, userId } });
      this.touch(gameId, userId);
      return { controllerId };
    });
  }
  async view(gameId: string, userId: string, controllerId?: string) {
    return this.recover(gameId, userId, controllerId);
  }
  /** Receipt and projection share the game queue, so recovery never unlocks an older view. */
  async recover(gameId: string, userId: string, controllerId?: string, pending?: Intent) {
    return this.serial(gameId, async () => {
      const seat = await this.member(gameId, userId);
      const canControl = !seat.controllerId || seat.controllerId === controllerId;
      const current = await this.current(gameId);
      const previous = pending ? await this.context.models.RichmanGameCommand.findOne({
        where: { gameId, userId, requestId: pending.id },
      }) : null;
      const resolution = !pending ? null : !previous ? 'missing' :
        previous.requestHash === sha(canonicalSaveJSON(pending)) ? 'committed' : 'conflict';
      if (canControl) this.touch(gameId, userId);
      return { canControl, ...projectGame(current.host, userId, this.online(gameId)), hostError: current.fault,
        recovery: pending ? { id: pending.id, resolution, receipt: resolution === 'committed' ? previous!.receipt : null } : null };
    });
  }
  async command(gameId: string, userId: string, authVersion: number, intent: Intent, controllerId?: string): Promise<CommandReceipt> {
    return this.serial(gameId, async () => {
      await this.leadership(); const seat = await this.member(gameId, userId);
      if (seat.controllerId && seat.controllerId !== controllerId) throw new AppError(409, 'NET_SESSION_REPLACED', '此账号已在另一窗口接管对局');
      const hash = sha(canonicalSaveJSON(intent));
      const previous = await this.context.models.RichmanGameCommand.findOne({ where: { gameId, userId, requestId: intent.id } });
      if (previous) {
        if (previous.requestHash !== hash) throw new AppError(409, 'NET_REQUEST_REUSED', '请求编号已用于其他命令');
        return previous.receipt!;
      }
      const current = await this.current(gameId);
      if (current.fault) throw new AppError(503, 'NET_GAME_STOPPED', '对局已停止推进，请重试获取状态');
      const candidate = current.host.fork(), key = `${gameId}/${userId}`;
      const live = intent.action.type === 'minigame' && ['point', 'dig'].includes(intent.action.input.kind);
      if (live && this.sources.now() - (this.inputTimes.get(key) ?? -Infinity) < 50) {
        throw new AppError(429, 'NET_INPUT_RATE', '小游戏输入过于频繁');
      }
      let step: CommittedStep;
      try { step = candidate.input(userId, intent); }
      catch (error) { throw domainError(error); }
      this.touch(gameId, userId);
      const receipt: CommandReceipt = { id: intent.id, gameId, revision: candidate.state.revision, acceptedAt: new Date().toISOString() };
      await this.commit(current, candidate, [step], { userId, authVersion, intent, hash, receipt });
      if (live) this.inputTimes.set(key, this.sources.now());
      return receipt;
    });
  }
  private async commit(current: Cached, candidate: GameHost, steps: CommittedStep[], request?: {
    userId: string; authVersion: number; intent: Intent; hash: string; receipt: CommandReceipt;
  }) {
    const { sequelize, models } = this.context, gameId = candidate.state.gameId;
    try {
      const packed = this.pack(candidate);
      await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED }, async transaction => {
        if (request) {
          const user = await models.User.findByPk(request.userId, { transaction, lock: transaction.LOCK.UPDATE });
          if (!user || user.status !== 'active' || user.authVersion !== request.authVersion) throw new AppError(401, 'ACCESS_TOKEN_INVALID', '访问令牌无效或已过期');
        }
        const row = await models.RichmanGame.findByPk(gameId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!row || row.revision !== current.host.state.revision) throw new AppError(409, 'NET_STALE', '对局进度已更新');
        await models.RichmanGameCommand.bulkCreate(steps.map(step => ({
          gameId, revision: step.command.expectedRevision + 1, command: step.command, events: step.events,
          userId: request?.userId ?? null, requestId: request?.intent.id ?? null, requestHash: request?.hash ?? null,
          receipt: request?.receipt ?? null, createdAt: new Date(),
        })), { transaction });
        const [changed] = await models.RichmanGame.update({ ...packed, revision: candidate.state.revision,
          status: candidate.state.phase === 'finished' ? 'finished' : 'active', updatedAt: new Date() },
        { where: { id: gameId, revision: row.revision }, transaction });
        if (candidate.state.phase === 'finished') await models.RichmanRoom.update({ status: 'finished', updatedAt: new Date() }, { where: { gameId }, transaction });
        if (changed !== 1) throw new AppError(409, 'NET_STALE', '对局进度已更新');
      });
      // Only the committed candidate becomes live.
      current.host = candidate; current.fault = null;
      if (candidate.state.phase === 'finished') this.games.delete(gameId);
    } catch (error) {
      // Commit acknowledgement may have been lost; discard cache and reconcile with MySQL on retry.
      this.games.delete(gameId);
      if (error instanceof AppError) throw error;
      throw new AppError(503, 'NET_STORAGE_FAILED', '命令结果暂时无法确认，请保留请求编号重试');
    }
  }
  pulse(): Promise<void> {
    if (this.pumping) return this.pumping;
    const run = async () => {
      await this.leadership();
      // Recover entries evicted after uncertain commits, including those no client currently polls.
      const rows = await this.context.models.RichmanGame.findAll({ where: { status: 'active' }, attributes: ['id'], limit: MAX_GAMES + 1 });
      if (rows.length > MAX_GAMES) throw new Error('host capacity exceeded');
      for (const row of rows) {
        try { await this.serial(row.id, async () => {
        const current = await this.current(row.id), now = this.sources.now(), elapsed = Math.max(0, now - current.at);
        current.at = now;
        if (current.fault) return;
        const candidate = current.host.fork();
        let steps: CommittedStep[];
        try { steps = candidate.advance(elapsed, this.online(row.id)); }
        catch (error) { current.fault = error instanceof HostError ? error.code : 'NET_HOST_ERROR'; return; }
        if (steps.length) {
          try { await this.commit(current, candidate, steps); }
          catch { /* Cache was evicted. Reconcile before any further rule execution. */ }
        } else current.host = candidate; // Only partial elapsed time changed, no rules/RNG/revision.
        }); } catch (error) {
          // A full client queue delays this game's pulse; it must not disable every game.
          if (!(error instanceof AppError) || error.code !== 'NET_BUSY') throw error;
        }
      }
    };
    this.pumping = run().finally(() => { this.pumping = null; });
    return this.pumping;
  }
}
function domainError(error: unknown) {
  if (!(error instanceof HostError)) return new AppError(503, 'NET_HOST_ERROR', '对局暂不可用');
  const status = error.code === 'NET_NOT_MEMBER' ? 404 : ['NET_INVALID_COMMAND', 'NET_INTERNAL_COMMAND'].includes(error.code) ? 400 : 409;
  return new AppError(status, error.code, '操作已拒绝，请根据最新对局状态操作');
}
