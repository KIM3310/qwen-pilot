import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { type QwenPilotConfig, type ModelTier, type SandboxMode } from "../config/index.js";
import { readTextFile, writeJsonFile, readJsonFile, fileExists, ensureDir, logger } from "../utils/index.js";
import { resolveModelForRole, type AgentDefinition } from "../agents/index.js";
import { getPromptContent } from "../prompts/index.js";

/** Persistent state for a single harness session. */
export interface SessionState {
  /** Short unique identifier (8 hex chars). */
  id: string;
  /** Selected model performance tier. */
  tier: ModelTier;
  /** Concrete model identifier (e.g. `"qwen3-coder-plus"`). */
  model: string;
  /** Sandbox execution mode. */
  sandboxMode: SandboxMode;
  /** Raw AGENTS.md content, if loaded. */
  agentsFile?: string;
  /** Unix timestamp when the session was created. */
  createdAt: number;
  /** Unix timestamp of the most recent activity. */
  lastActiveAt: number;
  /** Number of prompts sent in this session. */
  promptCount: number;
  /** Ordered list of context strings injected into the session. */
  context: string[];
}

/**
 * Create a new session state from the resolved configuration.
 *
 * @param config       - The resolved qwen-pilot configuration.
 * @param tierOverride - Optional tier to use instead of the config default.
 * @returns A fresh {@link SessionState}.
 */
export function createSession(config: QwenPilotConfig, tierOverride?: ModelTier): SessionState {
  const tier = tierOverride ?? config.harness.defaultTier;
  const model = resolveModelFromTier(tier, config);

  return {
    id: randomUUID().slice(0, 8),
    tier,
    model,
    sandboxMode: config.harness.sandboxMode,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    promptCount: 0,
    context: [],
  };
}

/**
 * Map a model tier to the concrete model identifier from configuration.
 *
 * @param tier   - The tier to resolve.
 * @param config - The resolved configuration.
 * @returns A model identifier string (e.g. `"qwen3.5-plus"`).
 */
export function resolveModelFromTier(tier: ModelTier, config: QwenPilotConfig): string {
  switch (tier) {
    case "high":
      return config.models.high;
    case "fast":
      return config.models.fast;
    case "balanced":
    default:
      return config.models.balanced;
  }
}

/**
 * Build the CLI argument array for spawning a Qwen CLI process.
 *
 * @param session - The current session state.
 * @param config  - The resolved configuration.
 * @returns An array of string arguments.
 */
export function buildSessionArgs(session: SessionState, config: QwenPilotConfig): string[] {
  const args: string[] = [];

  args.push("--model", session.model);

  if (session.sandboxMode === "full") {
    args.push("--sandbox");
  } else if (session.sandboxMode === "none") {
    args.push("--no-sandbox");
  }

  return args;
}

/**
 * Build the context injection string that is prepended to prompts.
 *
 * @param session       - The current session state.
 * @param agentsContent - Optional raw AGENTS.md content to include.
 * @returns A multi-line context string.
 */
export function buildContextInjection(session: SessionState, agentsContent?: string): string {
  const parts: string[] = [];

  parts.push(`# Session: ${session.id}`);
  parts.push(`Model: ${session.model} (Tier: ${session.tier})`);
  parts.push(`Sandbox: ${session.sandboxMode}`);

  if (agentsContent) {
    parts.push("\n# Project Context (AGENTS.md)\n");
    parts.push(agentsContent);
  }

  if (session.context.length > 0) {
    parts.push("\n# Session Context\n");
    parts.push(session.context.join("\n"));
  }

  return parts.join("\n");
}

/**
 * Build the tool-calling optimization context to append when tools are available.
 *
 * Loads the `tool-calling` prompt from the prompt system and returns it
 * wrapped in a section header, or an empty string if not found.
 *
 * @param toolCount - Number of tools available in the current session.
 * @returns A context string to append, or empty string.
 */
export async function buildToolCallingInjection(toolCount?: number): Promise<string> {
  if (toolCount !== undefined && toolCount <= 0) return "";

  const content = await getPromptContent("tool-calling");
  if (!content) return "";

  const parts: string[] = [];
  parts.push("\n# Tool Calling Optimization\n");
  if (toolCount !== undefined) {
    parts.push(`Tools available: ${toolCount}\n`);
  }
  parts.push(content);
  return parts.join("\n");
}

/**
 * Attempt to read `AGENTS.md` from the given working directory.
 *
 * @param cwd - Directory to search (defaults to `process.cwd()`).
 * @returns The file contents or `null` if not found.
 */
export async function loadAgentsFile(cwd?: string): Promise<string | null> {
  const dir = cwd ?? process.cwd();
  const agentsPath = join(dir, "AGENTS.md");
  if (await fileExists(agentsPath)) {
    return readTextFile(agentsPath);
  }
  return null;
}

/**
 * Persist a session state to disk as JSON.
 *
 * @param session  - The session to save.
 * @param stateDir - The `.qwen-pilot` state directory.
 */
export async function saveSession(session: SessionState, stateDir: string): Promise<void> {
  const sessionsDir = join(stateDir, "sessions");
  await ensureDir(sessionsDir);
  await writeJsonFile(join(sessionsDir, `${session.id}.json`), session);
}

/**
 * Load a previously-saved session by its ID.
 *
 * @param sessionId - The 8-char session identifier.
 * @param stateDir  - The `.qwen-pilot` state directory.
 * @returns The session state or `null` if not found.
 */
export async function loadSession(sessionId: string, stateDir: string): Promise<SessionState | null> {
  const filePath = join(stateDir, "sessions", `${sessionId}.json`);
  if (await fileExists(filePath)) {
    return readJsonFile<SessionState>(filePath);
  }
  return null;
}

/**
 * List all saved sessions, sorted by most-recently-active first.
 *
 * @param stateDir - The `.qwen-pilot` state directory.
 * @returns Array of session states.
 */
export async function listSessions(stateDir: string): Promise<SessionState[]> {
  const sessionsDir = join(stateDir, "sessions");
  try {
    const { listFiles } = await import("../utils/index.js");
    const files = await listFiles(sessionsDir, ".json");
    const sessions: SessionState[] = [];
    for (const f of files) {
      try {
        const s = await readJsonFile<SessionState>(join(sessionsDir, f));
        sessions.push(s);
      } catch {
        // skip corrupted
      }
    }
    return sessions.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
  } catch {
    return [];
  }
}
