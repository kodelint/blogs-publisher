import { MarkdownProcessor } from "../../src/utils/markdown-processor";

jest.mock("../../src/utils/logger");

describe("MarkdownProcessor", () => {
  let processor: MarkdownProcessor;

  beforeEach(() => {
    processor = new MarkdownProcessor();
    jest.clearAllMocks();
  });

  describe("toHtml", () => {
    test("should convert markdown to HTML", () => {
      const markdown = "# Title\n\nSome **bold** text";
      const result = processor.toHtml(markdown);
      expect(result).toContain("<h1>Title</h1>");
      expect(result).toContain("<strong>bold</strong>");
    });
  });

  describe("extractTitle", () => {
    test("should extract title from h1", () => {
      const markdown = "# My Title\n\nSome content";
      const title = processor.extractTitle(markdown);
      expect(title).toBe("My Title");
    });

    test("should return null when no title found", () => {
      const markdown = "Some content without title";
      const title = processor.extractTitle(markdown);
      expect(title).toBeNull();
    });
  });

  describe("extractDescription", () => {
    test("should extract description from content and truncate properly", () => {
      const markdown = "This is a description. It has multiple sentences.";
      const description = processor.extractDescription(markdown, 25);
      expect(description).toBe("This is a description.");
    });

    test("should handle exact length match", () => {
      const markdown = "Short text.";
      const description = processor.extractDescription(markdown, 11);
      expect(description).toBe("Short text.");
    });

    test("should handle markdown formatting", () => {
      const markdown = "**Bold** text and [link](url)";
      const description = processor.extractDescription(markdown);
      expect(description).toBe("Bold text and link");
    });

    test("should truncate long text at word boundary", () => {
      const longText =
        "This is a very long description that should be truncated properly at a word boundary.";
      const description = processor.extractDescription(longText, 40);
      expect(description).toBe("This is a very long description that...");
    });

    test("should truncate long text at character boundary if no word boundary", () => {
      const longText = "ThisIsAVeryLongWordWithoutSpacesThatWillBeTruncated";
      const description = processor.extractDescription(longText, 20);
      expect(description).toBe("ThisIsAVeryLongWordW...");
    });

    test("should handle empty content", () => {
      const description = processor.extractDescription("", 50);
      expect(description).toBe("");
    });
  });

  describe("extractTags", () => {
    test("should extract hashtags from content", () => {
      const markdown = "Content with #javascript and #typescript tags";
      const tags = processor.extractTags(markdown);
      expect(tags).toEqual(["javascript", "typescript"]);
    });

    test("should return unique tags", () => {
      const markdown = "#javascript #javascript #typescript";
      const tags = processor.extractTags(markdown);
      expect(tags).toEqual(["javascript", "typescript"]);
    });

    test("should return empty array when no tags found", () => {
      const markdown = "Content without tags";
      const tags = processor.extractTags(markdown);
      expect(tags).toEqual([]);
    });

    test("should handle tags with hyphens and numbers", () => {
      const markdown = "Content with #react-native and #typescript2 tags";
      const tags = processor.extractTags(markdown);
      expect(tags).toEqual(["react-native", "typescript2"]);
    });
  });

  describe("validateMarkdown", () => {
    test("should validate correct markdown", () => {
      const markdown = "# Title\n\nValid content";
      const result = processor.validateMarkdown(markdown);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("should detect empty content", () => {
      const result = processor.validateMarkdown("");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Markdown content is empty");
    });

    test("should detect missing title", () => {
      const result = processor.validateMarkdown("Content without title");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("No title (# heading) found in markdown");
    });

    test("should detect unclosed code blocks", () => {
      const markdown = '```javascript\nconsole.log("hello")';
      const result = processor.validateMarkdown(markdown);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Unclosed code block detected");
    });

    test("should detect unclosed inline code", () => {
      const markdown = "Some `inline code without closing";
      const result = processor.validateMarkdown(markdown);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Unclosed inline code detected");
    });
  });

  describe("processImagesForPlatform", () => {
    test("should process images for different platforms", () => {
      const markdown = "![alt](image.png)";

      const mediumResult = processor.processImagesForPlatform(
        markdown,
        "medium",
      );
      const devtoResult = processor.processImagesForPlatform(markdown, "devto");
      const hashnodeResult = processor.processImagesForPlatform(
        markdown,
        "hashnode",
      );

      expect(mediumResult).toBe(markdown);
      expect(devtoResult).toBe(markdown);
      expect(hashnodeResult).toBe(markdown);
    });

    test("should handle multiple images", () => {
      const markdown = "![alt1](img1.png)\n![alt2](img2.png)";
      const result = processor.processImagesForPlatform(markdown, "medium");
      expect(result).toBe(markdown);
    });

    test("should handle images with special characters", () => {
      const markdown =
        "![alt text](image-with-dashes.png?width=100&height=100)";
      const result = processor.processImagesForPlatform(markdown, "devto");
      expect(result).toBe(markdown);
    });
  });
});
