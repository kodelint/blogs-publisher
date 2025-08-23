import MarkdownIt from "markdown-it";

export class MarkdownProcessor {
  private md: MarkdownIt;

  constructor() {
    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
    });
  }

  toHtml(markdown: string): string {
    return this.md.render(markdown);
  }

  extractTitle(markdown: string): string | null {
    const lines = markdown.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("# ")) {
        return trimmed.substring(2).trim();
      }
    }
    return null;
  }

  extractDescription(markdown: string, maxLength: number = 160): string {
    // Remove front matter if present
    const content = markdown.replace(/^---[\s\S]*?---\n/, "");

    // Remove markdown formatting
    const plainText = content
      .replace(/^#{1,6}\s+/gm, "") // Remove headers
      .replace(/\*\*(.+?)\*\*/g, "$1") // Remove bold
      .replace(/\*(.+?)\*/g, "$1") // Remove italic
      .replace(/`(.+?)`/g, "$1") // Remove inline code
      .replace(/```[\s\S]*?```/g, "") // Remove code blocks
      .replace(/\[(.+?)\]\(.+?\)/g, "$1") // Remove links
      .replace(/!\[.*?\]\(.+?\)/g, "") // Remove images
      .replace(/^\s*[-*+]\s+/gm, "") // Remove list markers
      .replace(/^\s*\d+\.\s+/gm, "") // Remove numbered list markers
      .replace(/\n+/g, " ") // Replace newlines with spaces
      .trim();

    if (plainText.length <= maxLength) {
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
      return truncated.substring(0, lastSentenceEnd + 1);
    }

    // Otherwise, find the last space and truncate there
    const lastSpace = truncated.lastIndexOf(" ");
    if (lastSpace > 0) {
      return truncated.substring(0, lastSpace) + "...";
    }

    return truncated + "...";
  }

  extractTags(markdown: string): string[] {
    const tags = new Set<string>();

    // Extract hashtags from content
    const hashtagRegex = /#(\w+)/g;
    let match;
    while ((match = hashtagRegex.exec(markdown)) !== null) {
      tags.add(match[1].toLowerCase());
    }

    return Array.from(tags);
  }

  validateMarkdown(markdown: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!markdown.trim()) {
      errors.push("Markdown content is empty");
    }

    if (!this.extractTitle(markdown)) {
      errors.push("No title (# heading) found in markdown");
    }

    // Check for unclosed code blocks
    const codeBlockMatches = markdown.match(/```/g);
    if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
      errors.push("Unclosed code block detected");
    }

    // Check for unclosed inline code
    const inlineCodeMatches = markdown.match(/(?<!\\)`/g);
    if (inlineCodeMatches && inlineCodeMatches.length % 2 !== 0) {
      errors.push("Unclosed inline code detected");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  processImagesForPlatform(
    markdown: string,
    platform: "medium" | "devto" | "hashnode",
  ): string {
    // Platform-specific image processing
    switch (platform) {
      case "medium":
        // Medium prefers images to be uploaded separately
        return markdown.replace(
          /!\[([^\]]*)\]\(([^)]+)\)/g,
          (match, alt, url) => {
            if (url.startsWith("http")) {
              return match; // Keep external URLs as-is
            }
            // Convert relative URLs to absolute if needed
            return match;
          },
        );

      case "devto":
        // Dev.to handles images well as-is
        return markdown;

      case "hashnode":
        // Hashnode handles images well as-is
        return markdown;

      default:
        return markdown;
    }
  }
}
