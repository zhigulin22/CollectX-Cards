import { FastifyBaseLogger } from 'fastify';

/**
 * Global logger instance
 * Инициализируется при старте сервера
 */
let globalLogger: FastifyBaseLogger | null = null;

/**
 * Установить глобальный логгер
 */
export function setLogger(logger: FastifyBaseLogger): void {
  globalLogger = logger;
}

/**
 * Получить логгер для использования в сервисах
 * Если глобальный логгер не установлен, использует console
 */
export function getLogger(): FastifyBaseLogger {
  if (globalLogger) {
    return globalLogger;
  }

  // Fallback к console если логгер ещё не инициализирован
  return {
    info: console.info.bind(console),
    error: console.error.bind(console),
    warn: console.warn.bind(console),
    debug: console.debug.bind(console),
    fatal: console.error.bind(console),
    trace: console.trace.bind(console),
    child: () => getLogger(),
    silent: () => {},
    level: 'info',
  } as unknown as FastifyBaseLogger;
}

/**
 * Создать логгер с префиксом для сервиса
 */
export function createServiceLogger(serviceName: string) {
  const logger = getLogger();

  return {
    info: (msg: string, data?: object) => {
      logger.info({ service: serviceName, ...data }, msg);
    },
    error: (msg: string, error?: unknown, data?: object) => {
      logger.error({ service: serviceName, err: error, ...data }, msg);
    },
    warn: (msg: string, data?: object) => {
      logger.warn({ service: serviceName, ...data }, msg);
    },
    debug: (msg: string, data?: object) => {
      logger.debug({ service: serviceName, ...data }, msg);
    },
  };
}

