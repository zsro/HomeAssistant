import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Express } from 'express';
import { Op } from 'sequelize';
import type { AppContext } from '../../src/app-context';
import { createApp } from '../../src/app';
import { loadConfig } from '../../src/config/env';
import { createMigrator } from '../../src/database/migrator';
import { initModels } from '../../src/database/models';
import { createSequelize } from '../../src/database/sequelize';
import { createAccessToken } from '../../src/modules/auth/tokens';
import { generateInviteCode } from '../../src/modules/auth/invite-code';
import { SaveService } from '../../src/modules/richman/save-service';
import { WorkerSaveValidator } from '../../src/modules/richman/save-validator';
import { SAVE_BYTES } from '../../src/modules/richman/save-contract';
import type { SaveWrite, SlotKey } from '../../src/modules/richman/save-contract';
import { up as saveMigration } from '../../database/migrations/202610200001-richman-saves';

const run = process.env.RUN_SAVE_DB_TESTS === '1';
const fixture = readFileSync(path.resolve('tests/fixtures/richman-save-v1.json'), 'utf8');
const pausedFixture = readFileSync(path.resolve('tests/fixtures/richman-save-paused-v1.json'), 'utf8');

describe.skipIf(!run)('SAVE-02 cloud MySQL (isolated test owners, no table resets)', () => {
  let context: AppContext, app: Express, token: string, otherToken: string;
  let owner: string, otherOwner: string;
  let service: SaveService;
  const createdOwners: string[] = [];
  const input = (expectedSlotVersion = 0, save = fixture): SaveWrite =>
    ({ requestId: randomUUID(), expectedSlotVersion, save });
  const put = (slot: SlotKey, body: SaveWrite, access = token) =>
    request(app).put(`/api/v1/richman/saves/${slot}`).set('Authorization', `Bearer ${access}`).send(body);
  const get = (slot: SlotKey, access = token) =>
    request(app).get(`/api/v1/richman/saves/${slot}`).set('Authorization', `Bearer ${access}`);
  beforeAll(async () => {
    const config = loadConfig();
    if (config.database.name !== 'homeAssistantDB_test') throw new Error('SAVE-02 集成测试只允许 homeAssistantDB_test');
    const sequelize = createSequelize(config);
    context = { config, sequelize, models: initModels(sequelize) };
    await sequelize.authenticate();
    await createMigrator(sequelize, false).up();
    const users = [];
    for (let i = 0; i < 2; i++) {
      const id = randomUUID();
      users.push(await context.models.User.create({
        id, username: `sv02_${id.replaceAll('-', '').slice(0, 24)}`, passwordHash: 'test-account-no-password-login',
        displayName: 'SAVE-02 temporary test', inviteCode: generateInviteCode(),
      }));
      createdOwners.push(id);
    }
    owner = users[0]!.id; otherOwner = users[1]!.id;
    token = createAccessToken(config, users[0]!); otherToken = createAccessToken(config, users[1]!);
    app = createApp(context);
    service = new SaveService(context, new WorkerSaveValidator());
  }, 30_000);
  afterEach(() => vi.restoreAllMocks());
  afterAll(async () => {
    if (!context) return;
    try {
      if (createdOwners.length) {
        // Only UUIDs created by this run, never a blanket destroy or truncate.
        const where = { ownerId: { [Op.in]: createdOwners } };
        await context.models.RichmanSaveSlot.destroy({ where });
        await context.models.RichmanSaveRevision.destroy({ where });
        await context.models.User.destroy({ where: { id: { [Op.in]: createdOwners } } });
      }
    } finally { await context.sequelize.close(); }
  });

  it('migration can resume after CREATE TABLE and retains uniqueness constraints', async () => {
    await saveMigration({ context: { queryInterface: context.sequelize.getQueryInterface(), allowLegacyReset: false } });
    const indexes = await context.sequelize.getQueryInterface().showIndex('richman_save_revisions') as { name: string; unique: boolean }[];
    expect(indexes).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'uq_richman_save_request', unique: true }),
      expect.objectContaining({ name: 'uq_richman_save_version', unique: true }),
    ]));
  });
  it('persists >32 KB and reads it through a fresh app/service (no process memory storage)', async () => {
    const body = input(0, fixture + ' '.repeat(40000));
    const saved = await put('manual-1', body);
    expect(saved.status).toBe(200);
    expect(saved.body.data).toMatchObject({ slot: 'manual-1', slotVersion: 1, bytes: Buffer.byteLength(body.save) });
    app = createApp(context);
    const loaded = await get('manual-1');
    expect(loaded.status).toBe(200);
    expect(loaded.body.data.save).toBe(body.save);
    expect(loaded.body.data.revisionId).toBe(saved.body.data.revisionId);
    const list = await request(app).get('/api/v1/richman/saves').set('Authorization', `Bearer ${token}`);
    expect(list.body.data.saves).toHaveLength(1);
    expect(list.body.data.saves[0].save).toBeUndefined();
    expect(list.body.data.saves[0].summary.gameId).toBe('save02-fixture');
  });
  it('enforces owner scoping on reads, lists, and overwrites', async () => {
    expect((await get('manual-1', otherToken)).status).toBe(404);
    const list = await request(app).get('/api/v1/richman/saves').set('Authorization', `Bearer ${otherToken}`);
    expect(list.body.data.saves).toEqual([]);
    const guessedVersion = await put('manual-1', input(1), otherToken);
    expect(guessedVersion.status).toBe(409);
    expect((await get('manual-1')).body.data.slotVersion).toBe(1);
    const own = await put('manual-1', input(), otherToken);
    expect(own.status).toBe(200);
    expect((await get('manual-1', otherToken)).body.data.revisionId).not.toBe((await get('manual-1')).body.data.revisionId);
  });
  it('returns the original receipt after a lost response, even after later overwrites', async () => {
    const first = input(1);
    const saved = await put('manual-1', first);
    expect(saved.status).toBe(200);
    expect((await put('manual-1', input(2))).status).toBe(200);
    app = createApp(context);
    expect((await put('manual-1', first)).body).toEqual(saved.body);
    expect((await get('manual-1')).body.data.slotVersion).toBe(3);
    expect(await context.models.RichmanSaveRevision.count({ where: { ownerId: owner, slotKey: 'manual-1' } })).toBe(3);
    const changed = await put('manual-1', { ...first, save: fixture + ' ' });
    expect(changed.status).toBe(409);
    expect(changed.body.error.code).toBe('SAVE_REQUEST_REUSED');
    expect((await put('manual-1', { ...first, expectedSlotVersion: 3 })).body.error.code).toBe('SAVE_REQUEST_REUSED');
  });
  it('rejects stale slot versions and preserves the last good payload on invalid saves', async () => {
    const before = (await get('manual-1')).body.data;
    expect((await put('manual-1', input(1))).body.error.code).toBe('SAVE_VERSION_CONFLICT');
    expect((await put('manual-1', input(3, '{'))).status).toBe(422);
    expect((await get('manual-1')).body.data).toEqual(before);
  });
  it('serializes racing first creates across service instances', async () => {
    const second = new SaveService(context, new WorkerSaveValidator());
    const results = await Promise.allSettled([
      service.write(owner, 0, 'manual-2', input()),
      second.write(owner, 0, 'manual-2', input()),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find(result => result.status === 'rejected')).toMatchObject({
      reason: { code: 'SAVE_VERSION_CONFLICT', details: { currentSlotVersion: 1 } },
    });
    expect(await context.models.RichmanSaveRevision.count({ where: { ownerId: owner, slotKey: 'manual-2' } })).toBe(1);
  });
  it('serializes racing overwrites and allows explicit rewind with the current slot version', async () => {
    const results = await Promise.allSettled([
      service.write(owner, 0, 'manual-2', input(1)),
      service.write(owner, 0, 'manual-2', input(1, fixture + ' ')),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find(result => result.status === 'rejected')).toMatchObject({ reason: { code: 'SAVE_VERSION_CONFLICT' } });
    const progressed = await service.write(owner, 0, 'manual-2', input(2, pausedFixture));
    expect(progressed).toMatchObject({ slotVersion: 3, summary: { revision: 1, paused: true } });
    const rewind = await service.write(owner, 0, 'manual-2', input(3));
    expect(rewind).toMatchObject({ slotVersion: 4, summary: { revision: 0, paused: false } });
  });
  it('deduplicates simultaneous identical requests and rejects simultaneous differing payloads', async () => {
    const body = input();
    const [a, b] = await Promise.all([service.write(owner, 0, 'manual-3', body), service.write(owner, 0, 'manual-3', body)]);
    expect(a).toEqual(b);
    expect(await context.models.RichmanSaveRevision.count({ where: { ownerId: owner, slotKey: 'manual-3' } })).toBe(1);
    const overwrite = input(1);
    const results = await Promise.allSettled([
      service.write(owner, 0, 'manual-3', overwrite),
      service.write(owner, 0, 'manual-3', { ...overwrite, save: fixture + ' ' }),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find(result => result.status === 'rejected')).toMatchObject({ reason: { code: 'SAVE_REQUEST_REUSED' } });
  });
  it('rolls back inserted revisions when switching the slot pointer fails; retry remains possible', async () => {
    const before = await service.read(owner, 'manual-3'), body = input(2);
    const fail = vi.spyOn(context.models.RichmanSaveSlot, 'update').mockRejectedValueOnce(new Error('injected pointer write failure'));
    await expect(service.write(owner, 0, 'manual-3', body)).rejects.toMatchObject({ code: 'SAVE_STORAGE_FAILED' });
    fail.mockRestore();
    expect(await service.read(owner, 'manual-3')).toEqual(before);
    expect(await context.models.RichmanSaveRevision.count({ where: { ownerId: owner, slotKey: 'manual-3' } })).toBe(2);
    expect((await service.write(owner, 0, 'manual-3', body)).slotVersion).toBe(3);
  });
  it('rolls back a first create when the slot insert fails', async () => {
    const body = input();
    const fail = vi.spyOn(context.models.RichmanSaveSlot, 'create').mockRejectedValueOnce(new Error('injected slot insert failure'));
    await expect(service.write(owner, 0, 'auto', body)).rejects.toMatchObject({ code: 'SAVE_STORAGE_FAILED' });
    fail.mockRestore();
    await expect(service.read(owner, 'auto')).rejects.toMatchObject({ code: 'SAVE_NOT_FOUND' });
    expect(await context.models.RichmanSaveRevision.count({ where: { ownerId: owner, slotKey: 'auto' } })).toBe(0);
    expect((await service.write(owner, 0, 'auto', body)).slotVersion).toBe(1);
  });
  it('round-trips the exact 8 MiB UTF-8 payload limit through HTTP and MySQL', async () => {
    const save = ' '.repeat(SAVE_BYTES - Buffer.byteLength(fixture)) + fixture;
    const saved = await put('auto', input(1, save));
    expect(saved.status).toBe(200);
    expect(saved.body.data.bytes).toBe(SAVE_BYTES);
    const loaded = await get('auto');
    expect(loaded.status).toBe(200);
    expect(loaded.body.data.save).toBe(save);
  }, 30_000);
  it('rechecks auth after slow validation and never commits using revoked credentials', async () => {
    const validator = new WorkerSaveValidator();
    const revoking = new SaveService(context, { validate: async save => {
      const summary = await validator.validate(save);
      await context.models.User.update({ authVersion: 1 }, { where: { id: otherOwner } });
      return summary;
    } });
    await expect(revoking.write(otherOwner, 0, 'auto', input())).rejects.toMatchObject({ status: 401 });
    expect(await context.models.RichmanSaveRevision.count({ where: { ownerId: otherOwner, slotKey: 'auto' } })).toBe(0);
    expect((await get('manual-1', otherToken)).status).toBe(401);
  });
});
