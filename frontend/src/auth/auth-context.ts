import { createContext, useContext } from 'react';
import type { User } from './types';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  signIn: (input: { username: string; password: string }) => Promise<void>;
  signUp: (input: { username: string; displayName: string; password: string; inviteCode: string }) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
