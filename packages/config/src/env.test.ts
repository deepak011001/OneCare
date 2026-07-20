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

  it('rejects placeholder MCP token in production', () => {
    assert.throws(() =>
      loadEnv({
        ...base,
        NODE_ENV: 'production',
        AUTH_MODE: 'entra',
        ENTRA_TENANT_ID: 't',
        ENTRA_CLIENT_ID: 'c',
        ENTRA_CLIENT_SECRET: 's',
        ENTRA_REDIRECT_URI: 'https://api.example/v1/auth/callback',
        MCP_GATEWAY_AUTH_TOKEN: 'change-me-local-only',
      }),
    );
  });

  it('defaults conversation store to memory', () => {
    const env = loadEnv({
      ...base,
      NODE_ENV: 'development',
      AUTH_MODE: 'development',
    });
    assert.equal(env.CONVERSATION_STORE, 'memory');
  });
});
