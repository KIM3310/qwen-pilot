import { z } from "zod";

export const WorkflowStepSchema = z.object({
  name: z.string(),
  agent: z.string().optional(),
  prompt: z.string(),
  gate: z.enum(["pass", "review", "test", "none"]).default("none"),
  retries: z.number().int().min(0).max(5).default(0),
});

export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

export const WorkflowMetaSchema = z.object({
  name: z.string(),
  description: z.string(),
  version: z.string().default("1.0.0"),
  tags: z.array(z.string()).optional(),
  loop: z.boolean().default(false),
  maxIterations: z.number().int().positive().default(10),
});

export type WorkflowMeta = z.infer<typeof WorkflowMetaSchema>;

export interface WorkflowDefinition {
  meta: WorkflowMeta;
  steps: WorkflowStep[];
  body: string;
  filePath: string;
}

export interface WorkflowRunResult {
  workflowName: string;
  status: "completed" | "failed" | "cancelled";
  stepsCompleted: number;
  totalSteps: number;
  startedAt: number;
  finishedAt: number;
  outputs: Record<string, string>;
  errors: string[];
}

export const BUILTIN_WORKFLOWS = [
  "autopilot",
  "deep-plan",
  "sprint",
  "investigate",
  "tdd",
  "review-cycle",
  "refactor",
  "deploy-prep",
  "interview",
  "team-sync",
] as const;

export type BuiltinWorkflow = (typeof BUILTIN_WORKFLOWS)[number];
