import type { AuthPayload, StoredSession } from './types';

const STORAGE_KEY = 'home-assistant.session.v1';

export function createStoredSession(payload: AuthPayload): StoredSession {
  const now = Date.now();
  return {
    ...payload,
    accessExpiresAt: now + payload.tokens.accessExpiresIn * 1_000,
    refreshExpiresAt: now + payload.tokens.refreshExpiresIn * 1_000,
  };
}

export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Partial<StoredSession>;
    if (
      !session.user?.id ||
      !session.tokens?.accessToken ||
      !session.tokens.refreshToken ||
      typeof session.refreshExpiresAt !== 'number'
    ) {
      clearSession();
      return null;
    }
    return session as StoredSession;
  } catch {
    clearSession();
    return null;
  }
}

export function saveSession(session: StoredSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}
