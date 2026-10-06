import { describe, expect, it } from 'vitest';
import { parseEnv } from '../../src/config/env.js';

const valid = {
  MONGODB_URI: 'mongodb://localhost:27017/bookstore',
  REDIS_URL: 'redis://localhost:6379',
  CORS_ORIGINS: 'http://localhost:5173, http://localhost:5174 ,',
};

describe('parseEnv', () => {
  it('applies defaults and splits CORS_ORIGINS into a trimmed list', () => {
    expect(parseEnv(valid)).toEqual({
      NODE_ENV: 'development',
      API_PORT: 4000,
      MONGODB_URI: 'mongodb://localhost:27017/bookstore',
      REDIS_URL: 'redis://localhost:6379',
      CORS_ORIGINS: ['http://localhost:5173', 'http://localhost:5174'],
      LOG_LEVEL: 'info',
    });
  });

  it('coerces API_PORT and accepts mongodb+srv and rediss URLs', () => {
    const env = parseEnv({
      ...valid,
      NODE_ENV: 'production',
      API_PORT: '8080',
      MONGODB_URI: 'mongodb+srv://user:pass@cluster.example.net/bookstore',
      REDIS_URL: 'rediss://cache.example.net:6380',
      LOG_LEVEL: 'warn',
    });

    expect(env).toMatchObject({ NODE_ENV: 'production', API_PORT: 8080, LOG_LEVEL: 'warn' });
  });

  it('returns a frozen object', () => {
    expect(Object.isFrozen(parseEnv(valid))).toBe(true);
  });

  it('names every missing required variable', () => {
    expect(() => parseEnv({})).toThrowError(
      /MONGODB_URI: Required[\s\S]*REDIS_URL: Required[\s\S]*CORS_ORIGINS: Required/,
    );
  });

  it('throws an EnvValidationError that points to .env.example', () => {
    try {
      parseEnv({});
      expect.unreachable();
    } catch (error) {
      expect(error.name).toBe('EnvValidationError');
      expect(error.message).toContain('apps/api/.env.example');
    }
  });

  it.each([
    ['MONGODB_URI', 'postgres://localhost/db', /MONGODB_URI: Must start with mongodb/],
    ['REDIS_URL', 'localhost:6379', /REDIS_URL: Must start with redis/],
    ['CORS_ORIGINS', 'http://ok.test,not-a-url', /CORS_ORIGINS\.1: Must be a comma-separated/],
    ['CORS_ORIGINS', ' , ', /CORS_ORIGINS: Required/],
    ['API_PORT', 'abc', /API_PORT:/],
    ['API_PORT', '70000', /API_PORT:/],
    ['NODE_ENV', 'staging', /NODE_ENV:/],
    ['LOG_LEVEL', 'verbose', /LOG_LEVEL:/],
  ])('rejects an invalid %s (%s)', (key, value, message) => {
    expect(() => parseEnv({ ...valid, [key]: value })).toThrowError(message);
  });
});
