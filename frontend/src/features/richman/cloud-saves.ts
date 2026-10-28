import { ApiError } from '../../api/client';
import { GameSession } from './game/session';
import { SaveError } from './game/save';
import type { SaveApi, SaveReceipt, SaveWrite, SlotKey } from './cloud-api';
import type { Manifest } from './types';

type PendingSave = { slot: SlotKey; body: SaveWrite; gameId: string; revision: number };
export type CloudSaveState = {
  slots: SaveReceipt[] | null; listing: boolean; busy: boolean; waiting: boolean;
  restoring: boolean; progress: number; candidate: GameSession | null; candidateReceipt: SaveReceipt | null;
  pending: boolean; message: string; errorCode: string | null;
  lastSaved: SaveReceipt | null; dirty: boolean; automatic: boolean;
};
export function saveErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return error.message.includes('另一账号') ? error.message : '登录已过期，请在这里重新登录；当前对局和待重试的保存仍然保留。';
    if (error.code === 'SAVE_VERSION_CONFLICT') return '此槽位已在其他页面更新。请放弃这次请求，重新读取槽位后选择；不会自动覆盖云端新档。';
    if (error.code === 'SAVE_REQUEST_REUSED') return '保存请求编号冲突，请放弃这次请求后重新选择槽位。';
    if (error.status === 429) return '保存太频繁，请稍候一分钟再重试。';
    if (error.code === 'SAVE_BUSY') return '云端正在处理其他存档，请稍后重试。';
    if (error.status === 413) return '存档超过服务器接收上限，本次未确认保存；当前对局仍在。';
    return `${error.message}。当前对局仍然保留，请检查后重试。`;
  }
  return error instanceof Error ? error.message : '操作失败，当前对局仍然保留。';
}

/** One owner, one in-flight request, immutable retry body, and an isolated load candidate. */
export class CloudSaves {
  private value: CloudSaveState = { slots: null, listing: false, busy: false, waiting: false, restoring: false,
    progress: 0, candidate: null, candidateReceipt: null, pending: false, message: '', errorCode: null,
    lastSaved: null, dirty: false, automatic: true };
  private listeners = new Set<() => void>();
  private disposed = false;
  private generation = 0;
  private pending: PendingSave | null = null;
  private queued: { slot: SlotKey; expectedSlotVersion: number; gameId: string } | null = null;
  private operation: AbortController | null = null;
  private listing: AbortController | null = null;
  private armed = false;
  private lastWriteAt = -Infinity;
  private lastSavedKey = '';
  private previousStable = '';
  private eligible = false;
  private listVersion = 0;
  constructor(readonly ownerId: string, private readonly api: SaveApi,
    private readonly current: () => GameSession | null, private readonly manifest: () => Manifest | null,
    private readonly clock = () => Date.now(), private readonly beforeCapture = () => {}) {}
  snapshot = () => this.value;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private patch(patch: Partial<CloudSaveState>) {
    if (this.disposed) return;
    this.value = { ...this.value, ...patch };
    this.listeners.forEach(listener => listener());
  }
  private failed(error: unknown) {
    this.patch({ errorCode: error instanceof ApiError ? error.code : error instanceof SaveError ? error.code : 'UNKNOWN',
      message: saveErrorMessage(error) });
  }
  async refresh() {
    if (this.value.busy || this.listing || this.disposed) return;
    const operation = new AbortController(), version = this.listVersion;
    this.listing = operation; this.patch({ listing: true });
    try {
      const slots = await this.api.list(operation.signal);
      if (!operation.signal.aborted && version === this.listVersion) this.patch({
        slots, ...(!this.pending ? { errorCode: null, message: '' } : {}),
      });
    } catch (error) { if (!operation.signal.aborted) this.failed(error); }
    finally { if (this.listing === operation) { this.listing = null; this.patch({ listing: false }); } }
  }
  beginGame() {
    this.cancelLoad(); this.cancelWaiting(); this.abandon();
    this.armed = true; this.lastSavedKey = ''; this.previousStable = ''; this.eligible = true;
    this.patch({ dirty: true, lastSaved: null, message: '本局尚未保存', errorCode: null });
  }
  prepareGame() {
    if (this.value.busy || this.pending) return false;
    this.armed = false; this.cancelLoad(); this.cancelWaiting();
    this.generation++;
    return true;
  }
  setAutomatic(automatic: boolean) { this.patch({ automatic }); }
  observe() {
    const session = this.current();
    if (!session || this.disposed || !this.armed) return;
    const key = `${session.gameId}:${session.state.revision}`;
    const dirty = key !== this.lastSavedKey;
    if (dirty !== this.value.dirty) this.patch({ dirty });
    if (session.state.mode !== 'surrender' || session.state.restorationPending || this.value.candidate) return;
    // Cheap phase filtering avoids cloning the complete world on animation frames.
    if (['rolling', 'moving'].includes(session.state.phase) || session.state.minigame?.stage === 'playing') return;
    if (!session.saveAvailability.ok) return;
    if (this.queued && this.queued.gameId !== session.gameId) this.cancelWaiting();
    if (this.queued && !this.value.busy) {
      const queued = this.queued; this.queued = null;
      this.patch({ waiting: false });
      void this.capture(queued.slot, queued.expectedSlotVersion);
      return;
    }
    if (this.previousStable !== key) { this.previousStable = key; this.eligible = dirty; }
    if (this.value.automatic && this.eligible && !this.value.busy && !this.pending && !this.value.errorCode &&
      this.value.slots !== null && !this.value.listing && this.clock() - this.lastWriteAt >= 30_000) {
      this.eligible = false;
      void this.capture('auto', this.value.slots.find(slot => slot.slot === 'auto')?.slotVersion ?? 0);
    }
  }
  async save(slot: SlotKey, expectedSlotVersion: number) {
    const session = this.current();
    if (!session || this.value.busy || this.pending || this.disposed) return;
    if (session.state.mode !== 'surrender') { this.failed(new Error('此历史模式不支持云存档，请使用当前完整对局模式。')); return; }
    this.armed = true;
    if (!session.saveAvailability.ok) {
      this.queued = { slot, expectedSlotVersion, gameId: session.gameId };
      this.patch({ waiting: true, message: '等待动画或小游戏结束后保存；若已暂停，请先继续对局。', errorCode: null });
      return;
    }
    await this.capture(slot, expectedSlotVersion);
  }
  cancelWaiting() { this.queued = null; this.patch({ waiting: false }); }
  private async capture(slot: SlotKey, expectedSlotVersion: number) {
    const session = this.current();
    if (!session || this.value.busy || this.pending) return;
    const generation = this.generation, gameId = session.gameId, revision = session.state.revision;
    this.beforeCapture();
    this.patch({ busy: true, errorCode: null, message: '正在准备存档…' });
    try {
      const save = await session.exportSave();
      if (this.disposed || generation !== this.generation || session !== this.current() || session.gameId !== gameId) return;
      this.pending = { slot, gameId, revision, body: { save, requestId: crypto.randomUUID(), expectedSlotVersion } };
      this.patch({ pending: true });
    } catch (error) { this.failed(error); }
    finally { this.patch({ busy: false }); }
    if (this.pending) await this.retry();
  }
  async retry() {
    if (!this.pending || this.value.busy || this.disposed) return;
    this.beforeCapture();
    const pending = this.pending, operation = new AbortController(), generation = this.generation;
    this.operation = operation; this.lastWriteAt = this.clock();
    this.patch({ busy: true, errorCode: null, message: `正在保存第 ${pending.revision} 步进度…` });
    try {
      const saved = await this.api.write(pending.slot, pending.body, operation.signal);
      if (this.disposed || generation !== this.generation) return;
      this.listVersion++;
      const previous = this.value.slots?.find(slot => slot.slot === saved.slot);
      const slots = previous && previous.slotVersion > saved.slotVersion ? this.value.slots :
        [...(this.value.slots ?? []).filter(slot => slot.slot !== saved.slot), saved];
      this.lastSavedKey = `${pending.gameId}:${pending.revision}`;
      this.pending = null;
      this.patch({ slots, pending: false, lastSaved: saved, message: `已保存 · ${new Date(saved.savedAt).toLocaleTimeString()}` });
    } catch (error) { if (!operation.signal.aborted) this.failed(error); }
    finally {
      if (this.operation === operation) { this.operation = null; this.patch({ busy: false }); }
      this.observeDirty();
    }
  }
  private observeDirty() {
    const session = this.current();
    if (session && this.armed) this.patch({ dirty: `${session.gameId}:${session.state.revision}` !== this.lastSavedKey });
  }
  abandon() {
    if (this.value.busy) return;
    if (this.pending?.slot === 'auto') this.patch({ automatic: false });
    this.pending = null;
    this.patch({ pending: false, errorCode: null, message: '可重新读取槽位后选择保存位置。' });
  }
  async load(slot: SlotKey) {
    if (this.value.busy || this.value.waiting || this.pending || this.disposed) return;
    const manifest = this.manifest();
    if (!manifest) return;
    this.cancelLoad();
    const operation = new AbortController(), generation = this.generation;
    this.operation = operation;
    this.patch({ busy: true, restoring: true, progress: 0, errorCode: null, message: '正在读取云端存档…' });
    try {
      const saved = await this.api.read(slot, operation.signal);
      if (operation.signal.aborted) return;
      const candidate = await GameSession.restore(manifest, saved.save, undefined, {
        signal: operation.signal,
        progress: (completed, total) => this.patch({ progress: total ? Math.floor(completed / total * 100) : 100, message: '正在恢复对局，当前对局保持不变…' }),
      });
      if (this.disposed || operation.signal.aborted || generation !== this.generation) { candidate.dispose(); return; }
      this.patch({ candidate, candidateReceipt: saved, message: '恢复校验完成。确认后替换当前对局，未保存进度将丢失。' });
    } catch (error) { if (!operation.signal.aborted) this.failed(error); }
    finally { if (this.operation === operation) { this.operation = null; this.patch({ busy: false, restoring: false }); } }
  }
  cancelLoad() {
    const hadLoad = this.value.restoring || this.value.candidate !== null;
    if (this.value.restoring) { this.operation?.abort(); this.operation = null; this.patch({ busy: false, restoring: false }); }
    this.value.candidate?.dispose();
    this.patch({ candidate: null, candidateReceipt: null,
      ...(hadLoad && !this.value.errorCode ? { message: '已取消读取，当前对局保持不变。' } : {}) });
  }
  adopt(replace: (candidate: GameSession) => void) {
    const candidate = this.value.candidate, receipt = this.value.candidateReceipt;
    if (!candidate || !receipt) return false;
    try { replace(candidate); } catch (error) { this.failed(error); return false; }
    this.armed = true; this.lastSavedKey = `${candidate.gameId}:${candidate.state.revision}`;
    this.previousStable = this.lastSavedKey; this.eligible = false;
    this.patch({ candidate: null, candidateReceipt: null, lastSaved: receipt, dirty: false, message: '已恢复，点击继续旅程。', errorCode: null });
    return true;
  }
  dispose() {
    this.disposed = true; this.generation++; this.operation?.abort(); this.listing?.abort();
    this.value.candidate?.dispose(); this.listeners.clear();
  }
}
