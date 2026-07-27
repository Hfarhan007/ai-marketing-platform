export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface LogEntry { context?: Readonly<Record<string, unknown>>; level: LogLevel; message: string; timestamp: string }
export type LogSink = (entry: LogEntry) => void;

const sensitive = /authorization|cookie|password|secret|token/i;
function redact(context: Readonly<Record<string, unknown>> | undefined) {
  if (!context) return undefined;
  return Object.fromEntries(Object.entries(context).map(([key, value]) => [key, sensitive.test(key) ? '[REDACTED]' : value]));
}

export function createLogger(sink: LogSink, minimum: LogLevel = 'info') {
  const rank: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
  const write = (level: LogLevel, message: string, context?: Readonly<Record<string, unknown>>) => {
    if (rank[level] < rank[minimum]) return;
    const safeContext = redact(context);
    sink({ level, message, timestamp: new Date().toISOString(), ...(safeContext ? { context: safeContext } : {}) });
  };
  return {
    debug: (message: string, context?: Readonly<Record<string, unknown>>) => write('debug', message, context),
    error: (message: string, context?: Readonly<Record<string, unknown>>) => write('error', message, context),
    info: (message: string, context?: Readonly<Record<string, unknown>>) => write('info', message, context),
    warn: (message: string, context?: Readonly<Record<string, unknown>>) => write('warn', message, context),
  };
}
