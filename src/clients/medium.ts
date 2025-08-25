import axios, { AxiosInstance } from "axios";
import { BlogPost, MediumPost } from "../types";
import { logger } from "../utils/logger";

export class MediumClient {
  private client: AxiosInstance;
  private userId?: string;

  constructor(token: string) {
    logger.debug("Initializing Medium client");
    this.client = axios.create({
      baseURL: "https://api.medium.com/v1",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    logger.debug("Medium client initialized");
  }

  async getUserId(): Promise<string> {
    if (this.userId) {
      logger.debug(`Using cached user ID: ${this.userId}`);
      return this.userId!;
    }

    try {
      logger.debug("Fetching Medium user ID");
      const response = await this.client.get("/me");
      this.userId = response.data.data.id;
      logger.debug(`Retrieved Medium user ID: ${this.userId}`);
      return this.userId!;
    } catch (error) {
      logger.error(`Failed to get Medium user info: ${error}`);
      throw new Error(`Failed to get Medium user info: ${error}`);
    }
  }

  async publishPost(blogPost: BlogPost): Promise<{ id: string; url: string }> {
    try {
      logger.info(`Publishing to Medium: ${blogPost.title}`);
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

      logger.debug(`Publishing as ${mediumPost.publishStatus}`);
      logger.debug(`Tags: ${mediumPost.tags?.join(", ") || "none"}`);

      const response = await this.client.post(
        `/users/${userId}/posts`,
        mediumPost,
      );

      logger.info(
        `Successfully published to Medium: ${response.data.data.url}`,
      );
      logger.debug(`Post ID: ${response.data.data.id}`);

      return {
        id: response.data.data.id,
        url: response.data.data.url,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage =
          error.response?.data?.errors?.[0]?.message || error.message;
        logger.error(`Medium API error: ${errorMessage}`);
        if (error.response?.data?.errors) {
          logger.debug(
            `Medium API errors: ${JSON.stringify(error.response.data.errors)}`,
          );
        }
        throw new Error(`Medium API error: ${errorMessage}`);
      }
      logger.error(`Unexpected error publishing to Medium: ${error}`);
      throw error;
    }
  }

  async getPost(postId: string): Promise<any> {
    try {
      logger.debug(`Fetching Medium post: ${postId}`);
      const response = await this.client.get(`/posts/${postId}`);
      logger.debug(`Retrieved Medium post: ${response.data.data.title}`);
      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage =
          error.response?.data?.errors?.[0]?.message || error.message;
        logger.error(`Error fetching Medium post: ${errorMessage}`);
        throw new Error(`Medium API error: ${errorMessage}`);
      }
      logger.error(`Unexpected error fetching Medium post: ${error}`);
      throw error;
    }
  }

  async getUserPosts(): Promise<any[]> {
    try {
      logger.debug("Fetching Medium user posts");
      const userId = await this.getUserId();
      const response = await this.client.get(`/users/${userId}/posts`);
      logger.debug(`Retrieved ${response.data.data.length} Medium posts`);
      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage =
          error.response?.data?.errors?.[0]?.message || error.message;
        logger.error(`Error fetching Medium user posts: ${errorMessage}`);
        throw new Error(`Medium API error: ${errorMessage}`);
      }
      logger.error(`Unexpected error fetching Medium user posts: ${error}`);
      throw error;
    }
  }
}
