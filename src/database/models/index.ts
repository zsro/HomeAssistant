import type { Sequelize } from 'sequelize';
import { AuthRefreshSession, initAuthRefreshSessionModel } from './auth-refresh-session';
import { initUserModel, User } from './user';

export type Models = {
  User: typeof User;
  AuthRefreshSession: typeof AuthRefreshSession;
};

export function initModels(sequelize: Sequelize): Models {
  initUserModel(sequelize);
  initAuthRefreshSessionModel(sequelize);

  User.belongsTo(User, {
    as: 'inviter',
    foreignKey: 'invitedByUserId',
    onDelete: 'SET NULL',
  });
  User.hasMany(User, { as: 'invitees', foreignKey: 'invitedByUserId' });
  User.hasMany(AuthRefreshSession, { as: 'refreshSessions', foreignKey: 'userId' });
  AuthRefreshSession.belongsTo(User, { as: 'user', foreignKey: 'userId' });
  AuthRefreshSession.belongsTo(AuthRefreshSession, {
    as: 'replacement',
    foreignKey: 'replacedBySessionId',
  });

  return { User, AuthRefreshSession };
}
