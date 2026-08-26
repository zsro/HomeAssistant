import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import type { Sequelize } from 'sequelize';
import { createApp } from '../../src/app';
import { loadConfig, type AppConfig } from '../../src/config/env';
import { createMigrator } from '../../src/database/migrator';
import { initModels, type Models } from '../../src/database/models';
import { createSequelize } from '../../src/database/sequelize';
import { generateInviteCode } from '../../src/modules/auth/invite-code';
import { hashPassword } from '../../src/modules/auth/password';

const runDatabaseTests = process.env.RUN_DB_TESTS === '1';

describe.skipIf(!runDatabaseTests)('invitation auth integration', () => {
  let config: AppConfig;
  let sequelize: Sequelize;
  let models: Models;
  let app: Express;
  let rootInviteCode: string;

  beforeAll(async () => {
    config = loadConfig();
    if (!config.database.name.endsWith('_test')) {
      throw new Error(`拒绝运行：集成测试数据库名必须以 _test 结尾，当前为 ${config.database.name}`);
    }
    sequelize = createSequelize(config);
    await sequelize.authenticate();
    await createMigrator(sequelize, false).up();
    models = initModels(sequelize);
    await models.AuthRefreshSession.destroy({ where: {} });
    await models.User.destroy({ where: {} });
    rootInviteCode = generateInviteCode();
    await models.User.create({
      id: randomUUID(),
      username: 'root_user',
      passwordHash: await hashPassword('root-password-123'),
      displayName: 'Root',
      inviteCode: rootInviteCode,
      invitedByUserId: null,
      status: 'active',
      authVersion: 0,
      lastLoginAt: null,
    });
    app = createApp({ config, sequelize, models });
  });

  afterAll(async () => {
    if (sequelize) await sequelize.close();
  });

  it('registers with a reusable invitation and rejects duplicate usernames', async () => {
    const invalidInvite = await request(app).post('/api/v1/auth/register').send({
      username: 'nobody', password: 'nobody-password-123', displayName: 'Nobody', inviteCode: 'ABCDEFGHJK',
    });
    expect(invalidInvite.status).toBe(400);
    expect(invalidInvite.body.error.code).toBe('INVITE_INVALID');

    const body = { username: 'alice', password: 'alice-password-123', displayName: 'Alice', inviteCode: rootInviteCode };
    const first = await request(app).post('/api/v1/auth/register').send(body);
    expect(first.status).toBe(201);
    expect(first.body.data.user.invitedByUserId).not.toBeNull();
    expect(first.body.data.tokens.refreshToken).toBeTruthy();
    expect((await request(app).post('/api/v1/auth/logout').send({
      refreshToken: first.body.data.tokens.refreshToken,
    })).status).toBe(200);
    expect((await request(app).post('/api/v1/auth/refresh').send({
      refreshToken: first.body.data.tokens.refreshToken,
    })).status).toBe(401);

    const second = await request(app).post('/api/v1/auth/register').send({ ...body, username: 'bob', displayName: 'Bob' });
    expect(second.status).toBe(201);
    const duplicate = await request(app).post('/api/v1/auth/register').send(body);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('USERNAME_TAKEN');

    const concurrentBody = {
      username: 'charlie', password: 'charlie-password-123', displayName: 'Charlie', inviteCode: rootInviteCode,
    };
    const concurrent = await Promise.all([
      request(app).post('/api/v1/auth/register').set('x-forwarded-for', '10.0.0.10').send(concurrentBody),
      request(app).post('/api/v1/auth/register').set('x-forwarded-for', '10.0.0.11').send(concurrentBody),
    ]);
    expect(concurrent.map(({ status }) => status).sort()).toEqual([201, 409]);
  });

  it('logs in, rotates refresh tokens, and detects replay', async () => {
    const wrongPassword = await request(app).post('/api/v1/auth/login').send({ username: 'alice', password: 'wrong-password' });
    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS');

    const login = await request(app).post('/api/v1/auth/login').send({ username: 'alice', password: 'alice-password-123' });
    expect(login.status).toBe(200);
    const oldRefreshToken = login.body.data.tokens.refreshToken as string;

    const rotated = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: oldRefreshToken });
    expect(rotated.status).toBe(200);
    expect(rotated.body.data.tokens.refreshToken).not.toBe(oldRefreshToken);

    const replay = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: oldRefreshToken });
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe('REFRESH_TOKEN_INVALID');

    const invalidatedAccess = await request(app)
      .get('/api/v1/users/me')
      .set('authorization', `Bearer ${rotated.body.data.tokens.accessToken}`);
    expect(invalidatedAccess.status).toBe(401);
  });

  it('changes passwords and invalidates all existing sessions', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ username: 'bob', password: 'alice-password-123' });
    const accessToken = login.body.data.tokens.accessToken as string;
    const refreshToken = login.body.data.tokens.refreshToken as string;
    const changed = await request(app)
      .put('/api/v1/auth/password')
      .set('authorization', `Bearer ${accessToken}`)
      .send({ oldPassword: 'alice-password-123', newPassword: 'new-password-456' });
    expect(changed.status).toBe(200);
    expect((await request(app).post('/api/v1/auth/refresh').send({ refreshToken })).status).toBe(401);
    const nextLogin = await request(app).post('/api/v1/auth/login').send({ username: 'bob', password: 'new-password-456' });
    expect(nextLogin.status).toBe(200);
    const logoutAll = await request(app)
      .post('/api/v1/auth/logout-all')
      .set('authorization', `Bearer ${nextLogin.body.data.tokens.accessToken}`);
    expect(logoutAll.status).toBe(200);
    expect((await request(app).post('/api/v1/auth/refresh').send({
      refreshToken: nextLogin.body.data.tokens.refreshToken,
    })).status).toBe(401);
  });
});
