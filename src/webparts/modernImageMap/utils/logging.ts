import { ConsoleListener, Logger, LogLevel } from '@pnp/logging';

/** Log levels selectable in the property pane (stored as text in the web part properties). */
export type LogLevelName = 'verbose' | 'info' | 'warning' | 'error' | 'off';

export const LOG_LEVEL_NAMES: LogLevelName[] = ['verbose', 'info', 'warning', 'error', 'off'];
export const DEFAULT_LOG_LEVEL: LogLevelName = 'warning';

const LEVELS: { [K in LogLevelName]: LogLevel } = {
  verbose: LogLevel.Verbose,
  info: LogLevel.Info,
  warning: LogLevel.Warning,
  error: LogLevel.Error,
  off: LogLevel.Off
};

const PREFIX = '[ImageMap] ';
let subscribed = false;

/** Stored properties are untrusted: unknown values fall back to the default level. */
export function sanitizeLogLevel(value: unknown): LogLevelName {
  const index = LOG_LEVEL_NAMES.indexOf(value as LogLevelName);
  return index >= 0 ? LOG_LEVEL_NAMES[index] : DEFAULT_LOG_LEVEL;
}

/**
 * Writes the log to the browser console from the given level on.
 * The PnP logger is shared by all instances of the web part on a page: the level set last applies.
 */
export function configureLogging(level: LogLevelName): void {
  if (!subscribed) {
    Logger.subscribe(new ConsoleListener());
    subscribed = true;
  }
  Logger.activeLogLevel = LEVELS[level];
}

function write(level: LogLevel, message: string, data?: unknown): void {
  Logger.log({ level, message: PREFIX + message, data });
}

/** Details for troubleshooting, e.g. individual requests. */
export function logVerbose(message: string, data?: unknown): void {
  write(LogLevel.Verbose, message, data);
}

export function logInfo(message: string, data?: unknown): void {
  write(LogLevel.Info, message, data);
}

export function logWarning(message: string, data?: unknown): void {
  write(LogLevel.Warning, message, data);
}

/** Technical details belong here, not in the UI. */
export function logError(message: string, data?: unknown): void {
  write(LogLevel.Error, message, data);
}
