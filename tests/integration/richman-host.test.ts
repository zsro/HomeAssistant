import { createHash, randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
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
import { GameHost } from '../../shared/richman/host';
import type { Seat } from '../../shared/richman/host';
import { fixtureHost } from '../helpers/richman-host-fixture';
import { canonicalSaveJSON } from '../../shared/richman/game/save';
import { decisionPlayer } from '../../shared/richman/game/computer';

describe.skipIf(process.env.RUN_NET_DB_TESTS !== '1')('NET-01 real cloud MySQL and authenticated HTTP', () => {
  let context: AppContext, host: GameService, app: Express, now = 0;
  const owners: string[] = [], tokens: string[] = [], games: string[] = [];
  const sources = { now: () => now, seed: () => 'save03-0', id: () => { const id = randomUUID(); games.push(id); return id; } };
  const seats = (): Seat[] => ['xiaomei', 'tuu'].map((characterId, i) =>
    ({ playerId: `player-${i + 1}`, userId: owners[i]!, characterId, policy: null }));
  const send = (id: string, body: object, token = tokens[0]!) =>
    request(app).post(`/api/v1/richman/games/${id}/commands`).set('Authorization', `Bearer ${token}`).send(body);
  const get = (id: string, token = tokens[0]!) =>
    request(app).get(`/api/v1/richman/games/${id}`).set('Authorization', `Bearer ${token}`);
  const input = (expectedRevision = 0) => ({ id: randomUUID(), expectedRevision, action: { type: 'roll' } });
  const restart = async () => {
    await host.stop(); host = new GameService(context, sources); await host.start(false);
    app = createApp({ ...context, gameHost: host });
  };
  beforeAll(async () => {
    const config = loadConfig();
    if (config.database.name !== 'homeAssistantDB_test') throw new Error('NET-01 tests require homeAssistantDB_test');
    config.logLevel = 'silent';
    const sequelize = createSequelize(config);
    context = { config, sequelize, models: initModels(sequelize) };
    await sequelize.authenticate(); await createMigrator(sequelize, false).up();
    for (let i = 0; i < 4; i++) {
      const id = randomUUID(), user = await context.models.User.create({
        id, username: `net01_${id.replaceAll('-', '').slice(0, 24)}`, passwordHash: 'no-password-login',
        displayName: 'NET-01 temporary test', inviteCode: generateInviteCode(),
      });
      owners.push(id); tokens.push(createAccessToken(config, user));
    }
    host = new GameService(context, sources); await host.start(false);
    app = createApp({ ...context, gameHost: host });
  }, 30_000);
  afterEach(() => vi.restoreAllMocks());
  afterAll(async () => {
    if (!context) return;
    await host?.stop();
    try {
      if (games.length) {
        const where = { gameId: { [Op.in]: games } };
        await context.models.RichmanGameCommand.destroy({ where });
        await context.models.RichmanGameSeat.destroy({ where });
        await context.models.RichmanGame.destroy({ where: { id: { [Op.in]: games } } });
      }
      if (owners.length) await context.models.User.destroy({ where: { id: { [Op.in]: owners } } });
    } finally { await context.sequelize.close(); }
  });
  it('does not expose provisioning or raw state, authenticates all command and view access', async () => {
    const id = await host.create(seats());
    expect((await request(app).get(`/api/v1/richman/games/${id}`)).status).toBe(401);
    expect((await get(id, tokens[2])).status).toBe(404);
    expect((await send(id, input(), tokens[2])).status).toBe(404);
    const view = await get(id);
    expect(view.status).toBe(200); expect(view.body.data.self).toBe('player-1');
    for (const key of ['seed', 'randomState', 'checkpoint', 'researchMemory', 'userId']) expect(JSON.stringify(view.body)).not.toContain(`"${key}"`);
    expect((await request(app).post('/api/v1/richman/games').set('Authorization', `Bearer ${tokens[0]}`).send({})).status).toBe(404);
  });
  it('rejects internal, wrong-seat, malformed, overlarge and client-authored state commands', async () => {
    const id = await host.create(seats());
    expect((await send(id, input(), tokens[1])).body.error.code).toBe('NET_WRONG_PLAYER');
    expect((await send(id, { ...input(), action: { type: 'animationDone', token: 'forged' } })).body.error.code).toBe('NET_INTERNAL_COMMAND');
    expect((await send(id, { ...input(), action: { type: 'minigame', decisionId: 'x', input: { kind: 'tick' } } })).body.error.code).toBe('NET_INTERNAL_COMMAND');
    expect((await send(id, { ...input(), playerId: 'player-2' })).status).toBe(400);
    expect((await send(id, { ...input(), action: { type: 'roll', dice: 6 } })).status).toBe(400);
    expect((await send(id, { ...input(), extra: 'x'.repeat(5000) })).status).toBe(413);
    expect((await get(id)).body.data.revision).toBe(0);
    expect(await context.models.RichmanGameCommand.count({ where: { gameId: id } })).toBe(0);
  });
  it('serializes simultaneous commands and deduplicates exact requests before stale checks', async () => {
    const id = await host.create(seats()), a = input(), b = input();
    const results = await Promise.all([send(id, a), send(id, b)]);
    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    const accepted = results[0]!.status === 200 ? a : b, receipt = results.find(r => r.status === 200)!.body.data;
    const retries = await Promise.all([send(id, accepted), send(id, accepted)]);
    expect(retries.map(r => r.body.data)).toEqual([receipt, receipt]);
    expect((await send(id, { ...accepted, expectedRevision: 1 })).body.error.code).toBe('NET_REQUEST_REUSED');
    expect(await context.models.RichmanGameCommand.count({ where: { gameId: id } })).toBe(1);
  });
  it('rolls back journal + checkpoint together and never publishes failed candidate state', async () => {
    const id = await host.create(seats()), body = input();
    const before = (await context.models.RichmanGame.findByPk(id))!.checkpoint;
    const fail = vi.spyOn(context.models.RichmanGame, 'update').mockRejectedValueOnce(new Error('injected write failure'));
    expect((await send(id, body)).body.error.code).toBe('NET_STORAGE_FAILED');
    fail.mockRestore();
    expect((await context.models.RichmanGame.findByPk(id))!.checkpoint).toBe(before);
    expect((await get(id)).body.data.revision).toBe(0);
    expect(await context.models.RichmanGameCommand.count({ where: { gameId: id } })).toBe(0);
    expect((await send(id, body)).status).toBe(200);
  });
  it('recovers a committed request after acknowledgement loss without replaying RNG or duplicating rows', async () => {
    const id = await host.create(seats()), body = input();
    const original = context.sequelize.transaction.bind(context.sequelize);
    const fail = vi.spyOn(context.sequelize, 'transaction').mockImplementationOnce((async (...args: unknown[]) => {
      await (original as (...args: unknown[]) => Promise<unknown>)(...args);
      throw new Error('injected lost commit acknowledgement');
    }) as typeof context.sequelize.transaction);
    expect((await send(id, body)).body.error.code).toBe('NET_STORAGE_FAILED');
    fail.mockRestore();
    const saved = (await context.models.RichmanGame.findByPk(id))!.checkpoint;
    expect((await host.recover(id, owners[0]!, undefined, body as never)).recovery?.resolution).toBe('committed');
    const retry = await send(id, body);
    expect(retry.status).toBe(200); expect(retry.body.data.revision).toBe(1);
    expect((await context.models.RichmanGame.findByPk(id))!.checkpoint).toBe(saved);
    expect(await context.models.RichmanGameCommand.count({ where: { gameId: id } })).toBe(1);
  });
  it('rejects expired authentication again inside the transaction', async () => {
    const id = await host.create(seats()), body = input();
    await expect(host.command(id, owners[0]!, 999, body as never)).rejects.toMatchObject({ code: 'ACCESS_TOKEN_INVALID' });
    expect((await get(id)).body.data.revision).toBe(0);
  });
  it('holds a single scheduler lock and permits a replacement only after shutdown', async () => {
    const other = new GameService(context, sources);
    await expect(other.start(false)).rejects.toThrow('调度锁');
    await other.stop();
    expect(host.available).toBe(true);
    await restart(); expect(host.available).toBe(true);
  });
  it('treats client queue saturation as backpressure without disabling the scheduler', async () => {
    const id = await host.create(seats());
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const original = context.models.RichmanGameSeat.findOne.bind(context.models.RichmanGameSeat);
    const block = vi.spyOn(context.models.RichmanGameSeat, 'findOne').mockImplementationOnce(async options => {
      await gate; return original(options);
    });
    const pending = Array.from({ length: 8 }, () => host.view(id, owners[0]!));
    try {
      await expect(host.view(id, owners[0]!)).rejects.toMatchObject({ code: 'NET_BUSY' });
      await host.pulse();
      expect(host.available).toBe(true);
    } finally { release(); await Promise.all(pending); block.mockRestore(); }
    await host.pulse();
    expect((await get(id)).status).toBe(200);
  });
  it('serializes disconnect after pending reads and rejects non-member disconnects', async () => {
    const id = await host.create(seats());
    const pendingRead = host.view(id, owners[0]!);
    const leaving = host.disconnect(id, owners[0]!);
    await pendingRead; await leaving;
    const observer = await get(id, tokens[1]);
    expect(observer.body.data.players[0].online).toBe(false);
    expect(observer.body.data.players[1].online).toBe(true);
    expect((await request(app).post(`/api/v1/richman/games/${id}/disconnect`)
      .set('Authorization', `Bearer ${tokens[2]}`).send({})).status).toBe(404);
  });
  it('restores an animation checkpoint after restart without advancing for offline wall time', async () => {
    const id = await host.create(seats()), body = input();
    await send(id, body);
    const before = (await context.models.RichmanGame.findByPk(id))!.checkpoint;
    await host.stop(); now += 120_000;
    host = new GameService(context, sources); await host.start(false); app = createApp({ ...context, gameHost: host });
    await host.pulse();
    expect((await context.models.RichmanGame.findByPk(id))!.checkpoint).toBe(before);
    for (let i = 0; i < 3; i++) { now += 250; await host.pulse(); }
    expect((await get(id)).body.data.revision).toBeGreaterThan(1);
    const rows = await context.models.RichmanGameCommand.findAll({ where: { gameId: id }, order: [['revision', 'ASC']] });
    expect(rows.map(r => r.revision)).toEqual(rows.map((_, i) => i + 1));
    expect(rows.slice(1).every(r => r.userId === null && r.command.action.type === 'animationDone')).toBe(true);
  }, 30_000);
  it('finishes a real two-human game and keeps the original receipt after restart', async () => {
    const id = await host.create(seats());
    const body = { id: randomUUID(), expectedRevision: 0, action: { type: 'surrender' } };
    const first = await send(id, body);
    expect(first.status).toBe(200);
    expect((await get(id)).body.data.phase).toBe('finished');
    await restart();
    expect((await get(id)).body.data.phase).toBe('finished');
    expect((await send(id, body)).body.data).toEqual(first.body.data);
  });
  it('fails closed on corrupt durable checkpoints without altering stored data', async () => {
    const id = await host.create(seats()), row = (await context.models.RichmanGame.findByPk(id))!;
    await host.stop();
    await context.models.RichmanGame.update({ checkpointHash: '0'.repeat(64) }, { where: { id } });
    host = new GameService(context, sources);
    await expect(host.start(false)).rejects.toMatchObject({ code: 'NET_CHECKPOINT_INVALID' });
    expect((await context.models.RichmanGame.findByPk(id))!.checkpoint).toBe(row.checkpoint);
    await context.models.RichmanGame.update({ checkpointHash: row.checkpointHash }, { where: { id } });
    await host.start(false); app = createApp({ ...context, gameHost: host });
  });
  it('recovers receipt + current projection atomically without executing missing requests or exposing other accounts', async () => {
    const id = await host.create(seats()), body = input(), controller = randomUUID();
    await host.claim(id, owners[0]!, controller);
    const recover = (pending: object, token = tokens[0]!) => request(app).post(`/api/v1/richman/games/${id}/recover`)
      .set('Authorization', `Bearer ${token}`).set('X-Richman-Controller', controller).send({ pending });
    expect((await recover(body)).body.data.recovery.resolution).toBe('missing');
    expect((await get(id)).body.data.revision).toBe(0);
    const receipt = await host.command(id, owners[0]!, 0, body as never, controller);
    await restart();
    const recovered = await recover(body);
    expect(recovered.status).toBe(200);
    expect(recovered.body.data.recovery).toEqual({ id: body.id, resolution: 'committed', receipt });
    expect(recovered.body.data.revision).toBeGreaterThanOrEqual(receipt.revision);
    expect((await recover({ ...body, expectedRevision: 1 })).body.data.recovery.resolution).toBe('conflict');
    expect((await recover(body, tokens[1])).body.data.recovery.resolution).toBe('missing');
    expect((await recover(body, tokens[2])).status).toBe(404);
    expect(await context.models.RichmanGameCommand.count({ where: { gameId: id } })).toBe(1);
  });
  it('retires a disconnected controller, fencing late views and commands even after service restart', async () => {
    const id = await host.create(seats()), old = randomUUID(), next = randomUUID();
    await host.claim(id, owners[0]!, old);
    await host.disconnect(id, owners[0]!, old);
    expect((await host.view(id, owners[0]!, old)).canControl).toBe(false);
    expect(host.isOnline(id, owners[0]!)).toBe(false);
    await restart();
    await expect(host.command(id, owners[0]!, 0, input() as never, old)).rejects.toMatchObject({ code: 'NET_SESSION_REPLACED' });
    await host.claim(id, owners[0]!, next);
    await host.disconnect(id, owners[0]!, old);
    expect((await host.view(id, owners[0]!, next)).canControl).toBe(true);
    expect(host.isOnline(id, owners[0]!)).toBe(true);
  });
  it.each([2, 3, 4, 'mixed'] as const)('restores %s seat checkpoint, identity and human decision after long offline time', async size => {
    const roster: Seat[] = ['xiaomei', 'tuu', 'chyan', 'salonbus'].slice(0, size === 'mixed' ? 4 : size).map((characterId, i) => ({
      playerId: `player-${i + 1}`, characterId, userId: size === 'mixed' && i > 0 ? null : owners[i]!,
      policy: size === 'mixed' && i > 0 ? 'research-v1' : null,
    }));
    const id = await host.create(roster), checkpoint = (await context.models.RichmanGame.findByPk(id))!.checkpoint;
    await host.stop(); now += 7 * 24 * 3600_000;
    host = new GameService(context, sources); await host.start(false); app = createApp({ ...context, gameHost: host });
    await host.pulse();
    expect((await context.models.RichmanGame.findByPk(id))!.checkpoint).toBe(checkpoint);
    for (const seat of roster.filter(s => s.userId)) {
      const view = await host.view(id, seat.userId!);
      expect(view.self).toBe(seat.playerId); expect(view.players).toHaveLength(roster.length);
      expect(view.responderId).toBe('player-1'); expect(view.revision).toBe(0);
    }
    expect((await send(id, input())).status).toBe(200);
  }, 30_000);
  it.each(['balloon', 'sky', 'penguin'] as const)('freezes offline %s clock, restores its checkpoint and settles exactly once', async game => {
    const id = randomUUID(); games.push(id);
    const { host: source } = fixtureHost('presentation-v47-paid-upgrade-tuu', state => state.pending?.kind === 'minigame' && state.pending.game === game, id);
    const checkpoint = source.checkpoint();
    checkpoint.seats.forEach((s, i) => { s.userId = owners[i]!; });
    const text = canonicalSaveJSON(checkpoint), date = new Date();
    await context.models.RichmanGame.create({ id, revision: source.state.revision, status: 'active', checkpoint: text,
      checkpointHash: createHash('sha256').update(text).digest('hex'), createdAt: date, updatedAt: date });
    await context.models.RichmanGameSeat.bulkCreate(checkpoint.seats.map(s => ({ gameId: id, ...s })));
    const owner = checkpoint.seats.find(s => s.playerId === source.state.players[source.state.active]!.id)!.userId!;
    const controller = randomUUID(); await host.claim(id, owner, controller);
    let view = await host.view(id, owner, controller);
    await host.command(id, owner, 0, { id: randomUUID(), expectedRevision: view.revision,
      action: { type: 'minigame', decisionId: view.decision!.id, input: { kind: 'start' } } }, controller);
    now += 250; await host.pulse();
    const beforeLeaseExpiry = (await context.models.RichmanGame.findByPk(id))!.checkpoint;
    now += 15_001; await host.pulse();
    expect(host.isOnline(id, owner)).toBe(false);
    expect((await context.models.RichmanGame.findByPk(id))!.checkpoint).toBe(beforeLeaseExpiry);
    await host.claim(id, owner, controller);
    await host.disconnect(id, owner, controller);
    const saved = (await context.models.RichmanGame.findByPk(id))!.checkpoint;
    now += 120_000; await host.pulse();
    expect((await context.models.RichmanGame.findByPk(id))!.checkpoint).toBe(saved);
    await restart(); now += 120_000; await host.pulse();
    expect((await context.models.RichmanGame.findByPk(id))!.checkpoint).toBe(saved);
    await host.claim(id, owner, controller); now += 250; await host.pulse();
    view = await host.view(id, owner, controller); expect(view.revision).toBeGreaterThan(JSON.parse(saved).engine.state.revision);
    await host.command(id, owner, 0, { id: randomUUID(), expectedRevision: view.revision,
      action: { type: 'minigame', decisionId: view.decision!.id, input: { kind: 'quit' } } }, controller);
    view = await host.view(id, owner, controller);
    const ack = { id: randomUUID(), expectedRevision: view.revision, action: { type: 'minigame' as const, decisionId: view.decision!.id, input: { kind: 'ack' as const } } };
    const receipt = await host.command(id, owner, 0, ack, controller);
    const settled = (await context.models.RichmanGame.findByPk(id))!.checkpoint;
    await restart();
    expect(await host.command(id, owner, 0, ack, controller)).toEqual(receipt);
    expect((await context.models.RichmanGame.findByPk(id))!.checkpoint).toBe(settled);
  }, 30_000);
  it.each(['auction', 'reaction'] as const)('restores the actual %s responder and nested continuation without duplicate settlement', async kind => {
    const id = randomUUID(); games.push(id);
    const { host: source } = fixtureHost(kind === 'auction' ? 'surrender-v47-4' : 'presentation-v47-paid-upgrade-tuu',
      state => state.pending?.kind === kind && (kind !== 'auction' || state.pending.responderId !== state.players[state.active]!.id), id);
    const checkpoint = source.checkpoint();
    checkpoint.seats.forEach((s, i) => { s.userId = owners[i]!; s.policy = null; });
    const text = canonicalSaveJSON(checkpoint), date = new Date();
    await context.models.RichmanGame.create({ id, revision: source.state.revision, status: 'active', checkpoint: text,
      checkpointHash: createHash('sha256').update(text).digest('hex'), createdAt: date, updatedAt: date });
    await context.models.RichmanGameSeat.bulkCreate(checkpoint.seats.map(s => ({ gameId: id, ...s })));
    const seat = checkpoint.seats.find(s => s.playerId === decisionPlayer(source.state))!;
    const controller = randomUUID(); await host.claim(id, seat.userId!, controller);
    await restart();
    const view = await host.view(id, seat.userId!, controller);
    expect(view.decision?.kind).toBe(kind); expect(view.responderId).toBe(seat.playerId);
    const intent = { id: randomUUID(), expectedRevision: view.revision, action: kind === 'auction' ?
      { type: 'auction' as const, decisionId: view.decision!.id, increment: null } :
      { type: 'reaction' as const, decisionId: view.decision!.id, choice: 'decline' as const } };
    const expected = GameHost.restore(checkpoint); expected.input(seat.userId!, intent);
    const receipt = await host.command(id, seat.userId!, 0, intent, controller);
    const saved = (await context.models.RichmanGame.findByPk(id))!.checkpoint;
    expect(saved).toBe(canonicalSaveJSON(expected.checkpoint()));
    await restart();
    expect((await host.recover(id, seat.userId!, controller, intent)).recovery?.receipt).toEqual(receipt);
    expect(await host.command(id, seat.userId!, 0, intent, controller)).toEqual(receipt);
    expect((await context.models.RichmanGame.findByPk(id))!.checkpoint).toBe(saved);
  }, 30_000);
});
