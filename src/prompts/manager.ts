import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { readTextFile, writeTextFile, listFiles, fileExists, parseMarkdownWithFrontmatter, renderMarkdownFrontmatter, type ParsedMarkdown } from "../utils/index.js";

/** Lightweight metadata about a prompt file. */
export interface PromptInfo {
  /** Stem name (e.g. `"architect"`). */
  name: string;
  /** Short description from frontmatter. */
  description: string;
  /** Model identifier from frontmatter. */
  model: string;
  /** Reasoning effort level. */
  reasoning_effort: string;
  /** Absolute path to the source file. */
  filePath: string;
}

/**
 * Return the built-in prompts directory shipped with the package.
 */
function getBuiltinDir(): string {
  const currentFile = fileURLToPath(import.meta.url);
  return join(dirname(currentFile), "..", "..", "prompts");
}

/**
 * Return the project-level prompts directory.
 */
function getProjectDir(): string {
  return join(process.cwd(), "prompts");
}

/**
 * List all available prompts from project-level and built-in
 * directories, sorted alphabetically.
 *
 * @returns Array of prompt metadata objects.
 */
export async function listPrompts(): Promise<PromptInfo[]> {
  const results: PromptInfo[] = [];
  const seen = new Set<string>();

  for (const dir of [getProjectDir(), getBuiltinDir()]) {
    const files = await listFiles(dir, ".md");
    for (const file of files) {
      const name = file.replace(/\.md$/, "");
      if (seen.has(name)) continue;
      seen.add(name);

      const filePath = join(dir, file);
      try {
        const raw = await readTextFile(filePath);
        const { frontmatter } = parseMarkdownWithFrontmatter(raw);
        results.push({
          name,
          description: String(frontmatter.description ?? ""),
          model: String(frontmatter.model ?? "qwen3-coder-plus"),
          reasoning_effort: String(frontmatter.reasoning_effort ?? "medium"),
          filePath,
        });
      } catch {
        results.push({ name, description: "", model: "qwen3-coder-plus", reasoning_effort: "medium", filePath });
      }
    }
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Load and parse a single prompt by name.
 *
 * @param name - Stem name of the prompt.
 * @returns Parsed markdown (frontmatter + body) or `null`.
 */
export async function showPrompt(name: string): Promise<ParsedMarkdown | null> {
  for (const dir of [getProjectDir(), getBuiltinDir()]) {
    const filePath = join(dir, `${name}.md`);
    if (await fileExists(filePath)) {
      const raw = await readTextFile(filePath);
      return parseMarkdownWithFrontmatter(raw);
    }
  }
  return null;
}

/**
 * Return just the body content of a prompt (the system prompt text).
 *
 * @param name - Stem name of the prompt.
 * @returns The body text or `null` if not found.
 */
export async function getPromptContent(name: string): Promise<string | null> {
  const parsed = await showPrompt(name);
  return parsed?.body ?? null;
}
