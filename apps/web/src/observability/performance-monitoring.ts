export interface PerformanceMonitor {
  measure(name: string, durationMs: number): void;
}

export const performanceMonitor: PerformanceMonitor = {
  measure(name, durationMs) {
    if (import.meta.env.DEV) console.info('[performance]', { durationMs, name });
  },
};
