import { join } from "node:path";
import { spawn } from "node:child_process";
import { loadConfig, type ModelTier } from "../../config/index.js";
import { createSession, buildSessionArgs, buildContextInjection, loadAgentsFile, saveSession } from "../../harness/index.js";
import { hookManager } from "../../hooks/index.js";
import { createMetricsTracker } from "../../metrics/index.js";
import { logger, commandExists } from "../../utils/index.js";

/** Options accepted by the `harness` command. */
export interface HarnessOptions {
  max?: boolean;
  balanced?: boolean;
  turbo?: boolean;
  sandbox?: string;
  dryRun?: boolean;
}

/**
 * Launch an enhanced interactive Qwen CLI session.
 *
 * When `--dry-run` is set the command prints the full session
 * configuration and argument list without spawning a process.
 *
 * @param options - CLI flags parsed by Commander.
 */
export async function harnessCommand(options: HarnessOptions): Promise<void> {
  const config = await loadConfig();

  // Determine tier
  let tier: ModelTier = "balanced";
  if (options.max) tier = "high";
  else if (options.turbo) tier = "fast";
  else if (options.balanced) tier = "balanced";

  // Override sandbox if specified
  if (options.sandbox) {
    const mode = options.sandbox;
    if (mode === "full" || mode === "relaxed" || mode === "none") {
      config.harness.sandboxMode = mode;
    }
  }

  const session = createSession(config, tier);
  const stateDir = join(process.cwd(), config.stateDir);
  const metrics = createMetricsTracker(session.model);

  // Load AGENTS.md context
  const agentsContent = await loadAgentsFile();
  if (agentsContent) {
    session.context.push("AGENTS.md loaded");
  }

  const contextInjection = buildContextInjection(session, agentsContent ?? undefined);
  const args = buildSessionArgs(session, config);

  // --- dry-run mode ---
  if (options.dryRun) {
    logger.banner("DRY RUN — harness");
    logger.info(`Session:  ${session.id}`);
    logger.info(`Model:    ${session.model} (Tier: ${session.tier})`);
    logger.info(`Sandbox:  ${session.sandboxMode}`);
    logger.info(`State:    ${stateDir}`);
    logger.info(`\nCommand that would execute:`);
    logger.info(`  qwen ${args.join(" ")}`);
    logger.info(`\nContext injection:`);
    console.log(contextInjection);
    logger.info("\nNo changes were made (dry-run).");
    return;
  }

  logger.banner("qwen-pilot harness");
  logger.info(`Session: ${session.id}`);
  logger.info(`Model: ${session.model} (Tier: ${session.tier})`);
  logger.info(`Sandbox: ${session.sandboxMode}`);

  if (agentsContent) {
    logger.success("Loaded AGENTS.md context");
  }

  // Check for qwen CLI
  const hasQwen = await commandExists("qwen");
  if (!hasQwen) {
    logger.warn("Qwen CLI not found. Install it to use interactive sessions.");
    logger.info("Session prepared with the following arguments:");
    logger.info(`  qwen ${args.join(" ")}`);
    logger.info("\nContext injection:");
    console.log(contextInjection);
  } else {
    logger.step("Launching Qwen CLI session...");
    await hookManager.emit("session:start", { sessionId: session.id, tier, model: session.model });

    await saveSession(session, stateDir);
    logger.success(`Session ${session.id} ready`);

    // Spawn an interactive Qwen CLI process with inherited stdio
    const child = spawn("qwen", args, {
      stdio: "inherit",
      env: { ...process.env, QP_SESSION_ID: session.id },
    });

    await new Promise<void>((resolve, reject) => {
      child.on("close", (code) => {
        hookManager.emit("session:end", { sessionId: session.id, exitCode: code ?? 0 });
        if (code !== 0) {
          hookManager.emit("session:error", { sessionId: session.id, exitCode: code ?? 1 });
        }
        resolve();
      });
      child.on("error", (err) => {
        hookManager.emit("session:error", { sessionId: session.id, error: err.message });
        logger.error(`Failed to launch Qwen CLI: ${err.message}`);
        resolve();
      });
    });

    return;
  }

  await saveSession(session, stateDir);
  logger.success(`Session ${session.id} ready`);
}
