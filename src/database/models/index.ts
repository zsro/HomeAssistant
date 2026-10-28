import type { Sequelize } from 'sequelize';
import { initRichmanRoomModels, RichmanRoom, RichmanRoomSeat } from './richman-room';
import { AuthRefreshSession, initAuthRefreshSessionModel } from './auth-refresh-session';
import { initUserModel, User } from './user';
import { initRichmanSaveModels, RichmanSaveRevision, RichmanSaveSlot } from './richman-save';
import { initRichmanGameModels, RichmanGame, RichmanGameSeat, RichmanGameCommand } from './richman-game';

export type Models = {
  RichmanRoom: typeof RichmanRoom;
  RichmanRoomSeat: typeof RichmanRoomSeat;
  User: typeof User;
  AuthRefreshSession: typeof AuthRefreshSession;
  RichmanSaveSlot: typeof RichmanSaveSlot;
  RichmanSaveRevision: typeof RichmanSaveRevision;
  RichmanGame: typeof RichmanGame;
  RichmanGameSeat: typeof RichmanGameSeat;
  RichmanGameCommand: typeof RichmanGameCommand;
};

export function initModels(sequelize: Sequelize): Models {
  initUserModel(sequelize);
  initAuthRefreshSessionModel(sequelize);
  initRichmanSaveModels(sequelize);
  initRichmanGameModels(sequelize);
  initRichmanRoomModels(sequelize);

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

  return { RichmanRoom, RichmanRoomSeat, User, AuthRefreshSession, RichmanSaveSlot, RichmanSaveRevision, RichmanGame, RichmanGameSeat, RichmanGameCommand };
}
