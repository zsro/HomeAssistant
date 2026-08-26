import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize,
} from 'sequelize';

export class AuthRefreshSession extends Model<
  InferAttributes<AuthRefreshSession>,
  InferCreationAttributes<AuthRefreshSession>
> {
  declare id: string;
  declare userId: string;
  declare tokenHash: string;
  declare expiresAt: Date;
  declare revokedAt: CreationOptional<Date | null>;
  declare lastUsedAt: CreationOptional<Date | null>;
  declare replacedBySessionId: CreationOptional<string | null>;
  declare createdIp: CreationOptional<string | null>;
  declare userAgent: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
}

export function initAuthRefreshSessionModel(sequelize: Sequelize): typeof AuthRefreshSession {
  AuthRefreshSession.init(
    {
      id: { type: DataTypes.CHAR(36), primaryKey: true },
      userId: { type: DataTypes.CHAR(36), allowNull: false, field: 'user_id' },
      tokenHash: { type: DataTypes.CHAR(64), allowNull: false, unique: 'uq_auth_refresh_sessions_token_hash', field: 'token_hash' },
      expiresAt: { type: DataTypes.DATE(3), allowNull: false, field: 'expires_at' },
      revokedAt: { type: DataTypes.DATE(3), allowNull: true, field: 'revoked_at' },
      lastUsedAt: { type: DataTypes.DATE(3), allowNull: true, field: 'last_used_at' },
      replacedBySessionId: { type: DataTypes.CHAR(36), allowNull: true, field: 'replaced_by_session_id' },
      createdIp: { type: DataTypes.STRING(45), allowNull: true, field: 'created_ip' },
      userAgent: { type: DataTypes.STRING(512), allowNull: true, field: 'user_agent' },
      createdAt: { type: DataTypes.DATE(3), allowNull: false, field: 'created_at' },
    },
    {
      sequelize,
      tableName: 'auth_refresh_sessions',
      modelName: 'AuthRefreshSession',
      timestamps: true,
      updatedAt: false,
      underscored: true,
    },
  );

  return AuthRefreshSession;
}
