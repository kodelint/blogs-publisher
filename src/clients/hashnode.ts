// hashnode.ts
import axios, { AxiosInstance } from "axios";
import { BlogPost, HashnodePost, HashnodePostResponse } from "../types";
import { logger } from "../utils/logger";

export class HashnodeClient {
  private client: AxiosInstance;

  constructor(token: string) {
    logger.debug("Initializing Hashnode client");
    this.client = axios.create({
      baseURL: "https://gql.hashnode.com",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
    });
    logger.debug("Hashnode client initialized");
  }

  private generateSlug(title: string): string {
    logger.debug(`Generating slug from title: ${title}`);
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
    logger.debug(`Generated slug: ${slug}`);
    return slug;
  }

  // Convert BlogPost to HashnodePost format
  private convertToHashnodePost(
    blogPost: BlogPost,
    publicationId?: string,
  ): HashnodePost {
    logger.debug("Converting blog post to Hashnode format");
    const slug = blogPost.slug || this.generateSlug(blogPost.title);

    // Handle publishedAt date conversion
    let publishedAt: string | undefined;
    if (blogPost.publishedAt) {
      publishedAt = new Date(blogPost.publishedAt).toISOString();
      logger.debug(`Using publishedAt: ${publishedAt}`);
    } else if (blogPost.date) {
      // Some Markdown processors might use 'date' instead of 'publishedAt'
      publishedAt = new Date(blogPost.date).toISOString();
      logger.debug(`Using date as publishedAt: ${publishedAt}`);
    }

    const hashnodePost = {
      title: blogPost.title,
      contentMarkdown: blogPost.content,
      tags: blogPost.tags.map((tag) => ({ name: tag })),
      coverImageURL: blogPost.cover_image, // Map cover_image to coverImageURL
      slug,
      subtitle: blogPost.subtitle || blogPost.description, // Use subtitle if available, fallback to description
      originalArticleURL: blogPost.canonical_url,
      publicationId,
      disableComments: false,
      publishedAt,
    };

    logger.debug(
      `Converted to Hashnode post format with ${blogPost.tags.length} tags`,
    );
    return hashnodePost;
  }

  async publishPost(
    blogPost: BlogPost,
    publicationId?: string,
  ): Promise<{ id: string; url: string }> {
    try {
      logger.info(`Publishing to Hashnode: ${blogPost.title}`);

      if (!publicationId) {
        logger.error("Hashnode publication ID not provided");
        throw new Error("Hashnode publication ID not provided");
      }

      logger.debug(`Using publication ID: ${publicationId}`);
      const hashnodePost = this.convertToHashnodePost(blogPost, publicationId);

      const mutation = `
        mutation PublishPost($input: PublishPostInput!) {
          publishPost(input: $input) {
            post {
              id
              slug
              url
              title
            }
          }
        }
      `;

      const variables = {
        input: {
          title: hashnodePost.title,
          contentMarkdown: hashnodePost.contentMarkdown,
          tags: hashnodePost.tags?.map((tag) => ({
            name: tag.name,
            slug: tag.name.toLowerCase().replace(/\s+/g, "-"),
          })),
          slug: hashnodePost.slug,
          coverImageOptions: hashnodePost.coverImageURL
            ? {
                coverImageURL: hashnodePost.coverImageURL,
              }
            : undefined,
          subtitle: hashnodePost.subtitle,
          publicationId: hashnodePost.publicationId,
          originalArticleURL: hashnodePost.originalArticleURL,
          disableComments: hashnodePost.disableComments,
          publishedAt: hashnodePost.publishedAt,
          metaTags: {
            title: hashnodePost.title,
            description: hashnodePost.subtitle,
            image: hashnodePost.coverImageURL,
          },
        },
      };

      logger.debug("Sending GraphQL mutation to Hashnode");
      const response = await this.client.post("", {
        query: mutation,
        variables,
      });

      if (response.data.errors) {
        const errorMessage = `Hashnode GraphQL errors: ${JSON.stringify(response.data.errors)}`;
        logger.error(errorMessage);
        throw new Error(errorMessage);
      }

      const post = response.data.data.publishPost.post;
      logger.info(`Successfully published to Hashnode: ${post.url}`);
      logger.debug(`Post ID: ${post.id}, Slug: ${post.slug}`);

      return {
        id: post.id,
        url: post.url,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage =
          error.response?.data?.errors?.[0]?.message ||
          error.response?.data?.message ||
          error.message;
        logger.error(`Hashnode API error: ${errorMessage}`);
        if (error.response?.data?.errors) {
          logger.debug(
            `Hashnode GraphQL errors: ${JSON.stringify(error.response.data.errors)}`,
          );
        }
        throw new Error(`Hashnode API error: ${errorMessage}`);
      }
      logger.error(`Unexpected error publishing to Hashnode: ${error}`);
      throw error;
    }
  }

  async getPost(slug: string): Promise<HashnodePostResponse | null> {
    try {
      logger.debug(`Fetching Hashnode post: ${slug}`);
      const query = `
        query GetPost($slug: String!) {
          post(slug: $slug) {
            id
            title
            slug
            url
            contentMarkdown
            tags {
              name
              slug
            }
            coverImage {
              url
            }
            subtitle
            dateAdded
            author {
              username
              name
            }
          }
        }
      `;

      const response = await this.client.post("", {
        query,
        variables: { slug },
      });

      if (response.data.errors) {
        const errorMessage = `Hashnode GraphQL errors: ${JSON.stringify(response.data.errors)}`;
        logger.error(errorMessage);
        throw new Error(errorMessage);
      }

      logger.debug(
        `Retrieved Hashnode post: ${response.data.data.post?.title}`,
      );
      return response.data.data.post;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage =
          error.response?.data?.errors?.[0]?.message || error.message;
        logger.error(`Error fetching Hashnode post: ${errorMessage}`);
        throw new Error(`Hashnode API error: ${errorMessage}`);
      }
      logger.error(`Unexpected error fetching Hashnode post: ${error}`);
      throw error;
    }
  }

  async getMe(): Promise<{
    id: string;
    username: string;
    name: string;
    tagline?: string;
    photo?: string;
    publicationDomain?: string;
    publications?: Array<{
      id: string;
      title: string;
      domain: string;
    }>;
  }> {
    try {
      logger.debug("Fetching Hashnode user info");
      const query = `
        query Me {
          me {
            id
            username
            name
            tagline
            photo
            publicationDomain
            publications {
              id
              title
              domain
            }
          }
        }
      `;

      const response = await this.client.post("", {
        query,
      });

      if (response.data.errors) {
        const errorMessage = `Hashnode GraphQL errors: ${JSON.stringify(response.data.errors)}`;
        logger.error(errorMessage);
        throw new Error(errorMessage);
      }

      const userData = response.data.data.me;
      logger.debug(`Retrieved Hashnode user: ${userData.username}`);
      logger.debug(
        `User has ${userData.publications?.length || 0} publications`,
      );

      return userData;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage =
          error.response?.data?.errors?.[0]?.message || error.message;
        logger.error(`Error fetching Hashnode user info: ${errorMessage}`);
        throw new Error(`Hashnode API error: ${errorMessage}`);
      }
      logger.error(`Unexpected error fetching Hashnode user info: ${error}`);
      throw error;
    }
  }

  async getUserPosts(username: string): Promise<any[]> {
    try {
      logger.debug(`Fetching Hashnode posts for user: ${username}`);
      const query = `
        query GetUserPosts($username: String!) {
          user(username: $username) {
            posts(page: 0) {
              id
              title
              slug
              url
              dateAdded
              tags {
                name
              }
            }
          }
        }
      `;

      const response = await this.client.post("", {
        query,
        variables: { username },
      });

      if (response.data.errors) {
        const errorMessage = `Hashnode GraphQL errors: ${JSON.stringify(response.data.errors)}`;
        logger.error(errorMessage);
        throw new Error(errorMessage);
      }

      const posts = response.data.data.user.posts;
      logger.debug(`Retrieved ${posts.length} posts for ${username}`);
      return posts;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage =
          error.response?.data?.errors?.[0]?.message || error.message;
        logger.error(`Error fetching Hashnode user posts: ${errorMessage}`);
        throw new Error(`Hashnode API error: ${errorMessage}`);
      }
      logger.error(`Unexpected error fetching Hashnode user posts: ${error}`);
      throw error;
    }
  }
}
