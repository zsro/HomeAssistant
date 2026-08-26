import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import type { AppContext } from './app-context';
import { createMigrator } from './database/migrator';
import { createLogger } from './lib/logger';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { createAuthRouter } from './modules/auth/auth-routes';
import { createUserRouter } from './modules/users/user-routes';
import { openapiDocument } from './openapi';

export function createApp(context: AppContext) {
  const app = express();
  const logger = createLogger(context.config);

  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(pinoHttp({ logger }));
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || context.config.corsOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
  }));
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok', message: 'Server is running' });
  });
  app.get('/api/ready', async (_request, response) => {
    try {
      await context.sequelize.authenticate();
      const pending = await createMigrator(context.sequelize, false).pending();
      if (pending.length > 0) throw new Error('pending migrations');
      response.json({ status: 'ready' });
    } catch {
      response.status(503).json({ status: 'not_ready' });
    }
  });

  app.get('/api/openapi.json', (_request, response) => response.json(openapiDocument));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));
  app.use('/api/v1/auth', createAuthRouter(context));
  app.use('/api/v1/users', createUserRouter(context));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
