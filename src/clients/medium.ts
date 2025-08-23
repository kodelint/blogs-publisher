import axios, { AxiosInstance } from "axios";
import { BlogPost, MediumPost } from "../types";

export class MediumClient {
  private client: AxiosInstance;
  private userId?: string;

  constructor(private token: string) {
    this.client = axios.create({
      baseURL: "https://api.medium.com/v1",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  }

  private async getUserId(): Promise<string> {
    if (this.userId) {
      return this.userId!;
    }

    try {
      const response = await this.client.get("/me");
      this.userId = response.data.data.id;
      return this.userId!;
    } catch (error) {
      throw new Error(`Failed to get Medium user info: ${error}`);
    }
  }

  async publishPost(blogPost: BlogPost): Promise<{ id: string; url: string }> {
    try {
      const userId = await this.getUserId();

      const mediumPost: MediumPost = {
        title: blogPost.title,
        contentFormat: "markdown",
        content: blogPost.content,
        tags: blogPost.tags.slice(0, 5), // Medium allows max 5 tags
        publishStatus: blogPost.published === false ? "draft" : "public",
        canonicalUrl: blogPost.canonical_url,
        notifyFollowers: true,
      };

      const response = await this.client.post(
        `/users/${userId}/posts`,
        mediumPost,
      );

      return {
        id: response.data.data.id,
        url: response.data.data.url,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Medium API error: ${error.response?.data?.errors?.[0]?.message || error.message}`,
        );
      }
      throw error;
    }
  }

  async getPost(postId: string): Promise<any> {
    try {
      const response = await this.client.get(`/posts/${postId}`);
      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Medium API error: ${error.response?.data?.errors?.[0]?.message || error.message}`,
        );
      }
      throw error;
    }
  }

  async getUserPosts(): Promise<any[]> {
    try {
      const userId = await this.getUserId();
      const response = await this.client.get(`/users/${userId}/posts`);
      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Medium API error: ${error.response?.data?.errors?.[0]?.message || error.message}`,
        );
      }
      throw error;
    }
  }
}
