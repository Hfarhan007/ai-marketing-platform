import { describe, expect, it } from 'vitest';
import { Environment, validateEnvironment } from './environment.schema.js';

describe('validateEnvironment', () => {
  it('applies safe local defaults', () => {
    const result = validateEnvironment({});
    expect(result.NODE_ENV).toBe(Environment.Development);
    expect(result.PORT).toBe(3001);
  });

  it('rejects invalid ports', () => {
    expect(() => validateEnvironment({ PORT: '70000' })).toThrow('Environment validation failed');
  });
});
