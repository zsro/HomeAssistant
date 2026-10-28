import { DataTypes } from 'sequelize';
import type { MigrationContext } from '../../src/database/migrator';

/** Additive authoritative journal, separate from personal SAVE slots. */
export async function up({ context: { queryInterface: qi } }: { context: MigrationContext }) {
  const options = { engine: 'InnoDB', charset: 'utf8mb4', collate: 'utf8mb4_bin' };
  await qi.createTable('richman_games', {
    id: { type: DataTypes.CHAR(36), primaryKey: true, allowNull: false },
    revision: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    status: { type: DataTypes.STRING(16), allowNull: false },
    checkpoint: { type: DataTypes.TEXT('medium'), allowNull: false },
    checkpoint_hash: { type: DataTypes.CHAR(64), allowNull: false },
    created_at: { type: DataTypes.DATE(3), allowNull: false },
    updated_at: { type: DataTypes.DATE(3), allowNull: false },
  }, options);
  const game = { type: DataTypes.CHAR(36), allowNull: false,
    references: { model: 'richman_games', key: 'id' }, onDelete: 'RESTRICT' };
  const user = { type: DataTypes.CHAR(36), references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT' };
  await qi.createTable('richman_game_seats', {
    game_id: { ...game, primaryKey: true },
    player_id: { type: DataTypes.STRING(16), primaryKey: true, allowNull: false },
    user_id: { ...user, allowNull: true },
    character_id: { type: DataTypes.STRING(32), allowNull: false },
    policy: { type: DataTypes.STRING(32), allowNull: true },
  }, { ...options, uniqueKeys: {
    uq_richman_game_user: { fields: ['game_id', 'user_id'] },
    uq_richman_game_character: { fields: ['game_id', 'character_id'] },
  } });
  await qi.createTable('richman_game_commands', {
    game_id: { ...game, primaryKey: true },
    revision: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, allowNull: false },
    user_id: { ...user, allowNull: true },
    request_id: { type: DataTypes.STRING(64), allowNull: true },
    request_hash: { type: DataTypes.CHAR(64), allowNull: true },
    command: { type: DataTypes.JSON, allowNull: false },
    events: { type: DataTypes.JSON, allowNull: false },
    receipt: { type: DataTypes.JSON, allowNull: true },
    created_at: { type: DataTypes.DATE(3), allowNull: false },
  }, { ...options, uniqueKeys: { uq_richman_game_request: { fields: ['game_id', 'user_id', 'request_id'] } } });
}
