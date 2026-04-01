/** Numeric log levels from most to least verbose. */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

const LEVEL_LABELS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: "DEBUG",
  [LogLevel.INFO]: "INFO",
  [LogLevel.WARN]: "WARN",
  [LogLevel.ERROR]: "ERROR",
  [LogLevel.SILENT]: "",
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: "\x1b[90m",
  [LogLevel.INFO]: "\x1b[36m",
  [LogLevel.WARN]: "\x1b[33m",
  [LogLevel.ERROR]: "\x1b[31m",
  [LogLevel.SILENT]: "",
};

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

/**
 * Structured logger that writes to stderr with ANSI colour and
 * timestamp prefixes.
 */
class Logger {
  private level: LogLevel = LogLevel.INFO;

  /** Set the minimum log level. Messages below this are suppressed. */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (level < this.level) return;
    const color = LEVEL_COLORS[level];
    const label = LEVEL_LABELS[level];
    const timestamp = new Date().toISOString().slice(11, 19);
    const prefix = `${color}[${timestamp}] ${label}${RESET}`;
    console.error(prefix, message, ...args);
  }

  /** Log a debug-level message. */
  debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  /** Log an info-level message. */
  info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  /** Log a warning-level message. */
  warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  /** Log an error-level message. */
  error(message: string, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  /** Print a green checkmark success line. */
  success(message: string): void {
    console.error(`${BOLD}\x1b[32m✓${RESET} ${message}`);
  }

  /** Print a cyan arrow step indicator. */
  step(message: string): void {
    console.error(`${BOLD}\x1b[36m→${RESET} ${message}`);
  }

  /** Print a prominent banner with a horizontal rule. */
  banner(title: string): void {
    const line = "─".repeat(Math.max(title.length + 4, 40));
    console.error(`\n${BOLD}\x1b[36m${line}${RESET}`);
    console.error(`${BOLD}\x1b[36m  ${title}${RESET}`);
    console.error(`${BOLD}\x1b[36m${line}${RESET}\n`);
  }
}

/** Shared singleton logger instance. */
export const logger = new Logger();
