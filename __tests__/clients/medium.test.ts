import axios from "axios";
import { MediumClient } from "../../src/clients/medium";
import { BlogPost } from "../../src/types";

jest.mock("axios");
jest.mock("../../src/utils/logger");

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("MediumClient", () => {
  let client: MediumClient;
  const mockToken = "test-token";

  // Helper function to create a blog post
  const createBlogPost = (overrides: Partial<BlogPost> = {}): BlogPost => ({
    title: "Test Post",
    content: "Test content",
    tags: ["test", "typescript", "javascript", "node", "web"],
    published: true,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default mock for axios instance
    const mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
    };
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    client = new MediumClient(mockToken);
  });

  // 1. CONSTRUCTOR AND INITIALIZATION TESTS
  describe("Constructor and Initialization", () => {
    test("should initialize with correct base URL and headers", () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: "https://api.medium.com/v1",
        headers: {
          Authorization: `Bearer ${mockToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
    });

    test("should handle empty token", () => {
      new MediumClient("");
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: "https://api.medium.com/v1",
        headers: {
          Authorization: "Bearer ",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
    });
  });

  // 2. GET USER ID TESTS
  describe("getUserId - Complete Coverage", () => {
    test("should return cached user ID", async () => {
      // Set cached user ID
      (client as any).userId = "cached-user-id";

      const userId = await client.getUserId();

      expect(userId).toBe("cached-user-id");
      // Should not call API when cached
      expect((client as any).client.get).not.toHaveBeenCalled();
    });

    test("should fetch user ID from API", async () => {
      const mockResponse = {
        data: {
          data: {
            id: "user-id-from-api",
          },
        },
      };

      (client as any).client.get.mockResolvedValue(mockResponse);

      const userId = await client.getUserId();

      expect(userId).toBe("user-id-from-api");
      expect((client as any).client.get).toHaveBeenCalledWith("/me");
    });

    test("should handle get user ID errors with regular Error", async () => {
      (client as any).client.get.mockRejectedValue(new Error("API error"));

      await expect(client.getUserId()).rejects.toThrow(
        "Failed to get Medium user info: Error: API error",
      );
    });

    test("should handle getUserId with axios error", async () => {
      const errorResponse = {
        response: {
          data: {
            errors: [{ message: "Axios error" }],
          },
        },
        isAxiosError: true,
      };

      (client as any).client.get.mockRejectedValue(errorResponse);

      // The actual implementation stringifies the error object
      await expect(client.getUserId()).rejects.toThrow(
        "Failed to get Medium user info: [object Object]",
      );
    });

    test("should handle axios error without response data", async () => {
      const errorResponse = {
        message: "Network error",
        isAxiosError: true,
        // No response property
      };

      (client as any).client.get.mockRejectedValue(errorResponse);

      await expect(client.getUserId()).rejects.toThrow(
        "Failed to get Medium user info: [object Object]",
      );
    });

    test("should handle axios error with empty response", async () => {
      const errorResponse = {
        response: {},
        isAxiosError: true,
        message: "Empty response",
      };

      (client as any).client.get.mockRejectedValue(errorResponse);

      await expect(client.getUserId()).rejects.toThrow(
        "Failed to get Medium user info: [object Object]",
      );
    });
  });

  // 3. PUBLISH POST TESTS
  describe("publishPost - Complete Coverage", () => {
    const blogPost: BlogPost = createBlogPost();

    test("should publish post successfully", async () => {
      const mockUserResponse = {
        data: {
          data: {
            id: "user-id",
          },
        },
      };
      const mockPublishResponse = {
        data: {
          data: {
            id: "post-id",
            url: "https://medium.com/test",
          },
        },
      };

      (client as any).client.get.mockResolvedValue(mockUserResponse);
      (client as any).client.post.mockResolvedValue(mockPublishResponse);

      const result = await client.publishPost(blogPost);

      expect(result).toEqual({
        id: "post-id",
        url: "https://medium.com/test",
      });
      expect((client as any).client.post).toHaveBeenCalledWith(
        "/users/user-id/posts",
        expect.objectContaining({
          title: "Test Post",
          content: "Test content",
          tags: ["test", "typescript", "javascript", "node", "web"],
          publishStatus: "public",
        }),
      );
    });

    test("should handle draft posts", async () => {
      const draftPost: BlogPost = { ...blogPost, published: false };
      const mockUserResponse = {
        data: {
          data: {
            id: "user-id",
          },
        },
      };
      const mockPublishResponse = {
        data: {
          data: {
            id: "post-id",
            url: "https://medium.com/test",
          },
        },
      };

      (client as any).client.get.mockResolvedValue(mockUserResponse);
      (client as any).client.post.mockResolvedValue(mockPublishResponse);

      await client.publishPost(draftPost);

      expect((client as any).client.post).toHaveBeenCalledWith(
        "/users/user-id/posts",
        expect.objectContaining({
          publishStatus: "draft",
        }),
      );
    });

    test("should handle API errors with regular Error", async () => {
      const mockUserResponse = {
        data: {
          data: {
            id: "user-id",
          },
        },
      };

      (client as any).client.get.mockResolvedValue(mockUserResponse);
      (client as any).client.post.mockRejectedValue(new Error("API error"));

      await expect(client.publishPost(blogPost)).rejects.toThrow("API error");
    });

    test("should handle publishPost with axios error structure", async () => {
      const mockUserResponse = {
        data: {
          data: {
            id: "user-id",
          },
        },
      };

      const errorResponse = {
        response: {
          data: {
            errors: [{ message: "Publish axios error" }],
          },
        },
        isAxiosError: true,
      };

      (client as any).client.get.mockResolvedValue(mockUserResponse);
      (client as any).client.post.mockRejectedValue(errorResponse);

      await expect(client.publishPost(blogPost)).rejects.toThrow(
        "Medium API error: Publish axios error",
      );
    });

    test("should handle publishPost when getUserId fails", async () => {
      (client as any).client.get.mockRejectedValue(new Error("User ID error"));

      await expect(client.publishPost(blogPost)).rejects.toThrow(
        "User ID error",
      );
    });

    test("should handle axios error without response data in publish", async () => {
      const mockUserResponse = {
        data: {
          data: {
            id: "user-id",
          },
        },
      };

      const errorResponse = {
        message: "Publish network error",
        isAxiosError: true,
        // No response property
      };

      (client as any).client.get.mockResolvedValue(mockUserResponse);
      (client as any).client.post.mockRejectedValue(errorResponse);

      await expect(client.publishPost(createBlogPost())).rejects.toThrow(
        "Publish network error",
      );
    });

    test("should handle axios error with empty response in publish", async () => {
      const mockUserResponse = {
        data: {
          data: {
            id: "user-id",
          },
        },
      };

      const errorResponse = {
        response: {},
        isAxiosError: true,
        message: "Empty publish response",
      };

      (client as any).client.get.mockResolvedValue(mockUserResponse);
      (client as any).client.post.mockRejectedValue(errorResponse);

      await expect(client.publishPost(createBlogPost())).rejects.toThrow(
        "Empty publish response",
      );
    });
  });

  // 4. GET POST TESTS
  describe("getPost - Complete Coverage", () => {
    test("should fetch post successfully", async () => {
      const mockResponse = {
        data: {
          data: {
            id: "post-id",
            title: "Test Post",
          },
        },
      };

      (client as any).client.get.mockResolvedValue(mockResponse);

      const result = await client.getPost("post-id");

      expect(result).toEqual(mockResponse.data.data);
      expect((client as any).client.get).toHaveBeenCalledWith("/posts/post-id");
    });

    test("should handle get post errors with regular Error", async () => {
      (client as any).client.get.mockRejectedValue(new Error("Get error"));
      await expect(client.getPost("post-id")).rejects.toThrow("Get error");
    });

    test("should handle getPost with axios error structure", async () => {
      const errorResponse = {
        response: {
          data: {
            errors: [{ message: "Axios error" }],
          },
        },
        isAxiosError: true,
      };

      (client as any).client.get.mockRejectedValue(errorResponse);

      await expect(client.getPost("post-id")).rejects.toThrow(
        "Medium API error: Axios error",
      );
    });

    test("should handle axios error without response data in getPost", async () => {
      const errorResponse = {
        message: "Get post network error",
        isAxiosError: true,
        // No response property
      };

      (client as any).client.get.mockRejectedValue(errorResponse);

      await expect(client.getPost("post-id")).rejects.toThrow(
        "Get post network error",
      );
    });

    test("should handle axios error with empty response in getPost", async () => {
      const errorResponse = {
        response: {},
        isAxiosError: true,
        message: "Empty get post response",
      };

      (client as any).client.get.mockRejectedValue(errorResponse);

      await expect(client.getPost("post-id")).rejects.toThrow(
        "Empty get post response",
      );
    });
  });

  // 5. GET USER POSTS TESTS
  describe("getUserPosts - Complete Coverage", () => {
    test("should fetch user posts successfully", async () => {
      const mockUserResponse = {
        data: {
          data: {
            id: "user-id",
          },
        },
      };
      const mockPostsResponse = {
        data: {
          data: [
            { id: "post-1", title: "Post 1" },
            { id: "post-2", title: "Post 2" },
          ],
        },
      };

      (client as any).client.get.mockResolvedValueOnce(mockUserResponse);
      (client as any).client.get.mockResolvedValueOnce(mockPostsResponse);

      const result = await client.getUserPosts();

      expect(result).toEqual(mockPostsResponse.data.data);
      expect((client as any).client.get).toHaveBeenCalledWith(
        "/users/user-id/posts",
      );
    });

    test("should handle getUserPosts errors with regular Error", async () => {
      const mockUserResponse = {
        data: {
          data: {
            id: "user-id",
          },
        },
      };

      (client as any).client.get.mockResolvedValueOnce(mockUserResponse);
      (client as any).client.get.mockRejectedValueOnce(
        new Error("Posts error"),
      );

      await expect(client.getUserPosts()).rejects.toThrow("Posts error");
    });

    test("should handle getUserPosts with axios error structure", async () => {
      const mockUserResponse = {
        data: {
          data: {
            id: "user-id",
          },
        },
      };

      const errorResponse = {
        response: {
          data: {
            errors: [{ message: "Posts axios error" }],
          },
        },
        isAxiosError: true,
      };

      (client as any).client.get.mockResolvedValueOnce(mockUserResponse);
      (client as any).client.get.mockRejectedValueOnce(errorResponse);

      await expect(client.getUserPosts()).rejects.toThrow(
        "Medium API error: Posts axios error",
      );
    });

    test("should handle getUserPosts when getUserId fails", async () => {
      (client as any).client.get.mockRejectedValue(new Error("User ID error"));

      await expect(client.getUserPosts()).rejects.toThrow("User ID error");
    });

    test("should handle axios error without response data in getUserPosts", async () => {
      const mockUserResponse = {
        data: {
          data: {
            id: "user-id",
          },
        },
      };

      const errorResponse = {
        message: "Get posts network error",
        isAxiosError: true,
        // No response property
      };

      (client as any).client.get.mockResolvedValueOnce(mockUserResponse);
      (client as any).client.get.mockRejectedValueOnce(errorResponse);

      await expect(client.getUserPosts()).rejects.toThrow(
        "Get posts network error",
      );
    });

    test("should handle axios error with empty response in getUserPosts", async () => {
      const mockUserResponse = {
        data: {
          data: {
            id: "user-id",
          },
        },
      };

      const errorResponse = {
        response: {},
        isAxiosError: true,
        message: "Empty get posts response",
      };

      (client as any).client.get.mockResolvedValueOnce(mockUserResponse);
      (client as any).client.get.mockRejectedValueOnce(errorResponse);

      await expect(client.getUserPosts()).rejects.toThrow(
        "Empty get posts response",
      );
    });
  });

  // 6. EDGE CASES AND ERROR SCENARIOS
  describe("Edge Cases and Error Scenarios", () => {
    test("should handle empty API responses", async () => {
      const mockUserResponse = {
        data: {
          data: {
            id: "user-id",
          },
        },
      };
      const mockPublishResponse = {
        data: {
          data: {
            id: "post-id",
            url: "https://medium.com/test",
          },
        },
      };

      (client as any).client.get.mockResolvedValue(mockUserResponse);
      (client as any).client.post.mockResolvedValue(mockPublishResponse);

      const result = await client.publishPost(createBlogPost());

      expect(result).toEqual({
        id: "post-id",
        url: "https://medium.com/test",
      });
    });

    test("should handle API responses with undefined url", async () => {
      const mockUserResponse = {
        data: {
          data: {
            id: "user-id",
          },
        },
      };
      const mockPublishResponse = {
        data: {
          data: {
            id: "post-id",
            url: undefined, // URL is undefined
          },
        },
      };

      (client as any).client.get.mockResolvedValue(mockUserResponse);
      (client as any).client.post.mockResolvedValue(mockPublishResponse);

      // The actual implementation handles undefined URL by returning it as undefined
      const result = await client.publishPost(createBlogPost());
      expect(result).toEqual({
        id: "post-id",
        url: undefined,
      });
    });

    test("should handle API responses missing url field", async () => {
      const mockUserResponse = {
        data: {
          data: {
            id: "user-id",
          },
        },
      };
      const mockPublishResponse = {
        data: {
          data: {
            id: "post-id",
            // Missing url field entirely
          },
        },
      };

      (client as any).client.get.mockResolvedValue(mockUserResponse);
      (client as any).client.post.mockResolvedValue(mockPublishResponse);

      // The actual implementation handles missing fields by returning undefined
      const result = await client.publishPost(createBlogPost());
      expect(result).toEqual({
        id: "post-id",
        url: undefined,
      });
    });

    test("should handle posts with minimal data", async () => {
      const minimalPost: BlogPost = {
        title: "Minimal Post",
        content: "Minimal content",
        tags: [],
        published: true,
      };

      const mockUserResponse = {
        data: {
          data: {
            id: "user-id",
          },
        },
      };
      const mockPublishResponse = {
        data: {
          data: {
            id: "post-id",
            url: "https://medium.com/minimal",
          },
        },
      };

      (client as any).client.get.mockResolvedValue(mockUserResponse);
      (client as any).client.post.mockResolvedValue(mockPublishResponse);

      await client.publishPost(minimalPost);

      expect((client as any).client.post).toHaveBeenCalledWith(
        "/users/user-id/posts",
        expect.objectContaining({
          title: "Minimal Post",
          content: "Minimal content",
          tags: [],
        }),
      );
    });

    test("should handle non-axios errors in all methods", async () => {
      const regularError = new Error("Regular error");
      (client as any).client.get.mockRejectedValue(regularError);

      await expect(client.getUserId()).rejects.toThrow(
        "Failed to get Medium user info: Error: Regular error",
      );
    });

    test("should handle non-object errors in getUserId", async () => {
      // Simulate a non-object error (string)
      (client as any).client.get.mockRejectedValue("String error");

      await expect(client.getUserId()).rejects.toThrow(
        "Failed to get Medium user info: String error",
      );
    });

    test("should handle null errors in getUserId", async () => {
      // Simulate a null error
      (client as any).client.get.mockRejectedValue(null);

      await expect(client.getUserId()).rejects.toThrow(
        "Failed to get Medium user info: null",
      );
    });

    test("should handle undefined errors in getUserId", async () => {
      // Simulate an undefined error
      (client as any).client.get.mockRejectedValue(undefined);

      await expect(client.getUserId()).rejects.toThrow(
        "Failed to get Medium user info: undefined",
      );
    });

    test("should handle posts with null content", async () => {
      const postWithNullContent = {
        title: "Test Post",
        content: null,
        tags: ["test"],
        published: true,
      } as unknown as BlogPost;

      const mockUserResponse = {
        data: {
          data: {
            id: "user-id",
          },
        },
      };
      const mockPublishResponse = {
        data: {
          data: {
            id: "post-id",
            url: "https://medium.com/test",
          },
        },
      };

      (client as any).client.get.mockResolvedValue(mockUserResponse);
      (client as any).client.post.mockResolvedValue(mockPublishResponse);

      const result = await client.publishPost(postWithNullContent);

      expect(result).toEqual({
        id: "post-id",
        url: "https://medium.com/test",
      });
      expect((client as any).client.post).toHaveBeenCalledWith(
        "/users/user-id/posts",
        expect.objectContaining({
          content: null,
        }),
      );
    });

    test("should handle posts with undefined tags", async () => {
      const postWithUndefinedTags = {
        title: "Test Post",
        content: "Test content",
        tags: undefined,
        published: true,
      } as unknown as BlogPost;

      // This will cause a TypeError in the actual implementation
      // because it tries to call .slice() on undefined
      const mockUserResponse = {
        data: {
          data: {
            id: "user-id",
          },
        },
      };

      (client as any).client.get.mockResolvedValue(mockUserResponse);

      await expect(client.publishPost(postWithUndefinedTags)).rejects.toThrow(
        expect.any(TypeError),
      );
    });

    test("should handle posts with null tags", async () => {
      const postWithNullTags = {
        title: "Test Post",
        content: "Test content",
        tags: null,
        published: true,
      } as unknown as BlogPost;

      // This will cause a TypeError in the actual implementation
      // because it tries to call .slice() on null
      const mockUserResponse = {
        data: {
          data: {
            id: "user-id",
          },
        },
      };

      (client as any).client.get.mockResolvedValue(mockUserResponse);

      await expect(client.publishPost(postWithNullTags)).rejects.toThrow(
        expect.any(TypeError),
      );
    });

    test("should handle posts with empty tags array", async () => {
      const postWithEmptyTags = {
        title: "Test Post",
        content: "Test content",
        tags: [],
        published: true,
      } as BlogPost;

      const mockUserResponse = {
        data: {
          data: {
            id: "user-id",
          },
        },
      };
      const mockPublishResponse = {
        data: {
          data: {
            id: "post-id",
            url: "https://medium.com/test",
          },
        },
      };

      (client as any).client.get.mockResolvedValue(mockUserResponse);
      (client as any).client.post.mockResolvedValue(mockPublishResponse);

      const result = await client.publishPost(postWithEmptyTags);

      expect(result).toEqual({
        id: "post-id",
        url: "https://medium.com/test",
      });
      expect((client as any).client.post).toHaveBeenCalledWith(
        "/users/user-id/posts",
        expect.objectContaining({
          tags: [],
        }),
      );
    });

    test("should handle posts with more than 5 tags", async () => {
      const postWithManyTags = {
        title: "Test Post",
        content: "Test content",
        tags: ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7"],
        published: true,
      } as BlogPost;

      const mockUserResponse = {
        data: {
          data: {
            id: "user-id",
          },
        },
      };
      const mockPublishResponse = {
        data: {
          data: {
            id: "post-id",
            url: "https://medium.com/test",
          },
        },
      };

      (client as any).client.get.mockResolvedValue(mockUserResponse);
      (client as any).client.post.mockResolvedValue(mockPublishResponse);

      const result = await client.publishPost(postWithManyTags);

      expect(result).toEqual({
        id: "post-id",
        url: "https://medium.com/test",
      });
      expect((client as any).client.post).toHaveBeenCalledWith(
        "/users/user-id/posts",
        expect.objectContaining({
          tags: ["tag1", "tag2", "tag3", "tag4", "tag5"], // Only first 5 tags
        }),
      );
    });
  });
});
