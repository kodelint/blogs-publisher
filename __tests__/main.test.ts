// main.test.ts
import * as core from "@actions/core";
import * as github from "@actions/github";
import { run } from "../src/main";
import { BlogsPublisher } from "../src/publisher";

// Mock the dependencies
jest.mock("@actions/core");
jest.mock("@actions/github");
jest.mock("../src/publisher");

describe("main", () => {
  const mockGetInput = core.getInput as jest.MockedFunction<
    typeof core.getInput
  >;
  const mockGetBooleanInput = core.getBooleanInput as jest.MockedFunction<
    typeof core.getBooleanInput
  >;
  const mockSetFailed = core.setFailed as jest.MockedFunction<
    typeof core.setFailed
  >;
  const mockSetOutput = core.setOutput as jest.MockedFunction<
    typeof core.setOutput
  >;
  const mockInfo = core.info as jest.MockedFunction<typeof core.info>;

  // Mock the BlogsPublisher methods
  const mockGetChangedFiles = jest.fn();
  const mockPublishBlogs = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    mockGetInput.mockImplementation((name: string) => {
      switch (name) {
        case "medium-token":
          return "medium-token";
        case "devto-token":
          return "devto-token";
        case "hashnode-token":
          return "hashnode-token";
        case "hashnode-publication-id":
          return "pub-id";
        case "medium-path":
          return "posts/medium";
        case "devto-path":
          return "posts/devto";
        case "hashnode-path":
          return "posts/hashnode";
        case "posts-directory":
          return ".";
        default:
          return "";
      }
    });

    mockGetBooleanInput.mockImplementation((name: string) => {
      switch (name) {
        case "use-commit-message":
          return false;
        case "dry-run":
          return false;
        default:
          return false;
      }
    });

    // Mock BlogsPublisher constructor
    (BlogsPublisher as jest.Mock).mockImplementation(() => ({
      getChangedFiles: mockGetChangedFiles,
      publishBlogs: mockPublishBlogs,
    }));

    // Default mock implementations
    mockGetChangedFiles.mockResolvedValue([]);
    mockPublishBlogs.mockResolvedValue({
      published: [],
      failed: [],
    });
  });

  it("should handle errors and call setFailed", async () => {
    // Force an error by making getInput throw
    mockGetInput.mockImplementation(() => {
      throw new Error("Test error");
    });

    await run();

    expect(mockSetFailed).toHaveBeenCalledWith("Test error");
  });

  it("should handle GitHub context without commits", async () => {
    // Mock empty GitHub context
    Object.defineProperty(github, "context", {
      value: {
        payload: {},
      },
      writable: true,
    });

    await run();

    // Should complete without errors
    expect(mockSetFailed).not.toHaveBeenCalled();
    expect(mockInfo).toHaveBeenCalledWith("Found 0 changed files");
  });

  it("should handle successful execution", async () => {
    // Mock GitHub context with commits
    Object.defineProperty(github, "context", {
      value: {
        payload: {
          commits: [
            {
              added: ["posts/medium/test.md"],
              modified: [],
            },
          ],
        },
      },
      writable: true,
    });

    // Mock successful execution
    mockGetChangedFiles.mockResolvedValue(["posts/medium/test.md"]);
    mockPublishBlogs.mockResolvedValue({
      published: [
        {
          platform: "medium",
          file: "test.md",
          success: true,
          url: "https://example.com",
        },
      ],
      failed: [],
    });

    await run();

    expect(mockInfo).toHaveBeenCalled();
    expect(mockSetFailed).not.toHaveBeenCalled();
  });
  it("should handle publisher errors", async () => {
    // Mock GitHub context with commits
    Object.defineProperty(github, "context", {
      value: {
        payload: {
          commits: [
            {
              added: ["posts/medium/test.md"],
              modified: [],
            },
          ],
        },
      },
      writable: true,
    });

    // Mock publisher to throw error
    mockGetChangedFiles.mockRejectedValueOnce(new Error("Publisher error"));

    await run();

    expect(mockSetFailed).toHaveBeenCalledWith("Publisher error");
  });

  it("should handle empty config values", async () => {
    // Mock empty config values
    mockGetInput.mockImplementation((name: string) => {
      return ""; // Empty for all inputs
    });

    mockGetBooleanInput.mockImplementation((name: string) => {
      return false; // Default false for all boolean inputs
    });

    await run();

    // Should complete without errors
    expect(mockSetFailed).not.toHaveBeenCalled();
  });
});
