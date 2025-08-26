// __tests__/utils/logger.test.ts
import { Logger, LogLevel, logger } from "../../src/utils/logger";

describe("Logger", () => {
  let testLogger: Logger;
  let consoleDebugSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create a fresh logger instance for each test
    testLogger = new Logger(LogLevel.ERROR); // Start with ERROR to avoid debug logs

    // Spy on individual console methods with proper typing
    consoleDebugSpy = jest.spyOn(console, "debug").mockImplementation();
    consoleInfoSpy = jest.spyOn(console, "info").mockImplementation();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("should create logger with default level", () => {
    const defaultLogger = new Logger();
    expect(defaultLogger).toBeInstanceOf(Logger);
  });

  test("should set log level", () => {
    // Clear initial debug logs from constructor
    consoleDebugSpy.mockClear();

    testLogger.setLevel(LogLevel.ERROR);
    testLogger.debug("test debug");
    expect(consoleDebugSpy).not.toHaveBeenCalled();
  });

  test("should log debug messages when level is DEBUG", () => {
    testLogger.setLevel(LogLevel.DEBUG);
    testLogger.debug("debug message");
    expect(consoleDebugSpy).toHaveBeenCalledWith("[DEBUG] debug message");
  });

  test("should log info messages when level is INFO or higher", () => {
    testLogger.setLevel(LogLevel.INFO);
    testLogger.info("info message");
    expect(consoleInfoSpy).toHaveBeenCalledWith("[INFO] info message");
  });

  test("should log warn messages when level is WARN or higher", () => {
    testLogger.setLevel(LogLevel.WARN);
    testLogger.warn("warn message");
    expect(consoleWarnSpy).toHaveBeenCalledWith("[WARN] warn message");
  });

  test("should log error messages when level is ERROR or higher", () => {
    testLogger.setLevel(LogLevel.ERROR);
    testLogger.error("error message");
    expect(consoleErrorSpy).toHaveBeenCalledWith("[ERROR] error message");
  });

  test("should not log debug messages when level is below DEBUG", () => {
    testLogger.setLevel(LogLevel.INFO);
    testLogger.debug("debug message");
    expect(consoleDebugSpy).not.toHaveBeenCalled();
  });

  test("singleton instance should work", () => {
    // Test the singleton instance
    logger.info("test message");
    expect(consoleInfoSpy).toHaveBeenCalledWith("[INFO] test message");
  });
});
