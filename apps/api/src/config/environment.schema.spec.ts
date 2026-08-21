import { describe, expect, it } from 'vitest';
import { Environment, validateEnvironment } from './environment.schema.js';

describe('validateEnvironment', () => {
  it('applies safe local defaults', () => {
    const result = validateEnvironment({});
    expect(result.NODE_ENV).toBe(Environment.Development);
    expect(result.PORT).toBe(3001);
  });

  it('converts a valid environment port to a number', () => {
    const result = validateEnvironment({ PORT: '3001' });
    expect(result.PORT).toBe(3001);
  });

  it('rejects invalid ports', () => {
    expect(() => validateEnvironment({ PORT: '70000' })).toThrow('Environment validation failed');
  });

  it('parses boolean environment strings without truthiness coercion', () => {
    const result = validateEnvironment({
      AUTH_COOKIE_SECURE: 'false',
      AUTH_RESET_REVOKES_ALL_SESSIONS: 'false',
      MONGODB_ATLAS_SEARCH_ENABLED: 'false',
    });

    expect(result.AUTH_COOKIE_SECURE).toBe(false);
    expect(result.AUTH_RESET_REVOKES_ALL_SESSIONS).toBe(false);
    expect(result.MONGODB_ATLAS_SEARCH_ENABLED).toBe(false);
  });

  it('rejects non-boolean environment strings', () => {
    expect(() => validateEnvironment({ AUTH_COOKIE_SECURE: 'yes' })).toThrow(
      'Environment validation failed',
    );
  });
});
