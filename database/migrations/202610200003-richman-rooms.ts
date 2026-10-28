import { DataTypes } from 'sequelize';
import type { MigrationContext } from '../../src/database/migrator';
export async function up({ context: { queryInterface: qi } }: { context: MigrationContext }) {
  const options = { engine: 'InnoDB', charset: 'utf8mb4', collate: 'utf8mb4_bin' };
  const user = { type: DataTypes.CHAR(36), references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT' };
  await qi.createTable('richman_rooms', {
    id: { type: DataTypes.CHAR(36), primaryKey: true, allowNull: false },
    code: { type: DataTypes.STRING(12), unique: true, allowNull: false },
    owner_id: { ...user, allowNull: false },
    revision: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    status: { type: DataTypes.STRING(16), allowNull: false },
    initial_funds: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    game_id: { type: DataTypes.CHAR(36), allowNull: true, unique: true, references: { model: 'richman_games', key: 'id' }, onDelete: 'RESTRICT' },
    created_at: { type: DataTypes.DATE(3), allowNull: false }, updated_at: { type: DataTypes.DATE(3), allowNull: false },
  }, options);
  await qi.createTable('richman_room_seats', {
    room_id: { type: DataTypes.CHAR(36), primaryKey: true, allowNull: false, references: { model: 'richman_rooms', key: 'id' }, onDelete: 'RESTRICT' },
    position: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, allowNull: false },
    user_id: { ...user, allowNull: true },
    character_id: { type: DataTypes.STRING(32), allowNull: false },
    kind: { type: DataTypes.STRING(16), allowNull: false }, ready: { type: DataTypes.BOOLEAN, allowNull: false },
    seen_at: { type: DataTypes.DATE(3), allowNull: false },
  }, { ...options, uniqueKeys: {
    uq_richman_room_user: { fields: ['room_id', 'user_id'] },
    uq_richman_room_character: { fields: ['room_id', 'character_id'] },
  } });
  await qi.addColumn('richman_game_seats', 'controller_id', { type: DataTypes.CHAR(36), allowNull: true });
}
