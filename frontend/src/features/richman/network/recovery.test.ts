import { afterEach, expect, it, vi } from 'vitest';
import { GameHost } from '../../../../../shared/richman/host';
import { SERVER_MANIFEST } from '../../../../../shared/richman/content';
import { projectGame } from '../../../../../shared/richman/projection';
import { NetworkSession } from './session';
import { netRequest } from './api';
import { ApiError } from '../../../api/client';
import type { NetworkView } from './view';
vi.mock('./api', () => ({ netRequest: vi.fn() }));
const sessions: NetworkSession[] = [];
const key = 'richman.net.pending:u1:recovery-test';
const intent = { id: 'original-request', expectedRevision: 0, action: { type: 'roll' as const } };
function fixture(): NetworkView {
  const host = new GameHost({ gameId: 'recovery-test', seed: 'secret', rulesId: 'japan-events-candidate-v47', characterIds: ['xiaomei', 'tuu'], humanIds: ['player-1', 'player-2'] },
    ['xiaomei', 'tuu'].map((characterId, i) => ({ playerId: `player-${i + 1}`, characterId, userId: `u${i + 1}`, policy: null })));
  return { ...projectGame(host, 'u1', new Set()), canControl: true, hostError: null };
}
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; };
async function connect() {
  const session = new NetworkSession(SERVER_MANIFEST, 'recovery-test', 'u1'); sessions.push(session);
  return session.connect(new AbortController().signal);
}
afterEach(async () => {
  sessions.splice(0).forEach(s => s.dispose()); await Promise.resolve();
  vi.resetAllMocks(); localStorage.clear(); sessionStorage.clear();
});
it('reconciles a durable committed request on browser restart without resending it', async () => {
  const view = fixture(); localStorage.setItem(key, JSON.stringify(intent));
  vi.mocked(netRequest).mockImplementation(async (_owner, path) => path.endsWith('/recover') ?
    { ...view, revision: 9, recovery: { id: intent.id, resolution: 'committed', receipt: { revision: 1 } } } : {});
  const session = await connect();
  expect(session.state.revision).toBe(9); expect(session.state.network?.pending).toBe(false);
  expect(localStorage.getItem(key)).toBeNull();
  expect(vi.mocked(netRequest).mock.calls.some(c => c[1].endsWith('/commands'))).toBe(false);
});
it('preserves an uncommitted request through refresh and authentication failure without spending automatically', async () => {
  const view = fixture(); let denied = false;
  localStorage.setItem(key, JSON.stringify(intent));
  vi.mocked(netRequest).mockImplementation(async (_owner, path) => {
    if (denied) throw new ApiError('ACCESS_TOKEN_INVALID', '重新登录原账号', 401);
    return path.endsWith('/recover') ? { ...view, recovery: { id: intent.id, resolution: 'missing', receipt: null } } : {};
  });
  const session = await connect(); denied = true; await session.refresh();
  expect(session.state.network).toMatchObject({ connected: false, pending: true });
  denied = false; await session.refresh();
  expect(session.state.network).toMatchObject({ connected: true, pending: true });
  expect(JSON.parse(localStorage.getItem(key)!)).toEqual(intent);
  expect(vi.mocked(netRequest).mock.calls.some(c => c[1].endsWith('/commands'))).toBe(false);
});
it('does not release input on an older in-flight poll after a successful command', async () => {
  const view = fixture(), oldPoll = deferred<NetworkView>(), recovery = deferred<NetworkView>();
  let reads = 0, savedId = '';
  vi.mocked(netRequest).mockImplementation(async (_owner, path, body) => {
    if (path.endsWith('/commands')) { savedId = (body as { id: string }).id; return { revision: 1 }; }
    if (path.endsWith('/recover')) return recovery.promise;
    if (path.endsWith('/recovery-test')) return ++reads === 1 ? view : oldPoll.promise;
    return {};
  });
  const session = await connect(); const poll = session.refresh(); session.roll();
  await vi.waitFor(() => expect(session.state.network?.connected).toBe(false));
  oldPoll.resolve(view); await poll;
  expect(session.state.network?.pending).toBe(true);
  session.roll(); expect(vi.mocked(netRequest).mock.calls.filter(c => c[1].endsWith('/commands'))).toHaveLength(1);
  recovery.resolve({ ...view, revision: 1, recovery: { id: savedId, resolution: 'committed', receipt: { revision: 1 } } });
  await vi.waitFor(() => expect(session.state.network?.pending).toBe(false));
  expect(session.state.revision).toBe(1);
});
it('rejects recovery projections behind their own receipt and stops controls on host fault', async () => {
  const view = fixture(); let next = view;
  vi.mocked(netRequest).mockImplementation(async (_owner, path) => path.endsWith('/claim') || path.endsWith('/disconnect') ? {} : next);
  const session = await connect();
  localStorage.setItem(key, JSON.stringify(intent));
  next = { ...view, recovery: { id: intent.id, resolution: 'committed', receipt: { revision: 2 } } };
  await session.refresh(); expect(session.state.network).toMatchObject({ pending: true, connected: false });
  expect(localStorage.getItem(key)).not.toBeNull();
  next = { ...view, revision: 2, hostError: 'NET_HOST_ERROR' };
  await session.refresh(); expect(session.state.network?.connected).toBe(false);
});
it('old disposed requests cannot clear new recovery records or poll after disconnect', async () => {
  const view = fixture(), command = deferred<object>();
  vi.mocked(netRequest).mockImplementation(async (_owner, path) => path.endsWith('/commands') ? command.promise :
    path.endsWith('/claim') || path.endsWith('/disconnect') ? {} : view);
  const session = await connect(); session.roll(); session.dispose();
  const newer = { ...intent, id: 'new-window-request' }; localStorage.setItem(key, JSON.stringify(newer));
  const before = vi.mocked(netRequest).mock.calls.filter(c => c[1].endsWith('/recovery-test')).length;
  command.resolve({ revision: 1 }); await session.refresh();
  await vi.waitFor(() => expect(vi.mocked(netRequest).mock.calls.some(c => c[1].endsWith('/disconnect'))).toBe(true));
  expect(JSON.parse(localStorage.getItem(key)!)).toEqual(newer);
  expect(vi.mocked(netRequest).mock.calls.filter(c => c[1].endsWith('/recovery-test'))).toHaveLength(before);
});
it('a replaced window can reconcile a receipt but cannot submit or automatically reclaim', async () => {
  const view = fixture(); localStorage.setItem(key, JSON.stringify(intent));
  vi.mocked(netRequest).mockImplementation(async (_owner, path) => path.endsWith('/recover') ?
    { ...view, canControl: false, recovery: { id: intent.id, resolution: 'missing', receipt: null } } : {});
  const session = await connect(); await session.retryPending(); await session.refresh();
  expect(session.state.network?.readOnly).toBe(true);
  expect(vi.mocked(netRequest).mock.calls.filter(c => c[1].endsWith('/claim'))).toHaveLength(1);
  expect(vi.mocked(netRequest).mock.calls.some(c => c[1].endsWith('/commands'))).toBe(false);
});
