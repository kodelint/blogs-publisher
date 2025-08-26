import axios, { AxiosInstance } from "axios";
import { BlogPost, DevToPost } from "../types";
import { logger } from "../utils/logger";

export class DevtoClient {
  private client: AxiosInstance;

  constructor(apiKey: string) {
    logger.debug("Initializing Dev.to client");
    this.client = axios.create({
      baseURL: "https://dev.to/api",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
    });
    logger.debug("Dev.to client initialized");
  }

  async publishPost(blogPost: BlogPost): Promise<{ id: number; url: string }> {
    try {
      logger.info(`Publishing to Dev.to: ${blogPost.title}`);
      logger.debug(
        `Post content length: ${blogPost.content.length} characters`,
      );
      logger.debug(`Tags: ${blogPost.tags.join(", ")}`);

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

      logger.debug("Sending request to Dev.to API");
      const response = await this.client.post("/articles", {
        article: devtoPost,
      });

      logger.info(`Successfully published to Dev.to: ${response.data.url}`);
      logger.debug(`Post ID: ${response.data.id}`);

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
        logger.error(`Dev.to API error: ${errorMessage}`);
        if (error.response?.data) {
          logger.debug(
            `Dev.to API response: ${JSON.stringify(error.response.data)}`,
          );
        }
        throw new Error(`Dev.to API error: ${errorMessage}`);
      }
      logger.error(`Unexpected error publishing to Dev.to: ${error}`);
      throw error;
    }
  }

  async getPost(postId: number): Promise<any> {
    try {
      logger.debug(`Fetching Dev.to post: ${postId}`);
      const response = await this.client.get(`/articles/${postId}`);
      logger.debug(`Retrieved Dev.to post: ${response.data.title}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message;
        logger.error(`Error fetching Dev.to post: ${errorMessage}`);
        throw new Error(`Dev.to API error: ${errorMessage}`);
      }
      logger.error(`Unexpected error fetching Dev.to post: ${error}`);
      throw error;
    }
  }

  async getUserPosts(username: string): Promise<any[]> {
    try {
      logger.debug(`Fetching Dev.to posts for user: ${username}`);
      const response = await this.client.get(`/articles?username=${username}`);
      logger.debug(`Retrieved ${response.data.length} posts for ${username}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message;
        logger.error(`Error fetching Dev.to user posts: ${errorMessage}`);
        throw new Error(`Dev.to API error: ${errorMessage}`);
      }
      logger.error(`Unexpected error fetching Dev.to user posts: ${error}`);
      throw error;
    }
  }

  async updatePost(
    postId: number,
    blogPost: BlogPost,
  ): Promise<{ id: number; url: string }> {
    try {
      logger.info(`Updating Dev.to post: ${postId}`);
      logger.debug(`New title: ${blogPost.title}`);

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

      logger.info(`Successfully updated Dev.to post: ${response.data.url}`);
      return {
        id: response.data.id,
        url: response.data.url,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message;
        logger.error(`Error updating Dev.to post: ${errorMessage}`);
        throw new Error(`Dev.to API error: ${errorMessage}`);
      }
      logger.error(`Unexpected error updating Dev.to post: ${error}`);
      throw error;
    }
  }

  async getMe(): Promise<any> {
    try {
      logger.debug("Fetching Dev.to user info");
      const response = await this.client.get("/users/me");
      logger.debug(`Retrieved Dev.to user: ${response.data.name}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message;
        logger.error(`Error fetching Dev.to user info: ${errorMessage}`);
        throw new Error(`Dev.to API error: ${errorMessage}`);
      }
      logger.error(`Unexpected error fetching Dev.to user info: ${error}`);
      throw error;
    }
  }
}
