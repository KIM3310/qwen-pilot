import { homedir } from "node:os";
import { join } from "node:path";
import { fileExists, logger, readJsonFile } from "../utils/index.js";
import { DEFAULT_CONFIG, type QwenPilotConfig, QwenPilotConfigSchema } from "./schema.js";

const CONFIG_FILENAME = "qwen-pilot.json";

/**
 * Return the absolute path to the user-level config file
 * (`~/.config/qwen-pilot/qwen-pilot.json`).
 */
export function getUserConfigPath(): string {
  return join(homedir(), ".config", "qwen-pilot", CONFIG_FILENAME);
}

/**
 * Return the absolute path to the project-level config file
 * (`.qwen-pilot/qwen-pilot.json` under the current working directory).
 */
export function getProjectConfigPath(): string {
  return join(process.cwd(), ".qwen-pilot", CONFIG_FILENAME);
}

/**
 * Apply environment variable overrides on top of a parsed config.
 *
 * Supported variables: `QP_MODEL_HIGH`, `QP_MODEL_BALANCED`,
 * `QP_MODEL_FAST`, `QP_SANDBOX_MODE`, `QP_MAX_WORKERS`.
 */
function applyEnvOverrides(config: QwenPilotConfig): QwenPilotConfig {
  const env = process.env;
  const merged = structuredClone(config);

  if (env.QP_MODEL_HIGH) merged.models.high = env.QP_MODEL_HIGH;
  if (env.QP_MODEL_BALANCED) merged.models.balanced = env.QP_MODEL_BALANCED;
  if (env.QP_MODEL_FAST) merged.models.fast = env.QP_MODEL_FAST;
  if (env.QP_SANDBOX_MODE) {
    const mode = env.QP_SANDBOX_MODE;
    if (mode === "full" || mode === "relaxed" || mode === "none") {
      merged.harness.sandboxMode = mode;
    }
  }
  if (env.QP_MAX_WORKERS) {
    const n = parseInt(env.QP_MAX_WORKERS, 10);
    if (!Number.isNaN(n) && n >= 1) merged.team.maxWorkers = n;
  }

  return merged;
}

/**
 * Deep-merge two plain objects, preferring values from `override`.
 */
function deepMerge(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
  const result = { ...base };
  for (const [key, val] of Object.entries(override)) {
    if (
      val &&
      typeof val === "object" &&
      !Array.isArray(val) &&
      typeof result[key] === "object" &&
      result[key] !== null
    ) {
      result[key] = deepMerge(result[key] as Record<string, unknown>, val as Record<string, unknown>);
    } else {
      result[key] = val;
    }
  }
  return result;
}

/**
 * Load the resolved configuration by layering user-level, project-level,
 * and environment-variable overrides.
 *
 * @returns The fully-resolved {@link QwenPilotConfig}.
 */
export async function loadConfig(): Promise<QwenPilotConfig> {
  let merged: Record<string, unknown> = {};

  // Layer 1: User-level config
  const userPath = getUserConfigPath();
  if (await fileExists(userPath)) {
    try {
      const userCfg = await readJsonFile<Record<string, unknown>>(userPath);
      merged = deepMerge(merged, userCfg);
      logger.debug(`Loaded user config from ${userPath}`);
    } catch (_e) {
      logger.warn(`Failed to parse user config at ${userPath}`);
    }
  }

  // Layer 2: Project-level config
  const projectPath = getProjectConfigPath();
  if (await fileExists(projectPath)) {
    try {
      const projCfg = await readJsonFile<Record<string, unknown>>(projectPath);
      merged = deepMerge(merged, projCfg);
      logger.debug(`Loaded project config from ${projectPath}`);
    } catch (_e) {
      logger.warn(`Failed to parse project config at ${projectPath}`);
    }
  }

  // Validate with defaults
  const parsed = QwenPilotConfigSchema.parse(merged);

  // Layer 3: Environment overrides
  return applyEnvOverrides(parsed);
}

/**
 * Validate an arbitrary value against the config schema.
 *
 * @param raw - The value to validate (typically parsed JSON).
 * @returns An object with `valid` boolean and an `errors` array.
 */
export function validateConfig(raw: unknown): { valid: boolean; errors: string[] } {
  const result = QwenPilotConfigSchema.safeParse(raw);
  if (result.success) {
    return { valid: true, errors: [] };
  }
  return {
    valid: false,
    errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
  };
}

export { DEFAULT_CONFIG };
