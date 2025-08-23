import axios from "axios";
import { MediumClient } from "../../src/clients/medium";
import { BlogPost } from "../../src/types";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("MediumClient", () => {
  let client: MediumClient;
  let mockAxiosInstance: jest.Mocked<any>;

  beforeEach(() => {
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    client = new MediumClient("test-token");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("MediumClient - Error Handling", () => {
    beforeEach(() => {
      // Mock getUserId to succeed by default
      jest
        .spyOn(MediumClient.prototype as any, "getUserId")
        .mockResolvedValue("test-user-id");
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should handle non-Axios errors in publishPost", async () => {
      const client = new MediumClient("test-token");
      const blogPost: BlogPost = {
        title: "Test Post",
        content: "Content",
        tags: [],
        published: true,
      };

      // Mock getUserId to throw an error
      jest
        .spyOn(MediumClient.prototype as any, "getUserId")
        .mockRejectedValueOnce(new Error("Generic error"));

      await expect(client.publishPost(blogPost)).rejects.toThrow(
        "Generic error",
      );
    });

    it("should handle Axios errors without response in publishPost", async () => {
      const client = new MediumClient("test-token");
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
        "Medium API error: Network error",
      );
    });
  });

  describe("getUserId", () => {
    it("should get user ID from API", async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          data: { id: "user-123" },
        },
      });

      const userId = await (client as any).getUserId();
      expect(userId).toBe("user-123");
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/me");
    });

    it("should cache user ID", async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          data: { id: "user-123" },
        },
      });

      await (client as any).getUserId();
      const userId = await (client as any).getUserId();

      expect(userId).toBe("user-123");
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    });

    it("should handle API error", async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error("API Error"));

      await expect((client as any).getUserId()).rejects.toThrow(
        "Failed to get Medium user info",
      );
    });
  });

  describe("publishPost", () => {
    beforeEach(() => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          data: { id: "user-123" },
        },
      });
    });

    it("should publish a post successfully", async () => {
      const blogPost: BlogPost = {
        title: "Test Post",
        content: "# Test Post\n\nThis is content.",
        tags: ["javascript", "tutorial"],
        published: true,
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          data: {
            id: "post-456",
            url: "https://medium.com/@user/test-post-abc123",
          },
        },
      });

      const result = await client.publishPost(blogPost);

      expect(result.id).toBe("post-456");
      expect(result.url).toBe("https://medium.com/@user/test-post-abc123");
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        "/users/user-123/posts",
        {
          title: "Test Post",
          contentFormat: "markdown",
          content: "# Test Post\n\nThis is content.",
          tags: ["javascript", "tutorial"],
          publishStatus: "public",
          canonicalUrl: undefined,
          notifyFollowers: true,
        },
      );
    });

    it("should limit tags to 5", async () => {
      const blogPost: BlogPost = {
        title: "Test Post",
        content: "Content",
        tags: ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"],
        published: true,
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          data: { id: "post-456", url: "https://example.com" },
        },
      });

      await client.publishPost(blogPost);

      const postData = mockAxiosInstance.post.mock.calls[0][1];
      expect(postData.tags).toHaveLength(5);
    });

    it("should set draft status for unpublished posts", async () => {
      const blogPost: BlogPost = {
        title: "Test Post",
        content: "Content",
        tags: [],
        published: false,
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          data: { id: "post-456", url: "https://example.com" },
        },
      });

      await client.publishPost(blogPost);

      const postData = mockAxiosInstance.post.mock.calls[0][1];
      expect(postData.publishStatus).toBe("draft");
    });

    it("should handle API error with error message", async () => {
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
            errors: [{ message: "Invalid token" }],
          },
        },
      };

      mockedAxios.isAxiosError.mockReturnValue(true);
      mockAxiosInstance.post.mockRejectedValueOnce(error);

      await expect(client.publishPost(blogPost)).rejects.toThrow(
        "Medium API error: Invalid token",
      );
    });
  });

  describe("getPost", () => {
    it("should get a post by ID", async () => {
      const mockPost = { id: "post-123", title: "Test Post" };
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { data: mockPost },
      });

      const result = await client.getPost("post-123");

      expect(result).toEqual(mockPost);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/posts/post-123");
    });

    it("should handle API error", async () => {
      const error = {
        isAxiosError: true,
        response: {
          data: {
            errors: [{ message: "Post not found" }],
          },
        },
      };

      mockedAxios.isAxiosError.mockReturnValue(true);
      mockAxiosInstance.get.mockRejectedValueOnce(error);

      await expect(client.getPost("invalid-id")).rejects.toThrow(
        "Medium API error: Post not found",
      );
    });
  });

  describe("getUserPosts", () => {
    beforeEach(() => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          data: { id: "user-123" },
        },
      });
    });

    it("should get user posts", async () => {
      const mockPosts = [
        { id: "post-1", title: "Post 1" },
        { id: "post-2", title: "Post 2" },
      ];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { data: mockPosts },
      });

      const result = await client.getUserPosts();

      expect(result).toEqual(mockPosts);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        "/users/user-123/posts",
      );
    });
  });

  // In medium.test.ts, update the edge case test:

  describe("MediumClient - Edge Cases", () => {
    beforeEach(() => {
      // Mock getUserId to succeed by default
      jest
        .spyOn(MediumClient.prototype as any, "getUserId")
        .mockResolvedValue("test-user-id");
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should handle Axios errors with message but no response in getUserId", async () => {
      const client = new MediumClient("test-token");
      const blogPost: BlogPost = {
        title: "Test Post",
        content: "Content",
        tags: [],
        published: true,
      };

      const error = {
        isAxiosError: true,
        message: "Custom error message",
        response: undefined, // No response object
      };

      // Mock getUserId to throw the error, not the publishPost call
      jest
        .spyOn(MediumClient.prototype as any, "getUserId")
        .mockRejectedValueOnce(error);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(client.publishPost(blogPost)).rejects.toThrow(
        "Medium API error: Custom error message",
      );
    });

    it("should handle Axios errors with empty errors array in getUserId", async () => {
      const client = new MediumClient("test-token");
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
            errors: [], // Empty errors array
          },
        },
      };

      // Mock getUserId to throw the error
      jest
        .spyOn(MediumClient.prototype as any, "getUserId")
        .mockRejectedValueOnce(error);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(client.publishPost(blogPost)).rejects.toThrow(
        "Medium API error: undefined",
      );
    });

    it("should handle non-Axios errors in getUserId", async () => {
      const client = new MediumClient("test-token");
      const blogPost: BlogPost = {
        title: "Test Post",
        content: "Content",
        tags: [],
        published: true,
      };

      const error = new Error("Generic getUserId error");
      jest
        .spyOn(MediumClient.prototype as any, "getUserId")
        .mockRejectedValueOnce(error);

      await expect(client.publishPost(blogPost)).rejects.toThrow(
        "Generic getUserId error",
      );
    });

    it("should handle Axios errors in getUserId", async () => {
      const client = new MediumClient("test-token");
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
            errors: [{ message: "User not found" }],
          },
        },
      };

      jest
        .spyOn(MediumClient.prototype as any, "getUserId")
        .mockRejectedValueOnce(error);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(client.publishPost(blogPost)).rejects.toThrow(
        "Medium API error: User not found",
      );
    });

    // Add tests for actual publishPost errors (after getUserId succeeds)
    it("should handle Axios errors in publishPost after successful getUserId", async () => {
      const client = new MediumClient("test-token");
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
            errors: [{ message: "Publish failed" }],
          },
        },
      };

      mockedAxios.isAxiosError.mockReturnValue(true);
      mockAxiosInstance.post.mockRejectedValueOnce(error);

      await expect(client.publishPost(blogPost)).rejects.toThrow(
        "Medium API error: Publish failed",
      );
    });

    it("should handle Axios errors with empty errors array in publishPost", async () => {
      const client = new MediumClient("test-token");
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
            errors: [], // Empty errors array
          },
        },
      };

      mockedAxios.isAxiosError.mockReturnValue(true);
      mockAxiosInstance.post.mockRejectedValueOnce(error);

      await expect(client.publishPost(blogPost)).rejects.toThrow(
        "Medium API error: undefined",
      );
    });

    it("should handle Axios errors with message but no response in publishPost", async () => {
      const client = new MediumClient("test-token");
      const blogPost: BlogPost = {
        title: "Test Post",
        content: "Content",
        tags: [],
        published: true,
      };

      const error = {
        isAxiosError: true,
        message: "Network error in publish",
        response: undefined, // No response object
      };

      mockedAxios.isAxiosError.mockReturnValue(true);
      mockAxiosInstance.post.mockRejectedValueOnce(error);

      await expect(client.publishPost(blogPost)).rejects.toThrow(
        "Medium API error: Network error in publish",
      );
    });
  });
});
