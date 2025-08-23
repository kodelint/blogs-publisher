import axios, { AxiosInstance } from "axios";
import { BlogPost, DevToPost } from "../types";

export class DevtoClient {
  private client: AxiosInstance;

  constructor(private apiKey: string) {
    this.client = axios.create({
      baseURL: "https://dev.to/api",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
    });
  }

  async publishPost(blogPost: BlogPost): Promise<{ id: number; url: string }> {
    try {
      const devtoPost: DevToPost = {
        title: blogPost.title,
        body_markdown: blogPost.content,
        published: blogPost.published !== false,
        tags: blogPost.tags.slice(0, 4), // Dev.to allows max 4 tags
        series: blogPost.series,
        canonical_url: blogPost.canonical_url,
        description: blogPost.description,
        cover_image: blogPost.cover_image,
        main_image: blogPost.cover_image,
      };

      const response = await this.client.post("/articles", {
        article: devtoPost,
      });

      return {
        id: response.data.id,
        url: response.data.url,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage =
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message;
        throw new Error(`Dev.to API error: ${errorMessage}`);
      }
      throw error;
    }
  }

  async getPost(postId: number): Promise<any> {
    try {
      const response = await this.client.get(`/articles/${postId}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Dev.to API error: ${error.response?.data?.error || error.message}`,
        );
      }
      throw error;
    }
  }

  async getUserPosts(username: string): Promise<any[]> {
    try {
      const response = await this.client.get(`/articles?username=${username}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Dev.to API error: ${error.response?.data?.error || error.message}`,
        );
      }
      throw error;
    }
  }

  async updatePost(
    postId: number,
    blogPost: BlogPost,
  ): Promise<{ id: number; url: string }> {
    try {
      const devtoPost: DevToPost = {
        title: blogPost.title,
        body_markdown: blogPost.content,
        published: blogPost.published !== false,
        tags: blogPost.tags.slice(0, 4),
        series: blogPost.series,
        canonical_url: blogPost.canonical_url,
        description: blogPost.description,
        cover_image: blogPost.cover_image,
        main_image: blogPost.cover_image,
      };

      const response = await this.client.put(`/articles/${postId}`, {
        article: devtoPost,
      });

      return {
        id: response.data.id,
        url: response.data.url,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Dev.to API error: ${error.response?.data?.error || error.message}`,
        );
      }
      throw error;
    }
  }

  async getMe(): Promise<any> {
    try {
      const response = await this.client.get("/users/me");
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Dev.to API error: ${error.response?.data?.error || error.message}`,
        );
      }
      throw error;
    }
  }
}
