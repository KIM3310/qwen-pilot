export interface MarkdownFrontmatter {
  [key: string]: string | number | boolean | string[];
}

export interface ParsedMarkdown {
  frontmatter: MarkdownFrontmatter;
  body: string;
}

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

export function renderMarkdownFrontmatter(fm: MarkdownFrontmatter): string {
  const lines = Object.entries(fm).map(([k, v]) => `${k}: ${v}`);
  return `---\n${lines.join("\n")}\n---`;
}
