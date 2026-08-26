import { createApp } from './app';
import { loadConfig } from './config/env';
import { initModels } from './database/models';
import { createSequelize } from './database/sequelize';

async function main() {
  const config = loadConfig();
  const sequelize = createSequelize(config);
  const models = initModels(sequelize);

  await sequelize.authenticate();
  const app = createApp({ config, sequelize, models });
  const server = app.listen(config.port, () => {
    console.log(`HomeAssistant backend listening on port ${config.port}`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => {
      void sequelize.close().finally(() => process.exit(0));
    });
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
