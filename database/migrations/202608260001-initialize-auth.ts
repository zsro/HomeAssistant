import { DataTypes, type QueryInterface } from 'sequelize';
import type { MigrationContext } from '../../src/database/migrator';

function normalizeTableName(entry: unknown): string {
  if (typeof entry === 'string') return entry;
  if (entry && typeof entry === 'object') {
    const record = entry as Record<string, unknown>;
    const value = record.tableName ?? record.TABLE_NAME ?? Object.values(record)[0];
    if (typeof value === 'string') return value;
  }
  return '';
}

async function dropLegacyTables(queryInterface: QueryInterface, tables: string[]) {
  await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  try {
    for (const table of tables) {
      await queryInterface.dropTable(table);
    }
  } finally {
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  }
}

export async function up({ context }: { context: MigrationContext }) {
  const { queryInterface, allowLegacyReset } = context;
  const tables = (await queryInterface.showAllTables())
    .map(normalizeTableName)
    .filter((table) => table && table !== 'ha_schema_migrations');

  if (tables.length > 0 && !allowLegacyReset) {
    throw new Error(
      `检测到现有业务表 (${tables.join(', ')})。首次重建必须先备份数据库并设置 ALLOW_LEGACY_RESET=1。`,
    );
  }

  if (tables.length > 0) {
    await dropLegacyTables(queryInterface, tables);
  }

  await queryInterface.createTable(
    'users',
    {
      id: { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
      username: { type: DataTypes.STRING(32), allowNull: false },
      password_hash: { type: DataTypes.STRING(255), allowNull: false },
      display_name: { type: DataTypes.STRING(64), allowNull: false },
      invite_code: { type: DataTypes.CHAR(10), allowNull: false },
      invited_by_user_id: {
        type: DataTypes.CHAR(36),
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      status: { type: DataTypes.ENUM('active', 'disabled'), allowNull: false, defaultValue: 'active' },
      auth_version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      last_login_at: { type: DataTypes.DATE(3), allowNull: true },
      created_at: { type: DataTypes.DATE(3), allowNull: false },
      updated_at: { type: DataTypes.DATE(3), allowNull: false },
    },
    { engine: 'InnoDB', charset: 'utf8mb4', collate: 'utf8mb4_bin' },
  );

  await queryInterface.addIndex('users', ['username'], { unique: true, name: 'uq_users_username' });
  await queryInterface.addIndex('users', ['invite_code'], { unique: true, name: 'uq_users_invite_code' });
  await queryInterface.addIndex('users', ['invited_by_user_id'], { name: 'idx_users_invited_by' });
  await queryInterface.addIndex('users', ['status'], { name: 'idx_users_status' });
  await queryInterface.addIndex('users', ['created_at'], { name: 'idx_users_created_at' });

  await queryInterface.createTable(
    'auth_refresh_sessions',
    {
      id: { type: DataTypes.CHAR(36), allowNull: false, primaryKey: true },
      user_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      token_hash: { type: DataTypes.CHAR(64), allowNull: false },
      expires_at: { type: DataTypes.DATE(3), allowNull: false },
      revoked_at: { type: DataTypes.DATE(3), allowNull: true },
      last_used_at: { type: DataTypes.DATE(3), allowNull: true },
      replaced_by_session_id: { type: DataTypes.CHAR(36), allowNull: true },
      created_ip: { type: DataTypes.STRING(45), allowNull: true },
      user_agent: { type: DataTypes.STRING(512), allowNull: true },
      created_at: { type: DataTypes.DATE(3), allowNull: false },
    },
    { engine: 'InnoDB', charset: 'utf8mb4', collate: 'utf8mb4_bin' },
  );

  await queryInterface.addConstraint('auth_refresh_sessions', {
    fields: ['replaced_by_session_id'],
    type: 'foreign key',
    name: 'fk_auth_refresh_sessions_replacement',
    references: { table: 'auth_refresh_sessions', field: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  });
  await queryInterface.addIndex('auth_refresh_sessions', ['token_hash'], { unique: true, name: 'uq_auth_refresh_sessions_token_hash' });
  await queryInterface.addIndex('auth_refresh_sessions', ['user_id'], { name: 'idx_auth_refresh_sessions_user' });
  await queryInterface.addIndex('auth_refresh_sessions', ['expires_at'], { name: 'idx_auth_refresh_sessions_expires_at' });
  await queryInterface.addIndex('auth_refresh_sessions', ['revoked_at'], { name: 'idx_auth_refresh_sessions_revoked_at' });
}

export async function down({ context }: { context: MigrationContext }) {
  await context.queryInterface.dropTable('auth_refresh_sessions');
  await context.queryInterface.dropTable('users');
}
