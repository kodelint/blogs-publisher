import * as core from "@actions/core";
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

export class BlogsPublisher {
  private mediumClient: MediumClient;
  private devtoClient: DevtoClient;
  private hashnodeClient: HashnodeClient;
  private markdownProcessor: MarkdownProcessor;

  constructor(private config: Config) {
    this.mediumClient = new MediumClient(config.mediumToken);
    this.devtoClient = new DevtoClient(config.devtoToken);
    this.hashnodeClient = new HashnodeClient(config.hashnodeToken);
    this.markdownProcessor = new MarkdownProcessor();
    if (config.githubToken) {
      process.env.GITHUB_TOKEN = config.githubToken;
    }
  }

  async getChangedFiles(context: typeof github.context): Promise<string[]> {
    try {
      core.info(`Event name: ${context.eventName}`);
      core.info(`Payload before: ${context.payload.before}`);
      core.info(`Payload after: ${context.payload.after}`);
      core.info(`Commits array: ${JSON.stringify(context.payload.commits)}`);

      const changedFiles = new Set<string>();

      // For push events (direct commits to branch)
      if (context.eventName === "push") {
        core.info("Processing push event");

        if (!context.payload.before || !context.payload.after) {
          core.warning("Missing before/after commit SHAs in push event");
          return [];
        }

        if (context.payload.before === context.payload.after) {
          core.info("No changes detected (before and after are the same)");
          return [];
        }

        const octokit = github.getOctokit(this.config.githubToken);

        // Get the comparison between the previous and current commit
        const { data: comparison } = await octokit.rest.repos.compareCommits({
          owner: context.repo.owner,
          repo: context.repo.repo,
          base: context.payload.before,
          head: context.payload.after,
        });

        core.info(`Comparison found ${comparison.files?.length || 0} files`);

        comparison.files?.forEach((file) => {
          core.info(`Changed file: ${file.filename} (status: ${file.status})`);
          changedFiles.add(file.filename);
        });
      }
      // For pull request events
      else if (context.eventName === "pull_request") {
        core.info("Processing pull_request event");
        const octokit = github.getOctokit(this.config.githubToken);

        const { data: files } = await octokit.rest.pulls.listFiles({
          owner: context.repo.owner,
          repo: context.repo.repo,
          pull_number: context.payload.pull_request!.number,
        });

        core.info(`PR found ${files.length} files`);

        files.forEach((file) => {
          core.info(`Changed file: ${file.filename} (status: ${file.status})`);
          changedFiles.add(file.filename);
        });
      }
      // Fallback: try to use commits array if available
      else if (
        context.payload.commits &&
        Array.isArray(context.payload.commits)
      ) {
        core.info("Processing using commits array");
        for (const commit of context.payload.commits) {
          if (commit.added && Array.isArray(commit.added)) {
            (commit.added as string[]).forEach((file) =>
              changedFiles.add(file),
            );
          }
          if (commit.modified && Array.isArray(commit.modified)) {
            (commit.modified as string[]).forEach((file) =>
              changedFiles.add(file),
            );
          }
        }
      } else {
        core.warning(`Unsupported event type: ${context.eventName}`);
        return [];
      }

      const markdownFiles = Array.from(changedFiles).filter(
        (file) => file.endsWith(".md") || file.endsWith(".markdown"),
      );

      core.info(`Found ${markdownFiles.length} markdown files to process`);
      core.info(`Files: ${JSON.stringify(markdownFiles)}`);

      return markdownFiles;
    } catch (error) {
      core.error(
        `Error getting changed files: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return [];
    }
  }

  private determinePlatform(
    filePath: string,
    commitMessage?: string,
  ): Platform | null {
    const normalizedPath = filePath.toLowerCase();

    // First check path-based determination (should take precedence)
    if (normalizedPath.includes(this.config.mediumPath.toLowerCase())) {
      return "medium";
    }
    if (normalizedPath.includes(this.config.devtoPath.toLowerCase())) {
      return "devto";
    }
    if (normalizedPath.includes(this.config.hashnodePath.toLowerCase())) {
      return "hashnode";
    }

    // Then check commit message if no path match found
    if (this.config.useCommitMessage && commitMessage) {
      const message = commitMessage.toLowerCase();
      if (message.includes("medium")) return "medium";
      if (message.includes("dev.to") || message.includes("devto"))
        return "devto";
      if (message.includes("hashnode")) return "hashnode";
    }

    return null;
  }

  private parseMarkdownFile(filePath: string): BlogPost {
    const fullPath = join(process.cwd(), this.config.postsDirectory, filePath);

    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }

    const fileContent = readFileSync(fullPath, "utf-8");
    const parsed = frontMatter<any>(fileContent);

    const title =
      parsed.attributes.title || this.extractTitleFromContent(parsed.body);

    return {
      title,
      content: parsed.body,
      tags: parsed.attributes.tags || [],
      canonical_url: parsed.attributes.canonical_url,
      description: parsed.attributes.description,
      cover_image: parsed.attributes.cover_image,
      published: parsed.attributes.published !== false,
      series: parsed.attributes.series,
      ...parsed.attributes,
    };
  }

  private extractTitleFromContent(content: string): string {
    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("# ")) {
        return trimmed.substring(2).trim();
      }
    }
    return "Untitled Post";
  }

  async publishBlogs(
    changedFiles: string[],
    context: typeof github.context,
  ): Promise<PublishResults> {
    const results: PublishResults = {
      published: [],
      failed: [],
    };

    const commitMessage = context.payload.head_commit?.message;

    for (const file of changedFiles) {
      try {
        const platform = this.determinePlatform(file, commitMessage);

        if (!platform) {
          core.info(`Skipping ${file} - no platform determined`);
          continue;
        }

        core.info(`Publishing ${file} to ${platform}`);

        const blogPost = this.parseMarkdownFile(file);
        const result = await this.publishToPlatform(platform, blogPost, file);

        if (result.success) {
          results.published.push(result);
        } else {
          results.failed.push(result);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        core.error(`Error processing ${file}: ${errorMessage}`);

        results.failed.push({
          platform: "medium", // default, will be overridden if platform was determined
          file,
          success: false,
          error: errorMessage,
        });
      }
    }

    return results;
  }

  private async publishToPlatform(
    platform: Platform,
    blogPost: BlogPost,
    file: string,
  ): Promise<PublishResult> {
    if (this.config.dryRun) {
      core.info(`[DRY RUN] Would publish ${file} to ${platform}`);
      return {
        platform,
        file,
        success: true,
        url: `https://example.com/${platform}/dry-run`,
      };
    }

    try {
      let result: any;

      switch (platform) {
        case "medium":
          if (!this.config.mediumToken) {
            throw new Error("Medium token not provided");
          }
          result = await this.mediumClient.publishPost(blogPost);
          break;

        case "devto":
          if (!this.config.devtoToken) {
            throw new Error("Dev.to token not provided");
          }
          result = await this.devtoClient.publishPost(blogPost);
          break;

        case "hashnode":
          if (!this.config.hashnodeToken) {
            throw new Error("Hashnode token not provided");
          }
          result = await this.hashnodeClient.publishPost(
            blogPost,
            this.config.hashnodePublicationId, // Make sure this is passed
          );
          break;

        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

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
      core.error(`Failed to publish to ${platform}: ${errorMessage}`);

      return {
        platform,
        file,
        success: false,
        error: errorMessage,
      };
    }
  }
}
