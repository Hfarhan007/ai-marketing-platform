export const DEFAULT_BODY_LIMIT_BYTES = 1_048_576;

export function trustedProxyConfiguration(value: string | undefined): boolean | string[] {
  if (!value || value.trim().toLowerCase() === 'false') return false;
  if (value.trim().toLowerCase() === 'true') return true;
  const entries = value.split(',').map((entry) => entry.trim()).filter(Boolean);
  if (entries.some((entry) => entry === '*' || entry === '0.0.0.0/0' || entry === '::/0')) {
    throw new Error('TRUST_PROXY must not trust every address');
  }
  return entries;
}

export function helmetConfiguration(production: boolean) {
  return {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    frameguard: { action: 'deny' as const },
    hsts: production ? { maxAge: 31_536_000, includeSubDomains: true, preload: true } : false,
    noSniff: true,
    referrerPolicy: { policy: 'no-referrer' as const },
  };
}

export function extractClientIp(request: { ip: string }): string {
  // Fastify computes `ip` using its configured trust-proxy boundary. Never parse
  // X-Forwarded-For independently, which would let an untrusted client spoof it.
  return request.ip;
}

export function strictCorsOrigin(allowedOrigins: readonly string[]) {
  const allowed = new Set(allowedOrigins.map((origin) => new URL(origin).origin));
  return (origin: string | undefined, callback: (error: Error | null, allow: boolean) => void): void => {
    if (origin === undefined) return callback(null, true);
    let normalized: string;
    try { normalized = new URL(origin).origin; } catch { return callback(new Error('Invalid Origin header'), false); }
    callback(allowed.has(normalized) ? null : new Error('Origin is not allowed'), allowed.has(normalized));
  };
}
