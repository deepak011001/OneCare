import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loadEnv } from './env';

describe('loadEnv auth guards', () => {
  const base = {
    DATABASE_URL: 'postgresql://onecare:onecare@localhost:5432/onecare',
    REDIS_URL: 'redis://localhost:6379',
    MCP_GATEWAY_AUTH_TOKEN: 'token-token-token',
    SESSION_SECRET: 'change-me-to-a-long-random-string-32c',
  };

  it('allows development auth outside production', () => {
    const env = loadEnv({
      ...base,
      NODE_ENV: 'development',
      AUTH_MODE: 'development',
    });
    assert.equal(env.AUTH_MODE, 'development');
  });

  it('rejects development auth in production', () => {
    assert.throws(() =>
      loadEnv({
        ...base,
        NODE_ENV: 'production',
        AUTH_MODE: 'development',
      }),
    );
  });
});
