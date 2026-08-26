import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize,
} from 'sequelize';

export type UserStatus = 'active' | 'disabled';

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: string;
  declare username: string;
  declare passwordHash: string;
  declare displayName: string;
  declare inviteCode: string;
  declare invitedByUserId: CreationOptional<string | null>;
  declare status: CreationOptional<UserStatus>;
  declare authVersion: CreationOptional<number>;
  declare lastLoginAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initUserModel(sequelize: Sequelize): typeof User {
  User.init(
    {
      id: { type: DataTypes.CHAR(36), primaryKey: true },
      username: { type: DataTypes.STRING(32), allowNull: false, unique: 'uq_users_username' },
      passwordHash: { type: DataTypes.STRING(255), allowNull: false, field: 'password_hash' },
      displayName: { type: DataTypes.STRING(64), allowNull: false, field: 'display_name' },
      inviteCode: { type: DataTypes.CHAR(10), allowNull: false, unique: 'uq_users_invite_code', field: 'invite_code' },
      invitedByUserId: { type: DataTypes.CHAR(36), allowNull: true, field: 'invited_by_user_id' },
      status: { type: DataTypes.ENUM('active', 'disabled'), allowNull: false, defaultValue: 'active' },
      authVersion: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'auth_version' },
      lastLoginAt: { type: DataTypes.DATE(3), allowNull: true, field: 'last_login_at' },
      createdAt: { type: DataTypes.DATE(3), allowNull: false, field: 'created_at' },
      updatedAt: { type: DataTypes.DATE(3), allowNull: false, field: 'updated_at' },
    },
    {
      sequelize,
      tableName: 'users',
      modelName: 'User',
      underscored: true,
      timestamps: true,
    },
  );

  return User;
}
