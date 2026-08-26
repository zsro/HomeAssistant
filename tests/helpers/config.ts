import type { AppConfig } from '../../src/config/env';

export function testConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    nodeEnv: 'test',
    port: 3001,
    database: { host: '127.0.0.1', port: 3306, name: 'unused_test', user: 'unused', password: 'unused' },
    jwt: {
      accessSecret: 'test-secret-that-is-at-least-thirty-two-characters-long',
      issuer: 'home-assistant-test',
      audience: 'home-assistant-test-clients',
      accessExpiresInSeconds: 900,
      refreshExpiresInSeconds: 2_592_000,
    },
    corsOrigins: ['https://example.test'],
    logLevel: 'silent',
    allowLegacyReset: false,
    ...overrides,
  };
}
