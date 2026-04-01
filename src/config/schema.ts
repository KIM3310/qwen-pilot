import { z } from "zod";

export const ModelTier = z.enum(["high", "balanced", "fast"]);
export type ModelTier = z.infer<typeof ModelTier>;

export const SandboxMode = z.enum(["full", "relaxed", "none"]);
export type SandboxMode = z.infer<typeof SandboxMode>;

export const ModelConfigSchema = z.object({
  high: z.string().default("qwen-max"),
  balanced: z.string().default("qwen-plus"),
  fast: z.string().default("qwen-turbo"),
});

export const HarnessConfigSchema = z.object({
  defaultTier: ModelTier.default("balanced"),
  sandboxMode: SandboxMode.default("relaxed"),
  maxTokens: z.number().int().positive().default(8192),
  temperature: z.number().min(0).max(2).default(0.7),
  contextWindow: z.number().int().positive().default(32768),
});

export const TeamConfigSchema = z.object({
  maxWorkers: z.number().int().min(1).max(16).default(4),
  heartbeatIntervalMs: z.number().int().positive().default(5000),
  taskTimeoutMs: z.number().int().positive().default(300000),
  sessionPrefix: z.string().default("qp"),
});

export const QwenPilotConfigSchema = z.object({
  models: ModelConfigSchema.default({}),
  harness: HarnessConfigSchema.default({}),
  team: TeamConfigSchema.default({}),
  stateDir: z.string().default(".qwen-pilot"),
  promptsDir: z.string().default("prompts"),
  workflowsDir: z.string().default("workflows"),
  hooksEnabled: z.boolean().default(true),
});

export type QwenPilotConfig = z.infer<typeof QwenPilotConfigSchema>;

export const DEFAULT_CONFIG: QwenPilotConfig = QwenPilotConfigSchema.parse({});
