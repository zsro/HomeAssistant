export type User = {
  id: string;
  username: string;
  displayName: string;
  inviteCode: string;
  invitedByUserId: string | null;
  status: 'active' | 'disabled';
  createdAt: string;
};

export type Tokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  accessExpiresIn: number;
  refreshExpiresIn: number;
};

export type AuthPayload = { user: User; tokens: Tokens };

export type StoredSession = AuthPayload & {
  accessExpiresAt: number;
  refreshExpiresAt: number;
};
