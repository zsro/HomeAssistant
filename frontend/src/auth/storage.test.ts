import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSession, createStoredSession, loadSession, saveSession } from './storage';
import type { AuthPayload } from './types';

const payload: AuthPayload = {
  user: {
    id: '2bf65df6-72e7-45ed-adf0-39dd10538326',
    username: 'tester',
    displayName: '测试用户',
    inviteCode: 'ABCDEFGHJK',
    invitedByUserId: null,
    status: 'active',
    createdAt: '2026-08-27T00:00:00.000Z',
  },
  tokens: {
    accessToken: 'access',
    refreshToken: 'refresh',
    tokenType: 'Bearer',
    accessExpiresIn: 900,
    refreshExpiresIn: 2_592_000,
  },
};

describe('session storage', () => {
  beforeEach(() => localStorage.clear());

  it('stores expiration timestamps with the token pair', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000);
    const session = createStoredSession(payload);
    expect(session.accessExpiresAt).toBe(901_000);
    expect(session.refreshExpiresAt).toBe(2_592_001_000);
    vi.restoreAllMocks();
  });

  it('loads a valid stored session', () => {
    const session = createStoredSession(payload);
    saveSession(session);
    expect(loadSession()).toEqual(session);
  });

  it('discards malformed data', () => {
    localStorage.setItem('home-assistant.session.v1', '{bad json');
    expect(loadSession()).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it('clears a session', () => {
    saveSession(createStoredSession(payload));
    clearSession();
    expect(loadSession()).toBeNull();
  });
});
