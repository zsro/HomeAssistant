import type { Sequelize } from 'sequelize';
import type { AppConfig } from './config/env';
import type { Models } from './database/models';

export type AppContext = {
  config: AppConfig;
  sequelize: Sequelize;
  models: Models;
};
