import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { type WorkflowDefinition, type WorkflowRunResult, type WorkflowStep, WorkflowMetaSchema } from "./types.js";
import { readTextFile, listFiles, fileExists, parseMarkdownWithFrontmatter, logger } from "../utils/index.js";
import { loadAgentDefinition } from "../agents/index.js";
import { type QwenPilotConfig } from "../config/index.js";

function getBuiltinDir(): string {
  const currentFile = fileURLToPath(import.meta.url);
  return join(dirname(currentFile), "..", "..", "workflows");
}

function getProjectDir(): string {
  return join(process.cwd(), "workflows");
}

export async function loadWorkflow(name: string, searchDirs?: string[]): Promise<WorkflowDefinition | null> {
  const dirs = searchDirs ?? [getProjectDir(), getBuiltinDir()];

  for (const dir of dirs) {
    const filePath = join(dir, `${name}.md`);
    if (await fileExists(filePath)) {
      try {
        const raw = await readTextFile(filePath);
        const { frontmatter, body } = parseMarkdownWithFrontmatter(raw);
        const meta = WorkflowMetaSchema.parse({ name, ...frontmatter });

        const steps = parseWorkflowSteps(body);
        return { meta, steps, body, filePath };
      } catch (e) {
        logger.warn(`Failed to parse workflow: ${filePath}`);
      }
    }
  }

  return null;
}

function parseWorkflowSteps(body: string): WorkflowStep[] {
  const steps: WorkflowStep[] = [];
  const stepBlocks = body.split(/^## Step /m).filter((b) => b.trim());

  for (const block of stepBlocks) {
    const lines = block.trim().split("\n");
    const headerLine = lines[0] ?? "";

    // Extract step name from header like "1: Plan" or "2: Execute (agent: executor)"
    const nameMatch = headerLine.match(/\d+:\s*(.+?)(?:\s*\(|$)/);
    const stepName = nameMatch?.[1]?.trim() ?? `Step ${steps.length + 1}`;

    const agentMatch = headerLine.match(/agent:\s*(\w[\w-]*)/);
    const gateMatch = block.match(/gate:\s*(pass|review|test|none)/i);
    const retriesMatch = block.match(/retries:\s*(\d+)/);

    const promptLines = lines.slice(1).filter((l) => !/^(gate|retries|agent):/i.test(l));
    const prompt = promptLines.join("\n").trim();

    const gateValue = gateMatch?.[1]?.toLowerCase();
    const validGate = gateValue === "pass" || gateValue === "review" || gateValue === "test" ? gateValue : "none";

    steps.push({
      name: stepName,
      agent: agentMatch?.[1],
      prompt: prompt || `Execute ${stepName}`,
      gate: validGate,
      retries: retriesMatch?.[1] ? parseInt(retriesMatch[1], 10) : 0,
    });
  }

  return steps;
}

export async function listWorkflows(searchDirs?: string[]): Promise<WorkflowDefinition[]> {
  const dirs = searchDirs ?? [getProjectDir(), getBuiltinDir()];
  const seen = new Set<string>();
  const results: WorkflowDefinition[] = [];

  for (const dir of dirs) {
    const files = await listFiles(dir, ".md");
    for (const file of files) {
      const name = file.replace(/\.md$/, "");
      if (seen.has(name)) continue;
      seen.add(name);

      const wf = await loadWorkflow(name, [dir]);
      if (wf) results.push(wf);
    }
  }

  return results.sort((a, b) => a.meta.name.localeCompare(b.meta.name));
}

export async function executeWorkflow(
  workflow: WorkflowDefinition,
  config: QwenPilotConfig,
  context?: string,
): Promise<WorkflowRunResult> {
  const startedAt = Date.now();
  const outputs: Record<string, string> = {};
  const errors: string[] = [];
  let stepsCompleted = 0;

  logger.banner(`Workflow: ${workflow.meta.name}`);
  logger.info(`Description: ${workflow.meta.description}`);
  logger.info(`Steps: ${workflow.steps.length}`);

  let iteration = 0;
  const maxIterations = workflow.meta.loop ? workflow.meta.maxIterations : 1;

  while (iteration < maxIterations) {
    if (workflow.meta.loop && iteration > 0) {
      logger.info(`--- Loop iteration ${iteration + 1} ---`);
    }

    for (const step of workflow.steps) {
      logger.step(`[${stepsCompleted + 1}/${workflow.steps.length}] ${step.name}`);

      if (step.agent) {
        const agentDef = await loadAgentDefinition(step.agent);
        if (agentDef) {
          logger.debug(`Using agent: ${agentDef.role.name} (${agentDef.role.model})`);
        }
      }

      // In a real implementation, this would invoke Qwen CLI.
      // Here we record the step as completed for the orchestration layer.
      const stepKey = `step_${stepsCompleted}_${step.name.replace(/\s+/g, "_")}`;
      outputs[stepKey] = `[Awaiting Qwen CLI execution] ${step.prompt.slice(0, 200)}`;

      if (step.gate !== "none") {
        logger.info(`Gate: ${step.gate} — verification required`);
      }

      stepsCompleted++;
    }

    iteration++;
    if (!workflow.meta.loop) break;
  }

  const finishedAt = Date.now();
  const status = errors.length > 0 ? "failed" : "completed";

  logger.success(`Workflow ${workflow.meta.name} ${status} in ${((finishedAt - startedAt) / 1000).toFixed(1)}s`);

  return {
    workflowName: workflow.meta.name,
    status,
    stepsCompleted,
    totalSteps: workflow.steps.length,
    startedAt,
    finishedAt,
    outputs,
    errors,
  };
}
