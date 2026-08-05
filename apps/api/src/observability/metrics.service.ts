import { Injectable } from '@nestjs/common';

type Labels = Record<string, string | number | boolean>;
interface Metric { help: string; name: string; type: 'counter' | 'gauge'; values: Map<string, number> }

@Injectable()
export class MetricsService {
  private readonly metrics = new Map<string, Metric>();

  increment(name: string, help: string, labels: Labels = {}, amount = 1): void {
    const metric = this.metric(name, help, 'counter');
    const key = encodeLabels(labels);
    metric.values.set(key, (metric.values.get(key) ?? 0) + amount);
  }

  gauge(name: string, help: string, value: number, labels: Labels = {}): void {
    this.metric(name, help, 'gauge').values.set(encodeLabels(labels), value);
  }

  observeHttp(method: string, route: string, status: number, durationMs: number): void {
    const labels = { method, route: normalizeRoute(route), status: String(status) };
    this.increment('http_requests_total', 'HTTP requests completed', labels);
    this.increment('http_request_duration_ms_sum', 'Total HTTP request duration in milliseconds', labels, durationMs);
  }

  observeDependency(kind: 'mongodb' | 'redis' | 'queue' | 'ai' | 'integration', healthy: boolean, latencyMs: number): void {
    this.gauge('dependency_health', 'Dependency health (1 healthy, 0 unhealthy)', healthy ? 1 : 0, { kind });
    this.gauge('dependency_latency_ms', 'Latest dependency check latency', latencyMs, { kind });
  }

  renderPrometheus(): string {
    const lines: string[] = [];
    for (const metric of [...this.metrics.values()].sort((a, b) => a.name.localeCompare(b.name))) {
      lines.push(`# HELP ${metric.name} ${metric.help}`, `# TYPE ${metric.name} ${metric.type}`);
      for (const [labels, value] of metric.values) lines.push(`${metric.name}${labels} ${Number.isFinite(value) ? value : 0}`);
    }
    return `${lines.join('\n')}\n`;
  }

  private metric(name: string, help: string, type: Metric['type']): Metric {
    const safeName = name.replace(/[^a-zA-Z0-9_:]/g, '_');
    const current = this.metrics.get(safeName);
    if (current) return current;
    const created = { name: safeName, help, type, values: new Map<string, number>() };
    this.metrics.set(safeName, created);
    return created;
  }
}

function encodeLabels(labels: Labels): string {
  const entries = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
  if (!entries.length) return '';
  return `{${entries.map(([key, value]) => `${key.replace(/[^a-zA-Z0-9_]/g, '_')}="${String(value).replace(/[\\"\n]/g, '\\$&')}"`).join(',')}}`;
}

function normalizeRoute(value: string): string {
  return value.split('?')[0]?.replace(/\/[0-9a-f]{24}(?=\/|$)/gi, '/:id').replace(/\/[0-9a-f-]{36}(?=\/|$)/gi, '/:id') ?? '/';
}
