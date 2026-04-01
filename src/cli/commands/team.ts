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
import { logger } from "../../utils/index.js";
import { initializeStateDir } from "../../state/index.js";

interface TeamOptions {
  role?: string;
  task?: string;
}

export async function teamCommand(countStr: string, options: TeamOptions): Promise<void> {
  const count = parseInt(countStr, 10);
  if (isNaN(count) || count < 1) {
    logger.error("Worker count must be a positive integer");
    process.exit(1);
  }

  const config = await loadConfig();
  const stateDir = join(process.cwd(), config.stateDir);
  const store = await initializeStateDir(stateDir);

  logger.banner("qwen-pilot team mode");

  // Check tmux
  const hasTmux = await checkTmuxAvailable();
  if (!hasTmux) {
    logger.error("tmux is required for team mode. Install tmux and try again.");
    logger.info("  macOS:  brew install tmux");
    logger.info("  Ubuntu: sudo apt install tmux");
    process.exit(1);
  }

  const role = options.role ?? "executor";
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
