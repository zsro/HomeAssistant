import pino from 'pino';
import type { AppConfig } from '../config/env';

export function createLogger(config: AppConfig) {
  return pino({
    level: config.logLevel,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.body.password',
        'req.body.oldPassword',
        'req.body.newPassword',
        'req.body.refreshToken',
        'password',
        'refreshToken',
        'accessToken',
      ],
      censor: '[REDACTED]',
    },
  });
}
