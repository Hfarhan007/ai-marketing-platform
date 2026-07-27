export interface Logger {
  debug(message: string, context?: Readonly<Record<string, unknown>>): void;
  error(message: string, context?: Readonly<Record<string, unknown>>): void;
  info(message: string, context?: Readonly<Record<string, unknown>>): void;
  warn(message: string, context?: Readonly<Record<string, unknown>>): void;
}

const noop = () => undefined;

export const developmentLogger: Logger = import.meta.env.DEV
  ? {
      debug: (message, context) => console.debug(message, context),
      error: (message, context) => console.error(message, context),
      info: (message, context) => console.info(message, context),
      warn: (message, context) => console.warn(message, context),
    }
  : { debug: noop, error: noop, info: noop, warn: noop };
