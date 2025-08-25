// publisher.ts
import * as github from "@actions/github";
import frontMatter from "front-matter";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { DevtoClient } from "./clients/devto";
import { HashnodeClient } from "./clients/hashnode";
import { MediumClient } from "./clients/medium";
import {
  BlogPost,
  Config,
  Platform,
  PublishResult,
  PublishResults,
} from "./types";
import { MarkdownProcessor } from "./utils/markdown-processor";
import { logger } from "./utils/logger";

export class BlogsPublisher {
  private mediumClient: MediumClient;
  private devtoClient: DevtoClient;
  private hashnodeClient: HashnodeClient;
  private markdownProcessor: MarkdownProcessor;
  private publishedPosts: Map<string, { platform: Platform; postId: string }> =
    new Map();

  constructor(private config: Config) {
    logger.info("Initializing BlogsPublisher");

    this.mediumClient = new MediumClient(config.mediumToken);
    this.devtoClient = new DevtoClient(config.devtoToken);
    this.hashnodeClient = new HashnodeClient(config.hashnodeToken);
    this.markdownProcessor = new MarkdownProcessor();

    if (config.githubToken) {
      process.env.GITHUB_TOKEN = config.githubToken;
      logger.debug("GITHUB_TOKEN environment variable set");
    }

    logger.debug("BlogsPublisher initialized successfully");
  }

  private async checkIfAlreadyPublished(
    filePath: string,
    platform: Platform,
  ): Promise<boolean> {
    if (!this.config.updateAlreadyPublished) {
      // Check if this file was already published to the same platform
      const publishedInfo = this.publishedPosts.get(filePath);
      const isAlreadyPublished =
        publishedInfo !== undefined && publishedInfo.platform === platform;

      if (isAlreadyPublished) {
        logger.debug(
          `File ${filePath} already published to ${platform}, skipping update`,
        );
      }

      return isAlreadyPublished;
    }

    logger.debug(
      "Update already published is enabled, proceeding with publication",
    );
    return false;
  }

  async getChangedFiles(context: typeof github.context): Promise<string[]> {
    try {
      logger.info(`Processing GitHub event: ${context.eventName}`);
      logger.debug(`Payload before: ${context.payload.before}`);
      logger.debug(`Payload after: ${context.payload.after}`);

      if (context.payload.commits) {
        logger.debug(`Commits count: ${context.payload.commits.length}`);
      }

      const changedFiles = new Set<string>();

      // For push events (direct commits to branch)
      if (context.eventName === "push") {
        logger.info("Processing push event");

        if (!context.payload.before || !context.payload.after) {
          logger.warn("Missing before/after commit SHAs in push event");
          // Fallback to commits array if available
          if (
            context.payload.commits &&
            Array.isArray(context.payload.commits)
          ) {
            logger.info("Processing using commits array fallback");
            for (const commit of context.payload.commits) {
              if (commit.added && Array.isArray(commit.added)) {
                logger.debug(`Added files: ${commit.added.length}`);
                commit.added.forEach((file: string) => changedFiles.add(file));
              }
              if (commit.modified && Array.isArray(commit.modified)) {
                logger.debug(`Modified files: ${commit.modified.length}`);
                commit.modified.forEach((file: string) =>
                  changedFiles.add(file),
                );
              }
            }
          }
          return Array.from(changedFiles).filter(
            (file) => file.endsWith(".md") || file.endsWith(".markdown"),
          );
        }

        if (context.payload.before === context.payload.after) {
          logger.info("No changes detected (before and after are the same)");
          return [];
        }

        const octokit = github.getOctokit(this.config.githubToken);
        logger.debug("Octokit client initialized for push event");

        // Get the comparison between the previous and current commit
        const { data: comparison } = await octokit.rest.repos.compareCommits({
          owner: context.repo.owner,
          repo: context.repo.repo,
          base: context.payload.before,
          head: context.payload.after,
        });

        logger.info(`Comparison found ${comparison.files?.length || 0} files`);

        comparison.files?.forEach((file) => {
          logger.debug(
            `Changed file: ${file.filename} (status: ${file.status})`,
          );
          changedFiles.add(file.filename);
        });
      }
      // For pull request events
      else if (context.eventName === "pull_request") {
        logger.info("Processing pull_request event");
        const octokit = github.getOctokit(this.config.githubToken);
        logger.debug("Octokit client initialized for PR event");

        const { data: files } = await octokit.rest.pulls.listFiles({
          owner: context.repo.owner,
          repo: context.repo.repo,
          pull_number: context.payload.pull_request!.number,
        });

        logger.info(`PR found ${files.length} files`);

        files.forEach((file) => {
          logger.debug(
            `Changed file: ${file.filename} (status: ${file.status})`,
          );
          changedFiles.add(file.filename);
        });
      }
      // Fallback: try to use commits array if available
      else if (
        context.payload.commits &&
        Array.isArray(context.payload.commits)
      ) {
        logger.info("Processing using commits array fallback");
        for (const commit of context.payload.commits) {
          if (commit.added && Array.isArray(commit.added)) {
            logger.debug(`Added files: ${commit.added.length}`);
            commit.added.forEach((file: string) => changedFiles.add(file));
          }
          if (commit.modified && Array.isArray(commit.modified)) {
            logger.debug(`Modified files: ${commit.modified.length}`);
            commit.modified.forEach((file: string) => changedFiles.add(file));
          }
        }
      } else {
        logger.warn(`Unsupported event type: ${context.eventName}`);
        return [];
      }

      const markdownFiles = Array.from(changedFiles).filter(
        (file) => file.endsWith(".md") || file.endsWith(".markdown"),
      );

      logger.info(`Found ${markdownFiles.length} markdown files to process`);
      logger.debug(`Markdown files: ${JSON.stringify(markdownFiles)}`);

      return markdownFiles;
    } catch (error) {
      logger.error(
        `Error getting changed files: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return [];
    }
  }

  // async getChangedFiles(context: typeof github.context): Promise<string[]> {
  //   try {
  //     logger.info(`Processing GitHub event: ${context.eventName}`);
  //     logger.debug(`Payload before: ${context.payload.before}`);
  //     logger.debug(`Payload after: ${context.payload.after}`);
  //
  //     if (context.payload.commits) {
  //       logger.debug(`Commits count: ${context.payload.commits.length}`);
  //     }
  //
  //     const changedFiles = new Set<string>();
  //
  //     // For push events (direct commits to branch)
  //     if (context.eventName === "push") {
  //       logger.info("Processing push event");
  //
  //       if (!context.payload.before || !context.payload.after) {
  //         logger.warn("Missing before/after commit SHAs in push event");
  //         return [];
  //       }
  //
  //       // previous code
  //       // if (context.payload.before === context.payload.after) {
  //       //   logger.info("No changes detected (before and after are the same)");
  //       //   return [];
  //       // }
  //
  //       if (context.payload.commits) {
  //         for (const commit of context.payload.commits) {
  //           if (commit.added)
  //             files.push(
  //               ...commit.added.filter(
  //                 (f) => f.endsWith(".md") || f.endsWith(".markdown"),
  //               ),
  //             );
  //           if (commit.modified)
  //             files.push(
  //               ...commit.modified.filter(
  //                 (f) => f.endsWith(".md") || f.endsWith(".markdown"),
  //               ),
  //             );
  //         }
  //       }
  //
  //
  //       const octokit = github.getOctokit(this.config.githubToken);
  //       logger.debug("Octokit client initialized for push event");
  //
  //       // Get the comparison between the previous and current commit
  //       const { data: comparison } = await octokit.rest.repos.compareCommits({
  //         owner: context.repo.owner,
  //         repo: context.repo.repo,
  //         base: context.payload.before,
  //         head: context.payload.after,
  //       });
  //
  //       logger.info(`Comparison found ${comparison.files?.length || 0} files`);
  //
  //       comparison.files?.forEach((file) => {
  //         logger.debug(
  //           `Changed file: ${file.filename} (status: ${file.status})`,
  //         );
  //         changedFiles.add(file.filename);
  //       });
  //     }
  //     // For pull request events
  //     else if (context.eventName === "pull_request") {
  //       logger.info("Processing pull_request event");
  //       const octokit = github.getOctokit(this.config.githubToken);
  //       logger.debug("Octokit client initialized for PR event");
  //
  //       const { data: files } = await octokit.rest.pulls.listFiles({
  //         owner: context.repo.owner,
  //         repo: context.repo.repo,
  //         pull_number: context.payload.pull_request!.number,
  //       });
  //
  //       logger.info(`PR found ${files.length} files`);
  //
  //       files.forEach((file) => {
  //         logger.debug(
  //           `Changed file: ${file.filename} (status: ${file.status})`,
  //         );
  //         changedFiles.add(file.filename);
  //       });
  //     }
  //     // Fallback: try to use commits array if available
  //     else if (
  //       context.payload.commits &&
  //       Array.isArray(context.payload.commits)
  //     ) {
  //       logger.info("Processing using commits array fallback");
  //       for (const commit of context.payload.commits) {
  //         if (commit.added && Array.isArray(commit.added)) {
  //           logger.debug(`Added files: ${commit.added.length}`);
  //           (commit.added as string[]).forEach((file) =>
  //             changedFiles.add(file),
  //           );
  //         }
  //         if (commit.modified && Array.isArray(commit.modified)) {
  //           logger.debug(`Modified files: ${commit.modified.length}`);
  //           (commit.modified as string[]).forEach((file) =>
  //             changedFiles.add(file),
  //           );
  //         }
  //       }
  //     } else {
  //       logger.warn(`Unsupported event type: ${context.eventName}`);
  //       return [];
  //     }
  //
  //     const markdownFiles = Array.from(changedFiles).filter(
  //       (file) => file.endsWith(".md") || file.endsWith(".markdown"),
  //     );
  //
  //     logger.info(`Found ${markdownFiles.length} markdown files to process`);
  //     logger.debug(`Markdown files: ${JSON.stringify(markdownFiles)}`);
  //
  //     return markdownFiles;
  //   } catch (error) {
  //     logger.error(
  //       `Error getting changed files: ${
  //         error instanceof Error ? error.message : String(error)
  //       }`,
  //     );
  //     return [];
  //   }
  // }

  private determinePlatform(
    filePath: string,
    commitMessage?: string,
  ): Platform | null {
    const normalizedPath = filePath.toLowerCase();
    logger.debug(`Determining platform for file: ${filePath}`);

    // First check path-based determination (should take precedence)
    if (normalizedPath.includes(this.config.mediumPath.toLowerCase())) {
      logger.debug(`File ${filePath} determined as Medium (path-based)`);
      return "medium";
    }
    if (normalizedPath.includes(this.config.devtoPath.toLowerCase())) {
      logger.debug(`File ${filePath} determined as Dev.to (path-based)`);
      return "devto";
    }
    if (normalizedPath.includes(this.config.hashnodePath.toLowerCase())) {
      logger.debug(`File ${filePath} determined as Hashnode (path-based)`);
      return "hashnode";
    }

    // Then check commit message if no path match found
    if (this.config.useCommitMessage && commitMessage) {
      logger.debug(`Checking commit message for platform: ${commitMessage}`);
      const message = commitMessage.toLowerCase();
      if (message.includes("medium")) {
        logger.debug(`File ${filePath} determined as Medium (commit-based)`);
        return "medium";
      }
      if (message.includes("dev.to") || message.includes("devto")) {
        logger.debug(`File ${filePath} determined as Dev.to (commit-based)`);
        return "devto";
      }
      if (message.includes("hashnode")) {
        logger.debug(`File ${filePath} determined as Hashnode (commit-based)`);
        return "hashnode";
      }
    }

    logger.debug(`No platform determined for file: ${filePath}`);
    return null;
  }

  private parseMarkdownFile(filePath: string): BlogPost {
    logger.debug(`Parsing markdown file: ${filePath}`);
    const fullPath = join(process.cwd(), this.config.postsDirectory, filePath);

    if (!existsSync(fullPath)) {
      logger.error(`File not found: ${fullPath}`);
      throw new Error(`File not found: ${fullPath}`);
    }

    const fileContent = readFileSync(fullPath, "utf-8");
    const parsed = frontMatter<any>(fileContent);

    // Use markdownProcessor to extract title and description
    const title =
      parsed.attributes.title ||
      this.markdownProcessor.extractTitle(parsed.body) ||
      this.extractTitleFromContent(parsed.body);

    const description =
      parsed.attributes.description ||
      this.markdownProcessor.extractDescription(parsed.body);

    // Use markdownProcessor to extract tags if not provided in front matter
    const tags =
      parsed.attributes.tags && parsed.attributes.tags.length > 0
        ? parsed.attributes.tags
        : this.markdownProcessor.extractTags(parsed.body);

    logger.debug(
      `Extracted metadata - Title: ${title}, Tags: ${tags.join(", ")}, Has description: ${!!description}`,
    );

    // Validate markdown content
    const validation = this.markdownProcessor.validateMarkdown(parsed.body);
    if (!validation.isValid) {
      logger.warn(
        `Markdown validation issues in ${filePath}: ${validation.errors.join(", ")}`,
      );
    } else {
      logger.debug(`Markdown validation passed for ${filePath}`);
    }

    const blogPost: BlogPost = {
      title,
      content: parsed.body,
      tags,
      canonical_url: parsed.attributes.canonical_url,
      description,
      cover_image: parsed.attributes.cover_image,
      published: parsed.attributes.published !== false,
      series: parsed.attributes.series,
      ...parsed.attributes,
    };

    logger.debug(`Successfully parsed file: ${filePath}`);
    return blogPost;
  }

  private extractTitleFromContent(content: string): string {
    logger.debug("Extracting title from content");
    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("# ")) {
        const title = trimmed.substring(2).trim();
        logger.debug(`Extracted title from content: ${title}`);
        return title;
      }
    }
    logger.warn("No title found in content, using 'Untitled Post'");
    return "Untitled Post";
  }

  async publishBlogs(
    changedFiles: string[],
    context: typeof github.context,
  ): Promise<PublishResults> {
    logger.info(
      `Starting publication process for ${changedFiles.length} files`,
    );

    const results: PublishResults = {
      published: [],
      failed: [],
    };

    const commitMessage = context.payload.head_commit?.message;
    if (commitMessage) {
      logger.debug(`Commit message: ${commitMessage}`);
    }

    for (const file of changedFiles) {
      try {
        logger.info(`Processing file: ${file}`);
        const platform = this.determinePlatform(file, commitMessage);

        if (!platform) {
          logger.info(`Skipping ${file} - no platform determined`);
          continue;
        }

        logger.debug(`Platform determined: ${platform} for file: ${file}`);

        // Check if already published and update is disabled
        const alreadyPublished = await this.checkIfAlreadyPublished(
          file,
          platform,
        );
        if (alreadyPublished) {
          logger.info(
            `Skipping ${file} - already published and update disabled`,
          );
          continue;
        }

        logger.info(`Publishing ${file} to ${platform}`);

        const blogPost = this.parseMarkdownFile(file);

        // Process images for the specific platform
        blogPost.content = this.markdownProcessor.processImagesForPlatform(
          blogPost.content,
          platform,
        );

        logger.debug(`Processed images for platform: ${platform}`);

        const result = await this.publishToPlatform(platform, blogPost, file);

        if (result.success) {
          // Track published posts
          this.publishedPosts.set(file, { platform, postId: result.postId! });
          results.published.push(result);
          logger.info(
            `Successfully published ${file} to ${platform}: ${result.url}`,
          );
        } else {
          results.failed.push(result);
          logger.warn(
            `Failed to publish ${file} to ${platform}: ${result.error}`,
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(`Error processing ${file}: ${errorMessage}`);

        results.failed.push({
          platform: "medium", // default, will be overridden if platform was determined
          file,
          success: false,
          error: errorMessage,
        });
      }
    }

    logger.info(
      `Publication process completed. Successful: ${results.published.length}, Failed: ${results.failed.length}`,
    );
    return results;
  }

  private async publishToPlatform(
    platform: Platform,
    blogPost: BlogPost,
    file: string,
  ): Promise<PublishResult> {
    if (this.config.dryRun) {
      logger.info(`[DRY RUN] Would publish ${file} to ${platform}`);
      return {
        platform,
        file,
        success: true,
        url: `https://example.com/${platform}/dry-run`,
      };
    }

    try {
      logger.debug(`Publishing to ${platform}: ${blogPost.title}`);
      let result: any;

      switch (platform) {
        case "medium":
          if (!this.config.mediumToken) {
            logger.error("Medium token not provided");
            throw new Error("Medium token not provided");
          }
          logger.debug("Calling Medium client");
          result = await this.mediumClient.publishPost(blogPost);
          break;

        case "devto":
          if (!this.config.devtoToken) {
            logger.error("Dev.to token not provided");
            throw new Error("Dev.to token not provided");
          }
          logger.debug("Calling Dev.to client");
          result = await this.devtoClient.publishPost(blogPost);
          break;

        case "hashnode":
          if (!this.config.hashnodeToken) {
            logger.error("Hashnode token not provided");
            throw new Error("Hashnode token not provided");
          }
          logger.debug("Calling Hashnode client");
          result = await this.hashnodeClient.publishPost(
            blogPost,
            this.config.hashnodePublicationId,
          );
          break;

        default:
          logger.error(`Unsupported platform: ${platform}`);
          throw new Error(`Unsupported platform: ${platform}`);
      }

      logger.debug(
        `Success response from ${platform}: ${JSON.stringify(result)}`,
      );

      return {
        platform,
        file,
        success: true,
        url: result.url,
        postId: result.id,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Failed to publish to ${platform}: ${errorMessage}`);

      return {
        platform,
        file,
        success: false,
        error: errorMessage,
      };
    }
  }
}
