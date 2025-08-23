import { jest } from "@jest/globals";

// Mock axios for all tests
jest.mock("axios", () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    isAxiosError: jest.fn(),
  },
  isAxiosError: jest.fn(),
}));

// Mock GitHub Actions core and github
jest.mock("@actions/core", () => ({
  getInput: jest.fn(),
  getBooleanInput: jest.fn(),
  setOutput: jest.fn(),
  setFailed: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  debug: jest.fn(),
  startGroup: jest.fn(),
  endGroup: jest.fn(),
}));

// Mock GitHub context properly - make it writable
const mockContext: {
  payload: {
    commits: any[];
    head_commit: any;
  };
} = {
  payload: {
    commits: [],
    head_commit: null,
  },
};

Object.defineProperty(mockContext, "payload", {
  value: mockContext.payload,
  writable: true,
});

jest.mock("@actions/github", () => ({
  __esModule: true,
  context: mockContext,
  getOctokit: jest.fn(),
}));

// Mock file system operations
jest.mock("fs", () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
  promises: {
    readFile: jest.fn(),
  },
}));

// Mock front-matter with proper implementation including all required properties
jest.mock("front-matter", () => {
  const mockImplementation = (content: string) => {
    // Simple front matter parser for tests
    const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontMatterRegex);

    let attributes: any = {};
    let body = content;
    let bodyBegin = 0;
    let frontmatter = "";

    if (match) {
      frontmatter = match[1];
      body = match[2];
      bodyBegin = match[0].indexOf(body);

      // Parse simple YAML-like attributes
      frontmatter.split("\n").forEach((line) => {
        const colonIndex = line.indexOf(":");
        if (colonIndex > 0) {
          const key = line.slice(0, colonIndex).trim();
          const value = line.slice(colonIndex + 1).trim();

          // Handle arrays (simple implementation)
          if (value.startsWith("[") && value.endsWith("]")) {
            attributes[key] = value
              .slice(1, -1)
              .split(",")
              .map((item: string) => item.trim());
          } else {
            attributes[key] = value;
          }
        }
      });
    }

    return {
      attributes,
      body,
      bodyBegin,
      frontmatter,
    };
  };

  return {
    __esModule: true,
    default: jest.fn(mockImplementation),
  };
});

// Set up global test timeout
jest.setTimeout(10000);
