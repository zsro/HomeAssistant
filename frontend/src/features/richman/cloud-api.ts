import { ApiError, request } from '../../api/client';
import { loadSession } from '../../auth/storage';
import type { SaveReceipt, SaveWrite, SlotKey } from '../../../../src/modules/richman/save-contract';
export type { SaveReceipt, SaveWrite, SlotKey };
export const SAVE_SLOTS: SlotKey[] = ['manual-1', 'manual-2', 'manual-3', 'auto'];
export const slotName = (slot: SlotKey) => slot === 'auto' ? '自动存档' : `手动存档 ${slot.slice(-1)}`;
export type LoadedSave = SaveReceipt & { save: string };
export interface SaveApi {
  list(signal: AbortSignal): Promise<SaveReceipt[]>;
  read(slot: SlotKey, signal: AbortSignal): Promise<LoadedSave>;
  write(slot: SlotKey, body: SaveWrite, signal: AbortSignal): Promise<SaveReceipt>;
}

export function cloudSaveApi(ownerId: string): SaveApi {
  async function call<T>(path: string, signal: AbortSignal, body?: SaveWrite): Promise<T> {
    const session = loadSession();
    if (!session) throw new ApiError('ACCESS_TOKEN_INVALID', '请重新登录后重试，当前对局仍然保留。', 401);
    if (session.user.id !== ownerId) throw new ApiError('SAVE_ACCOUNT_CHANGED', '这局属于另一账号，请登录原账号后重试。', 401);
    const controller = new AbortController(), abort = () => controller.abort();
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) controller.abort();
    const timeout = window.setTimeout(abort, 45_000);
    try {
      return await request<T>(`/richman/saves${path}`, {
        method: body ? 'PUT' : 'GET', ...(body ? { body: JSON.stringify(body) } : {}),
        headers: { Authorization: `Bearer ${session.tokens.accessToken}` }, signal: controller.signal,
      });
    } finally { clearTimeout(timeout); signal.removeEventListener('abort', abort); }
  }
  return {
    list: async signal => (await call<{ saves: SaveReceipt[] }>('', signal)).saves,
    read: (slot, signal) => call<LoadedSave>(`/${slot}`, signal),
    write: (slot, body, signal) => call<SaveReceipt>(`/${slot}`, signal, body),
  };
}
