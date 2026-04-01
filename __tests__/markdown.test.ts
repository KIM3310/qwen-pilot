import { describe, it, expect } from "vitest";
import { parseMarkdownWithFrontmatter, renderMarkdownFrontmatter } from "../src/utils/markdown.js";

describe("parseMarkdownWithFrontmatter", () => {
  it("should parse frontmatter and body", () => {
    const input = `---
name: test-agent
description: A test agent
model: qwen-plus
---

This is the body content.`;

    const result = parseMarkdownWithFrontmatter(input);
    expect(result.frontmatter.name).toBe("test-agent");
    expect(result.frontmatter.description).toBe("A test agent");
    expect(result.frontmatter.model).toBe("qwen-plus");
    expect(result.body).toBe("This is the body content.");
  });

  it("should return empty frontmatter when no frontmatter exists", () => {
    const input = "Just body content here.";
    const result = parseMarkdownWithFrontmatter(input);
    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe("Just body content here.");
  });

  it("should handle boolean values in frontmatter", () => {
    const input = `---
enabled: true
disabled: false
---
Body`;

    const result = parseMarkdownWithFrontmatter(input);
    expect(result.frontmatter.enabled).toBe(true);
    expect(result.frontmatter.disabled).toBe(false);
  });

  it("should handle numeric values in frontmatter", () => {
    const input = `---
count: 42
ratio: 3.14
---
Body`;

    const result = parseMarkdownWithFrontmatter(input);
    expect(result.frontmatter.count).toBe(42);
    expect(result.frontmatter.ratio).toBe(3.14);
  });

  it("should handle quoted strings in frontmatter", () => {
    const input = `---
name: "quoted value"
other: 'single quoted'
---
Body`;

    const result = parseMarkdownWithFrontmatter(input);
    expect(result.frontmatter.name).toBe("quoted value");
    expect(result.frontmatter.other).toBe("single quoted");
  });

  it("should handle empty body", () => {
    const input = `---
name: test
---`;

    const result = parseMarkdownWithFrontmatter(input);
    expect(result.frontmatter.name).toBe("test");
    expect(result.body).toBe("");
  });
});

describe("renderMarkdownFrontmatter", () => {
  it("should render frontmatter correctly", () => {
    const fm = { name: "test", version: "1.0.0" };
    const result = renderMarkdownFrontmatter(fm);
    expect(result).toBe("---\nname: test\nversion: 1.0.0\n---");
  });

  it("should render empty frontmatter", () => {
    const result = renderMarkdownFrontmatter({});
    expect(result).toBe("---\n\n---");
  });
});

describe("parseMarkdownWithFrontmatter edge cases", () => {
  it("should handle frontmatter with unclosed delimiter", () => {
    const input = "---\nname: test\nno closing delimiter";
    const result = parseMarkdownWithFrontmatter(input);
    expect(result.frontmatter).toEqual({});
  });

  it("should handle content with colons in values", () => {
    const input = `---
url: https://example.com:8080/path
---
Body`;
    const result = parseMarkdownWithFrontmatter(input);
    expect(result.frontmatter.url).toBe("https://example.com:8080/path");
  });

  it("should handle empty string input", () => {
    const result = parseMarkdownWithFrontmatter("");
    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe("");
  });
});
