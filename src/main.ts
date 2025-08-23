import * as core from "@actions/core";
import * as github from "@actions/github";
import { BlogsPublisher } from "./publisher";
import { Config } from "./types";

export async function run(): Promise<void> {
  try {
    const config: Config = {
      mediumToken: core.getInput("medium-token"),
      devtoToken: core.getInput("devto-token"),
      hashnodeToken: core.getInput("hashnode-token"),
      hashnodePublicationId: core.getInput("hashnode-publication-id"),
      mediumPath: core.getInput("medium-path") || "posts/medium",
      devtoPath: core.getInput("devto-path") || "posts/devto",
      hashnodePath: core.getInput("hashnode-path") || "posts/hashnode",
      useCommitMessage: core.getBooleanInput("use-commit-message"),
      dryRun: core.getBooleanInput("dry-run"),
      postsDirectory: core.getInput("posts-directory") || ".",
      githubToken: core.getInput("github-token"),
    };

    const publisher = new BlogsPublisher(config);

    // Get changed files from GitHub context
    const context = github.context;
    const changedFiles = await publisher.getChangedFiles(context);

    core.info(`Found ${changedFiles.length} changed files`);

    const results = await publisher.publishBlogs(changedFiles, context);

    core.setOutput("published-posts", JSON.stringify(results.published));
    core.setOutput("failed-posts", JSON.stringify(results.failed));

    if (results.failed.length > 0) {
      core.setFailed(`Failed to publish ${results.failed.length} posts`);
    } else {
      core.info(`Successfully published ${results.published.length} posts`);
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

// Only run if this file is being executed directly (not imported)
if (require.main === module) {
  run();
}
