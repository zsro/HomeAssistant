import { afterEach, expect, it, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { GameHost } from '../../../../../shared/richman/host';
import { SERVER_MANIFEST } from '../../../../../shared/richman/content';
import { projectGame } from '../../../../../shared/richman/projection';
import { networkSnapshot } from './view';
import { NetworkSession } from './session';
import { netRequest } from './api';
import { ApiError } from '../../../api/client';
import { decisionWindow } from '../window-state';
import { turnControls } from '../classic-presentation';
import { ItemPanel } from '../ItemPanel';
import { G6Panel } from '../G6Panel';
import { FinancePanel } from '../FinancePanel';
vi.mock('./api', () => ({ netRequest: vi.fn() }));
const manifest = SERVER_MANIFEST;
function fixture() {
  const host = new GameHost({ gameId: 'network-test', seed: 'never-public', rulesId: 'japan-events-candidate-v47', characterIds: ['xiaomei','tuu'], humanIds: ['player-1','player-2'] },
    [{ playerId: 'player-1', characterId: 'xiaomei', userId: 'u1', policy: null }, { playerId: 'player-2', characterId: 'tuu', userId: 'u2', policy: null }]);
  return { host, view: { ...projectGame(host, 'u1', new Set(['u1','u2'])), canControl: true, hostError: null } };
}
afterEach(() => { cleanup(); vi.resetAllMocks(); sessionStorage.clear(); localStorage.clear(); });
it('maps authoritative public data to existing inventory, stock and finance windows without a local engine', () => {
  const { view } = fixture();
  const snapshot = networkSnapshot(view, manifest, { pending: false, connected: true, message: '', readOnly: false });
  const use = vi.fn(() => true);
  expect(turnControls(snapshot, true).go).toBe(true);
  render(<><ItemPanel snapshot={snapshot} onUse={use} buy={use} leave={use}/><G6Panel snapshot={snapshot} trade={use}/><FinancePanel snapshot={snapshot} manifest={manifest} transfer={use} leaveBank={use} settleDebt={use} newGame={use}/></>);
  expect(snapshot.seed).toBe(''); expect(snapshot.effects?.inventory['player-2']).toEqual({});
  expect(JSON.stringify(view)).not.toContain('never-public');
  for (const key of ['randomState','researchMemory','order','world','noise','momentum']) expect(JSON.stringify(view)).not.toContain(`"${key}"`);
});
it('waiting and replaced seats cannot trigger GO or force an empty decision modal', () => {
  const { host } = fixture(); host.input('u1', { id: 'roll', expectedRevision: 0, action: { type: 'roll' } });
  host.advance(250, new Set(['u1','u2'])); host.advance(250, new Set(['u1','u2'])); host.advance(250, new Set(['u1','u2']));
  const view = { ...projectGame(host, 'u2', new Set()), canControl: false, hostError: null };
  const snapshot = networkSnapshot(view, manifest, { pending: false, connected: true, message: '', readOnly: true });
  expect(turnControls(snapshot, true).go).toBe(false); expect(decisionWindow(snapshot)).toBeNull(); expect(snapshot.decision).toBeNull();
});
it('keeps an immutable pending request through lost response, blocks duplicates, and retries the same id', async () => {
  const { view } = fixture(), calls: unknown[] = [];
  let release: (value: unknown) => void = () => {};
  const gate = new Promise(resolve => { release = resolve; }); let count = 0;
  vi.mocked(netRequest).mockImplementation(async (_owner, path, body) => {
    if (path.endsWith('/commands')) { calls.push(structuredClone(body)); if (++count === 1) { await gate; throw new ApiError('NETWORK_ERROR', 'lost', 0); } return { id: 'accepted' }; }
    if (path.endsWith('/recover')) return { ...view, recovery: { id: (body as { pending: { id: string } }).pending.id, resolution: count > 1 ? 'committed' : 'missing', receipt: count > 1 ? { revision: 0 } : null } };
    return path.endsWith('/claim') || path.endsWith('/disconnect') ? {} : structuredClone(view);
  });
  const session = await new NetworkSession(manifest, view.gameId, 'u1').connect(new AbortController().signal);
  const cash = session.state.economy!.balances['player-1'].cash;
  session.roll(); session.roll(); expect(calls).toHaveLength(1); expect(session.state.revision).toBe(0); expect(session.state.economy!.balances['player-1'].cash).toBe(cash); expect(session.state.network?.pending).toBe(true);
  release(null); await vi.waitFor(() => expect(session.state.network?.message).toContain('结果待确认'));
  await session.retryPending(); expect(calls).toHaveLength(2); expect(calls[1]).toEqual(calls[0]); expect(session.state.network?.pending).toBe(false);
  expect(session.saveAvailability.ok).toBe(false); session.tick(10000); expect(session.state.revision).toBe(0); session.dispose();
});
it('persists unconfirmed commands across reload and rejects local rule controls', async () => {
  const { view } = fixture(); const key = `richman.net.pending:u1:${view.gameId}`, intent = { id: 'saved-request', expectedRevision: 0, action: { type: 'roll' } };
  sessionStorage.setItem(key, JSON.stringify(intent));
  let committed = false;
  vi.mocked(netRequest).mockImplementation(async (_owner, path) => {
    if (path.endsWith('/commands')) { committed = true; return {}; }
    if (path.endsWith('/recover')) return { ...view, recovery: { id: intent.id, resolution: committed ? 'committed' : 'missing', receipt: committed ? { revision: 0 } : null } };
    return path.endsWith('/claim') || path.endsWith('/disconnect') ? {} : structuredClone(view);
  });
  const session = await new NetworkSession(manifest, view.gameId, 'u1').connect(new AbortController().signal);
  expect(session.state.network?.pending).toBe(true); session.roll(); session.pause(true); session.reset();
  expect(vi.mocked(netRequest).mock.calls.some(c => c[1].endsWith('/commands'))).toBe(false); expect(session.state.paused).toBe(false);
  await session.retryPending(); expect(vi.mocked(netRequest).mock.calls.find(c => c[1].endsWith('/commands'))?.[2]).toEqual(intent); session.dispose();
});
