import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { authRateLimit } from '../../src/middleware/rate-limit';

describe('authentication rate limiting', () => {
  it('returns the common 429 error after ten requests', async () => {
    const app = express();
    app.use(authRateLimit);
    app.post('/', (_request, response) => response.json({ success: true }));

    for (let index = 0; index < 10; index += 1) {
      expect((await request(app).post('/')).status).toBe(200);
    }
    const limited = await request(app).post('/');
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('RATE_LIMITED');
  });
});
