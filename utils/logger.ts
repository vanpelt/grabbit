export type LogMethod = (...args: unknown[]) => void;

const ENV = process.env.EXPO_PUBLIC_ENV ?? process.env.NODE_ENV ?? 'development';
const shouldLog = ENV !== 'production';

function timestamp(): string {
  return new Date().toISOString();
}

function createLogger(method: LogMethod): LogMethod {
  return (...args: unknown[]) => {
    if (!shouldLog) return;
    method(`[${timestamp()}]`, ...args);
  };
}

export const logger = {
  log: createLogger(console.log),
  warn: createLogger(console.warn),
  error: createLogger(console.error),
};

export default logger;
