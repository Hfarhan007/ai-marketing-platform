/** Documentation aid only: CSP must ultimately be emitted as an HTTP header by the hosting layer. */
export const recommendedContentSecurityPolicy = {
  'base-uri': ["'self'"],
  'default-src': ["'self'"],
  'frame-ancestors': ["'none'"],
  'object-src': ["'none'"],
} as const;
