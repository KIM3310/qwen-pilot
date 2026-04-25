import { loadConfig } from "../../config/index.js";
import { hookManager } from "../../hooks/index.js";
import { logger } from "../../utils/index.js";
import { executeWorkflow, listWorkflows, loadWorkflow } from "../../workflows/index.js";

/**
 * Display detailed information about a specific workflow.
 *
 * @param name - The workflow name (stem of the `.md` file).
 */
export async function workflowsShowCommand(name: string): Promise<void> {
  const workflow = await loadWorkflow(name);
  if (!workflow) {
    logger.error(`Workflow "${name}" not found`);
    process.exit(1);
  }

  logger.banner(`Workflow: ${name}`);

  console.log("Metadata:");
  console.log(`  name: ${workflow.meta.name}`);
  console.log(`  description: ${workflow.meta.description}`);
  console.log(`  loop: ${workflow.meta.loop ? "yes" : "no"}`);
  if (workflow.meta.loop) {
    console.log(`  maxIterations: ${workflow.meta.maxIterations}`);
  }
  console.log();

  console.log(`Steps (${workflow.steps.length}):`);
  console.log("─".repeat(60));
  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    if (!step) continue;
    console.log(`  ${i + 1}. ${step.name}${step.agent ? ` (agent: ${step.agent})` : ""}`);
    if (step.gate !== "none") console.log(`     gate: ${step.gate}`);
    if (step.retries > 0) console.log(`     retries: ${step.retries}`);
  }
}

/**
 * List all available workflows from project + built-in directories.
 */
export async function workflowsListCommand(): Promise<void> {
  const workflows = await listWorkflows();

  if (workflows.length === 0) {
    logger.info("No workflows found. Run 'qp setup' to initialize.");
    return;
  }

  logger.banner("Available Workflows");

  const maxName = Math.max(...workflows.map((w) => w.meta.name.length), 10);

  console.log(`  ${"NAME".padEnd(maxName)}  ${"STEPS".padEnd(6)}  ${"LOOP".padEnd(5)}  DESCRIPTION`);
  console.log(`  ${"─".repeat(maxName)}  ${"─".repeat(6)}  ${"─".repeat(5)}  ${"─".repeat(40)}`);

  for (const w of workflows) {
    console.log(
      `  ${w.meta.name.padEnd(maxName)}  ${String(w.steps.length).padEnd(6)}  ${(w.meta.loop ? "yes" : "no").padEnd(5)}  ${w.meta.description.slice(0, 60)}`,
    );
  }

  console.log(`\n  Total: ${workflows.length} workflows`);
}

/** Options for the workflow run command. */
export interface WorkflowsRunOptions {
  dryRun?: boolean;
}

/**
 * Execute a named workflow.
 *
 * When `--dry-run` is set, each step is printed with its agent and
 * gate configuration but nothing is executed.
 *
 * @param name       - Workflow name.
 * @param contextArg - Optional extra context string.
 * @param options    - CLI flags parsed by Commander.
 */
export async function workflowsRunCommand(
  name: string,
  contextArg?: string,
  options?: WorkflowsRunOptions,
): Promise<void> {
  const config = await loadConfig();
  const workflow = await loadWorkflow(name);

  if (!workflow) {
    logger.error(`Workflow "${name}" not found`);
    process.exit(1);
  }

  // --- dry-run mode ---
  if (options?.dryRun) {
    logger.banner(`DRY RUN — workflow: ${workflow.meta.name}`);
    logger.info(`Description: ${workflow.meta.description}`);
    logger.info(`Steps: ${workflow.steps.length}`);
    logger.info(`Loop: ${workflow.meta.loop ? `yes (max ${workflow.meta.maxIterations})` : "no"}`);
    if (contextArg) logger.info(`Context: ${contextArg}`);
    console.log();

    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      if (!step) continue;
      logger.step(`[${i + 1}/${workflow.steps.length}] ${step.name}`);
      if (step.agent) logger.info(`  Agent: ${step.agent}`);
      logger.info(`  Prompt: ${step.prompt.slice(0, 120)}${step.prompt.length > 120 ? "..." : ""}`);
      if (step.gate !== "none") logger.info(`  Gate: ${step.gate}`);
      if (step.retries > 0) logger.info(`  Retries: ${step.retries}`);
    }

    logger.info("\nNo changes were made (dry-run).");
    return;
  }

  await hookManager.emit("workflow:start", { name: workflow.meta.name });

  const result = await executeWorkflow(workflow, config, contextArg);

  await hookManager.emit("workflow:end", {
    name: workflow.meta.name,
    status: result.status,
    stepsCompleted: result.stepsCompleted,
  });

  if (result.status === "failed") {
    logger.error(`Workflow failed with ${result.errors.length} error(s)`);
    for (const err of result.errors) {
      logger.error(`  ${err}`);
    }
    process.exit(1);
  }

  logger.success(
    `Workflow completed: ${result.stepsCompleted}/${result.totalSteps} steps in ${((result.finishedAt - result.startedAt) / 1000).toFixed(1)}s`,
  );
}
