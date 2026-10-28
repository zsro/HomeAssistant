// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import nodes from '../../../../shared/richman/japan-topology.fixture.json';
import type { Manifest } from './types';
import { GameSession } from './game/session';
import { CloudSaves } from './cloud-saves';
import type { SaveApi, SaveReceipt, SaveWrite, SlotKey } from './cloud-api';
import { ApiError } from '../../api/client';
import { restoreSave } from './game/save';
import fixture from '../../../../tests/fixtures/richman-save-paused-v1.json';

const manifest: Manifest = { version: 1, map: { name: '日本', width: 2304, height: 2304, nodes, scenery: [] }, sprites: {},
  characters: ['xiaomei', 'tuu', 'chyan', 'salonbus'].map(id => ({ id, name: id, color: '#fff', idle: [], walk: [], walkFramesPerDirection: 10 })) };
const makeSession = () => new GameSession(manifest, { id: () => 'cloud-test-game', seed: () => 'cloud-test-seed' }, 'surrender');
function receipt(slot: SlotKey, body: SaveWrite): SaveReceipt {
  const save = JSON.parse(body.save);
  return { slot, slotVersion: body.expectedSlotVersion + 1, savedAt: '2026-10-20T08:00:00.000Z', revisionId: body.requestId,
    bytes: Buffer.byteLength(body.save), summary: {
      gameId: save.gameId, revision: save.revision, mapId: 'japan', rulesId: save.replay.rulesId,
      characterIds: save.replay.config.characterIds, computerIds: [], phase: 'idle', paused: false,
      gameDate: '1998-01-01', turn: 1, activePlayerId: 'player-1', stateDigest: save.stateDigest,
    } };
}
function setup() {
  let session = makeSession(), now = 1000;
  const write = vi.fn<SaveApi['write']>(async (slot, body) => receipt(slot, body));
  const read = vi.fn<SaveApi['read']>();
  const list = vi.fn<SaveApi['list']>(async () => []);
  const api = { write, read, list }, manager = new CloudSaves('owner-1', api, () => session, () => manifest, () => now);
  return { api, manager, session, advance: (ms: number) => { now += ms; }, replace: (next: GameSession) => { session.dispose(); session = next; } };
}
async function idle(manager: CloudSaves) { await vi.waitFor(() => expect(manager.snapshot().busy).toBe(false)); }

describe('SAVE-03 cloud workflow', () => {
  it('never saves the initial preview, or guesses version zero when listing failed', async () => {
    const { manager, api } = setup();
    await manager.refresh(); manager.observe();
    expect(api.write).not.toHaveBeenCalled();
    api.list.mockRejectedValueOnce(new ApiError('NETWORK_ERROR', '离线', 0));
    const fresh = new CloudSaves('owner-1', api, makeSession, () => manifest);
    await fresh.refresh(); fresh.beginGame(); fresh.observe();
    expect(api.write).not.toHaveBeenCalled();
    manager.dispose(); fresh.dispose();
  });
  it('captures one immutable revision while play continues during upload', async () => {
    const { manager, api, session } = setup();
    let resolve!: (value: SaveReceipt) => void;
    api.write.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const saving = manager.save('manual-1', 0);
    await vi.waitFor(() => expect(api.write).toHaveBeenCalledOnce());
    const [slot, body] = api.write.mock.calls[0];
    expect(JSON.parse(body.save).revision).toBe(0);
    session.pause(true);
    resolve(receipt(slot, body)); await saving;
    expect(manager.snapshot()).toMatchObject({ busy: false, pending: false, dirty: true, lastSaved: { summary: { revision: 0 } } });
    manager.dispose();
  });
  it('retries the exact request after a lost response without capturing newer progress', async () => {
    const { manager, api, session } = setup();
    api.write.mockRejectedValueOnce(new ApiError('NETWORK_ERROR', '应答丢失', 0));
    await manager.save('manual-1', 0);
    const original = structuredClone(api.write.mock.calls[0][1]);
    session.pause(true);
    await manager.retry();
    expect(api.write.mock.calls[1][1]).toEqual(original);
    expect(manager.snapshot()).toMatchObject({ pending: false, dirty: true });
    manager.dispose();
  });
  it('throttles automatic saves and stops on conflict until explicit user action', async () => {
    const { manager, api, session, advance } = setup();
    await manager.refresh(); manager.beginGame(); manager.observe(); await idle(manager);
    expect(api.write).toHaveBeenCalledOnce();
    session.pause(true); advance(29_000); manager.observe(); expect(api.write).toHaveBeenCalledOnce();
    api.write.mockRejectedValueOnce(new ApiError('SAVE_VERSION_CONFLICT', '冲突', 409));
    advance(1000); manager.observe(); await idle(manager);
    expect(api.write).toHaveBeenCalledTimes(2);
    advance(60_000); manager.observe(); expect(api.write).toHaveBeenCalledTimes(2);
    await manager.refresh(); manager.observe(); expect(api.write).toHaveBeenCalledTimes(2);
    manager.abandon(); expect(manager.snapshot().automatic).toBe(false);
    await manager.save('manual-2', 0); expect(api.write).toHaveBeenCalledTimes(3);
    manager.dispose();
  });
  it('queues a moving save and writes at the next real stable decision', async () => {
    const { manager, api, session } = setup();
    session.roll();
    await manager.save('manual-1', 0);
    expect(manager.snapshot().waiting).toBe(true);
    expect(api.write).not.toHaveBeenCalled();
    for (let i = 0; i < 250 && manager.snapshot().waiting; i++) { session.tick(50); manager.observe(); }
    await idle(manager);
    expect(manager.snapshot().waiting).toBe(false);
    expect(api.write).toHaveBeenCalledOnce();
    const restored = await GameSession.restore(manifest, api.write.mock.calls[0][1].save);
    expect(restored.gameState).toEqual(session.gameState);
    restored.dispose(); manager.dispose();
  });
  it('cancels queued saves on new-game preparation and refuses to discard an unresolved upload', async () => {
    const { manager, api, session } = setup();
    session.roll(); await manager.save('manual-1', 0);
    expect(manager.prepareGame()).toBe(true); expect(manager.snapshot().waiting).toBe(false);
    session.reset();
    api.write.mockRejectedValueOnce(new ApiError('NETWORK_ERROR', '离线', 0));
    await manager.save('manual-1', 0);
    expect(manager.prepareGame()).toBe(false);
    manager.abandon(); expect(manager.prepareGame()).toBe(true);
    manager.dispose();
  });
  it('retains the original game when the downloaded save fails validation', async () => {
    const { manager, api, session } = setup(), before = session.gameState;
    const body = { save: await session.exportSave(), requestId: 'load', expectedSlotVersion: 0 };
    api.read.mockResolvedValue({ ...receipt('manual-1', body), save: body.save.replace(/"stateDigest":"[^"]+"/, `"stateDigest":"${'0'.repeat(64)}"`) });
    await manager.load('manual-1');
    expect(manager.snapshot()).toMatchObject({ candidate: null, errorCode: 'digest-mismatch', busy: false });
    expect(session.gameState).toEqual(before);
    session.pause(true); expect(session.state.paused).toBe(true);
    manager.dispose();
  });
  it('restores into a candidate, allows decline, and holds accepted loads until continued', async () => {
    const { manager, api, session, replace } = setup();
    const body = { save: await session.exportSave(), requestId: 'load', expectedSlotVersion: 0 };
    const saved = receipt('manual-1', body);
    api.read.mockResolvedValue({ ...saved, save: body.save });
    session.pause(true);
    await manager.load('manual-1');
    expect(session.state.paused).toBe(true); expect(manager.snapshot().candidate?.state.paused).toBe(false);
    manager.cancelLoad(); expect(manager.snapshot().candidate).toBeNull();
    await manager.load('manual-1');
    const candidate = manager.snapshot().candidate!;
    expect(manager.adopt(replace)).toBe(true);
    const before = candidate.gameState;
    candidate.tick(60000); candidate.roll(); expect(candidate.gameState).toEqual(before);
    candidate.continueRestored(); candidate.roll(); expect(candidate.state.phase).toBe('rolling');
    manager.dispose();
  });
  it('ignores late reads after cancellation or unmount', async () => {
    const { manager, api, session } = setup();
    let resolve!: (value: Awaited<ReturnType<SaveApi['read']>>) => void;
    const body = { save: await session.exportSave(), requestId: 'late', expectedSlotVersion: 0 };
    api.read.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const loading = manager.load('manual-1');
    manager.cancelLoad();
    resolve({ ...receipt('manual-1', body), save: body.save }); await loading;
    expect(manager.snapshot().candidate).toBeNull();
    expect(manager.snapshot().busy).toBe(false);
    manager.dispose();
  });
  it('does not autosave the old game while a restored candidate awaits confirmation', async () => {
    const { manager, api, session } = setup();
    await manager.refresh(); manager.beginGame();
    const body = { save: await session.exportSave(), requestId: 'candidate', expectedSlotVersion: 0 };
    api.read.mockResolvedValue({ ...receipt('manual-1', body), save: body.save });
    await manager.load('manual-1'); manager.observe();
    expect(api.write).not.toHaveBeenCalled();
    expect(manager.adopt(() => { throw new Error('renderer unavailable'); })).toBe(false);
    expect(session.state.revision).toBe(0);
    expect(manager.snapshot().candidate).not.toBeNull();
    manager.cancelLoad(); manager.observe();
    expect(api.write).not.toHaveBeenCalled(); // A failed adoption also pauses automatic retries.
    await manager.refresh(); manager.observe(); await idle(manager);
    expect(api.write).toHaveBeenCalledOnce();
    manager.dispose();
  });
  it('keeps slot metadata newer than an idempotent old receipt', async () => {
    const { manager, api, session } = setup();
    api.write.mockRejectedValueOnce(new ApiError('NETWORK_ERROR', '应答丢失', 0));
    await manager.save('manual-1', 0);
    const old = receipt('manual-1', api.write.mock.calls[0][1]);
    api.list.mockResolvedValue([{ ...old, slotVersion: 5 }]);
    await manager.refresh(); await manager.retry();
    expect(manager.snapshot().slots?.[0].slotVersion).toBe(5);
    expect(manager.snapshot().lastSaved?.slotVersion).toBe(1);
    expect(session.state.revision).toBe(0);
    manager.dispose();
  });
});

it('menu holds do not alter replay, RNG, pause or consume command IDs', async () => {
  const session = makeSession(), replay = session.exportReplay(), state = session.gameState;
  session.hold(true); session.tick(10000); session.roll(); session.pause(true);
  expect(session.exportReplay()).toEqual(replay); expect(session.gameState).toEqual(state);
  expect(JSON.parse(await session.exportSave()).revision).toBe(0);
  session.hold(false); session.roll();
  expect(session.exportReplay()?.commands[0].id).toBe('command-1');
  session.dispose();
});
it('restoration cancellation is checked before dispatch and reports progress', async () => {
  const abort = new AbortController(), progress = vi.fn(() => abort.abort());
  await expect(restoreSave(manifest, JSON.stringify(fixture), 30000, { signal: abort.signal, progress }))
    .rejects.toMatchObject({ code: 'cancelled' });
  expect(progress).toHaveBeenCalledWith(0, 1);
});
