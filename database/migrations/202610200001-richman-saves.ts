import { DataTypes } from 'sequelize';
import type { MigrationContext } from '../../src/database/migrator';

/** Additive only. No automatic rollback: successful saves must be retained. */
export async function up({ context: { queryInterface: qi } }: { context: MigrationContext }) {
  const owner = {
    type: DataTypes.CHAR(36), allowNull: false,
    references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE',
  };
  const options = { engine: 'InnoDB', charset: 'utf8mb4', collate: 'utf8mb4_bin' };
  // Define indexes with CREATE TABLE so a MySQL DDL retry cannot leave a table
  // without its uniqueness constraints after an interrupted migration.
  await qi.createTable('richman_save_revisions', {
    id: { type: DataTypes.CHAR(36), primaryKey: true, allowNull: false },
    owner_id: owner,
    slot_key: { type: DataTypes.STRING(16), allowNull: false },
    slot_version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    request_id: { type: DataTypes.STRING(64), allowNull: false },
    request_hash: { type: DataTypes.CHAR(64), allowNull: false },
    payload: { type: DataTypes.TEXT('medium'), allowNull: false },
    bytes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    summary: { type: DataTypes.JSON, allowNull: false },
    created_at: { type: DataTypes.DATE(3), allowNull: false },
  }, {
    ...options,
    uniqueKeys: {
      uq_richman_save_request: { fields: ['owner_id', 'slot_key', 'request_id'] },
      uq_richman_save_version: { fields: ['owner_id', 'slot_key', 'slot_version'] },
    },
  });
  await qi.createTable('richman_save_slots', {
    owner_id: { ...owner, primaryKey: true },
    slot_key: { type: DataTypes.STRING(16), primaryKey: true, allowNull: false },
    slot_version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    current_revision_id: {
      type: DataTypes.CHAR(36), allowNull: false,
      references: { model: 'richman_save_revisions', key: 'id' }, onDelete: 'RESTRICT',
    },
  }, options);
}
