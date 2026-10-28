import { readFileSync } from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import express from 'express';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app';
import { initModels } from '../../src/database/models';
import { createSequelize } from '../../src/database/sequelize';
import { createAccessToken } from '../../src/modules/auth/tokens';
import { createSaveRouter } from '../../src/modules/richman/save-routes';
import { SAVE_BYTES, SAVE_HTTP_BYTES } from '../../src/modules/richman/save-contract';
import { WorkerSaveValidator } from '../../src/modules/richman/save-validator';
import { errorHandler } from '../../src/middleware/error-handler';
import { testConfig } from '../helpers/config';

const fixture = readFileSync(path.resolve('tests/fixtures/richman-save-v1.json'), 'utf8');
const config = testConfig(), sequelize = createSequelize(config), models = initModels(sequelize);
const context = { config, sequelize, models };
const user = models.User.build({ id: 'ec3d907b-7af2-4528-9785-6bcd0be9561e', username: 'save_test',
  displayName: 'save', passwordHash: 'unused', inviteCode: 'SAVE02TEST' });
const token = createAccessToken(config, user);
const input = { requestId: 'unit-request', expectedSlotVersion: 0, save: fixture };
const auth = (req: request.Test) => req.set('Authorization', `Bearer ${token}`);
afterEach(() => vi.restoreAllMocks());
afterAll(() => sequelize.close());

describe('isolated save validation', () => {
  it('restores a real v47 save in the compiled Node worker', async () => {
    const result = await new WorkerSaveValidator().validate(fixture);
    expect(result).toMatchObject({ gameId: 'save02-fixture', revision: 0, phase: 'idle', mapId: 'japan' });
  });
  it.each([
    ['JSON', '{', 'invalid-save'],
    ['version', JSON.stringify({ ...JSON.parse(fixture), formatVersion: 2 }), 'unsupported-version'],
    ['digest', fixture.replace(/"stateDigest":"[a-f0-9]{64}"/, `"stateDigest":"${'0'.repeat(64)}"`), 'digest-mismatch'],
    ['fingerprint', fixture.replace(/"mapFingerprint":"[^"]*"/, '"mapFingerprint":"wrong"'), 'incompatible-content'],
  ])('rejects invalid %s without returning a candidate state', async (_label, save, reason) => {
    await expect(new WorkerSaveValidator().validate(save)).rejects.toMatchObject({ code: 'SAVE_INVALID', details: { reason } });
  });
  it('bounds byte size before starting a worker', async () => {
    await expect(new WorkerSaveValidator().validate('中'.repeat(Math.floor(SAVE_BYTES / 3) + 1)))
      .rejects.toMatchObject({ status: 413, code: 'SAVE_TOO_LARGE' });
  });
  it('hard terminates a timed out worker and releases capacity', async () => {
    const workerPath = path.resolve('tests/fixtures/save-worker-hang.cjs');
    const validator = new WorkerSaveValidator(workerPath, 40);
    await expect(validator.validate(fixture)).rejects.toMatchObject({ code: 'SAVE_RESTORE_TIMEOUT' });
    await expect(validator.validate(fixture)).rejects.toMatchObject({ code: 'SAVE_RESTORE_TIMEOUT' });
  });
  it('admits at most two workers and cancels abandoned work', async () => {
    const validator = new WorkerSaveValidator(path.resolve('tests/fixtures/save-worker-hang.cjs'), 1000);
    const a = new AbortController(), b = new AbortController();
    const first = validator.validate(fixture, a.signal).catch(error => error);
    const second = validator.validate(fixture, b.signal).catch(error => error);
    await expect(validator.validate(fixture)).rejects.toMatchObject({ code: 'SAVE_BUSY' });
    a.abort(); b.abort();
    expect(await first).toMatchObject({ code: 'SAVE_CANCELLED' });
    expect(await second).toMatchObject({ code: 'SAVE_CANCELLED' });
  });
  it('reports worker startup errors without leaking payloads', async () => {
    await expect(new WorkerSaveValidator('/nonexistent/save-worker.js').validate(fixture))
      .rejects.toMatchObject({ code: 'SAVE_VALIDATOR_FAILED' });
  });
});

describe('save HTTP boundaries (database calls stubbed)', () => {
  function stubAuth() { vi.spyOn(models.User, 'findByPk').mockResolvedValue(user); }
  it('authenticates before parsing a large invalid body', async () => {
    const app = createApp(context);
    const response = await request(app).put('/api/v1/richman/saves/manual-1')
      .set('Content-Type', 'application/json').send('{'.repeat(40000));
    expect(response.status).toBe(401);
  });
  it('allows more than 32 KB only on the authenticated save route', async () => {
    stubAuth();
    vi.spyOn(models.RichmanSaveRevision, 'findOne').mockResolvedValue(null);
    const response = await auth(request(createApp(context)).put('/api/v1/richman/saves/manual-1'))
      .send({ ...input, save: ' '.repeat(40000) + '{' });
    expect(response.status).toBe(422); // reached worker, not rejected by global parser
    expect(response.body.error.code).toBe('SAVE_INVALID');
    const ordinary = await request(createApp(context)).post('/api/v1/auth/login').send({ padding: 'x'.repeat(40000) });
    expect(ordinary.status).toBe(413);
  });
  it.each([
    [{ ...input, ownerId: 'another-user' }, 'manual-1'],
    [{ ...input, expectedSlotVersion: -1 }, 'manual-1'],
    [{ ...input, requestId: 'unsafe/id' }, 'manual-1'],
    [input, 'manual-4'],
  ])('rejects unknown ownership, malformed versions/IDs and slots', async (body, slot) => {
    stubAuth();
    const response = await auth(request(createApp(context)).put(`/api/v1/richman/saves/${slot}`)).send(body);
    expect(response.status).toBe(400);
  });
  it('returns stable errors for malformed JSON and HTTP body limits', async () => {
    stubAuth();
    const app = createApp(context);
    const broken = await auth(request(app).put('/api/v1/richman/saves/auto')).set('Content-Type', 'application/json').send('{');
    expect(broken.status).toBe(400);
    expect(broken.body.error.code).toBe('INVALID_JSON');
    const oversized = await auth(request(app).put('/api/v1/richman/saves/auto')).send({ save: 'x'.repeat(SAVE_HTTP_BYTES) });
    expect(oversized.status).toBe(413);
  });
  it('rejects oversized UTF-8 saves, non-JSON and compressed input', async () => {
    stubAuth();
    const app = createApp(context);
    const oversized = await auth(request(app).put('/api/v1/richman/saves/auto'))
      .send({ ...input, save: '中'.repeat(Math.floor(SAVE_BYTES / 3) + 1) });
    expect(oversized.status).toBe(413);
    expect(oversized.body.error.code).toBe('SAVE_TOO_LARGE');
    expect((await auth(request(app).put('/api/v1/richman/saves/auto'))
      .send({ ...input, save: 'x'.repeat(SAVE_BYTES + 1) })).body.error.code).toBe('SAVE_TOO_LARGE');
    expect((await auth(request(app).put('/api/v1/richman/saves/auto')).type('text').send('test')).status).toBe(415);
    expect((await auth(request(app).put('/api/v1/richman/saves/auto')).set('Content-Encoding', 'gzip').send(input)).status).toBe(415);
  });
  it('rate limits PUT attempts by authenticated account before replay or database writes', async () => {
    stubAuth();
    const app = createApp(context);
    for (let i = 0; i < 12; i++) {
      expect((await auth(request(app).put('/api/v1/richman/saves/auto')).send({})).status).toBe(400);
    }
    const blocked = await auth(request(app).put('/api/v1/richman/saves/auto')).send({});
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('SAVE_RATE_LIMITED');
  });
  it('keeps health responsive and rejects concurrent uploads for the same account', async () => {
    stubAuth();
    vi.spyOn(models.RichmanSaveRevision, 'findOne').mockResolvedValue(null);
    let entered!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; });
    let finish!: () => void;
    const pending = new Promise<void>(resolve => { finish = resolve; });
    const validator = { validate: vi.fn(async () => { entered(); await pending; throw new Error('test stop'); }) };
    const app = express();
    app.use('/saves', createSaveRouter(context, validator));
    app.get('/health', (_req, res) => res.json({ ok: true }));
    // Avoid logging the intentionally injected failure through pino-less test app.
    app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      void _next; res.status(err && typeof err === 'object' && 'status' in err ? Number(err.status) : 500).json({});
    });
    const first = auth(request(app).put('/saves/auto')).send(input).then(result => result);
    await started;
    expect((await request(app).get('/health')).status).toBe(200);
    expect((await auth(request(app).put('/saves/auto')).send(input)).status).toBe(503);
    finish(); await first;
  });
  it('does not expose slot content through list calls', async () => {
    stubAuth();
    const find = vi.spyOn(models.RichmanSaveSlot, 'findAll').mockResolvedValue([]);
    const app = express(); app.use('/saves', createSaveRouter(context)); app.use(errorHandler);
    const result = await auth(request(app).get('/saves'));
    expect(result.body.data).toEqual({ saves: [] });
    expect(find).toHaveBeenCalledWith({ where: { ownerId: user.id } });
    expect(result.headers['cache-control']).toBe('no-store');
  });
});
