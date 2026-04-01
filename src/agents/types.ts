import { z } from "zod";

export const AgentRoleSchema = z.object({
  name: z.string(),
  description: z.string(),
  model: z.string().default("qwen-plus"),
  reasoning_effort: z.enum(["low", "medium", "high"]).default("medium"),
  tags: z.array(z.string()).optional(),
});

export type AgentRole = z.infer<typeof AgentRoleSchema>;

export interface AgentDefinition {
  role: AgentRole;
  systemPrompt: string;
  filePath: string;
}

export interface AgentInstance {
  id: string;
  definition: AgentDefinition;
  status: "idle" | "working" | "completed" | "failed";
  assignedTask?: string;
  startedAt?: number;
}

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

export type BuiltinRole = (typeof BUILTIN_ROLES)[number];
