global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// Mock environment variables
process.env.GITHUB_TOKEN = "test-github-token";
process.env.DEBUGGING_ENABLED = "false";

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "log").mockImplementation();
  jest.spyOn(console, "info").mockImplementation();
  jest.spyOn(console, "warn").mockImplementation();
  jest.spyOn(console, "error").mockImplementation();
  jest.spyOn(console, "debug").mockImplementation();
});

afterAll(() => {
  jest.restoreAllMocks();
});
