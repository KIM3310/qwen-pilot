/**
 * Plugin / extension loader.
 *
 * Auto-discovers custom prompts from `.qwen-pilot/prompts/` and custom
 * workflows from `.qwen-pilot/workflows/` in the project root, merging
 * them with the built-in and project-level sets.
 */

import { join } from "node:path";
import { fileExists, listFiles, readTextFile, logger } from "../utils/index.js";
import { parseMarkdownWithFrontmatter } from "../utils/markdown.js";

/** Descriptor for a discovered plugin file. */
export interface PluginEntry {
  /** Stem name without extension (e.g. `"my-agent"`). */
  name: string;
  /** Absolute path on disk. */
  filePath: string;
  /** `"prompt"` or `"workflow"`. */
  kind: "prompt" | "workflow";
}

/**
 * Return the directory where user plugins of a given kind live.
 *
 * @param kind - `"prompts"` or `"workflows"`.
 * @param cwd  - Working directory override (defaults to `process.cwd()`).
 */
export function getPluginDir(kind: "prompts" | "workflows", cwd?: string): string {
  return join(cwd ?? process.cwd(), ".qwen-pilot", kind);
}

/**
 * Scan `.qwen-pilot/prompts/` and `.qwen-pilot/workflows/` for
 * user-supplied markdown files and return descriptors.
 *
 * @param cwd - Working directory override.
 * @returns Array of discovered {@link PluginEntry} items.
 */
export async function discoverPlugins(cwd?: string): Promise<PluginEntry[]> {
  const entries: PluginEntry[] = [];

  for (const kind of ["prompts", "workflows"] as const) {
    const dir = getPluginDir(kind, cwd);
    if (!(await fileExists(dir))) continue;

    const files = await listFiles(dir, ".md");
    for (const file of files) {
      const name = file.replace(/\.md$/, "");
      entries.push({
        name,
        filePath: join(dir, file),
        kind: kind === "prompts" ? "prompt" : "workflow",
      });
    }
  }

  if (entries.length > 0) {
    logger.debug(`Discovered ${entries.length} plugin(s) from .qwen-pilot/`);
  }

  return entries;
}

/**
 * Build the ordered search-directory list for prompts, including the
 * plugin directory when it exists.
 *
 * Priority (highest first):
 * 1. `.qwen-pilot/prompts/`  (user plugins)
 * 2. `prompts/`              (project-level)
 * 3. built-in prompts shipped with the package
 *
 * @param builtinDir - Absolute path to the built-in prompts directory.
 * @param cwd        - Working directory override.
 */
export async function buildPromptSearchDirs(builtinDir: string, cwd?: string): Promise<string[]> {
  const base = cwd ?? process.cwd();
  const dirs: string[] = [];

  const pluginDir = getPluginDir("prompts", base);
  if (await fileExists(pluginDir)) dirs.push(pluginDir);

  dirs.push(join(base, "prompts"));
  dirs.push(builtinDir);

  return dirs;
}

/**
 * Build the ordered search-directory list for workflows, including the
 * plugin directory when it exists.
 *
 * @param builtinDir - Absolute path to the built-in workflows directory.
 * @param cwd        - Working directory override.
 */
export async function buildWorkflowSearchDirs(builtinDir: string, cwd?: string): Promise<string[]> {
  const base = cwd ?? process.cwd();
  const dirs: string[] = [];

  const pluginDir = getPluginDir("workflows", base);
  if (await fileExists(pluginDir)) dirs.push(pluginDir);

  dirs.push(join(base, "workflows"));
  dirs.push(builtinDir);

  return dirs;
}
