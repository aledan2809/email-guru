/**
 * Logger utility for controlled logging based on environment
 * Reduces noise in production while maintaining debug capability
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Determines if logging is enabled for the given level
 */
function isLogEnabled(level: LogLevel): boolean {
  const isDev = process.env.NODE_ENV === 'development';
  const isDebugEnabled = process.env.DEBUG === 'true' || process.env.DEBUG === '1';

  switch (level) {
    case 'debug':
      return isDev || isDebugEnabled;
    case 'info':
      return isDev || isDebugEnabled;
    case 'warn':
      return true; // Always show warnings
    case 'error':
      return true; // Always show errors
    default:
      return false;
  }
}

/**
 * Format log message with timestamp and level
 */
function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
}

/**
 * Debug-level logging (development only unless DEBUG=true)
 */
export function logDebug(message: string, ...args: any[]): void {
  if (isLogEnabled('debug')) {
    console.log(formatMessage('debug', message), ...args);
  }
}

/**
 * Info-level logging (development only unless DEBUG=true)
 */
export function logInfo(message: string, ...args: any[]): void {
  if (isLogEnabled('info')) {
    console.log(formatMessage('info', message), ...args);
  }
}

/**
 * Warning-level logging (always shown)
 */
export function logWarn(message: string, ...args: any[]): void {
  if (isLogEnabled('warn')) {
    console.warn(formatMessage('warn', message), ...args);
  }
}

/**
 * Error-level logging (always shown)
 */
export function logError(message: string, ...args: any[]): void {
  if (isLogEnabled('error')) {
    console.error(formatMessage('error', message), ...args);
  }
}

/**
 * Legacy compatibility - maps to appropriate log level
 * @deprecated Use logDebug, logInfo, logWarn, logError instead
 */
export const logger = {
  debug: logDebug,
  info: logInfo,
  warn: logWarn,
  error: logError,
  log: logInfo, // console.log equivalent
};

export default logger;