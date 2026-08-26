import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import type { Sequelize } from 'sequelize';
import { createApp } from '../../src/app';
import { initModels } from '../../src/database/models';
import { createSequelize } from '../../src/database/sequelize';
import { testConfig } from '../helpers/config';

describe('HTTP shell', () => {
  let sequelize: Sequelize;
  let app: Express;

  beforeAll(() => {
    const config = testConfig();
    sequelize = createSequelize(config);
    app = createApp({ config, sequelize, models: initModels(sequelize) });
  });

  afterAll(async () => sequelize.close());

  it('serves health without touching the database', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', message: 'Server is running' });
  });

  it('serves OpenAPI and docs', async () => {
    const spec = await request(app).get('/api/openapi.json');
    expect(spec.status).toBe(200);
    expect(spec.body.paths['/v1/auth/register']).toBeDefined();
    expect((await request(app).get('/api/docs/')).status).toBe(200);
  });

  it('requires an invitation before database work', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      username: 'alice', password: 'long-password', displayName: 'Alice',
    });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVITE_REQUIRED');
  });

  it('uses the common not-found error shape', async () => {
    const response = await request(app).get('/api/unknown');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ success: false, error: { code: 'NOT_FOUND', message: '接口不存在' } });
  });
});
