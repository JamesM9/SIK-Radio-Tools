/**
 * Device event and diagnostics logger
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  source?: string;
}

const MAX_ENTRIES = 500;
const entries: LogEntry[] = [];

export function log(level: LogLevel, message: string, source?: string): void {
  const entry: LogEntry = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    level,
    message,
    source,
  };
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) {
    entries.shift();
  }
}

export function logInfo(msg: string, source?: string): void {
  log('info', msg, source);
}

export function logWarn(msg: string, source?: string): void {
  log('warn', msg, source);
}

export function logError(msg: string, source?: string): void {
  log('error', msg, source);
}

export function logDebug(msg: string, source?: string): void {
  log('debug', msg, source);
}

export function getEntries(): LogEntry[] {
  return [...entries];
}

export function clearLog(): void {
  entries.length = 0;
}

export function formatEntry(e: LogEntry): string {
  const time = new Date(e.timestamp).toISOString().slice(11, 23);
  const src = e.source ? ` [${e.source}]` : '';
  return `[${time}] ${e.level.toUpperCase()}${src} ${e.message}`;
}
