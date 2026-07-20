import { createLogger } from './logger';
import { redactPii } from './pii';
import type { LogFields, LogLevel, Logger } from './logger';

/** Logger that redacts PII/secrets from field payloads. */
export function createSafeLogger(
  name: string,
  level: LogLevel = 'info',
  baseFields: LogFields = {},
): Logger {
  const inner = createLogger(name, level, baseFields);
  const wrap =
    (fn: (message: string, fields?: LogFields) => void) =>
    (message: string, fields?: LogFields) => {
      fn(message, fields ? redactPii(fields as Record<string, unknown>) : undefined);
    };
  return {
    child(fields: LogFields) {
      return createSafeLogger(name, level, {
        ...baseFields,
        ...redactPii(fields as Record<string, unknown>),
      });
    },
    fatal: wrap(inner.fatal.bind(inner)),
    error: wrap(inner.error.bind(inner)),
    warn: wrap(inner.warn.bind(inner)),
    info: wrap(inner.info.bind(inner)),
    debug: wrap(inner.debug.bind(inner)),
    trace: wrap(inner.trace.bind(inner)),
  };
}
