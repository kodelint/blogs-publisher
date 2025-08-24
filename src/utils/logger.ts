export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
    this.debug(`Logger initialized with level: ${LogLevel[level]}`);
  }

  setLevel(level: LogLevel): void {
    this.debug(
      `Changing log level from ${LogLevel[this.level]} to ${LogLevel[level]}`,
    );
    this.level = level;
  }

  error(message: string, ...meta: any[]): void {
    if (this.level >= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, ...meta);
    }
  }

  warn(message: string, ...meta: any[]): void {
    if (this.level >= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...meta);
    }
  }

  info(message: string, ...meta: any[]): void {
    if (this.level >= LogLevel.INFO) {
      console.info(`[INFO] ${message}`, ...meta);
    }
  }

  debug(message: string, ...meta: any[]): void {
    if (this.level >= LogLevel.DEBUG) {
      console.debug(`[DEBUG] ${message}`, ...meta);
    }
  }
}

// Singleton instance
export const logger = new Logger();

// Initialize based on environment variable
if (process.env.DEBUGGING_ENABLED === "true") {
  logger.info(
    "Debug logging enabled via DEBUGGING_ENABLED environment variable",
  );
  logger.setLevel(LogLevel.DEBUG);
} else {
  logger.debug("Debug logging not enabled via environment variable");
}
