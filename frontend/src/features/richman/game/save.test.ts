// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import nodes from '../../../../../shared/richman/japan-topology.fixture.json';
import type { Manifest } from '../types';
import { GameSession } from './session';
import { GameEngine } from './engine';
import type { GameState, Pending } from './engine';
import { canonicalSaveJSON, createSave, parseSave, restoreSave, SAVE_LIMITS, savePoint } from './save';
import type { SaveEnvelopeV1, SavedControl } from './save';
import { SURRENDER_RULES } from './surrender';

const manifest: Manifest = {
  version: 1, map: { name: '日本', width: 2304, height: 2304, nodes, scenery: [] }, sprites: {},
  characters: ['xiaomei', 'tuu', 'chyan', 'salonbus'].map(id => ({ id, name: id, color: '#fff', idle: [], walk: [], walkFramesPerDirection: 10 })),
};
function session(computerIds: string[] = []) {
  const model = new GameSession(manifest, { id: () => 'save-game', seed: () => 'save-seed' });
  model.start({ mode: 'surrender', characterIds: ['xiaomei', 'tuu'], seed: 'save-seed', computerIds, computerPolicy: 'research-v1', initialFunds: 300000 });
  return model;
}
const control: SavedControl = { mode: 'surrender', computerIds: [], computerPolicy: 'basic-v1', commandSerial: 0 };
function engine() { return new GameEngine(nodes, { gameId: 'save-game', seed: 'save-seed', rulesId: SURRENDER_RULES.id, characterIds: ['xiaomei', 'tuu'] }); }
async function changed(edit: (save: SaveEnvelopeV1) => void) {
  const value = parseSave(await session().exportSave()); edit(value); return JSON.stringify(value);
}

describe('SAVE-01 session restoration', () => {
  it('restores without starting a new game, consuming IDs, replaying audio or advancing until continued', async () => {
    const original = session(['xiaomei', 'tuu']);
    const serialized = await original.exportSave();
    const start = vi.spyOn(GameSession.prototype, 'start');
    const restored = await GameSession.restore(manifest, serialized, { id: () => { throw Error('new ID'); }, seed: () => { throw Error('new seed'); } });
    expect(start).not.toHaveBeenCalled(); start.mockRestore();
    const presentation = vi.fn(), change = vi.fn(); restored.onPresentation = presentation; restored.onChange = change;
    const before = restored.gameState;
    restored.tick(60000); restored.roll(); restored.pause(true);
    expect(restored.gameState).toEqual(before); expect(restored.state.restorationPending).toBe(true);
    restored.continueRestored();
    expect(restored.gameState).toEqual(before); expect(restored.state.restorationPending).toBeUndefined();
    expect(presentation).not.toHaveBeenCalled(); expect(change).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 12; i++) { original.tick(50); restored.tick(50); }
    expect(restored.exportReplay()).toEqual(original.exportReplay());
    expect(restored.gameState).toEqual(original.gameState);
  });

  it('preserves pause and rejected-command gaps; the next ID cannot collide', async () => {
    const original = session(); original.endTurn(); // invalid, but consumes command-1
    original.pause(true); const before = original.gameState;
    const serialized = await original.exportSave();
    expect(parseSave(serialized).session.commandSerial).toBe(2);
    const restored = await GameSession.restore(manifest, serialized); restored.continueRestored();
    restored.tick(1000); expect(restored.gameState).toEqual(before);
    original.pause(false); restored.pause(false); original.roll(); restored.roll();
    expect(restored.exportReplay()).toEqual(original.exportReplay());
    expect(restored.gameState).toEqual(original.gameState);
    expect(restored.exportReplay()!.commands.at(-1)!.id).toBe('command-4');
  });

  it('captures one revision before asynchronous hashing even if the live game moves on', async () => {
    const original = session(), state = original.gameState;
    const pendingSave = original.exportSave(); original.roll();
    const restored = await GameSession.restore(manifest, await pendingSave);
    expect(restored.gameState).toEqual(state);
    expect(restored.gameState).not.toEqual(original.gameState);
  });

  it('restores a genuine branch decision and continues to the identical next decision', async () => {
    const original = session(); original.roll();
    for (let i = 0; i < 1000 && original.state.phase !== 'choosing'; i++) original.tick(50);
    expect(original.state.phase).toBe('choosing');
    const restored = await GameSession.restore(manifest, await original.exportSave()); restored.continueRestored();
    expect(restored.state.choices).toEqual(original.state.choices);
    original.choose(original.state.choices[0]); restored.choose(restored.state.choices[0]);
    for (let i = 0; i < 200; i++) { original.tick(50); restored.tick(50); }
    expect(restored.gameState).toEqual(original.gameState);
    expect(restored.exportReplay()).toEqual(original.exportReplay());
  });

  it('does not damage the current game when a replacement is corrupt; disposal stops restored callbacks', async () => {
    const original = session(), state = original.gameState;
    await expect(GameSession.restore(manifest, '{')).rejects.toMatchObject({ code: 'invalid-save' });
    expect(original.gameState).toEqual(state);
    const restored = await GameSession.restore(manifest, await original.exportSave());
    restored.dispose(); restored.continueRestored(); restored.roll(); restored.tick(50);
    expect(restored.gameState).toEqual(state);
    await expect(restored.exportSave()).rejects.toMatchObject({ code: 'closed-session' });
  });

  it('retains engine de-duplication after restore, including before a stale revision check', async () => {
    const original = session(); original.pause(true);
    const restored = await restoreSave(manifest, await original.exportSave());
    const command = restored.engine.exportReplay().commands[0], before = restored.engine.state;
    expect(restored.engine.dispatch(command)).toEqual({ ok: false, reason: 'duplicate' });
    expect(restored.engine.state).toEqual(before);
  });

  it('does not save legacy/sandbox modes or a paused animation', async () => {
    const original = session(); original.roll(); original.pause(true);
    expect(original.saveAvailability).toEqual({ ok: false, reason: 'animation' });
    await expect(original.exportSave()).rejects.toMatchObject({ code: 'unsafe-point' });
    for (const mode of ['turns', 'sandbox', 'stockCircuit'] as const) {
      original.start({ mode, characterIds: ['xiaomei', 'tuu'], seed: 'old' });
      await expect(original.exportSave()).rejects.toMatchObject({ code: 'unsupported-version' });
    }
  });
});

describe('SAVE-01 stable-point whitelist (synthetic classification, not gameplay evidence)', () => {
  const samples: [Pending['kind'], GameState['phase']][] = [
    ['branch', 'choosing'], ['property', 'property'], ['bank', 'bank'], ['debt', 'debt'], ['shop', 'shop'],
    ['effect', 'effect'], ['reaction', 'reaction'], ['auction', 'auction'], ['news', 'news'], ['fortune', 'fortune'],
    ['lottery', 'lottery'], ['company', 'company'], ['construction', 'commerce'], ['subscription', 'commerce'],
    ['insurance', 'commerce'], ['facility', 'facility'], ['surrender', 'surrender'],
  ];
  it.each(samples)('allows %s only with its matching phase %s', (kind, phase) => {
    const state = engine().state; state.phase = phase; state.pending = { kind, id: 'pending' } as Pending;
    expect(savePoint(state)).toEqual({ ok: true }); state.phase = 'idle';
    expect(savePoint(state).ok).toBe(false);
  });
  it('allows only audited magic/minigame substages, including when paused', () => {
    const state = engine().state;
    for (const [kind, stages] of [['magic', ['draw', 'choose', 'result', 'build']], ['minigame', ['ready', 'result']]] as const) {
      for (const stage of [...stages, 'playing', 'future']) {
        state.phase = kind; state.paused = true; state.pending = { kind, id: 'p', stage } as Pending;
        expect(savePoint(state).ok).toBe((stages as readonly string[]).includes(stage));
      }
    }
    state.pending = null;
    for (const phase of ['idle', 'turnEnd', 'finished'] as const) { state.phase = phase; expect(savePoint(state).ok).toBe(true); }
  });
});

describe('SAVE-01 untrusted envelope validation and limits', () => {
  it.each([
    ['format', (s: SaveEnvelopeV1) => { s.formatVersion = 2 as 1; }, 'unsupported-version'],
    ['session version', (s: SaveEnvelopeV1) => { s.sessionVersion = 2 as 1; }, 'unsupported-version'],
    ['rules', (s: SaveEnvelopeV1) => { s.replay.rulesId = 'japan-events-candidate-v44'; }, 'unsupported-version'],
    ['control', (s: SaveEnvelopeV1) => { s.session.computerPolicy = 'new-policy' as SavedControl['computerPolicy']; }, 'invalid-save'],
    ['game identity', (s: SaveEnvelopeV1) => { s.gameId = 'another-game'; }, 'invalid-save'],
    ['revision', (s: SaveEnvelopeV1) => { s.revision = 1; }, 'invalid-save'],
    ['counter', (s: SaveEnvelopeV1) => { s.session.commandSerial = Number.MAX_SAFE_INTEGER; }, 'invalid-save'],
    ['seat mismatch', (s: SaveEnvelopeV1) => { s.session.computerIds = ['xiaomei']; }, 'invalid-save'],
    ['digest', (s: SaveEnvelopeV1) => { s.stateDigest = '0'.repeat(64); }, 'digest-mismatch'],
    ['valid changed policy', (s: SaveEnvelopeV1) => { s.session.computerPolicy = 'tools-v1'; }, 'digest-mismatch'],
    ['map fingerprint', (s: SaveEnvelopeV1) => { s.replay.mapFingerprint = 'wrong'; }, 'incompatible-content'],
    ['item fingerprint', (s: SaveEnvelopeV1) => { s.replay.itemFingerprint = 'wrong'; }, 'incompatible-content'],
    ['catalog fingerprint', (s: SaveEnvelopeV1) => { s.replay.catalogFingerprint = 'wrong'; }, 'incompatible-content'],
  ] as const)('rejects %s', async (_label, edit, code) => {
    await expect(restoreSave(manifest, await changed(edit))).rejects.toMatchObject({ code });
  });

  it('checks roster, permits presentation-only asset updates, and canonicalizes JSON key order', async () => {
    const serialized = await session().exportSave();
    await expect(restoreSave({ ...manifest, characters: [] }, serialized)).rejects.toMatchObject({ code: 'incompatible-content' });
    const reordered = canonicalSaveJSON(JSON.parse(serialized));
    expect((await restoreSave({ ...manifest, version: 2 }, reordered)).engine.state).toEqual(session().gameState);
  });

  it('rejects unknown fields, malformed actions, ID collisions, stale commands and illegal transitions', async () => {
    const original = session(); original.pause(true); const value = parseSave(await original.exportSave());
    const corrupt = (edit: (s: SaveEnvelopeV1) => void) => { const s = structuredClone(value); edit(s); return JSON.stringify(s); };
    const edits = [
      (s: SaveEnvelopeV1) => { Object.assign(s, { unexpected: true }); },
      (s: SaveEnvelopeV1) => { Object.assign(s.replay.commands[0].action, { value: 'false' }); },
      (s: SaveEnvelopeV1) => { s.replay.commands[0].action = { type: 'bank', decisionId: 'p', operation: 'deposit', amount: NaN }; },
      (s: SaveEnvelopeV1) => { s.replay.commands[0].id = 'command-0'; },
      (s: SaveEnvelopeV1) => { s.session.commandSerial = 0; },
      (s: SaveEnvelopeV1) => { s.replay.commands[0].expectedRevision = 1; },
      (s: SaveEnvelopeV1) => { s.replay.commands[0].playerId = 'player-9'; },
    ];
    for (const edit of edits) await expect(restoreSave(manifest, corrupt(edit))).rejects.toMatchObject({ code: 'invalid-save' });
    await expect(restoreSave(manifest, corrupt(s => { s.replay.commands[0].action = { type: 'endTurn' }; }))).rejects.toMatchObject({ code: 'invalid-replay' });
    await expect(restoreSave(manifest, corrupt(s => { s.replay.commands[0].action = { type: 'roll' }; }))).rejects.toMatchObject({ code: 'unsafe-point' });
    await expect(restoreSave(manifest, serializedWithProto(value))).rejects.toMatchObject({ code: 'invalid-save' });
  });

  it('bounds encoded size, command count and replay duration', async () => {
    expect(() => parseSave(' '.repeat(SAVE_LIMITS.bytes + 1))).toThrow(expect.objectContaining({ code: 'limit-exceeded' }));
    expect(() => parseSave('中'.repeat(Math.floor(SAVE_LIMITS.bytes / 3) + 1))).toThrow(expect.objectContaining({ code: 'limit-exceeded' }));
    const value = parseSave(await session().exportSave());
    value.replay.commands = Array(SAVE_LIMITS.commands + 1).fill({});
    expect(() => parseSave(JSON.stringify(value))).toThrow(expect.objectContaining({ code: 'limit-exceeded' }));
    await expect(restoreSave(manifest, await session().exportSave(), 0.00001)).rejects.toMatchObject({ code: 'limit-exceeded' });
  });

  it('writer rejects unrecognized command shapes before issuing a save', async () => {
    const e = engine();
    // Engine TypeScript callers were historically trusted; the persistence boundary is strict.
    expect(e.dispatch({ id: 'command-1', gameId: 'save-game', expectedRevision: 0, playerId: 'player-1', action: { type: 'pause', value: true, unexpected: 'field' } as never }).ok).toBe(true);
    await expect(createSave(manifest, e, { ...control, commandSerial: 1 }, {})).rejects.toMatchObject({ code: 'invalid-save' });
  });
});
function serializedWithProto(value: SaveEnvelopeV1) {
  return JSON.stringify(value).replace('"mode":"surrender"', '"mode":"surrender","__proto__":{"polluted":true}');
}
