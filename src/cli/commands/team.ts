import { join } from "node:path";
import { loadConfig } from "../../config/index.js";
import {
  createTeamSession,
  checkTmuxAvailable,
  createTmuxSession,
  createTmuxPane,
  spawnWorker,
  addTask,
  sendToPane,
} from "../../team/index.js";
import { loadAgentDefinition, resolveModelForRole } from "../../agents/index.js";
import { hookManager } from "../../hooks/index.js";
import { QwenPilotError } from "../../errors/index.js";
import { logger, ensureQwenCli } from "../../utils/index.js";
import { initializeStateDir } from "../../state/index.js";

/** Options accepted by the `team` command. */
export interface TeamOptions {
  role?: string;
  task?: string;
  dryRun?: boolean;
}

/**
 * Launch a multi-agent team coordinated through tmux.
 *
 * When `--dry-run` is set, the command prints the planned tmux layout,
 * worker configuration, and commands without creating any sessions.
 *
 * @param countStr - Number of workers (from CLI argument).
 * @param options  - CLI flags parsed by Commander.
 */
export async function teamCommand(countStr: string, options: TeamOptions): Promise<void> {
  const count = parseInt(countStr, 10);
  if (isNaN(count) || count < 1) {
    logger.error("Worker count must be a positive integer");
    process.exit(1);
  }

  const config = await loadConfig();
  const role = options.role ?? "executor";

  // --- dry-run mode ---
  if (options.dryRun) {
    const session = createTeamSession(config, count);
    const agentDef = await loadAgentDefinition(role);

    logger.banner("DRY RUN — team");
    logger.info(`Session:  ${session.id}`);
    logger.info(`Workers:  ${session.config.maxWorkers}`);
    logger.info(`Role:     ${role}`);

    if (agentDef) {
      const model = resolveModelForRole(agentDef.role, config.models);
      logger.info(`Model:    ${model}`);
      logger.info(`Agent:    ${agentDef.role.name} — ${agentDef.role.description}`);
    }

    logger.info(`\nTmux session: ${session.tmuxSession}`);
    for (let i = 0; i < session.config.maxWorkers; i++) {
      const paneId = i === 0 ? `${session.tmuxSession}:0.0` : `${session.tmuxSession}:0.${i}`;
      const model = agentDef
        ? resolveModelForRole(agentDef.role, config.models)
        : config.models.balanced;
      logger.info(`  Pane ${paneId}: qwen --model ${model}`);
    }

    if (options.task) {
      logger.info(`\nInitial task: ${options.task}`);
    }

    logger.info("\nNo changes were made (dry-run).");
    return;
  }

  const stateDir = join(process.cwd(), config.stateDir);
  const store = await initializeStateDir(stateDir);

  logger.banner("qwen-pilot team mode");

  // Ensure qwen CLI is available before setting up team
  await ensureQwenCli();

  // Check tmux
  const hasTmux = await checkTmuxAvailable();
  if (!hasTmux) {
    throw new QwenPilotError("QP_006");
  }

  const session = createTeamSession(config, count);

  logger.info(`Team session: ${session.id}`);
  logger.info(`Workers: ${session.config.maxWorkers}`);
  logger.info(`Role: ${role}`);

  // Load agent definition
  const agentDef = await loadAgentDefinition(role);
  if (!agentDef) {
    logger.warn(`Agent role "${role}" not found, using default executor behavior`);
  }

  // Create tmux session
  logger.step("Creating tmux session...");
  const tmuxCreated = await createTmuxSession(session.tmuxSession);
  if (!tmuxCreated) {
    logger.error("Failed to create tmux session");
    process.exit(1);
  }

  // Spawn workers
  for (let i = 0; i < session.config.maxWorkers; i++) {
    logger.step(`Spawning worker ${i + 1}/${session.config.maxWorkers}...`);

    let paneId: string;
    if (i === 0) {
      // Use the default pane for first worker
      paneId = `${session.tmuxSession}:0.0`;
    } else {
      paneId = await createTmuxPane(session.tmuxSession, `worker-${i}`);
    }

    const worker = spawnWorker(session, role, paneId);
    await hookManager.emit("team:spawn", { workerId: worker.id, role });

    // Build the command for this worker
    const model = agentDef
      ? resolveModelForRole(agentDef.role, config.models)
      : config.models.balanced;

    // Send the actual qwen CLI command to the tmux pane
    const qwenArgs = [`--model`, model];
    const workerCmd = `qwen ${qwenArgs.join(" ")}`;
    logger.info(`  Pane ${paneId}: ${workerCmd}`);
    await sendToPane(paneId, workerCmd);
  }

  // Add initial task if provided
  if (options.task) {
    const task = addTask(session, options.task);
    logger.info(`Task queued: ${task.id} — ${task.description}`);
  }

  // Save session state
  await store.set("sessions", session.id, session);

  logger.success(`Team session ${session.tmuxSession} created with ${session.config.maxWorkers} workers`);
  logger.info(`Attach: tmux attach -t ${session.tmuxSession}`);
}
