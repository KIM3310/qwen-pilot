import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { type QwenPilotConfig, type ModelTier, type SandboxMode } from "../config/index.js";
import { readTextFile, writeJsonFile, readJsonFile, fileExists, ensureDir, logger } from "../utils/index.js";
import { resolveModelForRole, type AgentDefinition } from "../agents/index.js";

export interface SessionState {
  id: string;
  tier: ModelTier;
  model: string;
  sandboxMode: SandboxMode;
  agentsFile?: string;
  createdAt: number;
  lastActiveAt: number;
  promptCount: number;
  context: string[];
}

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

export async function loadAgentsFile(cwd?: string): Promise<string | null> {
  const dir = cwd ?? process.cwd();
  const agentsPath = join(dir, "AGENTS.md");
  if (await fileExists(agentsPath)) {
    return readTextFile(agentsPath);
  }
  return null;
}

export async function saveSession(session: SessionState, stateDir: string): Promise<void> {
  const sessionsDir = join(stateDir, "sessions");
  await ensureDir(sessionsDir);
  await writeJsonFile(join(sessionsDir, `${session.id}.json`), session);
}

export async function loadSession(sessionId: string, stateDir: string): Promise<SessionState | null> {
  const filePath = join(stateDir, "sessions", `${sessionId}.json`);
  if (await fileExists(filePath)) {
    return readJsonFile<SessionState>(filePath);
  }
  return null;
}

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
