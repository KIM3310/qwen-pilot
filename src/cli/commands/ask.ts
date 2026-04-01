import { loadConfig } from "../../config/index.js";
import { createSession, buildSessionArgs, buildContextInjection, loadAgentsFile } from "../../harness/index.js";
import { logger, commandExists, exec } from "../../utils/index.js";

interface AskOptions {
  model?: string;
  role?: string;
}

export async function askCommand(prompt: string, options: AskOptions): Promise<void> {
  if (!prompt || prompt.trim().length === 0) {
    logger.error("Prompt cannot be empty");
    process.exit(1);
  }

  const config = await loadConfig();
  const session = createSession(config);

  if (options.model) {
    session.model = options.model;
  }

  // Build context
  const agentsContent = await loadAgentsFile();
  const context = buildContextInjection(session, agentsContent ?? undefined);
  const args = buildSessionArgs(session, config);

  // Add prompt
  args.push("--prompt", prompt);

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
  const result = await exec("qwen", args);

  if (result.exitCode !== 0) {
    logger.error(`Qwen CLI exited with code ${result.exitCode}`);
    if (result.stderr) logger.error(result.stderr);
    process.exit(1);
  }

  console.log(result.stdout);
}
