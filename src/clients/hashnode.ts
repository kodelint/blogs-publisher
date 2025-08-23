import axios, { AxiosInstance } from "axios";
import { BlogPost, HashnodePost, HashnodePostResponse } from "../types";

export class HashnodeClient {
  private client: AxiosInstance;

  constructor(private token: string) {
    this.client = axios.create({
      baseURL: "https://gql.hashnode.com",
      headers: {
        Authorization: this.token,
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

  // Convert BlogPost to HashnodePost format
  private convertToHashnodePost(
    blogPost: BlogPost,
    publicationId?: string,
  ): HashnodePost {
    const slug = blogPost.slug || this.generateSlug(blogPost.title);

    // Handle publishedAt date conversion
    let publishedAt: string | undefined;
    if (blogPost.publishedAt) {
      publishedAt = new Date(blogPost.publishedAt).toISOString();
    } else if (blogPost.date) {
      // Some Markdown processors might use 'date' instead of 'publishedAt'
      publishedAt = new Date(blogPost.date).toISOString();
    }

    return {
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
  }

  async publishPost(
    blogPost: BlogPost,
    publicationId?: string,
  ): Promise<{ id: string; url: string }> {
    try {
      if (!publicationId) {
        throw new Error("Hashnode publication ID not provided");
      }

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
          publishedAt: hashnodePost.publishedAt, // Add this line
          metaTags: {
            title: hashnodePost.title,
            description: hashnodePost.subtitle,
            image: hashnodePost.coverImageURL,
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

  async getPost(slug: string): Promise<HashnodePostResponse | null> {
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
