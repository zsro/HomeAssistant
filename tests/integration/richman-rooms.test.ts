import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Op } from 'sequelize';
import type { Express } from 'express';
import type { AppContext } from '../../src/app-context';
import { createApp } from '../../src/app';
import { loadConfig } from '../../src/config/env';
import { createMigrator } from '../../src/database/migrator';
import { initModels } from '../../src/database/models';
import { createSequelize } from '../../src/database/sequelize';
import { createAccessToken } from '../../src/modules/auth/tokens';
import { generateInviteCode } from '../../src/modules/auth/invite-code';
import { GameService } from '../../src/modules/richman/game-service';

describe.skipIf(process.env.RUN_NET_DB_TESTS !== '1')('NET-02 private rooms / real MySQL', () => {
  let context: AppContext, app: Express, host: GameService;
  const users: string[] = [], tokens: string[] = [], rooms: string[] = [], games: string[] = [];
  const post = (path: string, body: object, user = 0) => request(app).post(`/api/v1/richman${path}`).set('Authorization', `Bearer ${tokens[user]}`).send(body);
  const get = (path: string, user = 0) => request(app).get(`/api/v1/richman${path}`).set('Authorization', `Bearer ${tokens[user]}`);
  const create = async (user = 0) => {
    const id = randomUUID(); rooms.push(id); const result = await post('/rooms', { id }, user); expect(result.status).toBe(200); return result.body.data;
  };
  const change = async (id: string, action: object, user = 0) => {
    const view = (await get(`/rooms/${id}`, user)).body.data;
    return post(`/rooms/${id}/change`, { revision: view.revision, action }, user);
  };
  const close = async (id: string, members = [0]) => {
    for (const user of members) expect((await change(id, { type: 'leave' }, user)).status).toBe(200);
  };
  beforeAll(async () => {
    const config = loadConfig(); if (config.database.name !== 'homeAssistantDB_test') throw new Error('test database required'); config.logLevel = 'silent';
    const sequelize = createSequelize(config); context = { config, sequelize, models: initModels(sequelize) };
    await sequelize.authenticate(); await createMigrator(sequelize, false).up();
    for (let i = 0; i < 4; i++) {
      const id = randomUUID(), u = await context.models.User.create({ id, username: `net02_${id.replaceAll('-', '').slice(0, 24)}`, passwordHash: 'no-login', displayName: `验收 ${i}`, inviteCode: generateInviteCode() });
      users.push(id); tokens.push(createAccessToken(config, u));
    }
    host = new GameService(context, { now: () => 0, seed: () => 'save03-0', id: () => { const id = randomUUID(); games.push(id); return id; } });
    await host.start(false); context.gameHost = host; app = createApp(context);
  }, 30000);
  beforeEach(() => { app = createApp(context); });
  afterAll(async () => {
    vi.restoreAllMocks(); await host?.stop(); if (!context) return;
    try {
      await context.models.RichmanRoomSeat.destroy({ where: { roomId: { [Op.in]: rooms } } });
      await context.models.RichmanRoom.destroy({ where: { id: { [Op.in]: rooms } } });
      await context.models.RichmanGameCommand.destroy({ where: { gameId: { [Op.in]: games } } });
      await context.models.RichmanGameSeat.destroy({ where: { gameId: { [Op.in]: games } } });
      await context.models.RichmanGame.destroy({ where: { id: { [Op.in]: games } } });
      await context.models.User.destroy({ where: { id: { [Op.in]: users } } });
    } finally { await context.sequelize.close(); }
  });
  it('authenticates rooms, hides unrelated rooms and deduplicates create/join', async () => {
    expect((await request(app).get('/api/v1/richman/rooms')).status).toBe(401);
    const r = await create(); expect(r.code).toMatch(/^[A-F0-9]{12}$/);
    expect((await post('/rooms', { id: r.id })).body.data.id).toBe(r.id);
    expect((await get(`/rooms/${r.id}`, 2)).status).toBe(404);
    expect((await get('/rooms', 2)).body.data).toEqual([]);
    expect((await post('/rooms/join', { code: r.code }, 1)).status).toBe(200);
    expect((await post('/rooms/join', { code: r.code }, 1)).body.data.seats.filter((s: { self: boolean }) => s.self)).toHaveLength(1);
    expect((await post('/rooms/join', { code: 'FFFFFFFFFFFF' }, 2)).status).toBe(404);
    expect((await post('/rooms/join', { code: r.code }, 2)).status).toBe(409);
    await close(r.id, [1, 0]);
  });
  it('serializes joins for the last seat and prevents membership in two waiting rooms', async () => {
    const a = await create(), b = await create(3);
    const result = await Promise.all([post('/rooms/join', { code: a.code }, 1), post('/rooms/join', { code: a.code }, 2)]);
    expect(result.map(r => r.status).sort()).toEqual([200,409]);
    const joined = result[0]!.status === 200 ? 1 : 2;
    expect((await post('/rooms/join', { code: b.code }, joined)).body.error.code).toBe('ROOM_ALREADY_JOINED');
    await close(a.id, [joined, 0]); await close(b.id, [3]);
  });
  it('guards host-only configuration, occupied characters, stale updates and resets readiness', async () => {
    const r = await create(); await post('/rooms/join', { code: r.code }, 1);
    expect((await change(r.id, { type: 'funds', initialFunds: 50000 }, 1)).status).toBe(403);
    expect((await change(r.id, { type: 'character', characterId: 'xiaomei' }, 1)).status).toBe(409);
    await change(r.id, { type: 'ready', ready: true }, 1);
    expect((await change(r.id, { type: 'character', characterId: 'chyan' })).status).toBe(200);
    const view = (await get(`/rooms/${r.id}`)).body.data;
    expect(view.seats.every((s: { ready: boolean }) => !s.ready)).toBe(true);
    expect((await post(`/rooms/${r.id}/change`, { revision: 0, action: { type: 'ready', ready: true } })).body.error.code).toBe('ROOM_STALE');
    expect((await change(r.id, { type: 'seat', position: 1, kind: 'ai' })).status).toBe(409);
    await close(r.id, [1,0]);
  });
  it('transfers pregame host to a remaining member and closes the final empty room', async () => {
    const r = await create(); await post('/rooms/join', { code: r.code }, 1);
    await change(r.id, { type: 'leave' });
    expect((await get(`/rooms/${r.id}`, 1)).body.data.owner).toBe(true);
    expect((await get(`/rooms/${r.id}`)).status).toBe(404);
    await close(r.id, [1]); expect((await post('/rooms/join', { code: r.code }, 2)).status).toBe(404);
  });
  it('requires online humans, no unfilled seats and at least two participants before atomic start', async () => {
    const r = await create();
    expect((await post(`/rooms/${r.id}/start`, { revision: r.revision })).status).toBe(409);
    await change(r.id, { type: 'seat', position: 1, kind: 'closed' }); await change(r.id, { type: 'ready', ready: true });
    let view = (await get(`/rooms/${r.id}`)).body.data;
    expect((await post(`/rooms/${r.id}/start`, { revision: view.revision })).status).toBe(409);
    await change(r.id, { type: 'seat', position: 1, kind: 'ai' }); await change(r.id, { type: 'ready', ready: true });
    view = (await get(`/rooms/${r.id}`)).body.data;
    await context.models.RichmanRoomSeat.update({ seenAt: new Date(0) }, { where: { roomId: r.id, userId: users[0]! } });
    expect((await post(`/rooms/${r.id}/start`, { revision: view.revision })).status).toBe(409);
    await close(r.id);
  });
  it('rolls back game/seats when the room start update fails and safely retries', async () => {
    const r = await create(); await change(r.id, { type: 'seat', position: 1, kind: 'ai' }); await change(r.id, { type: 'ready', ready: true });
    const view = (await get(`/rooms/${r.id}`)).body.data;
    const spy = vi.spyOn(context.models.RichmanRoom.prototype, 'update').mockRejectedValueOnce(new Error('injected room write failure'));
    expect((await post(`/rooms/${r.id}/start`, { revision: view.revision })).status).toBe(500); spy.mockRestore();
    expect(await context.models.RichmanGame.findByPk(games.at(-1))).toBeNull();
    expect((await get(`/rooms/${r.id}`)).body.data.gameId).toBeNull();
    const results = await Promise.all([post(`/rooms/${r.id}/start`, { revision: view.revision }), post(`/rooms/${r.id}/start`, { revision: view.revision })]);
    expect(results.map(r => r.status)).toEqual([200,200]); expect(results[0]!.body.data.gameId).toBe(results[1]!.body.data.gameId);
    expect((await change(r.id, { type: 'leave' })).status).toBe(409);
    const gameId = results[0]!.body.data.gameId;
    expect((await get(`/games/${gameId}`)).body.data.players[1].computer).toBe(true);
  });
  it('creates two authenticated seats, locks configuration and fences older control windows', async () => {
    const r = await create(); await post('/rooms/join', { code: r.code }, 1);
    await change(r.id, { type: 'ready', ready: true }); await change(r.id, { type: 'ready', ready: true }, 1);
    const view = (await get(`/rooms/${r.id}`)).body.data;
    expect((await post(`/rooms/${r.id}/start`, { revision: view.revision }, 1)).status).toBe(403);
    const started = await post(`/rooms/${r.id}/start`, { revision: view.revision }), id = started.body.data.gameId;
    expect(started.status).toBe(200);
    expect((await post('/rooms/join', { code: r.code }, 2)).status).toBe(409);
    expect((await change(r.id, { type: 'funds', initialFunds: 50000 })).status).toBe(409);
    const first = randomUUID(), second = randomUUID();
    await post(`/games/${id}/claim`, { controllerId: first }); await post(`/games/${id}/claim`, { controllerId: second });
    expect((await get(`/games/${id}`).set('X-Richman-Controller', first)).body.data.canControl).toBe(false);
    const body = { id: randomUUID(), expectedRevision: 0, action: { type: 'roll' } };
    expect((await post(`/games/${id}/commands`, body).set('X-Richman-Controller', first)).body.error.code).toBe('NET_SESSION_REPLACED');
    expect((await post(`/games/${id}/commands`, body).set('X-Richman-Controller', second)).status).toBe(200);
    const before = (await get(`/games/${id}`, 1)).body.data;
    await post(`/games/${id}/disconnect`, {}).set('X-Richman-Controller', second);
    expect((await get(`/games/${id}`, 1)).body.data.revision).toBe(before.revision);
    expect((await get(`/rooms/${r.id}`, 1)).body.data.gameId).toBe(id);
  });
  it('persists finished room status with the terminal game command', async () => {
    const r = await create(); await post('/rooms/join', { code: r.code }, 1);
    await change(r.id, { type: 'ready', ready: true }); await change(r.id, { type: 'ready', ready: true }, 1);
    const view = (await get(`/rooms/${r.id}`)).body.data;
    const id = (await post(`/rooms/${r.id}/start`, { revision: view.revision })).body.data.gameId;
    const response = await post(`/games/${id}/commands`, { id: randomUUID(), expectedRevision: 0, action: { type: 'surrender' } });
    expect(response.status).toBe(200);
    expect((await get(`/games/${id}`, 1)).body.data.phase).toBe('finished');
    expect((await get(`/rooms/${r.id}`, 1)).body.data.status).toBe('finished');
  });

});
