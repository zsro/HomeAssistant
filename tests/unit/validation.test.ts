import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from '../../src/modules/auth/validation';

describe('auth validation', () => {
  it('normalizes usernames and invitation codes', () => {
    const result = registerSchema.parse({
      username: '  Alice_01 ',
      password: '这是一个足够长的密码123',
      displayName: '  Alice  ',
      inviteCode: 'abcdefghjk',
    });
    expect(result).toEqual({
      username: 'alice_01',
      password: '这是一个足够长的密码123',
      displayName: 'Alice',
      inviteCode: 'ABCDEFGHJK',
    });
  });

  it('does not trim passwords', () => {
    const result = loginSchema.parse({ username: 'alice', password: '  password  ' });
    expect(result.password).toBe('  password  ');
  });

  it('rejects ambiguous invitation characters', () => {
    expect(() => registerSchema.parse({
      username: 'alice', password: 'long-password', displayName: 'Alice', inviteCode: 'ABCDE0GHJK',
    })).toThrow();
  });
});
