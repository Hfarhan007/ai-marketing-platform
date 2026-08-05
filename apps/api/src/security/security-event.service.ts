import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { MetricsService } from '../observability/metrics.service.js';
import { redactSensitive } from './sensitive-field-redactor.js';

export type SecurityEventType = 'auth_failure' | 'invalid_signature' | 'rate_limit' | 'replay' | 'suspicious_input' | 'ssrf_blocked';

@Injectable()
export class SecurityEventService {
  private readonly failures = new Map<string, { count: number; since: number }>();
  constructor(private readonly logger: PinoLogger, private readonly metrics: MetricsService) { logger.setContext(SecurityEventService.name); }

  record(type: SecurityEventType, severity: 'low' | 'medium' | 'high', metadata: Record<string, unknown> = {}): void {
    this.metrics.increment('security_events_total', 'Security events detected', { type, severity });
    this.logger.warn({ securityEvent: type, severity, metadata: redactSensitive(metadata) }, 'Security event');
  }

  recordFailure(key: string, now = Date.now()): boolean {
    const current = this.failures.get(key);
    const state = !current || now - current.since > 300_000 ? { count: 1, since: now } : { ...current, count: current.count + 1 };
    this.failures.set(key, state);
    const suspicious = state.count >= 5;
    if (suspicious) this.record('auth_failure', 'high', { key, attempts: state.count });
    return suspicious;
  }
}
