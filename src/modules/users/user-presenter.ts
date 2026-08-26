import type { User } from '../../database/models/user';

export function presentUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    inviteCode: user.inviteCode,
    invitedByUserId: user.invitedByUserId,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
  };
}
