import { describe, expect, it, vi } from 'vitest';
import { safeIdentifier, validTraceParent } from '../common/middleware/correlation-id.middleware.js';
import { MetricsService } from '../observability/metrics.service.js';
import { SecurityEventService } from './security-event.service.js';
import { extractClientIp, helmetConfiguration, strictCorsOrigin, trustedProxyConfiguration } from './http-security.config.js';
import { REDACTED, redactSensitive } from './sensitive-field-redactor.js';

describe('backend security controls', () => {
  it('rejects spoofable proxy configurations and trusts Fastify IP extraction', () => {
    expect(() => trustedProxyConfiguration('0.0.0.0/0')).toThrow();
    expect(trustedProxyConfiguration('127.0.0.1,10.0.0.0/8')).toEqual(['127.0.0.1', '10.0.0.0/8']);
    expect(extractClientIp({ ip: '203.0.113.4' })).toBe('203.0.113.4');
  });

  it('uses exact CORS origins', () => {
    const callback = vi.fn();
    const policy = strictCorsOrigin(['https://app.example.com']);
    policy('https://app.example.com.evil.test', callback);
    expect(callback).toHaveBeenCalledWith(expect.any(Error), false);
  });

  it('enables production transport security headers', () => {
    expect(helmetConfiguration(true).hsts).toMatchObject({ preload: true });
    expect(helmetConfiguration(true).contentSecurityPolicy.directives.frameAncestors).toEqual(["'none'"]);
  });

  it('rejects malicious request and trace identifiers', () => {
    expect(safeIdentifier('ok-id:2')).toBe('ok-id:2');
    expect(safeIdentifier('bad\r\nid')).toBeUndefined();
    expect(validTraceParent('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01')).toBeTruthy();
    expect(validTraceParent('00-00000000000000000000000000000000-0000000000000000-01')).toBeUndefined();
  });

  it('redacts nested credentials and secret-looking values', () => {
    expect(redactSensitive({ nested: { password: 'hello' }, message: 'Bearer abc.def' })).toEqual({ nested: { password: REDACTED }, message: REDACTED });
  });

  it('detects repeated suspicious authentication activity', () => {
    const logger = { setContext: vi.fn(), warn: vi.fn() };
    const service = new SecurityEventService(logger as never, new MetricsService());
    for (let attempt = 0; attempt < 4; attempt += 1) expect(service.recordFailure('ip:1', attempt)).toBe(false);
    expect(service.recordFailure('ip:1', 4)).toBe(true);
    expect(logger.warn).toHaveBeenCalled();
  });
});
