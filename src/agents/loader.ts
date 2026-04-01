import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { AgentRoleSchema, type AgentDefinition, type AgentRole, BUILTIN_ROLES } from "./types.js";
import { readTextFile, listFiles, fileExists, parseMarkdownWithFrontmatter, logger } from "../utils/index.js";

/**
 * Return the absolute path to the built-in prompts directory shipped
 * with the package.
 */
function getBuiltinPromptsDir(): string {
  const currentFile = fileURLToPath(import.meta.url);
  return join(dirname(currentFile), "..", "..", "prompts");
}

/**
 * Load a single agent definition by name, searching project-level
 * and built-in directories in order of priority.
 *
 * @param name       - The agent role name (e.g. `"architect"`).
 * @param searchDirs - Override search directories.
 * @returns The parsed definition or `null` if not found.
 */
export async function loadAgentDefinition(name: string, searchDirs?: string[]): Promise<AgentDefinition | null> {
  const dirs = searchDirs ?? [join(process.cwd(), "prompts"), getBuiltinPromptsDir()];

  for (const dir of dirs) {
    const filePath = join(dir, `${name}.md`);
    if (await fileExists(filePath)) {
      try {
        const raw = await readTextFile(filePath);
        const { frontmatter, body } = parseMarkdownWithFrontmatter(raw);
        const role = AgentRoleSchema.parse({ name, ...frontmatter });
        return { role, systemPrompt: body, filePath };
      } catch (e) {
        logger.warn(`Failed to parse agent definition: ${filePath}`);
      }
    }
  }

  return null;
}

/**
 * List all available agent definitions from project-level and
 * built-in directories, sorted alphabetically by name.
 *
 * @param searchDirs - Override search directories.
 * @returns Array of agent definitions.
 */
export async function listAgentDefinitions(searchDirs?: string[]): Promise<AgentDefinition[]> {
  const dirs = searchDirs ?? [join(process.cwd(), "prompts"), getBuiltinPromptsDir()];
  const seen = new Set<string>();
  const results: AgentDefinition[] = [];

  for (const dir of dirs) {
    const files = await listFiles(dir, ".md");
    for (const file of files) {
      const name = file.replace(/\.md$/, "");
      if (seen.has(name)) continue;
      seen.add(name);

      const def = await loadAgentDefinition(name, [dir]);
      if (def) results.push(def);
    }
  }

  return results.sort((a, b) => a.role.name.localeCompare(b.role.name));
}

/**
 * Determine the concrete model identifier for a given agent role
 * by inspecting keywords in the role's `model` field.
 *
 * @param role   - The agent role metadata.
 * @param models - The tier-to-model mapping from configuration.
 * @returns A model identifier string.
 */
export function resolveModelForRole(role: AgentRole, models: { high: string; balanced: string; fast: string }): string {
  const modelName = role.model.toLowerCase();
  if (modelName.includes("max") || modelName.includes("high")) return models.high;
  if (modelName.includes("turbo") || modelName.includes("fast")) return models.fast;
  return models.balanced;
}
