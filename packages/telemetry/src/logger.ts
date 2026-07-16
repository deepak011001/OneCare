export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface LogFields {
  readonly correlationId?: string;
  readonly tenantId?: string;
  readonly userId?: string;
  readonly [key: string]: unknown;
}

export interface Logger {
  child(fields: LogFields): Logger;
  fatal(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  debug(message: string, fields?: LogFields): void;
  trace(message: string, fields?: LogFields): void;
}

const levelOrder: Record<LogLevel, number> = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10,
};

export function createLogger(
  name: string,
  level: LogLevel = 'info',
  baseFields: LogFields = {},
): Logger {
  const write = (entryLevel: LogLevel, message: string, fields?: LogFields) => {
    if (levelOrder[entryLevel] < levelOrder[level]) {
      return;
    }
    const payload = {
      level: entryLevel,
      name,
      message,
      time: new Date().toISOString(),
      ...baseFields,
      ...fields,
    };
    const line = JSON.stringify(payload);
    if (entryLevel === 'error' || entryLevel === 'fatal') {
      console.error(line);
      return;
    }
    if (entryLevel === 'warn') {
      console.warn(line);
      return;
    }
    // Structured stdout for info/debug/trace in foundation milestone
    // eslint-disable-next-line no-console -- intentional structured logger sink
    console.log(line);
  };

  return {
    child(fields: LogFields) {
      return createLogger(name, level, { ...baseFields, ...fields });
    },
    fatal: (message, fields) => write('fatal', message, fields),
    error: (message, fields) => write('error', message, fields),
    warn: (message, fields) => write('warn', message, fields),
    info: (message, fields) => write('info', message, fields),
    debug: (message, fields) => write('debug', message, fields),
    trace: (message, fields) => write('trace', message, fields),
  };
}
