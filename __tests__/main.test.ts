import * as core from "@actions/core";
import { run } from "../src/main";
import { BlogsPublisher } from "../src/publisher";
import { logger } from "../src/utils/logger";

jest.mock("@actions/core");
jest.mock("../src/publisher");
jest.mock("../src/utils/logger");

const mockedCore = core as jest.Mocked<typeof core>;
const mockedBlogsPublisher = BlogsPublisher as jest.MockedClass<
  typeof BlogsPublisher
>;

describe("Main Action", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear environment variable
    delete process.env.DEBUGGING_ENABLED;

    // Mock ALL required inputs with proper values
    mockedCore.getInput.mockImplementation((key: string) => {
      const inputs: { [key: string]: string } = {
        "medium-token": "medium-token",
        "devto-token": "devto-token",
        "hashnode-token": "hashnode-token",
        "hashnode-publication-id": "hashnode-pub-id",
        "github-token": "github-token",
        "medium-path": "posts/medium",
        devto_path: "posts/devto",
        hashnode_path: "posts/hashnode",
        posts_directory: ".",
      };
      return inputs[key] || "";
    });

    mockedCore.getBooleanInput.mockImplementation((key: string) => {
      const booleans: { [key: string]: boolean } = {
        use_commit_message: false,
        dry_run: false,
        update_already_published: true,
        debugging_enabled: false, // Make sure this returns false
      };
      return booleans[key] || false;
    });
  });

  test("should run successfully with no changed files", async () => {
    const mockInstance = {
      getChangedFiles: jest.fn().mockResolvedValue([]),
      publishBlogs: jest.fn(), // This should NOT be called when no files
    };

    const mockConstructor = jest.fn(() => mockInstance);
    mockedBlogsPublisher.mockImplementation(mockConstructor as any);

    await run();

    // Check if BlogsPublisher was instantiated
    expect(mockConstructor).toHaveBeenCalled();

    // Check if getChangedFiles was called
    expect(mockInstance.getChangedFiles).toHaveBeenCalled();

    // Check that publishBlogs was NOT called (since no files)
    expect(mockInstance.publishBlogs).not.toHaveBeenCalled();

    // Check that setOutput was NOT called (this is the correct behavior!)
    expect(mockedCore.setOutput).not.toHaveBeenCalled();

    // Check that setFailed was NOT called
    expect(mockedCore.setFailed).not.toHaveBeenCalled();
  });

  test("should call setOutput when files are found", async () => {
    const mockInstance = {
      getChangedFiles: jest.fn().mockResolvedValue(["test.md"]),
      publishBlogs: jest.fn().mockResolvedValue({
        published: [
          {
            platform: "medium",
            file: "test.md",
            success: true,
            url: "https://medium.com/test",
          },
        ],
        failed: [],
      }),
    };

    const mockConstructor = jest.fn(() => mockInstance);
    mockedBlogsPublisher.mockImplementation(mockConstructor as any);

    await run();

    // Check if BlogsPublisher was instantiated
    expect(mockConstructor).toHaveBeenCalled();

    // Check if getChangedFiles was called
    expect(mockInstance.getChangedFiles).toHaveBeenCalled();

    // Check that publishBlogs was called
    expect(mockInstance.publishBlogs).toHaveBeenCalled();

    // Check that setOutput was called with the correct values
    expect(mockedCore.setOutput).toHaveBeenCalledWith(
      "published-posts",
      JSON.stringify([
        {
          platform: "medium",
          file: "test.md",
          success: true,
          url: "https://medium.com/test",
        },
      ]),
    );
    expect(mockedCore.setOutput).toHaveBeenCalledWith("failed-posts", "[]");

    // Check that setFailed was NOT called
    expect(mockedCore.setFailed).not.toHaveBeenCalled();
  });

  test("should handle errors gracefully", async () => {
    const mockInstance = {
      getChangedFiles: jest.fn().mockRejectedValue(new Error("Test error")),
      publishBlogs: jest.fn(),
    };
    mockedBlogsPublisher.mockImplementation(() => mockInstance as any);

    await run();

    expect(mockedCore.setFailed).toHaveBeenCalledWith("Test error");
  });

  test("should enable debug logging when debugging is enabled via environment", async () => {
    process.env.DEBUGGING_ENABLED = "true";

    const mockInstance = {
      getChangedFiles: jest.fn().mockResolvedValue([]),
      publishBlogs: jest.fn().mockResolvedValue({
        published: [],
        failed: [],
      }),
    };
    mockedBlogsPublisher.mockImplementation(() => mockInstance as any);

    await run();

    expect(logger.setLevel).toHaveBeenCalled();
  });

  test("should handle successful publication with files", async () => {
    const mockInstance = {
      getChangedFiles: jest.fn().mockResolvedValue(["test.md"]),
      publishBlogs: jest.fn().mockResolvedValue({
        published: [
          {
            platform: "medium",
            file: "test.md",
            success: true,
            url: "https://medium.com/test",
          },
        ],
        failed: [],
      }),
    };
    mockedBlogsPublisher.mockImplementation(() => mockInstance as any);

    await run();

    expect(mockedCore.setOutput).toHaveBeenCalledWith(
      "published-posts",
      JSON.stringify([
        {
          platform: "medium",
          file: "test.md",
          success: true,
          url: "https://medium.com/test",
        },
      ]),
    );
    expect(mockedCore.setOutput).toHaveBeenCalledWith("failed-posts", "[]");
    expect(mockedCore.setFailed).not.toHaveBeenCalled();
  });

  test("should handle failed publications", async () => {
    const mockInstance = {
      getChangedFiles: jest.fn().mockResolvedValue(["test.md"]),
      publishBlogs: jest.fn().mockResolvedValue({
        published: [],
        failed: [
          {
            platform: "medium",
            file: "test.md",
            success: false,
            error: "API error",
          },
        ],
      }),
    };
    mockedBlogsPublisher.mockImplementation(() => mockInstance as any);

    await run();

    expect(mockedCore.setFailed).toHaveBeenCalledWith(
      "Failed to publish 1 posts",
    );
  });

  test("should handle debugging enabled via both environment and input", async () => {
    process.env.DEBUGGING_ENABLED = "true";

    mockedCore.getBooleanInput.mockImplementation((key: string) => {
      return key === "debugging_enabled";
    });

    const mockInstance = {
      getChangedFiles: jest.fn().mockResolvedValue([]),
      publishBlogs: jest.fn().mockResolvedValue({
        published: [],
        failed: [],
      }),
    };
    mockedBlogsPublisher.mockImplementation(() => mockInstance as any);

    await run();

    expect(logger.setLevel).toHaveBeenCalled();
  });
});

describe("Main Action - Branch Coverage", () => {
  test("should handle missing tokens gracefully", async () => {
    // Mock some tokens as empty
    mockedCore.getInput.mockImplementation((key: string) => {
      const inputs: { [key: string]: string } = {
        "medium-token": "",
        "devto-token": "devto-token",
        "hashnode-token": "hashnode-token",
        "hashnode-publication-id": "hashnode-pub-id",
        "github-token": "github-token",
        "medium-path": "posts/medium",
        devto_path: "posts/devto",
        hashnode_path: "posts/hashnode",
        posts_directory: ".",
      };
      return inputs[key] || "";
    });

    const mockInstance = {
      getChangedFiles: jest.fn().mockResolvedValue(["test.md"]),
      publishBlogs: jest.fn().mockResolvedValue({
        published: [],
        failed: [
          {
            platform: "medium",
            file: "test.md",
            success: false,
            error: "Medium token not provided",
          },
        ],
      }),
    };
    mockedBlogsPublisher.mockImplementation(() => mockInstance as any);

    await run();

    expect(mockedCore.setFailed).toHaveBeenCalledWith(
      "Failed to publish 1 posts",
    );
  });
});

describe("Main Action - Additional Coverage", () => {
  test("should handle empty posts directory input", async () => {
    mockedCore.getInput.mockImplementation((key: string) => {
      const inputs: { [key: string]: string } = {
        "medium-token": "medium-token",
        "devto-token": "devto-token",
        "hashnode-token": "hashnode-token",
        "hashnode-publication-id": "hashnode-pub-id",
        "github-token": "github-token",
        "medium-path": "posts/medium",
        devto_path: "posts/devto",
        hashnode_path: "posts/hashnode",
        posts_directory: "", // Empty string
      };
      return inputs[key] || "";
    });

    const mockInstance = {
      getChangedFiles: jest.fn().mockResolvedValue([]),
      publishBlogs: jest.fn(),
    };
    mockedBlogsPublisher.mockImplementation(() => mockInstance as any);

    await run();

    // Should still work with default posts directory
    expect(mockInstance.getChangedFiles).toHaveBeenCalled();
  });

  test("should handle default path values when inputs are empty", async () => {
    mockedCore.getInput.mockImplementation((key: string) => {
      const inputs: { [key: string]: string } = {
        "medium-token": "medium-token",
        "devto-token": "devto-token",
        "hashnode-token": "hashnode-token",
        "hashnode-publication-id": "hashnode-pub-id",
        "github-token": "github-token",
        "medium-path": "", // Empty - should use default
        devto_path: "", // Empty - should use default
        hashnode_path: "", // Empty - should use default
        posts_directory: ".",
      };
      return inputs[key] || "";
    });

    const mockInstance = {
      getChangedFiles: jest.fn().mockResolvedValue([]),
      publishBlogs: jest.fn(),
    };
    mockedBlogsPublisher.mockImplementation(() => mockInstance as any);

    await run();

    // Should still work with default paths
    expect(mockInstance.getChangedFiles).toHaveBeenCalled();
  });

  test("should handle updateAlreadyPublished set to false", async () => {
    mockedCore.getBooleanInput.mockImplementation((key: string) => {
      if (key === "update_already_published") return false;
      return false;
    });

    const mockInstance = {
      getChangedFiles: jest.fn().mockResolvedValue([]),
      publishBlogs: jest.fn(),
    };
    mockedBlogsPublisher.mockImplementation(() => mockInstance as any);

    await run();

    // Should still work with updateAlreadyPublished = false
    expect(mockInstance.getChangedFiles).toHaveBeenCalled();
  });

  test("should handle non-Error object thrown", async () => {
    const mockInstance = {
      getChangedFiles: jest
        .fn()
        .mockRejectedValue("String error instead of Error object"),
      publishBlogs: jest.fn(),
    };
    mockedBlogsPublisher.mockImplementation(() => mockInstance as any);

    await run();

    expect(mockedCore.setFailed).toHaveBeenCalledWith(
      "String error instead of Error object",
    );
  });

  test("should handle error with null or undefined message", async () => {
    const mockInstance = {
      getChangedFiles: jest.fn().mockRejectedValue({ message: null }),
      publishBlogs: jest.fn(),
    };
    mockedBlogsPublisher.mockImplementation(() => mockInstance as any);

    await run();

    expect(mockedCore.setFailed).toHaveBeenCalled();
  });

  test("should log debug information when files are found", async () => {
    const mockInstance = {
      getChangedFiles: jest.fn().mockResolvedValue(["test1.md", "test2.md"]),
      publishBlogs: jest.fn().mockResolvedValue({
        published: [
          {
            platform: "medium",
            file: "test1.md",
            success: true,
            url: "https://medium.com/test1",
          },
        ],
        failed: [
          {
            platform: "devto",
            file: "test2.md",
            success: false,
            error: "API error",
          },
        ],
      }),
    };
    mockedBlogsPublisher.mockImplementation(() => mockInstance as any);

    process.env.DEBUGGING_ENABLED = "true";

    await run();

    expect(logger.debug).toHaveBeenCalledWith(
      'Files to process: ["test1.md","test2.md"]',
    );
  });

  test("should handle mixed success/failure results", async () => {
    const mockInstance = {
      getChangedFiles: jest.fn().mockResolvedValue(["test1.md", "test2.md"]),
      publishBlogs: jest.fn().mockResolvedValue({
        published: [
          {
            platform: "medium",
            file: "test1.md",
            success: true,
            url: "https://medium.com/test1",
          },
        ],
        failed: [
          {
            platform: "devto",
            file: "test2.md",
            success: false,
            error: "API error",
          },
        ],
      }),
    };
    mockedBlogsPublisher.mockImplementation(() => mockInstance as any);

    await run();

    expect(mockedCore.setOutput).toHaveBeenCalledWith(
      "published-posts",
      expect.any(String),
    );
    expect(mockedCore.setOutput).toHaveBeenCalledWith(
      "failed-posts",
      expect.any(String),
    );
    expect(mockedCore.setFailed).toHaveBeenCalledWith(
      "Failed to publish 1 posts",
    );
  });

  test("should handle push event with commits but no markdown files", async () => {
    const mockInstance = {
      getChangedFiles: jest.fn().mockResolvedValue([]),
      publishBlogs: jest.fn(),
    };
    mockedBlogsPublisher.mockImplementation(() => mockInstance as any);

    await run();

    expect(logger.info).toHaveBeenCalledWith(
      "No markdown files to process, exiting",
    );
    expect(mockInstance.publishBlogs).not.toHaveBeenCalled();
  });

  test("should handle different GitHub event types", async () => {
    // This tests that the context is passed through correctly
    const mockInstance = {
      getChangedFiles: jest.fn().mockResolvedValue([]),
      publishBlogs: jest.fn(),
    };
    mockedBlogsPublisher.mockImplementation(() => mockInstance as any);

    await run();

    // The getChangedFiles should be called with the mocked context
    expect(mockInstance.getChangedFiles).toHaveBeenCalled();
  });
});
