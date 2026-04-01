import { loadConfig } from "../../config/index.js";
import { createSession, buildSessionArgs, buildContextInjection, loadAgentsFile } from "../../harness/index.js";
import { createMetricsTracker } from "../../metrics/index.js";
import { QwenPilotError } from "../../errors/index.js";
import { logger, commandExists, exec } from "../../utils/index.js";

/** Options accepted by the `ask` command. */
export interface AskOptions {
  model?: string;
  role?: string;
  dryRun?: boolean;
}

/**
 * Execute a single-shot prompt against Qwen CLI.
 *
 * When `--dry-run` is set the command prints exactly what *would*
 * happen without invoking the Qwen CLI.
 *
 * @param prompt  - The prompt text to send.
 * @param options - CLI flags parsed by Commander.
 */
export async function askCommand(prompt: string, options: AskOptions): Promise<void> {
  if (!prompt || prompt.trim().length === 0) {
    throw new QwenPilotError("QP_012");
  }

  const config = await loadConfig();
  const session = createSession(config);
  const metrics = createMetricsTracker(session.model);

  if (options.model) {
    session.model = options.model;
  }

  // Build context
  const agentsContent = await loadAgentsFile();
  const context = buildContextInjection(session, agentsContent ?? undefined);
  const args = buildSessionArgs(session, config);

  // Add prompt
  args.push("--prompt", prompt);

  // --- dry-run mode ---
  if (options.dryRun) {
    logger.banner("DRY RUN — ask");
    logger.info(`Model:   ${session.model}`);
    logger.info(`Tier:    ${session.tier}`);
    logger.info(`Sandbox: ${session.sandboxMode}`);
    logger.info(`\nCommand that would execute:`);
    logger.info(`  qwen ${args.join(" ")}`);
    logger.info(`\nPrompt: ${prompt}`);

    if (options.role) {
      const { loadAgentDefinition } = await import("../../agents/index.js");
      const agentDef = await loadAgentDefinition(options.role);
      if (agentDef) {
        logger.info(`\nAgent: ${agentDef.role.name}`);
        logger.info(`System prompt preview: ${agentDef.systemPrompt.slice(0, 200)}...`);
      }
    }

    logger.info("\nNo changes were made (dry-run).");
    return;
  }

  const hasQwen = await commandExists("qwen");
  if (!hasQwen) {
    logger.warn("Qwen CLI not found in PATH");
    logger.info("\nWould execute:");
    logger.info(`  qwen ${args.join(" ")}`);
    logger.info(`\nPrompt: ${prompt}`);

    if (options.role) {
      const { loadAgentDefinition } = await import("../../agents/index.js");
      const agentDef = await loadAgentDefinition(options.role);
      if (agentDef) {
        logger.info(`\nAgent: ${agentDef.role.name}`);
        logger.info(`System prompt preview: ${agentDef.systemPrompt.slice(0, 200)}...`);
      }
    }
    return;
  }

  logger.step(`Asking Qwen (${session.model})...`);
  const startMs = Date.now();
  const result = await exec("qwen", args);
  const latencyMs = Date.now() - startMs;

  metrics.recordPrompt(prompt.length, latencyMs);

  if (result.exitCode !== 0) {
    logger.error(`Qwen CLI exited with code ${result.exitCode}`);
    if (result.stderr) logger.error(result.stderr);
    process.exit(1);
  }

  metrics.recordCompletion(result.stdout.length);
  console.log(result.stdout);
}
