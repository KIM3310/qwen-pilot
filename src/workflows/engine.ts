import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { type WorkflowDefinition, type WorkflowRunResult, type WorkflowStep, WorkflowMetaSchema } from "./types.js";
import { readTextFile, listFiles, fileExists, parseMarkdownWithFrontmatter, logger } from "../utils/index.js";
import { loadAgentDefinition, resolveModelForRole } from "../agents/index.js";
import { type QwenPilotConfig } from "../config/index.js";
import { commandExists, exec } from "../utils/index.js";
import { createSession, buildSessionArgs } from "../harness/index.js";
import { hookManager } from "../hooks/index.js";
import { createMetricsTracker } from "../metrics/index.js";

/**
 * Return the directory containing built-in workflow definitions
 * shipped with the package.
 */
function getBuiltinDir(): string {
  const currentFile = fileURLToPath(import.meta.url);
  return join(dirname(currentFile), "..", "..", "workflows");
}

/**
 * Return the project-level workflow directory.
 */
function getProjectDir(): string {
  return join(process.cwd(), "workflows");
}

/**
 * Load a single workflow definition by name, searching project-level
 * and built-in directories (in that order).
 *
 * @param name       - Stem name of the workflow (e.g. `"autopilot"`).
 * @param searchDirs - Override search directories.
 * @returns The parsed definition or `null` if not found.
 */
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

/**
 * Parse the markdown body of a workflow into an ordered array of steps.
 *
 * Each `## Step N: <Name>` heading starts a new step block.
 */
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

/**
 * List all available workflows from the given (or default) directories.
 *
 * @param searchDirs - Override search directories.
 * @returns Sorted array of workflow definitions.
 */
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

/**
 * Execute a single workflow step by invoking the Qwen CLI (or
 * recording the intended invocation when the CLI is absent).
 *
 * @returns The CLI stdout on success, or an error string.
 */
async function executeStep(
  step: WorkflowStep,
  config: QwenPilotConfig,
  previousOutputs: Record<string, string>,
  context?: string,
): Promise<{ ok: boolean; output: string; latencyMs: number }> {
  // Determine the model for this step
  let model = config.models.balanced;
  if (step.agent) {
    const agentDef = await loadAgentDefinition(step.agent);
    if (agentDef) {
      model = resolveModelForRole(agentDef.role, config.models);
    }
  }

  // Build the full prompt, including prior step outputs as context
  const contextParts: string[] = [];
  if (context) contextParts.push(`Context: ${context}`);

  const prevKeys = Object.keys(previousOutputs);
  if (prevKeys.length > 0) {
    contextParts.push("Previous step outputs:");
    for (const key of prevKeys) {
      contextParts.push(`  [${key}]: ${previousOutputs[key]!.slice(0, 500)}`);
    }
  }

  const fullPrompt = contextParts.length > 0
    ? `${contextParts.join("\n")}\n\nTask: ${step.prompt}`
    : step.prompt;

  // Build session and args
  const session = createSession(config);
  session.model = model;
  const args = buildSessionArgs(session, config);
  args.push("--prompt", fullPrompt);

  const hasQwen = await commandExists("qwen");
  if (!hasQwen) {
    // Record what would happen without actually executing
    const output = `[Qwen CLI not available] Would execute: qwen ${args.join(" ")}`;
    return { ok: true, output, latencyMs: 0 };
  }

  const startMs = Date.now();
  const result = await exec("qwen", args);
  const latencyMs = Date.now() - startMs;

  if (result.exitCode !== 0) {
    return { ok: false, output: result.stderr || `Exit code ${result.exitCode}`, latencyMs };
  }

  return { ok: true, output: result.stdout, latencyMs };
}

/**
 * Check a gate condition for a completed step.
 *
 * - `"none"` — always passes.
 * - `"pass"` — passes if the step output is non-empty.
 * - `"review"` — passes (logged for human review).
 * - `"test"` — passes if the output does not contain common failure
 *   indicators.
 *
 * @returns `true` if the gate is satisfied.
 */
function checkGate(gate: WorkflowStep["gate"], output: string): boolean {
  switch (gate) {
    case "none":
      return true;
    case "pass":
      return output.trim().length > 0;
    case "review":
      logger.info("  Gate: review — output available for inspection");
      return true;
    case "test": {
      const failPatterns = ["FAIL", "ERROR", "error:", "AssertionError", "FAILED"];
      return !failPatterns.some((p) => output.includes(p));
    }
    default:
      return true;
  }
}

/**
 * Execute an entire workflow by sequentially running each step via the
 * Qwen CLI, checking gate conditions, and optionally looping.
 *
 * @param workflow - The parsed workflow definition.
 * @param config   - Resolved qwen-pilot configuration.
 * @param context  - Extra context string from the user.
 * @returns A summary of the run.
 */
export async function executeWorkflow(
  workflow: WorkflowDefinition,
  config: QwenPilotConfig,
  context?: string,
): Promise<WorkflowRunResult> {
  const startedAt = Date.now();
  const outputs: Record<string, string> = {};
  const errors: string[] = [];
  let stepsCompleted = 0;

  const metrics = createMetricsTracker(config.models.balanced);

  logger.banner(`Workflow: ${workflow.meta.name}`);
  logger.info(`Description: ${workflow.meta.description}`);
  logger.info(`Steps: ${workflow.steps.length}`);

  let iteration = 0;
  const maxIterations = workflow.meta.loop ? workflow.meta.maxIterations : 1;

  while (iteration < maxIterations) {
    if (workflow.meta.loop && iteration > 0) {
      logger.info(`--- Loop iteration ${iteration + 1} ---`);
    }

    let loopFailed = false;

    for (const step of workflow.steps) {
      logger.step(`[${stepsCompleted + 1}/${workflow.steps.length}] ${step.name}`);

      await hookManager.emit("workflow:step", {
        name: step.name,
        agent: step.agent,
        iteration,
      });

      if (step.agent) {
        const agentDef = await loadAgentDefinition(step.agent);
        if (agentDef) {
          logger.debug(`Using agent: ${agentDef.role.name} (${agentDef.role.model})`);
        }
      }

      // Attempt the step, with retries
      let attempt = 0;
      let stepOk = false;
      let stepOutput = "";

      while (attempt <= step.retries) {
        if (attempt > 0) {
          logger.warn(`  Retry ${attempt}/${step.retries} for "${step.name}"`);
        }

        const result = await executeStep(step, config, outputs, context);
        metrics.recordPrompt(step.prompt.length, result.latencyMs);

        if (!result.ok) {
          errors.push(`Step "${step.name}" attempt ${attempt + 1}: ${result.output}`);
          attempt++;
          continue;
        }

        metrics.recordCompletion(result.output.length);
        stepOutput = result.output;

        // Check gate condition
        if (checkGate(step.gate, stepOutput)) {
          stepOk = true;
          break;
        }

        logger.warn(`  Gate "${step.gate}" not satisfied for "${step.name}"`);
        errors.push(`Step "${step.name}" gate "${step.gate}" failed on attempt ${attempt + 1}`);
        attempt++;
      }

      const stepKey = `step_${stepsCompleted}_${step.name.replace(/\s+/g, "_")}`;
      outputs[stepKey] = stepOutput;

      if (!stepOk) {
        // In loop mode, trigger loop-back; otherwise hard-fail
        if (workflow.meta.loop) {
          logger.warn(`Step "${step.name}" failed — looping back`);
          loopFailed = true;
          break;
        }
        // Non-loop: abort
        const finishedAt = Date.now();
        return {
          workflowName: workflow.meta.name,
          status: "failed",
          stepsCompleted,
          totalSteps: workflow.steps.length,
          startedAt,
          finishedAt,
          outputs,
          errors,
        };
      }

      stepsCompleted++;
    }

    iteration++;

    // If the loop iteration succeeded fully, no need to continue looping
    if (!loopFailed) break;
  }

  const finishedAt = Date.now();
  const status = errors.length > 0 && stepsCompleted < workflow.steps.length ? "failed" : "completed";

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
