import { describe, expect, it } from 'vitest';
import type { User } from '../../src/database/models/user';
import { generateInviteCode } from '../../src/modules/auth/invite-code';
import { hashPassword, verifyPassword } from '../../src/modules/auth/password';
import { createAccessToken, createRefreshToken, hashRefreshToken, verifyAccessToken } from '../../src/modules/auth/tokens';
import { testConfig } from '../helpers/config';

describe('security primitives', () => {
  it('generates invitation codes with the restricted alphabet', () => {
    const codes = Array.from({ length: 100 }, generateInviteCode);
    expect(codes.every((code) => /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/.test(code))).toBe(true);
    expect(new Set(codes).size).toBe(100);
  });

  it('hashes passwords with Argon2id', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    await expect(verifyPassword(hash, 'correct horse battery staple')).resolves.toBe(true);
    await expect(verifyPassword(hash, 'incorrect password')).resolves.toBe(false);
  });

  it('signs and verifies scoped access tokens', () => {
    const config = testConfig();
    const user = { id: '7dc22070-d4d8-41ea-9810-c70a2f7df21c', authVersion: 4 } as User;
    const token = createAccessToken(config, user);
    expect(verifyAccessToken(config, token)).toEqual({ sub: user.id, av: 4 });
    expect(() => verifyAccessToken({ ...config, jwt: { ...config.jwt, audience: 'wrong' } }, token)).toThrow();
  });

  it('stores only a deterministic refresh token hash', () => {
    const token = createRefreshToken();
    expect(token.length).toBeGreaterThan(50);
    expect(hashRefreshToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
  });
});
