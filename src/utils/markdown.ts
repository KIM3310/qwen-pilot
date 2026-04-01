/** Key-value pairs extracted from YAML-like frontmatter. */
export interface MarkdownFrontmatter {
  [key: string]: string | number | boolean | string[];
}

/** Result of parsing a markdown file with optional frontmatter. */
export interface ParsedMarkdown {
  /** Parsed frontmatter key-value pairs. */
  frontmatter: MarkdownFrontmatter;
  /** The markdown body after the frontmatter block. */
  body: string;
}

/**
 * Parse a markdown string that may begin with a `---` delimited
 * frontmatter block.
 *
 * @param content - Raw markdown content.
 * @returns Parsed frontmatter and body.
 */
export function parseMarkdownWithFrontmatter(content: string): ParsedMarkdown {
  const trimmed = content.trim();
  if (!trimmed.startsWith("---")) {
    return { frontmatter: {}, body: trimmed };
  }

  const endIdx = trimmed.indexOf("---", 3);
  if (endIdx === -1) {
    return { frontmatter: {}, body: trimmed };
  }

  const fmBlock = trimmed.slice(3, endIdx).trim();
  const body = trimmed.slice(endIdx + 3).trim();

  const frontmatter: MarkdownFrontmatter = {};
  for (const line of fmBlock.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value: string | number | boolean = line.slice(colonIdx + 1).trim();

    // Remove surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Type coercion
    if (value === "true") value = true;
    else if (value === "false") value = false;
    else if (/^\d+(\.\d+)?$/.test(value as string)) value = Number(value);

    frontmatter[key] = value;
  }

  return { frontmatter, body };
}

/**
 * Render a frontmatter object back into a `---` delimited string.
 *
 * @param fm - The frontmatter key-value pairs.
 * @returns A formatted frontmatter block.
 */
export function renderMarkdownFrontmatter(fm: MarkdownFrontmatter): string {
  const lines = Object.entries(fm).map(([k, v]) => `${k}: ${v}`);
  return `---\n${lines.join("\n")}\n---`;
}
