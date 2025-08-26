import axios from "axios";
import { DevtoClient } from "../../src/clients/devto";
import { BlogPost } from "../../src/types";

jest.mock("axios");
jest.mock("../../src/utils/logger");

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("DevtoClient", () => {
  let client: DevtoClient;
  const apiKey = "test-api-key";

  // Helper function to create a blog post
  const createBlogPost = (overrides: Partial<BlogPost> = {}): BlogPost => ({
    title: "Test Post",
    content: "Test content",
    tags: ["test", "typescript", "javascript", "node", "web"],
    published: true,
    description: "Test description",
    cover_image: "test.jpg",
    canonical_url: "https://example.com/original",
    series: undefined,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default mock for axios instance
    const mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
    };
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    client = new DevtoClient(apiKey);
  });

  // 1. CONSTRUCTOR AND INITIALIZATION TESTS
  describe("Constructor and Initialization", () => {
    test("should initialize with correct base URL and headers", () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: "https://dev.to/api",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
        },
      });
    });

    test("should handle empty API key", () => {
      new DevtoClient(""); // Remove the assignment to emptyClient
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: "https://dev.to/api",
        headers: {
          "api-key": "",
          "Content-Type": "application/json",
        },
      });
    });
  });

  // 2. PUBLISH POST TESTS
  describe("publishPost - Complete Coverage", () => {
    test("should publish post successfully with all fields", async () => {
      const blogPost = createBlogPost();
      const mockResponse = {
        data: {
          id: 123,
          url: "https://dev.to/test",
          title: "Test Post",
        },
      };

      (client as any).client.post.mockResolvedValue(mockResponse);

      const result = await client.publishPost(blogPost);

      expect(result).toEqual({
        id: 123,
        url: "https://dev.to/test",
      });
      expect((client as any).client.post).toHaveBeenCalledWith("/articles", {
        article: expect.objectContaining({
          title: "Test Post",
          body_markdown: "Test content",
          published: true,
          description: "Test description",
          canonical_url: "https://example.com/original",
        }),
      });
    });

    test("should handle posts with series", async () => {
      const postWithSeries = createBlogPost({ series: "test-series" });
      const mockResponse = { data: { id: 123, url: "https://dev.to/test" } };

      (client as any).client.post.mockResolvedValue(mockResponse);

      await client.publishPost(postWithSeries);

      expect((client as any).client.post).toHaveBeenCalledWith("/articles", {
        article: expect.objectContaining({ series: "test-series" }),
      });
    });

    test("should handle posts without cover image", async () => {
      const postWithoutCover = createBlogPost({ cover_image: undefined });
      const mockResponse = { data: { id: 123, url: "https://dev.to/test" } };

      (client as any).client.post.mockResolvedValue(mockResponse);

      await client.publishPost(postWithoutCover);

      expect((client as any).client.post).toHaveBeenCalledWith("/articles", {
        article: expect.objectContaining({
          cover_image: undefined,
          main_image: undefined,
        }),
      });
    });

    test("should handle empty tags array", async () => {
      const postWithoutTags = createBlogPost({ tags: [] });
      const mockResponse = { data: { id: 123, url: "https://dev.to/test" } };

      (client as any).client.post.mockResolvedValue(mockResponse);

      await client.publishPost(postWithoutTags);

      expect((client as any).client.post).toHaveBeenCalledWith("/articles", {
        article: expect.objectContaining({ tags: [] }),
      });
    });

    test("should slice tags to maximum 4", async () => {
      const postWithManyTags = createBlogPost({
        tags: ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"],
      });
      const mockResponse = { data: { id: 123, url: "https://dev.to/test" } };

      (client as any).client.post.mockResolvedValue(mockResponse);

      await client.publishPost(postWithManyTags);

      expect((client as any).client.post).toHaveBeenCalledWith("/articles", {
        article: expect.objectContaining({
          tags: ["tag1", "tag2", "tag3", "tag4"],
        }),
      });
    });

    test("should handle posts with less than 4 tags", async () => {
      const postWith2Tags = createBlogPost({ tags: ["tag1", "tag2"] });
      const mockResponse = { data: { id: 123, url: "https://dev.to/test" } };

      (client as any).client.post.mockResolvedValue(mockResponse);

      await client.publishPost(postWith2Tags);

      expect((client as any).client.post).toHaveBeenCalledWith("/articles", {
        article: expect.objectContaining({ tags: ["tag1", "tag2"] }),
      });
    });

    test("should handle unexpected API response structure", async () => {
      const blogPost = createBlogPost();
      const mockResponse = { data: { url: "https://dev.to/test" } }; // Missing id

      (client as any).client.post.mockResolvedValue(mockResponse);

      const result = await client.publishPost(blogPost);

      expect(result).toEqual({ id: undefined, url: "https://dev.to/test" });
    });

    test("should handle cover_image without main_image", async () => {
      const blogPost = {
        title: "Test Post",
        content: "Test content",
        tags: ["test"],
        published: true,
        cover_image: "test.jpg",
        // No main_image
      };

      const mockResponse = { data: { id: 123, url: "https://dev.to/test" } };

      (client as any).client.post.mockResolvedValue(mockResponse);

      await client.publishPost(blogPost);

      expect((client as any).client.post).toHaveBeenCalledWith("/articles", {
        article: expect.objectContaining({
          cover_image: "test.jpg",
          main_image: "test.jpg",
        }),
      });
    });

    test("should handle empty API response", async () => {
      const blogPost = createBlogPost();
      const mockResponse = { data: {} }; // Empty response

      (client as any).client.post.mockResolvedValue(mockResponse);

      const result = await client.publishPost(blogPost);

      expect(result).toEqual({});
    });
  });

  // 3. ERROR HANDLING TESTS
  describe("Error Handling - Complete Coverage", () => {
    test("should handle errors with unexpected response structure", async () => {
      const errorResponse = {
        response: {
          data: {
            message: "Custom error message",
            details: "Additional details",
          },
        },
        isAxiosError: true,
      };

      (client as any).client.post.mockRejectedValue(errorResponse);

      await expect(client.publishPost(createBlogPost())).rejects.toThrow(
        "Dev.to API error: Custom error message",
      );
    });

    test("should handle errors with no response data", async () => {
      const errorResponse = {
        message: "Network timeout",
        isAxiosError: true,
      };

      (client as any).client.post.mockRejectedValue(errorResponse);

      await expect(client.publishPost(createBlogPost())).rejects.toThrow(
        "Dev.to API error: Network timeout",
      );
    });

    test("should handle errors with empty response", async () => {
      const errorResponse = {
        response: {},
        isAxiosError: true,
        message: "Empty response error",
      };

      (client as any).client.post.mockRejectedValue(errorResponse);

      await expect(client.publishPost(createBlogPost())).rejects.toThrow(
        "Dev.to API error: Empty response error",
      );
    });

    test("should handle axios errors without response", async () => {
      const errorResponse = {
        message: "Network error",
        isAxiosError: true,
      };

      (client as any).client.post.mockRejectedValue(errorResponse);

      await expect(client.publishPost(createBlogPost())).rejects.toThrow(
        "Dev.to API error: Network error",
      );
    });

    test("should handle errors with specific error structure", async () => {
      const errorResponse = {
        response: {
          data: { error: "Specific error", details: "Additional details" },
        },
        isAxiosError: true,
      };

      (client as any).client.post.mockRejectedValue(errorResponse);

      await expect(client.publishPost(createBlogPost())).rejects.toThrow(
        "Dev.to API error: Specific error",
      );
    });
  });

  // 4. GET POST TESTS
  describe("getPost - Complete Coverage", () => {
    test("should fetch post successfully", async () => {
      const mockResponse = {
        data: { id: 123, title: "Test Post", url: "https://dev.to/test" },
      };

      (client as any).client.get.mockResolvedValue(mockResponse);

      const result = await client.getPost(123);

      expect(result).toEqual(mockResponse.data);
      expect((client as any).client.get).toHaveBeenCalledWith("/articles/123");
    });

    test("should handle get post errors", async () => {
      const errorResponse = {
        response: { data: { error: "Get error" } },
        isAxiosError: true,
      };
      (client as any).client.get.mockRejectedValue(errorResponse);

      await expect(client.getPost(123)).rejects.toThrow(
        "Dev.to API error: Get error",
      );
    });

    test("should handle non-axios error in getPost", async () => {
      const error = new Error("Non-axios error");
      (client as any).client.get.mockRejectedValue(error);

      await expect(client.getPost(123)).rejects.toThrow("Non-axios error");
    });
  });

  // 5. UPDATE POST TESTS
  describe("updatePost - Complete Coverage", () => {
    test("should update post successfully", async () => {
      const blogPost = createBlogPost({ title: "Updated Post" });
      const mockResponse = { data: { id: 123, url: "https://dev.to/updated" } };

      (client as any).client.put.mockResolvedValue(mockResponse);

      const result = await client.updatePost(123, blogPost);

      expect(result).toEqual({ id: 123, url: "https://dev.to/updated" });
      expect((client as any).client.put).toHaveBeenCalledWith("/articles/123", {
        article: expect.objectContaining({ title: "Updated Post" }),
      });
    });

    test("should handle updatePost with all possible fields", async () => {
      const blogPost: BlogPost = {
        title: "Updated Post",
        content: "Updated content",
        tags: ["updated"],
        published: false,
        description: "Updated description",
        cover_image: "updated.jpg",
        canonical_url: "https://example.com/updated",
        series: "updated-series",
      };

      const mockResponse = { data: { id: 123, url: "https://dev.to/updated" } };

      (client as any).client.put.mockResolvedValue(mockResponse);

      const result = await client.updatePost(123, blogPost);

      expect(result).toEqual({ id: 123, url: "https://dev.to/updated" });
      expect((client as any).client.put).toHaveBeenCalledWith("/articles/123", {
        article: expect.objectContaining({
          published: false,
          series: "updated-series",
        }),
      });
    });

    test("should handle updatePost errors", async () => {
      const errorResponse = {
        message: "Update failed",
        isAxiosError: true,
      };

      (client as any).client.put.mockRejectedValue(errorResponse);

      await expect(client.updatePost(123, createBlogPost())).rejects.toThrow(
        "Dev.to API error: Update failed",
      );
    });
  });

  // 6. GET USER POSTS TESTS
  describe("getUserPosts - Complete Coverage", () => {
    test("should fetch user posts successfully", async () => {
      const mockResponse = { data: [{ id: 1, title: "Post 1" }] };

      (client as any).client.get.mockResolvedValue(mockResponse);

      const result = await client.getUserPosts("testuser");

      expect(result).toEqual(mockResponse.data);
      expect((client as any).client.get).toHaveBeenCalledWith(
        "/articles?username=testuser",
      );
    });

    test("should handle empty posts array", async () => {
      const mockResponse = { data: [] };

      (client as any).client.get.mockResolvedValue(mockResponse);

      const result = await client.getUserPosts("testuser");

      expect(result).toEqual([]);
    });

    test("should handle different usernames", async () => {
      const mockResponse = { data: [{ id: 1, title: "Post 1" }] };

      (client as any).client.get.mockResolvedValue(mockResponse);

      const result = await client.getUserPosts("differentuser");

      expect(result).toEqual(mockResponse.data);
      expect((client as any).client.get).toHaveBeenCalledWith(
        "/articles?username=differentuser",
      );
    });

    test("should handle getUserPosts errors", async () => {
      const errorResponse = {
        response: { data: null },
        isAxiosError: true,
        message: "Empty data error",
      };

      (client as any).client.get.mockRejectedValue(errorResponse);

      await expect(client.getUserPosts("testuser")).rejects.toThrow(
        "Dev.to API error: Empty data error",
      );
    });
  });

  // 7. GET ME TESTS
  describe("getMe - Complete Coverage", () => {
    test("should fetch user info successfully", async () => {
      const mockResponse = {
        data: { id: 1, name: "Test User", username: "testuser" },
      };

      (client as any).client.get.mockResolvedValue(mockResponse);

      const result = await client.getMe();

      expect(result).toEqual(mockResponse.data);
      expect((client as any).client.get).toHaveBeenCalledWith("/users/me");
    });

    test("should handle getMe errors", async () => {
      const errorResponse = {
        response: { data: { error: "Custom error" } },
        isAxiosError: true,
      };

      (client as any).client.get.mockRejectedValue(errorResponse);

      await expect(client.getMe()).rejects.toThrow(
        "Dev.to API error: Custom error",
      );
    });
  });

  // 8. EDGE CASES AND ERROR SCENARIOS
  describe("Edge Cases and Error Scenarios", () => {
    test("should handle non-standard error formats", async () => {
      const errorResponse = {
        response: {
          data: { error_message: "Non-standard error format" },
        },
        isAxiosError: true,
        message: "Fallback error message",
      };

      (client as any).client.post.mockRejectedValue(errorResponse);

      await expect(client.publishPost(createBlogPost())).rejects.toThrow(
        "Dev.to API error: Fallback error message",
      );
    });

    test("should handle regular Error objects (no wrapping)", async () => {
      const error = new Error("Generic error");
      (client as any).client.post.mockRejectedValue(error);

      // Regular Error objects are NOT wrapped with "Dev.to API error: " prefix
      await expect(client.publishPost(createBlogPost())).rejects.toThrow(
        "Generic error",
      );
    });

    test("should handle errors with only message property", async () => {
      const errorResponse = {
        message: "Network error",
        isAxiosError: true,
      };

      (client as any).client.post.mockRejectedValue(errorResponse);

      await expect(client.publishPost(createBlogPost())).rejects.toThrow(
        "Dev.to API error: Network error",
      );
    });

    test("should handle axios errors with response data error", async () => {
      const errorResponse = {
        response: {
          data: { error: "Specific API error" },
        },
        isAxiosError: true,
        message: "Fallback message",
      };

      (client as any).client.post.mockRejectedValue(errorResponse);

      await expect(client.publishPost(createBlogPost())).rejects.toThrow(
        "Dev.to API error: Specific API error",
      );
    });

    test("should handle axios errors without response data", async () => {
      const errorResponse = {
        response: {},
        isAxiosError: true,
        message: "Response error",
      };

      (client as any).client.post.mockRejectedValue(errorResponse);

      await expect(client.publishPost(createBlogPost())).rejects.toThrow(
        "Dev.to API error: Response error",
      );
    });
  });
});
