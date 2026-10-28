import { createApp } from './app';
import { loadConfig } from './config/env';
import { initModels } from './database/models';
import { createSequelize } from './database/sequelize';
import { GameService } from './modules/richman/game-service';

async function main() {
  const config = loadConfig();
  const sequelize = createSequelize(config);
  const models = initModels(sequelize);

  const context = { config, sequelize, models };
  const gameHost = new GameService(context);
  try {
    await sequelize.authenticate();
    await gameHost.start();
  } catch (error) {
    await gameHost.stop();
    await sequelize.close();
    throw error;
  }
  const app = createApp({ ...context, gameHost });
  const server = app.listen(config.port, () => {
    console.log(`HomeAssistant backend listening on port ${config.port}`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => {
      void gameHost.stop().then(() => sequelize.close()).finally(() => process.exit(0));
    });
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
