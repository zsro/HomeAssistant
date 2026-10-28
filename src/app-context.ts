import type { Sequelize } from 'sequelize';
import type { AppConfig } from './config/env';
import type { Models } from './database/models';
import type { GameService } from './modules/richman/game-service';

export type AppContext = {
  config: AppConfig;
  sequelize: Sequelize;
  models: Models;
  gameHost?: GameService;
};
