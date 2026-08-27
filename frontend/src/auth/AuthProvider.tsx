import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../api/client';
import { AuthContext } from './auth-context';
import type { AuthStatus } from './auth-context';
import { clearSession, createStoredSession, loadSession, saveSession } from './storage';
import type { AuthPayload, StoredSession } from './types';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<StoredSession | null>(null);
  const sessionRef = useRef<StoredSession | null>(null);
  const restorePromiseRef = useRef<Promise<AuthPayload | null> | null>(null);

  const commitSession = useCallback((payload: AuthPayload) => {
    const next = createStoredSession(payload);
    sessionRef.current = next;
    setSession(next);
    saveSession(next);
    setStatus('authenticated');
    return next;
  }, []);

  const forgetSession = useCallback(() => {
    sessionRef.current = null;
    setSession(null);
    clearSession();
    setStatus('anonymous');
  }, []);

  useEffect(() => {
    let active = true;
    restorePromiseRef.current ??= (async () => {
      const stored = loadSession();
      if (!stored || stored.refreshExpiresAt <= Date.now()) return null;
      const payload = stored.accessExpiresAt > Date.now() + 5_000
        ? { user: stored.user, tokens: stored.tokens }
        : await api.refresh(stored.tokens.refreshToken);
      const user = await api.getCurrentUser(payload.tokens.accessToken);
      return { user, tokens: payload.tokens };
    })();

    void restorePromiseRef.current
      .then((payload) => {
        if (!active) return;
        if (payload) commitSession(payload);
        else forgetSession();
      })
      .catch(() => {
        if (active) forgetSession();
      });
    return () => { active = false; };
  }, [commitSession, forgetSession]);

  useEffect(() => {
    if (!session) return;
    const delay = Math.max(1_000, session.accessExpiresAt - Date.now() - 60_000);
    const timer = window.setTimeout(() => {
      const current = sessionRef.current;
      if (!current) return;
      void api.refresh(current.tokens.refreshToken).then(commitSession).catch(forgetSession);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [commitSession, forgetSession, session]);

  const signIn = useCallback(async (input: { username: string; password: string }) => {
    commitSession(await api.login(input));
  }, [commitSession]);

  const signUp = useCallback(async (input: { username: string; displayName: string; password: string; inviteCode: string }) => {
    commitSession(await api.register(input));
  }, [commitSession]);

  const signOut = useCallback(async () => {
    const refreshToken = sessionRef.current?.tokens.refreshToken;
    forgetSession();
    if (refreshToken) await api.logout(refreshToken).catch(() => undefined);
  }, [forgetSession]);

  return (
    <AuthContext.Provider value={{ status, user: session?.user ?? null, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
