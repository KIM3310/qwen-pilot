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

class Logger {
  private level: LogLevel = LogLevel.INFO;

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

  debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  success(message: string): void {
    console.error(`${BOLD}\x1b[32m✓${RESET} ${message}`);
  }

  step(message: string): void {
    console.error(`${BOLD}\x1b[36m→${RESET} ${message}`);
  }

  banner(title: string): void {
    const line = "─".repeat(Math.max(title.length + 4, 40));
    console.error(`\n${BOLD}\x1b[36m${line}${RESET}`);
    console.error(`${BOLD}\x1b[36m  ${title}${RESET}`);
    console.error(`${BOLD}\x1b[36m${line}${RESET}\n`);
  }
}

export const logger = new Logger();
