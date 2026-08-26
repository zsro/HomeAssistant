import { Sequelize } from 'sequelize';
import type { AppConfig } from '../config/env';

export function createSequelize(config: AppConfig): Sequelize {
  return new Sequelize(
    config.database.name,
    config.database.user,
    config.database.password,
    {
      host: config.database.host,
      port: config.database.port,
      dialect: 'mysql',
      timezone: '+00:00',
      logging: false,
      define: {
        charset: 'utf8mb4',
        collate: 'utf8mb4_bin',
      },
      pool: {
        max: 10,
        min: 0,
        acquire: 30_000,
        idle: 10_000,
      },
    },
  );
}
