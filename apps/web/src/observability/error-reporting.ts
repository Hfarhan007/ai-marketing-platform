export interface ErrorContext {
  boundary?: string;
  componentStack?: string;
}

export interface ErrorReporter {
  capture(error: unknown, context?: ErrorContext): void;
}

export const errorReporter: ErrorReporter = {
  capture(error, context) {
    if (import.meta.env.DEV) console.error('[error-reporting]', error, context);
  },
};
