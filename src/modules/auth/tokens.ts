import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { AppConfig } from '../../config/env';
import { AppError } from '../../lib/app-error';
import type { User } from '../../database/models/user';

export type AccessTokenClaims = {
  sub: string;
  av: number;
};

export function createAccessToken(config: AppConfig, user: User): string {
  return jwt.sign(
    { av: user.authVersion },
    config.jwt.accessSecret,
    {
      algorithm: 'HS256',
      subject: user.id,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      expiresIn: config.jwt.accessExpiresInSeconds,
    },
  );
}

export function verifyAccessToken(config: AppConfig, token: string): AccessTokenClaims {
  try {
    const payload = jwt.verify(token, config.jwt.accessSecret, {
      algorithms: ['HS256'],
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    });

    if (typeof payload === 'string' || !payload.sub || typeof payload.av !== 'number') {
      throw new Error('invalid payload');
    }

    return { sub: payload.sub, av: payload.av };
  } catch {
    throw new AppError(401, 'ACCESS_TOKEN_INVALID', '访问令牌无效或已过期');
  }
}

export function createRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
