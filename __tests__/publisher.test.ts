import frontMatter from "front-matter";
import { existsSync, readFileSync } from "fs";
import { BlogsPublisher } from "../src/publisher";
import { Config } from "../src/types";

jest.mock("fs");
jest.mock("front-matter");
jest.mock("@actions/github");

const mockReadFileSync = readFileSync as jest.MockedFunction<
  typeof readFileSync
>;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockFrontMatter = frontMatter as jest.MockedFunction<typeof frontMatter>;

describe("BlogsPublisher", () => {
  let publisher: BlogsPublisher;
  let config: Config;

  beforeEach(() => {
    config = {
      mediumToken: "medium-token",
      devtoToken: "devto-token",
      hashnodeToken: "hashnode-token",
      hashnodePublicationId: "pub-id",
      mediumPath: "posts/medium",
      devtoPath: "posts/devto",
      hashnodePath: "posts/hashnode",
      useCommitMessage: false,
      dryRun: false,
      postsDirectory: ".",
      githubToken: "github-token",
    };

    publisher = new BlogsPublisher(config);
    jest.clearAllMocks();
  });

  describe("getChangedFiles", () => {
    it("should return markdown files from commits", async () => {
      const context = {
        payload: {
          commits: [
            {
              added: ["posts/medium/test.md", "README.md"],
              modified: ["posts/devto/another.md"],
            },
          ],
        },
      };

      const result = await publisher.getChangedFiles(context as any);

      expect(result).toEqual([
        "posts/medium/test.md",
        "README.md",
        "posts/devto/another.md",
      ]);
    });

    it("should return empty array when no commits", async () => {
      const context = {
        payload: {},
      };

      const result = await publisher.getChangedFiles(context as any);
      expect(result).toEqual([]);
    });

    it("should filter only markdown files", async () => {
      const context = {
        payload: {
          commits: [
            {
              added: ["posts/test.md", "src/test.ts", "docs/guide.markdown"],
              modified: ["package.json"],
            },
          ],
        },
      };

      const result = await publisher.getChangedFiles(context as any);
      expect(result).toEqual(["posts/test.md", "docs/guide.markdown"]);
    });
    it("should handle commits with missing added/modified properties", async () => {
      const context = {
        payload: {
          commits: [
            {
              // No added or modified properties
              message: "test commit",
            },
          ],
        },
      };

      const result = await publisher.getChangedFiles(context as any);
      expect(result).toEqual([]);
    });

    it("should handle commits with non-array added/modified properties", async () => {
      const context = {
        payload: {
          commits: [
            {
              added: "invalid-string", // Should be array
              modified: null, // Should be array
            },
          ],
        },
      };

      const result = await publisher.getChangedFiles(context as any);
      expect(result).toEqual([]);
    });
  });

  describe("determinePlatform", () => {
    it("should use commit message when useCommitMessage is true", () => {
      const result = (publisher as any).determinePlatform(
        "any/file.md",
        "Post to medium: new article",
      );
      expect(result).toBeNull(); // Should be null since useCommitMessage is false

      // Test with useCommitMessage true
      const configWithCommit = { ...config, useCommitMessage: true };
      const publisherWithCommit = new BlogsPublisher(configWithCommit);

      const result2 = (publisherWithCommit as any).determinePlatform(
        "any/file.md",
        "Post to medium: new article",
      );
      expect(result2).toBe("medium");

      const result3 = (publisherWithCommit as any).determinePlatform(
        "any/file.md",
        "Post to devto: new article",
      );
      expect(result3).toBe("devto");

      const result4 = (publisherWithCommit as any).determinePlatform(
        "any/file.md",
        "Post to hashnode: new article",
      );
      expect(result4).toBe("hashnode");
    });

    it("should prioritize path over commit message", () => {
      const configWithCommit = { ...config, useCommitMessage: true };
      const publisherWithCommit = new BlogsPublisher(configWithCommit);

      const result = (publisherWithCommit as any).determinePlatform(
        "posts/medium/test.md",
        "Post to devto: new article",
      );
      expect(result).toBe("medium"); // Should use path, not commit message
    });
  });

  describe("extractTitleFromContent", () => {
    it("should extract title from markdown content", () => {
      const content = `# My Title\n\nSome content`;
      const result = (publisher as any).extractTitleFromContent(content);
      expect(result).toBe("My Title");
    });

    it("should handle multiple heading levels", () => {
      const content = `## Not the main title\n\n# Main Title\n\nContent`;
      const result = (publisher as any).extractTitleFromContent(content);
      expect(result).toBe("Main Title");
    });

    it('should return "Untitled Post" when no title found', () => {
      const content = `No title here\n\nJust content`;
      const result = (publisher as any).extractTitleFromContent(content);
      expect(result).toBe("Untitled Post");
    });
  });

  describe("publishToPlatform", () => {
    it("should handle dry run mode", async () => {
      const blogPost = {
        title: "Test",
        content: "Content",
        tags: [],
        published: true,
      };

      const dryRunPublisher = new BlogsPublisher({ ...config, dryRun: true });
      const result = await (dryRunPublisher as any).publishToPlatform(
        "medium",
        blogPost,
        "test.md",
      );

      expect(result.success).toBe(true);
      expect(result.url).toContain("dry-run");
    });

    it("should handle missing tokens", async () => {
      const blogPost = {
        title: "Test",
        content: "Content",
        tags: [],
        published: true,
      };

      const noTokenConfig = { ...config, mediumToken: "" };
      const noTokenPublisher = new BlogsPublisher(noTokenConfig);

      const result = await (noTokenPublisher as any).publishToPlatform(
        "medium",
        blogPost,
        "test.md",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Medium token not provided");
    });

    it("should handle unsupported platform", async () => {
      const blogPost = {
        title: "Test",
        content: "Content",
        tags: [],
        published: true,
      };

      const result = await (publisher as any).publishToPlatform(
        "unknown" as any,
        blogPost,
        "test.md",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unsupported platform");
    });
  });

  it("should handle platform API errors", async () => {
    const blogPost = {
      title: "Test",
      content: "Content",
      tags: [],
      published: true,
    };

    // Mock the clients to throw errors
    jest
      .spyOn(publisher["mediumClient"], "publishPost")
      .mockRejectedValueOnce(new Error("API error"));

    const result = await (publisher as any).publishToPlatform(
      "medium",
      blogPost,
      "test.md",
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("API error");
  });

  it("should handle hashnode publication without publication ID", async () => {
    const blogPost = {
      title: "Test",
      content: "Content",
      tags: [],
      published: true,
    };

    const noPubIdConfig = {
      ...config,
      hashnodeToken: "hashnode-token",
      hashnodePublicationId: "",
    };
    const noPubIdPublisher = new BlogsPublisher(noPubIdConfig);

    const result = await (noPubIdPublisher as any).publishToPlatform(
      "hashnode",
      blogPost,
      "test.md",
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Hashnode publication ID not provided");
  });

  describe("publishBlogs", () => {
    beforeEach(() => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(`---
title: Test Post
tags: javascript, tutorial
published: true
---

# Test Post

This is a test post content.`);

      // Mock front-matter to return proper structure with all required properties
      mockFrontMatter.mockReturnValue({
        attributes: {
          title: "Test Post",
          tags: ["javascript", "tutorial"],
          published: true,
        },
        body: "# Test Post\n\nThis is a test post content.",
        bodyBegin: 50,
        frontmatter:
          "title: Test Post\ntags: javascript, tutorial\npublished: true",
      });
    });

    it("should publish to medium based on path", async () => {
      const files = ["posts/medium/test.md"];
      const context = {
        payload: {
          head_commit: { message: "Add new post" },
        },
      };

      // Mock dry run
      publisher = new BlogsPublisher({ ...config, dryRun: true });

      const result = await publisher.publishBlogs(files, context as any);

      expect(result.published).toHaveLength(1);
      expect(result.published[0].platform).toBe("medium");
      expect(result.failed).toHaveLength(0);
    });

    it("should publish to devto based on path", async () => {
      const files = ["posts/devto/test.md"];
      const context = {
        payload: {
          head_commit: { message: "Add new post" },
        },
      };

      publisher = new BlogsPublisher({ ...config, dryRun: true });

      const result = await publisher.publishBlogs(files, context as any);

      expect(result.published).toHaveLength(1);
      expect(result.published[0].platform).toBe("devto");
    });

    it("should publish to hashnode based on path", async () => {
      const files = ["posts/hashnode/test.md"];
      const context = {
        payload: {
          head_commit: { message: "Add new post" },
        },
      };

      publisher = new BlogsPublisher({ ...config, dryRun: true });

      const result = await publisher.publishBlogs(files, context as any);

      expect(result.published).toHaveLength(1);
      expect(result.published[0].platform).toBe("hashnode");
    });

    it("should use commit message when useCommitMessage is true", async () => {
      const files = ["posts/random/test.md"];
      const context = {
        payload: {
          head_commit: { message: "Post to medium: new article" },
        },
      };

      const configWithCommitMessage = {
        ...config,
        useCommitMessage: true,
        dryRun: true,
      };
      publisher = new BlogsPublisher(configWithCommitMessage);

      const result = await publisher.publishBlogs(files, context as any);

      expect(result.published).toHaveLength(1);
      expect(result.published[0].platform).toBe("medium");
    });

    it("should skip files that don't match any platform", async () => {
      const files = ["docs/readme.md"];
      const context = {
        payload: {
          head_commit: { message: "Update docs" },
        },
      };

      const result = await publisher.publishBlogs(files, context as any);

      expect(result.published).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
    });

    it("should handle file not found error", async () => {
      mockExistsSync.mockReturnValue(false);

      const files = ["posts/medium/nonexistent.md"];
      const context = {
        payload: {
          head_commit: { message: "Add new post" },
        },
      };

      const result = await publisher.publishBlogs(files, context as any);

      expect(result.published).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toContain("File not found");
    });
  });

  describe("parseMarkdownFile", () => {
    it("should parse front matter correctly", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(`---
title: Test Post
tags: javascript, tutorial
published: true
canonical_url: https://example.com/test
---

# Test Post

This is the content.`);

      mockFrontMatter.mockReturnValue({
        attributes: {
          title: "Test Post",
          tags: ["javascript", "tutorial"],
          published: true,
          canonical_url: "https://example.com/test",
        },
        body: "# Test Post\n\nThis is the content.",
        bodyBegin: 80,
        frontmatter:
          "title: Test Post\ntags: javascript, tutorial\npublished: true\ncanonical_url: https://example.com/test",
      });

      const result = (publisher as any).parseMarkdownFile("test.md");

      expect(result.title).toBe("Test Post");
      expect(result.tags).toEqual(["javascript", "tutorial"]);
      expect(result.published).toBe(true);
      expect(result.canonical_url).toBe("https://example.com/test");
      expect(result.content).toContain("# Test Post");
    });

    it("should extract title from content if not in front matter", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(`# My Great Post

This is the content without front matter.`);

      mockFrontMatter.mockReturnValue({
        attributes: {},
        body: "# My Great Post\n\nThis is the content without front matter.",
        bodyBegin: 0,
        frontmatter: "",
      });

      const result = (publisher as any).parseMarkdownFile("test.md");

      expect(result.title).toBe("My Great Post");
      expect(result.content).toContain("# My Great Post");
    });

    it("should use default title if none found", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        `This is just content without any title.`,
      );

      mockFrontMatter.mockReturnValue({
        attributes: {},
        body: "This is just content without any title.",
        bodyBegin: 0,
        frontmatter: "",
      });

      const result = (publisher as any).parseMarkdownFile("test.md");

      expect(result.title).toBe("Untitled Post");
    });
  });
});
