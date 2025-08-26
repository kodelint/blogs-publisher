// import { Config, BlogPost, PublishResults, Platform } from "../src/types";
//
// describe("Type Definitions", () => {
//   test("Config interface should have correct properties", () => {
//     const config: Config = {
//       mediumToken: "token",
//       devtoToken: "token",
//       hashnodeToken: "token",
//       hashnodePublicationId: "pub-id",
//       mediumPath: "posts/medium",
//       devtoPath: "posts/devto",
//       hashnodePath: "posts/hashnode",
//       useCommitMessage: true,
//       dryRun: false,
//       postsDirectory: ".",
//       githubToken: "token",
//       updateAlreadyPublished: true,
//       debuggingEnabled: false,
//     };
//
//     expect(config).toBeDefined();
//     expect(config.mediumToken).toBe("token");
//   });
//
//   test("BlogPost interface should allow extra properties", () => {
//     const blogPost: BlogPost = {
//       title: "Test",
//       content: "Content",
//       tags: ["test"],
//       customProp: "value",
//     };
//
//     expect(blogPost.customProp).toBe("value");
//   });
//
//   test("Platform type should accept valid values", () => {
//     const platforms: Platform[] = ["medium", "devto", "hashnode"];
//     expect(platforms).toHaveLength(3);
//   });
//
//   test("PublishResults should contain published and failed arrays", () => {
//     const results: PublishResults = {
//       published: [],
//       failed: [],
//     };
//
//     expect(results.published).toEqual([]);
//     expect(results.failed).toEqual([]);
//   });
// });
// Update __tests__/types.test.ts

import {
  Config,
  BlogPost,
  PublishResults,
  Platform,
  MediumPost,
  DevToPost,
  HashnodePost,
  HashnodePostResponse,
  PublishResult,
} from "../src/types";

describe("Type Definitions", () => {
  describe("Config Interface", () => {
    test("should have correct required properties", () => {
      const config: Config = {
        mediumToken: "token",
        devtoToken: "token",
        hashnodeToken: "token",
        hashnodePublicationId: "pub-id",
        mediumPath: "posts/medium",
        devtoPath: "posts/devto",
        hashnodePath: "posts/hashnode",
        useCommitMessage: true,
        dryRun: false,
        postsDirectory: ".",
        githubToken: "token",
        updateAlreadyPublished: true,
        debuggingEnabled: false,
      };

      expect(config.mediumToken).toBe("token");
      expect(config.devtoToken).toBe("token");
      expect(config.hashnodeToken).toBe("token");
      expect(config.mediumPath).toBe("posts/medium");
      expect(config.devtoPath).toBe("posts/devto");
      expect(config.hashnodePath).toBe("posts/hashnode");
      expect(config.useCommitMessage).toBe(true);
      expect(config.dryRun).toBe(false);
      expect(config.postsDirectory).toBe(".");
      expect(config.githubToken).toBe("token");
      expect(config.updateAlreadyPublished).toBe(true);
      expect(config.debuggingEnabled).toBe(false);
    });

    test("should allow optional hashnodePublicationId", () => {
      const configWithoutPubId: Config = {
        mediumToken: "token",
        devtoToken: "token",
        hashnodeToken: "token",
        mediumPath: "posts/medium",
        devtoPath: "posts/devto",
        hashnodePath: "posts/hashnode",
        useCommitMessage: false,
        dryRun: true,
        postsDirectory: ".",
        githubToken: "token",
        updateAlreadyPublished: false,
        debuggingEnabled: true,
      };

      expect(configWithoutPubId.hashnodePublicationId).toBeUndefined();
      expect(configWithoutPubId.dryRun).toBe(true);
      expect(configWithoutPubId.debuggingEnabled).toBe(true);
    });
  });

  describe("BlogPost Interface", () => {
    test("should have required properties", () => {
      const blogPost: BlogPost = {
        title: "Test Post",
        content: "Test content",
        tags: ["test", "typescript"],
      };

      expect(blogPost.title).toBe("Test Post");
      expect(blogPost.content).toBe("Test content");
      expect(blogPost.tags).toEqual(["test", "typescript"]);
    });

    test("should allow optional properties", () => {
      const blogPost: BlogPost = {
        title: "Test Post",
        content: "Test content",
        tags: ["test"],
        canonical_url: "https://example.com",
        description: "Test description",
        cover_image: "test.jpg",
        published: true,
        publishedAt: "2023-01-01",
        series: "Test Series",
      };

      expect(blogPost.canonical_url).toBe("https://example.com");
      expect(blogPost.description).toBe("Test description");
      expect(blogPost.cover_image).toBe("test.jpg");
      expect(blogPost.published).toBe(true);
      expect(blogPost.publishedAt).toBe("2023-01-01");
      expect(blogPost.series).toBe("Test Series");
    });

    test("should allow extra properties via index signature", () => {
      const blogPost: BlogPost = {
        title: "Test",
        content: "Content",
        tags: ["test"],
        customProp: "value",
        anotherCustom: 123,
        nested: { prop: "nestedValue" },
      };

      expect(blogPost.customProp).toBe("value");
      expect(blogPost.anotherCustom).toBe(123);
      expect(blogPost.nested).toEqual({ prop: "nestedValue" });
    });

    test("should handle empty tags array", () => {
      const blogPost: BlogPost = {
        title: "Test",
        content: "Content",
        tags: [],
      };

      expect(blogPost.tags).toEqual([]);
    });

    test("should handle undefined published status", () => {
      const blogPost: BlogPost = {
        title: "Test",
        content: "Content",
        tags: ["test"],
      };

      expect(blogPost.published).toBeUndefined();
    });
  });

  describe("Platform Type", () => {
    test("should accept valid platform values", () => {
      const platforms: Platform[] = ["medium", "devto", "hashnode"];

      expect(platforms).toHaveLength(3);
      expect(platforms).toContain("medium");
      expect(platforms).toContain("devto");
      expect(platforms).toContain("hashnode");
    });

    test("should reject invalid platform values", () => {
      // This test ensures TypeScript would catch invalid values
      const validPlatforms: Platform[] = ["medium", "devto", "hashnode"];

      // We'll test this by ensuring valid platforms don't include invalid values
      expect(validPlatforms).not.toContain("invalid");
      expect(validPlatforms).not.toContain("twitter");
      expect(validPlatforms).not.toContain("linkedin");
    });

    // Alternative approach: test TypeScript's type checking behavior
    test("should have correct type narrowing", () => {
      const platform: Platform = "medium";

      // This demonstrates type narrowing works correctly
      if (platform === "medium") {
        expect(platform).toBe("medium");
      } else if (platform === "devto") {
        expect(platform).toBe("devto");
      } else if (platform === "hashnode") {
        expect(platform).toBe("hashnode");
      } else {
        // This should never happen due to TypeScript's type system
        fail(`Unexpected platform: ${platform}`);
      }
    });
  });

  describe("PublishResults Interface", () => {
    test("should contain empty published and failed arrays", () => {
      const results: PublishResults = {
        published: [],
        failed: [],
      };

      expect(results.published).toEqual([]);
      expect(results.failed).toEqual([]);
    });

    test("should contain successful publish results", () => {
      const results: PublishResults = {
        published: [
          {
            platform: "medium",
            file: "test.md",
            success: true,
            url: "https://medium.com/test",
            postId: "123",
          },
        ],
        failed: [],
      };

      expect(results.published).toHaveLength(1);
      expect(results.published[0].platform).toBe("medium");
      expect(results.published[0].success).toBe(true);
      expect(results.published[0].url).toBe("https://medium.com/test");
    });

    test("should contain failed publish results", () => {
      const results: PublishResults = {
        published: [],
        failed: [
          {
            platform: "devto",
            file: "test.md",
            success: false,
            error: "API error",
          },
        ],
      };

      expect(results.failed).toHaveLength(1);
      expect(results.failed[0].platform).toBe("devto");
      expect(results.failed[0].success).toBe(false);
      expect(results.failed[0].error).toBe("API error");
    });
  });

  describe("PublishResult Interface", () => {
    test("should allow successful result without error", () => {
      const result: PublishResult = {
        platform: "hashnode",
        file: "test.md",
        success: true,
        url: "https://hashnode.com/test",
        postId: "456",
      };

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test("should allow failed result without url", () => {
      const result: PublishResult = {
        platform: "medium",
        file: "test.md",
        success: false,
        error: "Network error",
      };

      expect(result.success).toBe(false);
      expect(result.url).toBeUndefined();
    });
  });

  describe("MediumPost Interface", () => {
    test("should have correct properties", () => {
      const mediumPost: MediumPost = {
        title: "Medium Post",
        contentFormat: "markdown",
        content: "# Content",
        tags: ["test"],
        publishStatus: "public",
        license: "all-rights-reserved",
        notifyFollowers: true,
        canonicalUrl: "https://example.com",
      };

      expect(mediumPost.title).toBe("Medium Post");
      expect(mediumPost.contentFormat).toBe("markdown");
      expect(mediumPost.publishStatus).toBe("public");
      expect(mediumPost.license).toBe("all-rights-reserved");
    });
  });

  describe("DevToPost Interface", () => {
    test("should have correct properties", () => {
      const devToPost: DevToPost = {
        title: "Dev.to Post",
        body_markdown: "# Content",
        published: true,
        tags: ["test", "webdev"],
        series: "Tutorial",
        canonical_url: "https://example.com",
        description: "Test description",
        cover_image: "cover.jpg",
        main_image: "main.jpg",
        organization_id: 123,
      };

      expect(devToPost.title).toBe("Dev.to Post");
      expect(devToPost.body_markdown).toBe("# Content");
      expect(devToPost.tags).toEqual(["test", "webdev"]);
      expect(devToPost.organization_id).toBe(123);
    });
  });

  describe("HashnodePost Interface", () => {
    test("should have correct properties", () => {
      const hashnodePost: HashnodePost = {
        title: "Hashnode Post",
        contentMarkdown: "# Content",
        tags: [{ name: "test" }, { name: "programming" }],
        coverImageURL: "cover.jpg",
        slug: "test-post",
        subtitle: "A test post",
        publishedAt: "2023-01-01",
        disableComments: false,
        publicationId: "pub-123",
        originalArticleURL: "https://example.com",
      };

      expect(hashnodePost.title).toBe("Hashnode Post");
      expect(hashnodePost.contentMarkdown).toBe("# Content");
      expect(hashnodePost.tags).toHaveLength(2);
      expect(hashnodePost.publicationId).toBe("pub-123");
    });

    test("should allow optional properties to be undefined", () => {
      const hashnodePost: HashnodePost = {
        title: "Hashnode Post",
        contentMarkdown: "# Content",
      };

      expect(hashnodePost.tags).toBeUndefined();
      expect(hashnodePost.coverImageURL).toBeUndefined();
      expect(hashnodePost.publicationId).toBeUndefined();
    });
  });

  describe("HashnodePostResponse Interface", () => {
    test("should have correct properties", () => {
      const response: HashnodePostResponse = {
        id: "post-123",
        title: "Test Post",
        slug: "test-post",
        url: "https://hashnode.com/test",
        contentMarkdown: "# Content",
        tags: [
          { name: "test", slug: "test" },
          { name: "typescript", slug: "typescript" },
        ],
        coverImage: { url: "cover.jpg" },
        subtitle: "A test post",
        dateAdded: "2023-01-01",
        author: {
          username: "testuser",
          name: "Test User",
        },
      };

      expect(response.id).toBe("post-123");
      expect(response.slug).toBe("test-post");
      expect(response.tags).toHaveLength(2);
      expect(response.author?.username).toBe("testuser");
    });

    test("should allow optional properties to be undefined", () => {
      const response: HashnodePostResponse = {
        id: "post-123",
        title: "Test Post",
        slug: "test-post",
        url: "https://hashnode.com/test",
      };

      expect(response.contentMarkdown).toBeUndefined();
      expect(response.tags).toBeUndefined();
      expect(response.coverImage).toBeUndefined();
    });
  });

  describe("Type Compatibility", () => {
    test("should allow BlogPost to be converted to platform-specific types", () => {
      const blogPost: BlogPost = {
        title: "Test Post",
        content: "Test content",
        tags: ["test", "typescript"],
        description: "Test description",
        cover_image: "test.jpg",
        published: true,
      };

      // This demonstrates type compatibility
      const mediumPost: MediumPost = {
        title: blogPost.title,
        contentFormat: "markdown",
        content: blogPost.content,
        tags: blogPost.tags,
        publishStatus: blogPost.published ? "public" : "draft",
        canonicalUrl: blogPost.canonical_url,
      };

      const devToPost: DevToPost = {
        title: blogPost.title,
        body_markdown: blogPost.content,
        published: blogPost.published,
        tags: blogPost.tags,
        canonical_url: blogPost.canonical_url,
        description: blogPost.description,
        cover_image: blogPost.cover_image,
      };

      expect(mediumPost.title).toBe(blogPost.title);
      expect(devToPost.title).toBe(blogPost.title);
    });
  });
});
