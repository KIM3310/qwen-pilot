import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { readTextFile, writeTextFile, listFiles, fileExists, parseMarkdownWithFrontmatter, renderMarkdownFrontmatter, type ParsedMarkdown } from "../utils/index.js";

export interface PromptInfo {
  name: string;
  description: string;
  model: string;
  reasoning_effort: string;
  filePath: string;
}

function getBuiltinDir(): string {
  const currentFile = fileURLToPath(import.meta.url);
  return join(dirname(currentFile), "..", "..", "prompts");
}

function getProjectDir(): string {
  return join(process.cwd(), "prompts");
}

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
          model: String(frontmatter.model ?? "qwen-plus"),
          reasoning_effort: String(frontmatter.reasoning_effort ?? "medium"),
          filePath,
        });
      } catch {
        results.push({ name, description: "", model: "qwen-plus", reasoning_effort: "medium", filePath });
      }
    }
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

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

export async function getPromptContent(name: string): Promise<string | null> {
  const parsed = await showPrompt(name);
  return parsed?.body ?? null;
}
