import axios from "axios";
import { DevtoClient } from "../../src/clients/devto";
import { BlogPost } from "../../src/types";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("DevtoClient", () => {
  let client: DevtoClient;
  let mockAxiosInstance: jest.Mocked<any>;

  beforeEach(() => {
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    client = new DevtoClient("test-api-key");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Add these tests to devto.test.ts

  describe("DevtoClient - Error Handling", () => {
    it("should handle non-Axios errors", async () => {
      const client = new DevtoClient("test-api-key");
      const blogPost: BlogPost = {
        title: "Test Post",
        content: "Content",
        tags: [],
        published: true,
      };

      const error = new Error("Generic error");
      mockedAxios.isAxiosError.mockReturnValue(false);
      mockAxiosInstance.post.mockRejectedValueOnce(error);

      await expect(client.publishPost(blogPost)).rejects.toThrow(
        "Generic error",
      );
    });

    it("should handle Axios errors without response", async () => {
      const client = new DevtoClient("test-api-key");
      const blogPost: BlogPost = {
        title: "Test Post",
        content: "Content",
        tags: [],
        published: true,
      };

      const error = {
        isAxiosError: true,
        message: "Network error",
      };

      mockedAxios.isAxiosError.mockReturnValue(true);
      mockAxiosInstance.post.mockRejectedValueOnce(error);

      await expect(client.publishPost(blogPost)).rejects.toThrow(
        "Dev.to API error: Network error",
      );
    });

    it("should handle non-Axios errors in publishPost", async () => {
      const client = new DevtoClient("test-api-key");
      const blogPost: BlogPost = {
        title: "Test Post",
        content: "Content",
        tags: [],
        published: true,
      };

      const error = new Error("Generic error");
      mockedAxios.isAxiosError.mockReturnValue(false);
      mockAxiosInstance.post.mockRejectedValueOnce(error);

      await expect(client.publishPost(blogPost)).rejects.toThrow(
        "Generic error",
      );
    });

    it("should handle Axios errors without response in publishPost", async () => {
      const client = new DevtoClient("test-api-key");
      const blogPost: BlogPost = {
        title: "Test Post",
        content: "Content",
        tags: [],
        published: true,
      };

      const error = {
        isAxiosError: true,
        message: "Network error",
      };

      mockedAxios.isAxiosError.mockReturnValue(true);
      mockAxiosInstance.post.mockRejectedValueOnce(error);

      await expect(client.publishPost(blogPost)).rejects.toThrow(
        "Dev.to API error: Network error",
      );
    });

    it("should handle non-Axios errors in getPost", async () => {
      const client = new DevtoClient("test-api-key");
      const error = new Error("Generic error");

      mockedAxios.isAxiosError.mockReturnValue(false);
      mockAxiosInstance.get.mockRejectedValueOnce(error);

      await expect(client.getPost(123)).rejects.toThrow("Generic error");
    });

    it("should handle non-Axios errors in getUserPosts", async () => {
      const client = new DevtoClient("test-api-key");
      const error = new Error("Generic error");

      mockedAxios.isAxiosError.mockReturnValue(false);
      mockAxiosInstance.get.mockRejectedValueOnce(error);

      await expect(client.getUserPosts("testuser")).rejects.toThrow(
        "Generic error",
      );
    });

    it("should handle non-Axios errors in updatePost", async () => {
      const client = new DevtoClient("test-api-key");
      const blogPost: BlogPost = {
        title: "Test Post",
        content: "Content",
        tags: [],
        published: true,
      };

      const error = new Error("Generic error");
      mockedAxios.isAxiosError.mockReturnValue(false);
      mockAxiosInstance.put.mockRejectedValueOnce(error);

      await expect(client.updatePost(123, blogPost)).rejects.toThrow(
        "Generic error",
      );
    });

    it("should handle non-Axios errors in getMe", async () => {
      const client = new DevtoClient("test-api-key");
      const error = new Error("Generic error");

      mockedAxios.isAxiosError.mockReturnValue(false);
      mockAxiosInstance.get.mockRejectedValueOnce(error);

      await expect(client.getMe()).rejects.toThrow("Generic error");
    });
  });

  describe("publishPost", () => {
    it("should publish a post successfully", async () => {
      const blogPost: BlogPost = {
        title: "Test Post",
        content: "# Test Post\n\nThis is content.",
        tags: ["javascript", "tutorial"],
        published: true,
        series: "My Series",
        canonical_url: "https://example.com/original",
        description: "Test description",
        cover_image: "https://example.com/image.jpg",
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          id: 123,
          url: "https://dev.to/user/test-post-123",
        },
      });

      const result = await client.publishPost(blogPost);

      expect(result.id).toBe(123);
      expect(result.url).toBe("https://dev.to/user/test-post-123");
      expect(mockAxiosInstance.post).toHaveBeenCalledWith("/articles", {
        article: {
          title: "Test Post",
          body_markdown: "# Test Post\n\nThis is content.",
          published: true,
          tags: ["javascript", "tutorial"],
          series: "My Series",
          canonical_url: "https://example.com/original",
          description: "Test description",
          cover_image: "https://example.com/image.jpg",
          main_image: "https://example.com/image.jpg",
        },
      });
    });

    it("should limit tags to 4", async () => {
      const blogPost: BlogPost = {
        title: "Test Post",
        content: "Content",
        tags: ["tag1", "tag2", "tag3", "tag4", "tag5"],
        published: true,
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { id: 123, url: "https://dev.to/test" },
      });

      await client.publishPost(blogPost);

      const articleData = mockAxiosInstance.post.mock.calls[0][1].article;
      expect(articleData.tags).toHaveLength(4);
      expect(articleData.tags).toEqual(["tag1", "tag2", "tag3", "tag4"]);
    });

    it("should handle unpublished posts", async () => {
      const blogPost: BlogPost = {
        title: "Draft Post",
        content: "Content",
        tags: [],
        published: false,
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { id: 123, url: "https://dev.to/test" },
      });

      await client.publishPost(blogPost);

      const articleData = mockAxiosInstance.post.mock.calls[0][1].article;
      expect(articleData.published).toBe(false);
    });

    it("should handle API error", async () => {
      const blogPost: BlogPost = {
        title: "Test Post",
        content: "Content",
        tags: [],
        published: true,
      };

      const error = {
        isAxiosError: true,
        response: {
          data: {
            error: "Validation failed",
          },
        },
      };

      mockedAxios.isAxiosError.mockReturnValue(true);
      mockAxiosInstance.post.mockRejectedValueOnce(error);

      await expect(client.publishPost(blogPost)).rejects.toThrow(
        "Dev.to API error: Validation failed",
      );
    });
  });

  describe("getPost", () => {
    it("should get a post by ID", async () => {
      const mockPost = {
        id: 123,
        title: "Test Post",
        url: "https://dev.to/test",
      };
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockPost,
      });

      const result = await client.getPost(123);

      expect(result).toEqual(mockPost);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/articles/123");
    });

    it("should handle API error", async () => {
      const error = {
        isAxiosError: true,
        response: {
          data: {
            error: "Article not found",
          },
        },
      };

      mockedAxios.isAxiosError.mockReturnValue(true);
      mockAxiosInstance.get.mockRejectedValueOnce(error);

      await expect(client.getPost(999)).rejects.toThrow(
        "Dev.to API error: Article not found",
      );
    });
  });

  describe("getUserPosts", () => {
    it("should get user posts", async () => {
      const mockPosts = [
        { id: 1, title: "Post 1" },
        { id: 2, title: "Post 2" },
      ];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockPosts,
      });

      const result = await client.getUserPosts("testuser");

      expect(result).toEqual(mockPosts);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        "/articles?username=testuser",
      );
    });
  });

  describe("updatePost", () => {
    it("should update a post successfully", async () => {
      const blogPost: BlogPost = {
        title: "Updated Post",
        content: "Updated content",
        tags: ["updated"],
        published: true,
      };

      mockAxiosInstance.put.mockResolvedValueOnce({
        data: {
          id: 123,
          url: "https://dev.to/user/updated-post-123",
        },
      });

      const result = await client.updatePost(123, blogPost);

      expect(result.id).toBe(123);
      expect(result.url).toBe("https://dev.to/user/updated-post-123");
      expect(mockAxiosInstance.put).toHaveBeenCalledWith("/articles/123", {
        article: {
          title: "Updated Post",
          body_markdown: "Updated content",
          published: true,
          tags: ["updated"],
          series: undefined,
          canonical_url: undefined,
          description: undefined,
          cover_image: undefined,
          main_image: undefined,
        },
      });
    });
  });

  describe("getMe", () => {
    it("should get current user info", async () => {
      const mockUser = { id: 1, username: "testuser", name: "Test User" };
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockUser,
      });

      const result = await client.getMe();

      expect(result).toEqual(mockUser);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/users/me");
    });
  });

  // Add to devto.test.ts
  describe("DevtoClient - Edge Cases", () => {
    it("should handle Axios errors without response data", async () => {
      const client = new DevtoClient("test-api-key");
      const blogPost: BlogPost = {
        title: "Test Post",
        content: "Content",
        tags: [],
        published: true,
      };

      const error = {
        isAxiosError: true,
        message: "Network error",
      };

      mockedAxios.isAxiosError.mockReturnValue(true);
      mockAxiosInstance.post.mockRejectedValueOnce(error);

      await expect(client.publishPost(blogPost)).rejects.toThrow(
        "Dev.to API error: Network error",
      );
    });

    it("should handle Axios errors with empty response", async () => {
      const client = new DevtoClient("test-api-key");
      const blogPost: BlogPost = {
        title: "Test Post",
        content: "Content",
        tags: [],
        published: true,
      };

      const error = {
        isAxiosError: true,
        response: {}, // Empty response
      };

      mockedAxios.isAxiosError.mockReturnValue(true);
      mockAxiosInstance.post.mockRejectedValueOnce(error);

      await expect(client.publishPost(blogPost)).rejects.toThrow(
        "Dev.to API error: undefined",
      );
    });
  });
  it("should handle Axios errors with empty error response in publishPost", async () => {
    const client = new DevtoClient("test-api-key");
    const blogPost: BlogPost = {
      title: "Test Post",
      content: "Content",
      tags: [],
      published: true,
    };

    const error = {
      isAxiosError: true,
      response: {
        data: {}, // Empty data object
      },
    };

    mockedAxios.isAxiosError.mockReturnValue(true);
    mockAxiosInstance.post.mockRejectedValueOnce(error);

    await expect(client.publishPost(blogPost)).rejects.toThrow(
      "Dev.to API error: undefined",
    );
  });

  it("should handle Axios errors with empty error response in getPost", async () => {
    const client = new DevtoClient("test-api-key");
    const error = {
      isAxiosError: true,
      response: {
        data: {}, // Empty data object
      },
    };

    mockedAxios.isAxiosError.mockReturnValue(true);
    mockAxiosInstance.get.mockRejectedValueOnce(error);

    await expect(client.getPost(123)).rejects.toThrow(
      "Dev.to API error: undefined",
    );
  });

  it("should handle Axios errors with empty error response in getUserPosts", async () => {
    const client = new DevtoClient("test-api-key");
    const error = {
      isAxiosError: true,
      response: {
        data: {}, // Empty data object
      },
    };

    mockedAxios.isAxiosError.mockReturnValue(true);
    mockAxiosInstance.get.mockRejectedValueOnce(error);

    await expect(client.getUserPosts("testuser")).rejects.toThrow(
      "Dev.to API error: undefined",
    );
  });

  it("should handle Axios errors with empty error response in updatePost", async () => {
    const client = new DevtoClient("test-api-key");
    const blogPost: BlogPost = {
      title: "Test Post",
      content: "Content",
      tags: [],
      published: true,
    };

    const error = {
      isAxiosError: true,
      response: {
        data: {}, // Empty data object
      },
    };

    mockedAxios.isAxiosError.mockReturnValue(true);
    mockAxiosInstance.put.mockRejectedValueOnce(error);

    await expect(client.updatePost(123, blogPost)).rejects.toThrow(
      "Dev.to API error: undefined",
    );
  });

  it("should handle Axios errors with empty error response in getMe", async () => {
    const client = new DevtoClient("test-api-key");
    const error = {
      isAxiosError: true,
      response: {
        data: {}, // Empty data object
      },
    };

    mockedAxios.isAxiosError.mockReturnValue(true);
    mockAxiosInstance.get.mockRejectedValueOnce(error);

    await expect(client.getMe()).rejects.toThrow("Dev.to API error: undefined");
  });
});
