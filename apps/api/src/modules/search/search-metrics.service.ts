import { Injectable } from '@nestjs/common';
@Injectable()
export class SearchMetrics {
  private readonly durations = new Map<string, { count: number; totalMs: number; slow: number }>();
  observe(entity: string, durationMs: number, slow: boolean) {
    const current = this.durations.get(entity) ?? { count: 0, totalMs: 0, slow: 0 };
    current.count += 1;
    current.totalMs += durationMs;
    if (slow) current.slow += 1;
    this.durations.set(entity, current);
  }
  snapshot() {
    return Object.fromEntries(
      [...this.durations].map(([entity, value]) => [
        entity,
        {
          count: value.count,
          averageMs: value.count ? value.totalMs / value.count : 0,
          slow: value.slow,
        },
      ]),
    );
  }
}
