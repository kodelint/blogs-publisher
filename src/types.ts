export interface Config {
  mediumToken: string;
  devtoToken: string;
  hashnodeToken: string;
  hashnodePublicationId?: string;
  mediumPath: string;
  devtoPath: string;
  hashnodePath: string;
  useCommitMessage: boolean;
  dryRun: boolean;
  postsDirectory: string;
  githubToken: string;
}

export interface BlogPost {
  title: string;
  content: string;
  tags: string[];
  canonical_url?: string;
  description?: string;
  cover_image?: string;
  published?: boolean;
  publishedAt?: string;
  series?: string;
  [key: string]: any;
}

export interface MediumPost {
  title: string;
  contentFormat: string;
  content: string;
  tags?: string[];
  publishStatus?: "public" | "draft" | "unlisted";
  license?: string;
  notifyFollowers?: boolean;
  canonicalUrl?: string;
}

export interface DevToPost {
  title: string;
  body_markdown: string;
  published?: boolean;
  tags?: string[];
  series?: string;
  canonical_url?: string;
  description?: string;
  cover_image?: string;
  main_image?: string;
  organization_id?: number;
}

export interface HashnodePost {
  title: string;
  contentMarkdown: string;
  tags?: { name: string }[];
  coverImageURL?: string;
  slug?: string;
  subtitle?: string;
  publishedAt?: string;
  disableComments?: boolean;
  publicationId?: string;
  originalArticleURL?: string;
}

export interface HashnodePostResponse {
  id: string;
  title: string;
  slug: string;
  url: string;
  contentMarkdown?: string;
  tags?: Array<{ name: string; slug: string }>;
  coverImage?: { url: string };
  subtitle?: string;
  dateAdded?: string;
  author?: {
    username: string;
    name: string;
  };
}

export interface PublishResult {
  platform: "medium" | "devto" | "hashnode";
  file: string;
  success: boolean;
  url?: string;
  error?: string;
  postId?: string;
}

export interface PublishResults {
  published: PublishResult[];
  failed: PublishResult[];
}

export type Platform = "medium" | "devto" | "hashnode";
