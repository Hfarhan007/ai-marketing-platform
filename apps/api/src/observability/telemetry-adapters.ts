import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { redactSensitive } from '../security/sensitive-field-redactor.js';
import { MetricsService } from './metrics.service.js';

export interface TelemetrySpan { end(error?: unknown): void; setAttribute(name: string, value: string | number | boolean): void }

/** SDK-neutral seam; production can supply an OpenTelemetry SDK-backed factory. */
@Injectable()
export class OpenTelemetryAdapter {
  startSpan(name: string): TelemetrySpan {
    void name;
    const attributes = new Map<string, string | number | boolean>();
    return { end: () => undefined, setAttribute: (name, value) => { attributes.set(name, value); } };
  }
  createTraceParent(): string { return `00-${randomBytes(16).toString('hex')}-${randomBytes(8).toString('hex')}-01`; }
}

@Injectable()
export class PrometheusAdapter {
  constructor(private readonly metrics: MetricsService) {}
  scrape(): string { return this.metrics.renderPrometheus(); }
}

@Injectable()
export class GrafanaAdapter {
  dashboardDatasource(): { type: string; uid: string } { return { type: 'prometheus', uid: 'prometheus' }; }
}

export type ErrorTransport = (error: unknown, context: Record<string, unknown>) => void;
@Injectable()
export class SentryAdapter {
  private transport?: ErrorTransport;
  configure(transport: ErrorTransport): void { this.transport = transport; }
  captureException(error: unknown, context: Record<string, unknown>): void { this.transport?.(error, redactSensitive(context)); }
}
