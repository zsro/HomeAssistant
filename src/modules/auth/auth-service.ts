import { randomUUID } from 'node:crypto';
import { UniqueConstraintError } from 'sequelize';
import type { Transaction } from 'sequelize';
import type { AppContext } from '../../app-context';
import type { AuthRefreshSession } from '../../database/models/auth-refresh-session';
import type { User } from '../../database/models/user';
import { AppError } from '../../lib/app-error';
import { presentUser } from '../users/user-presenter';
import { generateInviteCode } from './invite-code';
import { hashPassword, verifyPassword } from './password';
import { createAccessToken, createRefreshToken, hashRefreshToken } from './tokens';
import type { ChangePasswordInput, LoginInput, RegisterInput } from './validation';

type ClientMetadata = { ip: string | null; userAgent: string | null };

function tokenPayload(context: AppContext, user: User, refreshToken: string) {
  return {
    user: presentUser(user),
    tokens: {
      accessToken: createAccessToken(context.config, user),
      refreshToken,
      tokenType: 'Bearer',
      accessExpiresIn: context.config.jwt.accessExpiresInSeconds,
      refreshExpiresIn: context.config.jwt.refreshExpiresInSeconds,
    },
  };
}

async function createRefreshSession(
  context: AppContext,
  user: User,
  metadata: ClientMetadata,
  transaction: Transaction,
) {
  const refreshToken = createRefreshToken();
  const session = await context.models.AuthRefreshSession.create(
    {
      id: randomUUID(),
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + context.config.jwt.refreshExpiresInSeconds * 1_000),
      revokedAt: null,
      lastUsedAt: null,
      replacedBySessionId: null,
      createdIp: metadata.ip,
      userAgent: metadata.userAgent,
    },
    { transaction },
  );
  return { session, refreshToken };
}

function isInviteCodeConflict(error: UniqueConstraintError): boolean {
  return error.errors.some((item) => item.path === 'invite_code' || item.path === 'inviteCode');
}

function isUsernameConflict(error: UniqueConstraintError): boolean {
  return error.errors.some((item) => item.path === 'username');
}

async function createUserWithUniqueInvite(
  context: AppContext,
  attributes: { username: string; passwordHash: string; displayName: string; invitedByUserId: string | null },
  transaction: Transaction,
) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      return await context.models.User.create(
        {
          id: randomUUID(),
          ...attributes,
          inviteCode: generateInviteCode(),
          status: 'active',
          authVersion: 0,
          lastLoginAt: null,
        },
        { transaction },
      );
    } catch (error) {
      if (error instanceof UniqueConstraintError && isInviteCodeConflict(error)) continue;
      throw error;
    }
  }

  throw new AppError(500, 'INVITE_GENERATION_FAILED', '邀请码生成失败，请稍后重试');
}

export async function register(
  context: AppContext,
  input: RegisterInput,
  metadata: ClientMetadata,
) {
  const passwordHash = await hashPassword(input.password);
  try {
    return await context.sequelize.transaction(async (transaction) => {
      const inviter = await context.models.User.findOne({
        where: { inviteCode: input.inviteCode, status: 'active' },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!inviter) throw new AppError(400, 'INVITE_INVALID', '邀请码无效');

      const existing = await context.models.User.findOne({ where: { username: input.username }, transaction });
      if (existing) throw new AppError(409, 'USERNAME_TAKEN', '用户名已存在');

      const user = await createUserWithUniqueInvite(
        context,
        {
          username: input.username,
          passwordHash,
          displayName: input.displayName,
          invitedByUserId: inviter.id,
        },
        transaction,
      );
      const { refreshToken } = await createRefreshSession(context, user, metadata, transaction);
      return tokenPayload(context, user, refreshToken);
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError && isUsernameConflict(error)) {
      throw new AppError(409, 'USERNAME_TAKEN', '用户名已存在');
    }
    throw error;
  }
}

export async function login(context: AppContext, input: LoginInput, metadata: ClientMetadata) {
  const user = await context.models.User.findOne({ where: { username: input.username } });
  if (!user || !(await verifyPassword(user.passwordHash, input.password))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', '用户名或密码错误');
  }
  if (user.status !== 'active') throw new AppError(403, 'ACCOUNT_DISABLED', '账号已禁用');

  return context.sequelize.transaction(async (transaction) => {
    user.lastLoginAt = new Date();
    await user.save({ transaction, fields: ['lastLoginAt'] });
    const { refreshToken } = await createRefreshSession(context, user, metadata, transaction);
    return tokenPayload(context, user, refreshToken);
  });
}

async function revokeAllSessions(context: AppContext, user: User, transaction: Transaction, now: Date) {
  user.authVersion += 1;
  await user.save({ transaction, fields: ['authVersion'] });
  await context.models.AuthRefreshSession.update(
    { revokedAt: now },
    { where: { userId: user.id, revokedAt: null }, transaction },
  );
}

type RefreshOutcome =
  | { kind: 'success'; user: User; refreshToken: string }
  | { kind: 'invalid' }
  | { kind: 'disabled' };

export async function refresh(context: AppContext, rawToken: string, metadata: ClientMetadata) {
  const tokenHash = hashRefreshToken(rawToken);
  const outcome = await context.sequelize.transaction<RefreshOutcome>(async (transaction) => {
    const session = await context.models.AuthRefreshSession.findOne({
      where: { tokenHash },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!session) return { kind: 'invalid' };

    const user = await context.models.User.findByPk(session.userId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!user) return { kind: 'invalid' };

    const now = new Date();
    if (session.revokedAt) {
      if (session.replacedBySessionId) await revokeAllSessions(context, user, transaction, now);
      return { kind: 'invalid' };
    }
    if (session.expiresAt <= now) {
      session.revokedAt = now;
      await session.save({ transaction, fields: ['revokedAt'] });
      return { kind: 'invalid' };
    }
    if (user.status !== 'active') {
      await revokeAllSessions(context, user, transaction, now);
      return { kind: 'disabled' };
    }

    const replacement = await createRefreshSession(context, user, metadata, transaction);
    session.revokedAt = now;
    session.lastUsedAt = now;
    session.replacedBySessionId = replacement.session.id;
    await session.save({ transaction, fields: ['revokedAt', 'lastUsedAt', 'replacedBySessionId'] });
    return { kind: 'success', user, refreshToken: replacement.refreshToken };
  });

  if (outcome.kind === 'disabled') throw new AppError(403, 'ACCOUNT_DISABLED', '账号已禁用');
  if (outcome.kind === 'invalid') throw new AppError(401, 'REFRESH_TOKEN_INVALID', '刷新令牌无效或已过期');
  return tokenPayload(context, outcome.user, outcome.refreshToken);
}

export async function logout(context: AppContext, rawToken: string) {
  const session = await context.models.AuthRefreshSession.findOne({
    where: { tokenHash: hashRefreshToken(rawToken) },
  });
  if (session && !session.revokedAt) {
    session.revokedAt = new Date();
    await session.save({ fields: ['revokedAt'] });
  }
}

export async function logoutAll(context: AppContext, userId: string) {
  await context.sequelize.transaction(async (transaction) => {
    const user = await context.models.User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!user) throw new AppError(401, 'ACCESS_TOKEN_INVALID', '访问令牌无效或已过期');
    await revokeAllSessions(context, user, transaction, new Date());
  });
}

export async function changePassword(context: AppContext, userId: string, input: ChangePasswordInput) {
  const nextHash = await hashPassword(input.newPassword);

  await context.sequelize.transaction(async (transaction) => {
    const lockedUser = await context.models.User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!lockedUser) throw new AppError(401, 'ACCESS_TOKEN_INVALID', '访问令牌无效或已过期');
    if (!(await verifyPassword(lockedUser.passwordHash, input.oldPassword))) {
      throw new AppError(401, 'INVALID_CREDENTIALS', '旧密码错误');
    }
    lockedUser.passwordHash = nextHash;
    lockedUser.authVersion += 1;
    await lockedUser.save({ transaction, fields: ['passwordHash', 'authVersion'] });
    await context.models.AuthRefreshSession.update(
      { revokedAt: new Date() },
      { where: { userId, revokedAt: null }, transaction },
    );
  });
}

export type { AuthRefreshSession };
