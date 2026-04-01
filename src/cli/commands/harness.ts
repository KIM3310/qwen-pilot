import { join } from "node:path";
import { loadConfig, type ModelTier } from "../../config/index.js";
import { createSession, buildSessionArgs, buildContextInjection, loadAgentsFile, saveSession } from "../../harness/index.js";
import { hookManager } from "../../hooks/index.js";
import { logger, commandExists } from "../../utils/index.js";

interface HarnessOptions {
  max?: boolean;
  balanced?: boolean;
  turbo?: boolean;
  sandbox?: string;
}

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

  logger.banner("qwen-pilot harness");
  logger.info(`Session: ${session.id}`);
  logger.info(`Model: ${session.model} (Tier: ${session.tier})`);
  logger.info(`Sandbox: ${session.sandboxMode}`);

  // Load AGENTS.md context
  const agentsContent = await loadAgentsFile();
  if (agentsContent) {
    logger.success("Loaded AGENTS.md context");
    session.context.push("AGENTS.md loaded");
  }

  const contextInjection = buildContextInjection(session, agentsContent ?? undefined);
  const args = buildSessionArgs(session, config);

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
    const { exec } = await import("../../utils/index.js");
    // Save session before launch
    await saveSession(session, stateDir);
    await hookManager.emit("session:start", { sessionId: session.id, tier, model: session.model });

    // In production, this would spawn an interactive Qwen CLI process.
    // For now we report the command:
    logger.info(`Command: qwen ${args.join(" ")}`);
    logger.info("Use --system-prompt to inject context.");
  }

  await saveSession(session, stateDir);
  logger.success(`Session ${session.id} ready`);
}
