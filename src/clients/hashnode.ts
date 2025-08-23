import axios, { AxiosInstance } from "axios";
import { BlogPost } from "../types";

export class HashnodeClient {
  private client: AxiosInstance;

  constructor(private token: string) {
    this.client = axios.create({
      baseURL: "https://gql.hashnode.com",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
    });
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }

  async publishPost(
    blogPost: BlogPost,
    publicationId?: string,
  ): Promise<{ id: string; url: string }> {
    try {
      // Validate that publication ID is provided
      const actualPublicationId = publicationId;
      if (!actualPublicationId) {
        throw new Error("Hashnode publication ID not provided");
      }

      const slug = blogPost.slug || this.generateSlug(blogPost.title);

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
          title: blogPost.title,
          contentMarkdown: blogPost.content,
          tags: blogPost.tags.map((tag) => ({
            name: tag,
            slug: tag.toLowerCase().replace(/\s+/g, "-"),
          })),
          slug,
          coverImageOptions: blogPost.cover_image
            ? {
                coverImageURL: blogPost.cover_image,
              }
            : undefined,
          subtitle: blogPost.description,
          publicationId: actualPublicationId,
          originalArticleURL: blogPost.canonical_url,
          disableComments: false,
          metaTags: {
            title: blogPost.title,
            description: blogPost.description,
            image: blogPost.cover_image,
          },
        },
      };

      const response = await this.client.post("", {
        query: mutation,
        variables,
      });

      if (response.data.errors) {
        throw new Error(
          `Hashnode GraphQL errors: ${JSON.stringify(response.data.errors)}`,
        );
      }

      const post = response.data.data.publishPost.post;
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
        throw new Error(`Hashnode API error: ${errorMessage}`);
      }
      throw error;
    }
  }

  async getPost(slug: string): Promise<any> {
    try {
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
        throw new Error(
          `Hashnode GraphQL errors: ${JSON.stringify(response.data.errors)}`,
        );
      }

      return response.data.data.post;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Hashnode API error: ${error.response?.data?.errors?.[0]?.message || error.message}`,
        );
      }
      throw error;
    }
  }

  async getMe(): Promise<any> {
    try {
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
        throw new Error(
          `Hashnode GraphQL errors: ${JSON.stringify(response.data.errors)}`,
        );
      }

      return response.data.data.me;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Hashnode API error: ${error.response?.data?.errors?.[0]?.message || error.message}`,
        );
      }
      throw error;
    }
  }

  async getUserPosts(username: string): Promise<any[]> {
    try {
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
        throw new Error(
          `Hashnode GraphQL errors: ${JSON.stringify(response.data.errors)}`,
        );
      }

      return response.data.data.user.posts;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Hashnode API error: ${error.response?.data?.errors?.[0]?.message || error.message}`,
        );
      }
      throw error;
    }
  }
}
