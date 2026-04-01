import { z } from "zod";

/** Zod schema describing an agent role's metadata. */
export const AgentRoleSchema = z.object({
  name: z.string(),
  description: z.string(),
  model: z.string().default("qwen3-coder-plus"),
  reasoning_effort: z.enum(["low", "medium", "high"]).default("medium"),
  tags: z.array(z.string()).optional(),
});

/** Parsed agent role metadata. */
export type AgentRole = z.infer<typeof AgentRoleSchema>;

/** A fully-loaded agent definition including its system prompt. */
export interface AgentDefinition {
  /** Parsed role metadata from frontmatter. */
  role: AgentRole;
  /** The markdown body used as the system prompt. */
  systemPrompt: string;
  /** Absolute path to the source `.md` file. */
  filePath: string;
}

/** Runtime state for a single agent instance during team mode. */
export interface AgentInstance {
  /** Unique instance identifier. */
  id: string;
  /** The agent definition this instance is based on. */
  definition: AgentDefinition;
  /** Current execution status. */
  status: "idle" | "working" | "completed" | "failed";
  /** ID of the currently assigned task, if any. */
  assignedTask?: string;
  /** Unix timestamp when work started. */
  startedAt?: number;
}

/** Names of all built-in agent roles shipped with the package. */
export const BUILTIN_ROLES = [
  "architect",
  "planner",
  "executor",
  "debugger",
  "reviewer",
  "security-auditor",
  "test-engineer",
  "optimizer",
  "documenter",
  "designer",
  "analyst",
  "scientist",
  "refactorer",
  "critic",
  "mentor",
] as const;

/** Union type of built-in role name strings. */
export type BuiltinRole = (typeof BUILTIN_ROLES)[number];
