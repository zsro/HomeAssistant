import { loadConfig } from '../config/env';
import { createMigrator } from './migrator';
import { createSequelize } from './sequelize';

async function main() {
  const config = loadConfig();
  const sequelize = createSequelize(config);

  try {
    await sequelize.authenticate();
    const migrator = createMigrator(sequelize, config.allowLegacyReset);
    const [executed, pending] = await Promise.all([migrator.executed(), migrator.pending()]);
    console.log(JSON.stringify({ executed: executed.map(({ name }) => name), pending: pending.map(({ name }) => name) }, null, 2));
  } finally {
    await sequelize.close();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
