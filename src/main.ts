// main.ts
import * as core from "@actions/core";
import * as github from "@actions/github";
import { BlogsPublisher } from "./publisher";
import { Config } from "./types";
import { logger, LogLevel } from "./utils/logger";

export async function run(): Promise<void> {
  try {
    logger.info("Starting blog publisher action");

    const debuggingEnabled =
      process.env.DEBUGGING_ENABLED === "true" ||
      core.getBooleanInput("debugging_enabled") ||
      process.env.ACTIONS_RUNNER_DEBUG === "true";

    if (debuggingEnabled) {
      logger.setLevel(LogLevel.DEBUG);
      logger.debug("Debug logging enabled");
    }

    const config: Config = {
      mediumToken: core.getInput("medium_token"),
      devtoToken: core.getInput("devto_token"),
      hashnodeToken: core.getInput("hashnode_token"),
      hashnodePublicationId: core.getInput("hashnode_publication_id"),
      mediumPath: core.getInput("medium_path") || "posts/medium",
      devtoPath: core.getInput("devto_path") || "posts/devto",
      hashnodePath: core.getInput("hashnode_path") || "posts/hashnode",
      useCommitMessage: core.getBooleanInput("use_commit_message"),
      dryRun: core.getBooleanInput("dry_run"),
      postsDirectory: core.getInput("posts_directory") || ".",
      githubToken: core.getInput("github_token"),
      updateAlreadyPublished:
        core.getBooleanInput("update_already_published") || true,
      debuggingEnabled,
    };

    logger.debug("Configuration loaded", {
      hasMediumToken: !!config.mediumToken,
      hasDevtoToken: !!config.devtoToken,
      hasHashnodeToken: !!config.hashnodeToken,
      hasHashnodePublicationId: !!config.hashnodePublicationId,
      updateAlreadyPublished: config.updateAlreadyPublished,
      dryRun: config.dryRun,
    });

    const publisher = new BlogsPublisher(config);

    // Get changed files from GitHub context
    const context = github.context;
    logger.info(`GitHub context event: ${context.eventName}`);

    const changedFiles = await publisher.getChangedFiles(context);
    logger.info(`Found ${changedFiles.length} changed markdown files`);

    if (changedFiles.length === 0) {
      logger.info("No markdown files to process, exiting");
      return;
    }

    logger.debug(`Files to process: ${JSON.stringify(changedFiles)}`);

    const results = await publisher.publishBlogs(changedFiles, context);

    core.setOutput("published-posts", JSON.stringify(results.published));
    core.setOutput("failed-posts", JSON.stringify(results.failed));

    logger.info(
      `Publishing completed: ${results.published.length} successful, ${results.failed.length} failed`,
    );

    if (results.failed.length > 0) {
      logger.warn(`Failed to publish ${results.failed.length} posts`);
      core.setFailed(`Failed to publish ${results.failed.length} posts`);
    } else {
      logger.info(`Successfully published ${results.published.length} posts`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Action failed with error: ${errorMessage}`);
    core.setFailed(errorMessage);
  }
}

// Only run if this file is being executed directly (not imported)
if (require.main === module) {
  run();
}
