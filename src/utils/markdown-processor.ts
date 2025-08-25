import MarkdownIt from "markdown-it";
import { logger } from "./logger";

export class MarkdownProcessor {
  private md: MarkdownIt;

  constructor() {
    logger.debug("Initializing MarkdownProcessor");
    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
    });
    logger.debug("MarkdownProcessor initialized successfully");
  }

  toHtml(markdown: string): string {
    logger.debug("Converting markdown to HTML");
    const result = this.md.render(markdown);
    logger.debug(
      `Converted markdown to HTML (length: ${result.length} characters)`,
    );
    return result;
  }

  extractTitle(markdown: string): string | null {
    logger.debug("Extracting title from markdown");
    const lines = markdown.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("# ")) {
        const title = trimmed.substring(2).trim();
        logger.debug(`Extracted title: ${title}`);
        return title;
      }
    }
    logger.debug("No title found in markdown");
    return null;
  }

  extractDescription(markdown: string, maxLength: number = 160): string {
    logger.debug(
      `Extracting description from markdown (max length: ${maxLength})`,
    );

    // Remove front matter if present
    const content = markdown.replace(/^---[\s\S]*?---\n/, "");
    logger.debug("Removed front matter from markdown");

    // Remove Markdown formatting
    const plainText = content
      .replace(/^#{1,6}\s+/gm, "") // Remove headers
      .replace(/\*\*(.+?)\*\*/g, "$1") // Remove bold
      .replace(/\*(.+?)\*/g, "$1") // Remove italic
      .replace(/`(.+?)`/g, "$1") // Remove inline code
      .replace(/```[\s\S]*?```/g, "") // Remove code blocks
      .replace(/\[(.+?)]\(.+?\)/g, "$1") // Remove links
      .replace(/!\[.*?]\(.+?\)/g, "") // Remove images
      .replace(/^\s*[-*+]\s+/gm, "") // Remove list markers
      .replace(/^\s*\d+\.\s+/gm, "") // Remove numbered list markers
      .replace(/\n+/g, " ") // Replace newlines with spaces
      .trim();

    logger.debug(
      `Plain text extracted (length: ${plainText.length} characters)`,
    );

    if (plainText.length <= maxLength) {
      logger.debug("Plain text fits within max length, returning as-is");
      return plainText;
    }

    // Find the last complete sentence within the limit
    const truncated = plainText.substring(0, maxLength);
    const lastPeriod = truncated.lastIndexOf(".");
    const lastExclamation = truncated.lastIndexOf("!");
    const lastQuestion = truncated.lastIndexOf("?");

    const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);

    if (lastSentenceEnd > maxLength * 0.7) {
      // If we find a sentence end in the last 30%
      const result = truncated.substring(0, lastSentenceEnd + 1);
      logger.debug(`Truncated at sentence end (length: ${result.length})`);
      return result;
    }

    // Otherwise, find the last space and truncate there
    const lastSpace = truncated.lastIndexOf(" ");
    if (lastSpace > 0) {
      const result = truncated.substring(0, lastSpace) + "...";
      logger.debug(`Truncated at word boundary (length: ${result.length})`);
      return result;
    }

    const result = truncated + "...";
    logger.debug(`Truncated at character boundary (length: ${result.length})`);
    return result;
  }

  extractTags(markdown: string): string[] {
    logger.debug("Extracting tags from markdown");
    const tags = new Set<string>();

    // Extract hashtags from content - support letters, numbers, underscores, and hyphens
    const hashtagRegex = /#([\w-]+)/g;
    let match;
    let count = 0;
    while ((match = hashtagRegex.exec(markdown)) !== null) {
      tags.add(match[1].toLowerCase());
      count++;
    }

    const tagArray = Array.from(tags);
    logger.debug(
      `Extracted ${count} hashtags, ${tagArray.length} unique tags: ${tagArray.join(", ")}`,
    );
    return tagArray;
  }

  validateMarkdown(markdown: string): { isValid: boolean; errors: string[] } {
    logger.debug("Validating markdown content");
    const errors: string[] = [];

    if (!markdown.trim()) {
      errors.push("Markdown content is empty");
      logger.warn("Markdown content is empty");
    }

    if (!this.extractTitle(markdown)) {
      errors.push("No title (# heading) found in markdown");
      logger.warn("No title found in markdown");
    }

    // Check for unclosed code blocks
    const codeBlockMatches = markdown.match(/```/g);
    if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
      errors.push("Unclosed code block detected");
      logger.warn("Unclosed code block detected in markdown");
    }

    // Check for unclosed inline code
    const inlineCodeMatches = markdown.match(/(?<!\\)`/g);
    if (inlineCodeMatches && inlineCodeMatches.length % 2 !== 0) {
      errors.push("Unclosed inline code detected");
      logger.warn("Unclosed inline code detected in markdown");
    }

    const isValid = errors.length === 0;
    if (isValid) {
      logger.debug("Markdown validation passed");
    } else {
      logger.warn(
        `Markdown validation failed with ${errors.length} errors: ${errors.join(", ")}`,
      );
    }

    return {
      isValid,
      errors,
    };
  }

  processImagesForPlatform(
    markdown: string,
    platform: "medium" | "devto" | "hashnode",
  ): string {
    logger.debug(`Processing images for platform: ${platform}`);

    let processedCount = 0;
    const result = markdown.replace(
      /!\[([^\]]*)]\(([^)]+)\)/g,
      (match, _alt, url) => {
        // Use underscore prefix for unused parameter
        processedCount++;

        // Platform-specific image processing
        switch (platform) {
          case "medium":
            // Medium prefers images to be uploaded separately
            if (url.startsWith("http")) {
              logger.debug(`Keeping external image URL for Medium: ${url}`);
              return match; // Keep external URLs as-is
            }
            // Convert relative URLs to absolute if needed
            logger.debug(`Processing relative image URL for Medium: ${url}`);
            return match;

          case "devto":
            // Dev.to handles images well as-is
            logger.debug(`Keeping image URL as-is for Dev.to: ${url}`);
            return match;

          case "hashnode":
            // Hashnode handles images well as-is
            logger.debug(`Keeping image URL as-is for Hashnode: ${url}`);
            return match;

          default:
            logger.debug(`Unknown platform, keeping image URL: ${url}`);
            return match;
        }
      },
    );

    logger.debug(`Processed ${processedCount} images for ${platform}`);
    return result;
  }
}
