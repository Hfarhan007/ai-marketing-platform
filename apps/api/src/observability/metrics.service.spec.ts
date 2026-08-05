import { describe, expect, it } from 'vitest';
import { MetricsService } from './metrics.service.js';

describe('MetricsService', () => {
  it('exports Prometheus metrics and normalizes identifiers in routes', () => {
    const metrics = new MetricsService();
    metrics.observeHttp('GET', '/workspaces/507f1f77bcf86cd799439011?secret=x', 200, 12);
    metrics.observeDependency('mongodb', true, 2);
    const output = metrics.renderPrometheus();
    expect(output).toContain('http_requests_total');
    expect(output).toContain('route="/workspaces/:id"');
    expect(output).not.toContain('secret=x');
    expect(output).toContain('dependency_health{kind="mongodb"} 1');
  });
});
