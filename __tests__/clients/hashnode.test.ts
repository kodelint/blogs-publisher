import axios from "axios";
import { HashnodeClient } from "../../src/clients/hashnode";
import { BlogPost } from "../../src/types";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("HashnodeClient", () => {
  let client: HashnodeClient;
  let mockAxiosInstance: jest.Mocked<any>;

  beforeEach(() => {
    mockAxiosInstance = {
      post: jest.fn(),
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    client = new HashnodeClient("test-token");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("HashnodeClient - Error Handling", () => {
    it("should throw error when publication ID is not provided", async () => {
      const blogPost: BlogPost = {
        title: "Test Post",
        content: "Content",
        tags: [],
        published: true,
      };

      await expect(client.publishPost(blogPost, undefined)).rejects.toThrow(
        "Hashnode publication ID not provided",
      );
    });

    it("should throw error when publication ID is empty string", async () => {
      const blogPost: BlogPost = {
        title: "Test Post",
        content: "Content",
        tags: [],
        published: true,
      };

      await expect(client.publishPost(blogPost, "")).rejects.toThrow(
        "Hashnode publication ID not provided",
      );
    });

    it("should handle non-Axios errors in publishPost", async () => {
      const blogPost: BlogPost = {
        title: "Test Post",
        content: "Content",
        tags: [],
        published: true,
      };

      const error = new Error("Generic error");
      mockedAxios.isAxiosError.mockReturnValue(false);
      mockAxiosInstance.post.mockRejectedValueOnce(error);

      await expect(client.publishPost(blogPost, "pub-id")).rejects.toThrow(
        "Generic error",
      );
    });

    it("should handle Axios errors without response in publishPost", async () => {
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

      await expect(client.publishPost(blogPost, "pub-id")).rejects.toThrow(
        "Hashnode API error: Network error",
      );
    });

    it("should handle GraphQL errors in publishPost", async () => {
      const blogPost: BlogPost = {
        title: "Test Post",
        content: "Content",
        tags: [],
        published: true,
      };

      const errorResponse = {
        data: {
          errors: [{ message: "GraphQL validation error" }],
        },
      };

      mockAxiosInstance.post.mockResolvedValueOnce(errorResponse);

      await expect(client.publishPost(blogPost, "pub-id")).rejects.toThrow(
        'Hashnode GraphQL errors: [{"message":"GraphQL validation error"}]',
      );
    });
  });

  describe("generateSlug", () => {
    it("should generate proper slug from title", () => {
      const slug = (client as any).generateSlug("My Awesome Blog Post!");
      expect(slug).toBe("my-awesome-blog-post");
    });

    it("should handle special characters", () => {
      const slug = (client as any).generateSlug("React & Vue.js: A Comparison");
      expect(slug).toBe("react-vuejs-a-comparison");
    });

    it("should handle multiple spaces and dashes", () => {
      const slug = (client as any).generateSlug("Test    Post   With   Spaces");
      expect(slug).toBe("test-post-with-spaces");
    });

    it("should handle empty string", () => {
      const slug = (client as any).generateSlug("");
      expect(slug).toBe("");
    });

    it("should handle string with only special characters", () => {
      const slug = (client as any).generateSlug("!@#$%^&*()");
      expect(slug).toBe("");
    });
  });

  describe("publishPost", () => {
    it("should publish a post successfully", async () => {
      const blogPost: BlogPost = {
        title: "Test Post",
        content: "# Test Post\n\nThis is content.",
        tags: ["javascript", "tutorial"],
        published: true,
        description: "Test description",
        cover_image: "https://example.com/image.jpg",
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          data: {
            publishPost: {
              post: {
                id: "123",
                url: "https://hashnode.com/post/123",
                slug: "test-post",
                title: "Test Post",
              },
            },
          },
        },
      });

      const result = await client.publishPost(blogPost, "test-publication-id");

      expect(result.id).toBe("123");
      expect(result.url).toBe("https://hashnode.com/post/123");
    });

    it("should use custom slug if provided", async () => {
      const blogPost: BlogPost = {
        title: "Test Post",
        content: "Content",
        tags: [],
        published: true,
        slug: "custom-slug",
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          data: {
            publishPost: {
              post: {
                id: "123",
                url: "https://hashnode.com/post/123",
                slug: "custom-slug",
                title: "Test Post",
              },
            },
          },
        },
      });

      const result = await client.publishPost(blogPost, "test-publication-id");

      expect(result.id).toBe("123");
    });

    it("should handle GraphQL errors", async () => {
      const blogPost: BlogPost = {
        title: "Test Post",
        content: "Content",
        tags: [],
        published: true,
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          errors: [{ message: "Invalid publication ID" }],
        },
      });

      await expect(
        client.publishPost(blogPost, "test-publication-id"),
      ).rejects.toThrow(
        'Hashnode GraphQL errors: [{"message":"Invalid publication ID"}]',
      );
    });

    it("should handle axios errors", async () => {
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
            errors: [{ message: "Authentication failed" }],
          },
        },
      };

      mockedAxios.isAxiosError.mockReturnValue(true);
      mockAxiosInstance.post.mockRejectedValueOnce(error);

      await expect(
        client.publishPost(blogPost, "test-publication-id"),
      ).rejects.toThrow("Hashnode API error: Authentication failed");
    });

    it("should handle empty tags array", async () => {
      const blogPost: BlogPost = {
        title: "Test Post",
        content: "Content",
        tags: [],
        published: true,
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          data: {
            publishPost: {
              post: {
                id: "123",
                url: "https://hashnode.com/post/123",
                slug: "test-post",
                title: "Test Post",
              },
            },
          },
        },
      });

      const result = await client.publishPost(blogPost, "test-publication-id");

      expect(result.id).toBe("123");
    });

    it("should handle undefined cover image", async () => {
      const blogPost: BlogPost = {
        title: "Test Post",
        content: "Content",
        tags: ["test"],
        published: true,
        // cover_image is undefined
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          data: {
            publishPost: {
              post: {
                id: "123",
                url: "https://hashnode.com/post/123",
                slug: "test-post",
                title: "Test Post",
              },
            },
          },
        },
      });

      const result = await client.publishPost(blogPost, "test-publication-id");

      expect(result.id).toBe("123");
    });

    it("should handle undefined canonical URL", async () => {
      const blogPost: BlogPost = {
        title: "Test Post",
        content: "Content",
        tags: ["test"],
        published: true,
        cover_image: "https://example.com/image.jpg",
        // canonical_url is undefined
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          data: {
            publishPost: {
              post: {
                id: "123",
                url: "https://hashnode.com/post/123",
                slug: "test-post",
                title: "Test Post",
              },
            },
          },
        },
      });

      const result = await client.publishPost(blogPost, "test-publication-id");

      expect(result.id).toBe("123");
    });

    it("should handle undefined description", async () => {
      const blogPost: BlogPost = {
        title: "Test Post",
        content: "Content",
        tags: ["test"],
        published: true,
        // description is undefined
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          data: {
            publishPost: {
              post: {
                id: "123",
                url: "https://hashnode.com/post/123",
                slug: "test-post",
                title: "Test Post",
              },
            },
          },
        },
      });

      const result = await client.publishPost(blogPost, "test-publication-id");

      expect(result.id).toBe("123");
    });
  });

  describe("getPost", () => {
    it("should get a post by slug", async () => {
      const mockPost = {
        id: "post-123",
        title: "Test Post",
        slug: "test-post",
        url: "https://example.com/test-post",
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          data: {
            post: mockPost,
          },
        },
      });

      const result = await client.getPost("test-post");

      expect(result).toEqual(mockPost);

      const query = mockAxiosInstance.post.mock.calls[0][1];
      expect(query.variables.slug).toBe("test-post");
    });

    it("should handle GraphQL errors in getPost", async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          errors: [{ message: "Post not found" }],
        },
      });

      await expect(client.getPost("invalid-slug")).rejects.toThrow(
        'Hashnode GraphQL errors: [{"message":"Post not found"}]',
      );
    });

    it("should handle Axios errors in getPost", async () => {
      const error = {
        isAxiosError: true,
        response: {
          data: {
            errors: [{ message: "Network error" }],
          },
        },
      };

      mockedAxios.isAxiosError.mockReturnValue(true);
      mockAxiosInstance.post.mockRejectedValueOnce(error);

      await expect(client.getPost("test-slug")).rejects.toThrow(
        "Hashnode API error: Network error",
      );
    });
  });

  describe("getMe", () => {
    it("should get current user info", async () => {
      const mockUser = {
        id: "user-123",
        username: "testuser",
        name: "Test User",
        publications: [],
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          data: {
            me: mockUser,
          },
        },
      });

      const result = await client.getMe();

      expect(result).toEqual(mockUser);
    });

    it("should handle errors in getMe", async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          errors: [{ message: "Authentication required" }],
        },
      });

      await expect(client.getMe()).rejects.toThrow(
        'Hashnode GraphQL errors: [{"message":"Authentication required"}]',
      );
    });
  });

  describe("getUserPosts", () => {
    it("should get user posts", async () => {
      const mockPosts = [
        { id: "post-1", title: "Post 1" },
        { id: "post-2", title: "Post 2" },
      ];

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          data: {
            user: {
              posts: mockPosts,
            },
          },
        },
      });

      const result = await client.getUserPosts("testuser");

      expect(result).toEqual(mockPosts);

      const query = mockAxiosInstance.post.mock.calls[0][1];
      expect(query.variables.username).toBe("testuser");
    });

    it("should handle empty user posts", async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          data: {
            user: {
              posts: [],
            },
          },
        },
      });

      const result = await client.getUserPosts("emptyuser");

      expect(result).toEqual([]);
    });

    it("should handle errors in getUserPosts", async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          errors: [{ message: "User not found" }],
        },
      });

      await expect(client.getUserPosts("nonexistent")).rejects.toThrow(
        'Hashnode GraphQL errors: [{"message":"User not found"}]',
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle non-Axios errors in getPost", async () => {
      const error = new Error("Generic error");
      mockedAxios.isAxiosError.mockReturnValue(false);
      mockAxiosInstance.post.mockRejectedValueOnce(error);

      await expect(client.getPost("test-slug")).rejects.toThrow(
        "Generic error",
      );
    });

    it("should handle non-Axios errors in getMe", async () => {
      const error = new Error("Generic error");
      mockedAxios.isAxiosError.mockReturnValue(false);
      mockAxiosInstance.post.mockRejectedValueOnce(error);

      await expect(client.getMe()).rejects.toThrow("Generic error");
    });

    it("should handle non-Axios errors in getUserPosts", async () => {
      const error = new Error("Generic error");
      mockedAxios.isAxiosError.mockReturnValue(false);
      mockAxiosInstance.post.mockRejectedValueOnce(error);

      await expect(client.getUserPosts("testuser")).rejects.toThrow(
        "Generic error",
      );
    });

    it("should handle Axios errors without response in getPost", async () => {
      const error = {
        isAxiosError: true,
        message: "Network error",
      };

      mockedAxios.isAxiosError.mockReturnValue(true);
      mockAxiosInstance.post.mockRejectedValueOnce(error);

      await expect(client.getPost("test-slug")).rejects.toThrow(
        "Hashnode API error: Network error",
      );
    });
  });
});
