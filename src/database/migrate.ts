import { loadConfig } from '../config/env';
import { createMigrator } from './migrator';
import { createSequelize } from './sequelize';

async function main() {
  const config = loadConfig();
  const sequelize = createSequelize(config);

  try {
    await sequelize.authenticate();
    const migrator = createMigrator(sequelize, config.allowLegacyReset);
    const migrations = await migrator.up();
    console.log(`数据库迁移完成，共执行 ${migrations.length} 个 migration`);
  } finally {
    await sequelize.close();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
