import path from 'node:path';
import { createRequire } from 'node:module';
import { SequelizeStorage, Umzug } from 'umzug';
import type { QueryInterface, Sequelize } from 'sequelize';

export type MigrationContext = {
  queryInterface: QueryInterface;
  allowLegacyReset: boolean;
};

type MigrationModule = {
  up: (params: { context: MigrationContext }) => Promise<void>;
  down?: (params: { context: MigrationContext }) => Promise<void>;
};

const loadMigration = createRequire(__filename);

export function createMigrator(sequelize: Sequelize, allowLegacyReset: boolean) {
  return new Umzug<MigrationContext>({
    migrations: {
      glob: path.join(__dirname, '../../database/migrations/*.{js,ts}'),
      resolve: ({ name, path: migrationPath, context }) => {
        if (!migrationPath) throw new Error(`Migration ${name} 缺少文件路径`);
        const migration = loadMigration(migrationPath) as MigrationModule;
        const down = migration.down;
        return {
          name: name.replace(/\.(?:js|ts)$/, ''),
          up: () => migration.up({ context }),
          ...(down ? { down: () => down({ context }) } : {}),
        };
      },
    },
    context: {
      queryInterface: sequelize.getQueryInterface(),
      allowLegacyReset,
    },
    storage: new SequelizeStorage({
      sequelize,
      tableName: 'ha_schema_migrations',
    }),
    logger: console,
  });
}
