import type { GameSession, SessionSnapshot, SessionOptions } from '../game/session';
import type { AudioPacket } from '../audio';
import type { Manifest } from '../types';
import { directionFor } from '../traversal';
import type { Action } from '../game/engine';
import type { EffectAction } from '../game/effects';
import type { MiniInput } from '../game/minigames';
import type { SaleAction } from '../game/estate-sales';
import type { SavePoint } from '../game/save';
import type { Intent } from '../../../../../shared/richman/host';
import { ApiError, getErrorMessage } from '../../../api/client';
import { netRequest } from './api';
import { validCommand } from '../../../../../shared/richman/game/save-validation';
import { networkSnapshot } from './view';
import type { NetworkStatus, NetworkView } from './view';

/** Transport/presentation only: no GameEngine, RNG, local AI or authoritative tick. */
export class NetworkSession implements Omit<Pick<GameSession, keyof GameSession>, 'gameState'> {
  readonly nodes;
  readonly controllerId = crypto.randomUUID();
  onChange: (view: SessionSnapshot) => void = () => {};
  onPresentation: (packet: AudioPacket) => void = () => {};
  private disposed = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private view!: SessionSnapshot;
  private remote!: NetworkView;
  private pending: Intent | null = null;
  private sending = false;
  private presentationKey = '';
  private motion = { id: '', elapsed: 0 };
  private polling: Promise<void> | null = null;
  private status: NetworkStatus = { connected: true, pending: false, message: '', readOnly: false };
  private readonly storageKey: string;
  constructor(readonly manifest: Manifest, readonly gameId: string, private readonly owner: string) {
    this.nodes = new Map(manifest.map.nodes.map(n => [n.id, n]));
    this.storageKey = `richman.net.pending:${owner}:${gameId}`;
  }
  private readonly lifetime = new AbortController();
  private readonly requests = new Set<Promise<unknown>>();
  private failures = 0;
  private storageBlocked = false;
  private syncing = false;
  private wake = () => { if (!this.disposed) { clearTimeout(this.timer); void this.refresh().finally(() => this.schedule()); } };
  private offline = () => { this.status.connected = false; this.status.message = '网络已断开，保留当前局面，正在等待重连'; this.publish(); };
  private visible = () => { if (!document.hidden) this.wake(); };
  private call<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    const request = netRequest<T>(this.owner, `/games/${this.gameId}${path}`, body, this.controllerId,
      signal ? AbortSignal.any([signal, this.lifetime.signal]) : this.lifetime.signal);
    this.requests.add(request);
    void request.finally(() => this.requests.delete(request)).catch(() => {});
    return request;
  }
  private readPending() {
    try {
      // Migrate NET-02 tab records once. Durable records also survive browser restart.
      const legacy = sessionStorage.getItem(this.storageKey);
      if (!localStorage.getItem(this.storageKey) && legacy) localStorage.setItem(this.storageKey, legacy);
      if (legacy) sessionStorage.removeItem(this.storageKey);
      const saved = localStorage.getItem(this.storageKey);
      this.storageBlocked = false;
      if (!saved) return;
      const intent = JSON.parse(saved) as Intent;
      if (!intent || !/^[A-Za-z0-9_-]{1,64}$/.test(intent.id) || !validCommand({ ...intent, gameId: this.gameId, playerId: 'player-1' })) throw new Error('invalid recovery record');
      this.pending = intent;
    } catch {
      this.storageBlocked = true;
      throw new ApiError('NET_RECOVERY_RECORD_INVALID', '无法读取本机操作恢复记录，请保留记录并检查浏览器存储权限', 0);
    }
  }
  private clearPending(intent: Intent) {
    // An obsolete window must never remove a newer window's request.
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved && JSON.parse(saved).id === intent.id) localStorage.removeItem(this.storageKey);
    } catch { /* A retained receipt will be safely reconciled again on the next read. */ }
    if (this.pending?.id === intent.id) this.pending = null;
  }
  async connect(signal: AbortSignal) {
    try {
      this.readPending();
      await this.call('/claim', { controllerId: this.controllerId }, signal);
      signal.throwIfAborted(); this.lifetime.signal.throwIfAborted();
      const next = await this.call<NetworkView>(this.pending ? '/recover' : '', this.pending ? { pending: this.pending } : undefined, signal);
      signal.throwIfAborted(); this.lifetime.signal.throwIfAborted();
      this.accept(next);
      window.addEventListener('online', this.wake); window.addEventListener('offline', this.offline);
      document.addEventListener('visibilitychange', this.visible);
      this.publish(); this.schedule();
      return this;
    } catch (error) { this.dispose(); throw error; }
  }
  get state() { return this.view; }
  get actor() { return this.view.actors[this.view.active]; }
  snapshot() { return structuredClone(this.view); }
  private accept(next: NetworkView) {
    if (this.remote && next.revision < this.remote.revision) throw new ApiError('NET_STALE_VIEW', '正在重新核对服务器进度', 0);
    const recovery = next.recovery;
    if (this.pending && recovery?.id === this.pending.id) {
      if (recovery.resolution === 'committed') {
        if (!recovery.receipt || next.revision < recovery.receipt.revision) throw new ApiError('NET_STALE_VIEW', '正在同步已确认操作', 0);
        this.clearPending(this.pending);
      } else if (recovery.resolution === 'conflict') {
        this.clearPending(this.pending);
        this.status.message = '请求编号与已保存操作不一致，已恢复服务器局面，请重新选择';
      }
    }
    this.remote = next; this.failures = 0;
    this.status.connected = !next.hostError && !this.storageBlocked && !this.syncing;
    this.status.message = next.hostError ? '服务器已停止本局推进，请稍后重新连接' : !next.canControl ? '此账号已在另一窗口操作。当前窗口只读' :
      this.pending ? this.sending ? '正在等待服务器确认操作…' : '操作结果待确认，请重试原请求' : recovery?.resolution === 'conflict' ? this.status.message : '';
  }
  private publish() {
    if (this.disposed || !this.remote) return;
    this.status.pending = !!this.pending; this.status.sending = this.sending;
    this.status.readOnly = !this.remote.canControl;
    const key = JSON.stringify([this.remote, this.status]);
    if (key === this.presentationKey) return;
    this.presentationKey = key;
    if (this.remote.motion?.id !== this.motion.id) this.motion = { id: this.remote.motion?.id ?? '', elapsed: 0 };
    this.view = networkSnapshot(this.remote, this.manifest, this.status);
    this.onChange(this.snapshot());
  }
  private schedule() {
    clearTimeout(this.timer);
    if (this.disposed) return;
    const delay = this.failures ? Math.min(10000, 500 * 2 ** Math.min(this.failures, 5)) : this.remote.phase === 'minigame' ? 100 : 400;
    this.timer = setTimeout(() => { void this.refresh().finally(() => this.schedule()); }, delay);
  }
  refresh(): Promise<void> {
    if (this.disposed) return Promise.resolve();
    if (this.polling) return this.polling;
    this.polling = (async () => {
      try {
        if (!this.pending) this.readPending();
        const pending = !this.sending && this.pending;
        const next = await this.call<NetworkView>(pending ? '/recover' : '', pending ? { pending } : undefined);
        if (!this.disposed) this.accept(next);
      } catch (error) {
        if (!this.disposed) { this.failures++; this.status.connected = false; this.status.message = `${getErrorMessage(error)}；正在自动重连，进度由服务器保留`; }
      } finally { this.publish(); this.polling = null; }
    })();
    return this.polling;
  }
  private async fresh() {
    // A poll started before command completion cannot be its confirmation barrier.
    this.syncing = true; this.status.connected = false; this.publish();
    await this.polling;
    this.syncing = false;
    if (!this.disposed) await this.refresh();
  }
  async reclaim() {
    if (this.disposed || this.sending) return;
    this.status.connected = false; this.publish();
    try { await this.call('/claim', { controllerId: this.controllerId }); await this.fresh(); }
    catch (error) { if (!this.disposed) { this.status.message = getErrorMessage(error); this.publish(); } }
  }
  private send(action: Action) {
    if (this.disposed || this.pending || this.sending || !this.status.connected || !this.remote.canControl || this.remote.responderId !== this.remote.self || this.remote.hostError) return { ok: false as const, reason: 'illegal-action' as const };
    const intent: Intent = { id: crypto.randomUUID(), expectedRevision: this.remote.revision, action };
    try {
      this.readPending();
      if (this.pending) { this.status.message = '还有待确认操作，请先核对原请求'; this.publish(); return { ok: false as const, reason: 'illegal-action' as const }; }
      localStorage.setItem(this.storageKey, JSON.stringify(intent));
    } catch { this.status.message = '无法保存本次请求编号，请允许浏览器存储后重试'; this.publish(); return { ok: false as const, reason: 'illegal-action' as const }; }
    this.pending = intent; void this.retryPending();
    return { ok: true as const, events: [] };
  }
  async retryPending() {
    if (!this.pending || this.sending || this.disposed || !this.remote.canControl) return;
    this.sending = true; this.status.message = '正在等待服务器确认操作…'; this.publish();
    const intent = this.pending;
    try {
      await this.call('/commands', intent);
      // Even a successful POST stays pending until a receipt and up-to-date projection agree.
    } catch (error) {
      if (this.disposed) return;
      if (error instanceof ApiError && [400, 404, 409].includes(error.status) && error.code !== 'NET_SESSION_REPLACED') this.clearPending(intent);
      this.status.message = `${getErrorMessage(error)}${this.pending ? '；结果待确认，请重试原请求' : '；请根据最新对局重新选择'}`;
    } finally {
      this.sending = false;
      if (!this.disposed) { this.status.connected = false; this.publish(); await this.fresh(); this.publish(); }
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; clearTimeout(this.timer); this.onChange = () => {}; this.onPresentation = () => {};
    window.removeEventListener('online', this.wake); window.removeEventListener('offline', this.offline);
    document.removeEventListener('visibilitychange', this.visible);
    this.lifetime.abort();
    // Drain every request, then retire this controller. Late server packets are fenced too.
    void Promise.allSettled([...this.requests]).then(() => netRequest(this.owner, `/games/${this.gameId}/disconnect`, {}, this.controllerId).catch(() => {}));
  }
  tick(milliseconds: number) {
    const motion = this.remote.motion;
    if (!motion || !this.view || this.remote.paused || !this.status.connected) return;
    const from = this.nodes.get(motion.from)!, to = this.nodes.get(motion.to)!;
    this.motion.elapsed += Math.max(0, Math.min(50, milliseconds));
    const fraction = Math.min(1, this.motion.elapsed / Math.max(240, Math.hypot(to.x - from.x, to.y - from.y) / 115 * 1000));
    this.actor.direction = directionFor(to.x - from.x, to.y - from.y);
    this.actor.x = from.x + (to.x - from.x) * fraction; this.actor.y = from.y + (to.y - from.y) * fraction;
  }
  hold(_value: boolean) { void _value; /* Menus never freeze other players. */ }
  get saveAvailability(): SavePoint { return { ok: false, reason: 'unsupported-mode' }; }
  exportSave(): Promise<string> { return Promise.reject(new Error('联机进度由服务器持续保存')); }
  exportReplay(): ReturnType<GameSession['exportReplay']> { return null; }
  continueRestored() {}
  start(_options: SessionOptions) { void _options; throw new Error('联机开局只能在房间中进行'); }
  reset() {}
  pause(_value: boolean) { void _value; }
  select(_index: number) { void _index; }
  visitJunction() {}
  retryComputer() { void this.refresh(); }
  operateSales(action: SaleAction) { return this.send(action).ok; }
  surrender() { return this.send({ type: 'surrender' }); }
  chooseDeath(decisionId: string, targetId: string | null) { return this.send({ type: 'chooseDeath', decisionId, targetId }); }
  bid(decisionId: string, increment: number | null) { return this.send({ type: 'auction', decisionId, increment }); }
  react(decisionId: string, choice: 'use' | 'decline', targetId?: string) { return this.send({ type: 'reaction', decisionId, choice, ...(targetId ? { targetId } : {}) }); }
  roll() { this.send({ type: 'roll' }); }
  choose(node: number) { if (this.remote.decision?.kind === 'branch') this.send({ type: 'choose', decisionId: this.remote.decision.id, node }); }
  decide(decisionId: string, accept: boolean, buildingType?: number) { return this.send({ type: 'property', decisionId, accept, ...(buildingType === undefined ? {} : { buildingType }) }); }
  loan(decisionId: string, operation: 'borrow' | 'repay', amount: number) { return this.send({ type: 'loan', decisionId, operation, amount }).ok; }
  transfer(decisionId: string, operation: 'deposit' | 'withdraw', amount: number) { return this.send({ type: 'bank', decisionId, operation, amount }); }
  leaveBank(decisionId: string) { return this.send({ type: 'leaveBank', decisionId }); }
  settleDebt(decisionId: string) { return this.send({ type: 'settleDebt', decisionId }); }
  trade(stockId: string, side: 'buy' | 'sell', quantity: number) { return this.send({ type: 'stockTrade', stockId, side, quantity }); }
  research(propertyId: string, itemId: string) { return this.send({ type: 'research', propertyId, itemId }); }
  collectFortuneCard(decisionId: string, itemId: string | null) { return this.send({ type: 'collectFortuneCard', decisionId, itemId }); }
  minigame(decisionId: string, input: MiniInput) { return this.send({ type: 'minigame', decisionId, input }); }
  magicBuild(decisionId: string, buildingType: number) { return this.send({ type: 'magicBuild', decisionId, buildingType }); }
  magic(decisionId: string, effect?: number) { return this.send({ type: 'magic', decisionId, ...(effect === undefined ? {} : { effect }) }); }
  spinInsurance(decisionId: string) { return this.send({ type: 'spinInsurance', decisionId }); }
  constructCompany(decisionId: string, propertyId: string | null, buildingType?: number) { return this.send({ type: 'constructCompany', decisionId, propertyId, ...(buildingType === undefined ? {} : { buildingType }) }); }
  subscribeCompany(decisionId: string, quantity: number | null) { return this.send({ type: 'subscribeCompany', decisionId, quantity }); }
  ackCompany(decisionId: string) { return this.send({ type: 'ackCompany', decisionId }); }
  buyLottery(decisionId: string, number: number) { return this.send({ type: 'buyLottery', decisionId, number }); }
  leaveLottery(decisionId: string) { return this.send({ type: 'leaveLottery', decisionId }); }
  acknowledgeFortune(decisionId: string) { return this.send({ type: 'ackFortune', decisionId }); }
  acknowledgeNews(decisionId: string) { return this.send({ type: 'ackNews', decisionId }); }
  useItem(action: EffectAction, value?: number, stolenItemId?: string) { return this.send({ type: 'item', action, ...(value === undefined ? {} : { value }), ...(stolenItemId ? { stolenItemId } : {}) }); }
  facility(decisionId: string, targetId: string | null) { return this.send({ type: 'facility', decisionId, targetId }); }
  sellItem(decisionId: string, itemId: string) { return this.send({ type: 'sellItem', decisionId, itemId }); }
  buyItem(decisionId: string, itemId = 'tool:01') { return this.send({ type: 'buyItem', decisionId, itemId }); }
  leaveShop(decisionId: string) { return this.send({ type: 'leaveShop', decisionId }); }
  traffic(diceCount: number, dismount = false) { return this.send({ type: 'traffic', diceCount, dismount }); }
  endTurn() { this.send({ type: 'endTurn' }); }
}
