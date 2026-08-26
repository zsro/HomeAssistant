import { rateLimit } from 'express-rate-limit';

function handler(_request: unknown, response: { status: (status: number) => { json: (body: unknown) => unknown } }) {
  return response.status(429).json({
    success: false,
    error: { code: 'RATE_LIMITED', message: '请求过于频繁，请稍后重试' },
  });
}

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1_000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler,
});

export const refreshRateLimit = rateLimit({
  windowMs: 15 * 60 * 1_000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler,
});
