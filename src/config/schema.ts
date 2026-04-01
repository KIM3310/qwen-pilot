import { z } from "zod";

/** Zod schema for the three model performance tiers. */
export const ModelTier = z.enum(["high", "balanced", "fast"]);

/** A model performance tier: `"high"`, `"balanced"`, or `"fast"`. */
export type ModelTier = z.infer<typeof ModelTier>;

/** Zod schema for sandbox execution modes. */
export const SandboxMode = z.enum(["full", "relaxed", "none"]);

/** Sandbox execution mode: `"full"`, `"relaxed"`, or `"none"`. */
export type SandboxMode = z.infer<typeof SandboxMode>;

/** Zod schema for the per-tier model identifier configuration. */
export const ModelConfigSchema = z.object({
  high: z.string().default("qwen3.5-plus"),
  balanced: z.string().default("qwen3-coder-plus"),
  fast: z.string().default("qwen3-coder-next"),
});

/** Zod schema for the harness session configuration. */
export const HarnessConfigSchema = z.object({
  defaultTier: ModelTier.default("balanced"),
  sandboxMode: SandboxMode.default("relaxed"),
  maxTokens: z.number().int().positive().default(8192),
  temperature: z.number().min(0).max(2).default(0.7),
  contextWindow: z.number().int().positive().default(262144),
});

/** Zod schema for the team / multi-agent configuration. */
export const TeamConfigSchema = z.object({
  maxWorkers: z.number().int().min(1).max(16).default(4),
  heartbeatIntervalMs: z.number().int().positive().default(5000),
  taskTimeoutMs: z.number().int().positive().default(300000),
  sessionPrefix: z.string().default("qp"),
});

/** Top-level Zod schema for the full qwen-pilot configuration file. */
export const QwenPilotConfigSchema = z.object({
  models: ModelConfigSchema.default({}),
  harness: HarnessConfigSchema.default({}),
  team: TeamConfigSchema.default({}),
  stateDir: z.string().default(".qwen-pilot"),
  promptsDir: z.string().default("prompts"),
  workflowsDir: z.string().default("workflows"),
  hooksEnabled: z.boolean().default(true),
});

/** Fully-resolved qwen-pilot configuration object. */
export type QwenPilotConfig = z.infer<typeof QwenPilotConfigSchema>;

/** Default configuration produced by parsing an empty object. */
export const DEFAULT_CONFIG: QwenPilotConfig = QwenPilotConfigSchema.parse({});
