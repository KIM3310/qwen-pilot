import { randomUUID } from "node:crypto";
import { type TeamSession, type TeamTask, type TeamWorker, type PhaseType, type PhaseResult } from "./types.js";
import { type QwenPilotConfig } from "../config/index.js";
import { exec, commandExists, logger } from "../utils/index.js";

const PHASE_ORDER: PhaseType[] = ["plan", "execute", "verify", "fix"];

/**
 * Create a new team session with the given worker count.
 *
 * The worker count is capped at the configured maximum.
 *
 * @param config      - Resolved qwen-pilot configuration.
 * @param workerCount - Desired number of workers.
 * @returns A fresh {@link TeamSession}.
 */
export function createTeamSession(config: QwenPilotConfig, workerCount: number): TeamSession {
  const sessionId = `qp-${randomUUID().slice(0, 6)}`;
  return {
    id: sessionId,
    tmuxSession: `${config.team.sessionPrefix}-${sessionId}`,
    workers: [],
    taskQueue: [],
    currentPhase: "plan",
    createdAt: Date.now(),
    config: {
      maxWorkers: Math.min(workerCount, config.team.maxWorkers),
      heartbeatIntervalMs: config.team.heartbeatIntervalMs,
      taskTimeoutMs: config.team.taskTimeoutMs,
    },
  };
}

/**
 * Add a task to the session work queue.
 *
 * @param session     - The team session.
 * @param description - Human-readable task description.
 * @param phase       - The phase this task belongs to (default: `"execute"`).
 * @returns The newly created task.
 */
export function addTask(session: TeamSession, description: string, phase: PhaseType = "execute"): TeamTask {
  const task: TeamTask = {
    id: randomUUID().slice(0, 8),
    description,
    status: "pending",
    phase,
    createdAt: Date.now(),
    retries: 0,
  };
  session.taskQueue.push(task);
  return task;
}

/**
 * Assign a pending task to an idle worker.
 *
 * @param session  - The team session.
 * @param taskId   - ID of the task to assign.
 * @param workerId - ID of the worker to assign to.
 * @returns `true` if the assignment succeeded.
 */
export function assignTask(session: TeamSession, taskId: string, workerId: string): boolean {
  const task = session.taskQueue.find((t) => t.id === taskId);
  const worker = session.workers.find((w) => w.id === workerId);

  if (!task || !worker || task.status !== "pending" || worker.status !== "idle") {
    return false;
  }

  task.status = "assigned";
  task.assignedWorker = workerId;
  task.startedAt = Date.now();
  worker.status = "busy";
  return true;
}

/**
 * Mark a task as completed and free the assigned worker.
 *
 * @param session - The team session.
 * @param taskId  - ID of the task.
 * @param output  - Optional result text.
 * @returns `true` if the completion was recorded.
 */
export function completeTask(session: TeamSession, taskId: string, output?: string): boolean {
  const task = session.taskQueue.find((t) => t.id === taskId);
  if (!task || task.status !== "assigned") return false;

  task.status = "completed";
  task.completedAt = Date.now();
  task.output = output;

  if (task.assignedWorker) {
    const worker = session.workers.find((w) => w.id === task.assignedWorker);
    if (worker) {
      worker.status = "idle";
      worker.tasksCompleted++;
    }
  }

  return true;
}

/**
 * Mark a task as failed and free the assigned worker.
 *
 * @param session - The team session.
 * @param taskId  - ID of the task.
 * @param error   - Error description.
 * @returns `true` if the failure was recorded.
 */
export function failTask(session: TeamSession, taskId: string, error: string): boolean {
  const task = session.taskQueue.find((t) => t.id === taskId);
  if (!task) return false;

  task.status = "failed";
  task.error = error;
  task.completedAt = Date.now();

  if (task.assignedWorker) {
    const worker = session.workers.find((w) => w.id === task.assignedWorker);
    if (worker) worker.status = "idle";
  }

  return true;
}

/**
 * Return the phase that follows the given one in the standard cycle.
 *
 * @param current - The current phase.
 * @returns The next phase (wraps around to `"plan"`).
 */
export function getNextPhase(current: PhaseType): PhaseType {
  const idx = PHASE_ORDER.indexOf(current);
  if (idx === -1 || idx >= PHASE_ORDER.length - 1) return "plan";
  return PHASE_ORDER[idx + 1] ?? "plan";
}

/**
 * Advance the session to the next phase.
 *
 * @param session - The team session to advance.
 * @returns The new current phase.
 */
export function advancePhase(session: TeamSession): PhaseType {
  session.currentPhase = getNextPhase(session.currentPhase);
  return session.currentPhase;
}

/**
 * Return all pending tasks, optionally filtered by phase.
 *
 * @param session - The team session.
 * @param phase   - Optional phase filter.
 */
export function getPendingTasks(session: TeamSession, phase?: PhaseType): TeamTask[] {
  return session.taskQueue.filter(
    (t) => t.status === "pending" && (phase === undefined || t.phase === phase),
  );
}

/**
 * Return all workers in the `"idle"` state.
 *
 * @param session - The team session.
 */
export function getIdleWorkers(session: TeamSession): TeamWorker[] {
  return session.workers.filter((w) => w.status === "idle");
}

/**
 * Compute summary metrics for a completed phase.
 *
 * @param session - The team session.
 * @param phase   - The phase to summarise.
 * @returns A {@link PhaseResult} with counts and duration.
 */
export function getPhaseResult(session: TeamSession, phase: PhaseType): PhaseResult {
  const phaseTasks = session.taskQueue.filter((t) => t.phase === phase);
  const completed = phaseTasks.filter((t) => t.status === "completed");
  const failed = phaseTasks.filter((t) => t.status === "failed");

  const startTimes = phaseTasks.map((t) => t.startedAt ?? t.createdAt);
  const endTimes = phaseTasks.map((t) => t.completedAt ?? Date.now());
  const duration = endTimes.length > 0 ? Math.max(...endTimes) - Math.min(...startTimes) : 0;

  return {
    phase,
    tasksCompleted: completed.length,
    tasksFailed: failed.length,
    duration,
  };
}

/**
 * Check whether tmux is available on the system.
 *
 * @returns `true` if `tmux` is found in `$PATH`.
 */
export async function checkTmuxAvailable(): Promise<boolean> {
  return commandExists("tmux");
}

/**
 * Create a new detached tmux session.
 *
 * @param sessionName - The tmux session name.
 * @returns `true` if creation succeeded.
 */
export async function createTmuxSession(sessionName: string): Promise<boolean> {
  const result = await exec("tmux", ["new-session", "-d", "-s", sessionName]);
  return result.exitCode === 0;
}

/**
 * Split a new pane inside an existing tmux session.
 *
 * @param sessionName - The tmux session name.
 * @param paneLabel   - A label for logging (not used by tmux).
 * @returns The new pane's identifier string.
 */
export async function createTmuxPane(sessionName: string, paneLabel: string): Promise<string> {
  const result = await exec("tmux", ["split-window", "-t", sessionName, "-P", "-F", "#{pane_id}"]);
  if (result.exitCode !== 0) {
    throw new Error(`Failed to create tmux pane: ${result.stderr}`);
  }
  return result.stdout.trim();
}

/**
 * Send a command string to a tmux pane as simulated keystrokes.
 *
 * @param paneId  - The tmux pane identifier.
 * @param command - The shell command to send.
 */
export async function sendToPane(paneId: string, command: string): Promise<void> {
  await exec("tmux", ["send-keys", "-t", paneId, command, "Enter"]);
}

/**
 * Destroy a tmux session.
 *
 * @param sessionName - The tmux session to kill.
 */
export async function killTmuxSession(sessionName: string): Promise<void> {
  await exec("tmux", ["kill-session", "-t", sessionName]);
}

/**
 * List tmux sessions whose names start with the given prefix.
 *
 * @param prefix - The prefix to match (e.g. `"qp"`).
 * @returns Array of matching session names.
 */
export async function listTmuxSessions(prefix: string): Promise<string[]> {
  const result = await exec("tmux", ["list-sessions", "-F", "#{session_name}"]);
  if (result.exitCode !== 0) return [];
  return result.stdout
    .trim()
    .split("\n")
    .filter((s) => s.startsWith(prefix));
}

/**
 * Register a new worker in the team session.
 *
 * @param session - The team session.
 * @param role    - Agent role for this worker.
 * @param paneId  - The tmux pane this worker lives in.
 * @returns The newly created worker.
 */
export function spawnWorker(session: TeamSession, role: string, paneId: string): TeamWorker {
  const worker: TeamWorker = {
    id: randomUUID().slice(0, 8),
    role,
    tmuxPane: paneId,
    status: "idle",
    lastHeartbeat: Date.now(),
    tasksCompleted: 0,
  };
  session.workers.push(worker);
  return worker;
}

/**
 * Detect workers whose heartbeat has exceeded the task timeout.
 *
 * @param session - The team session.
 * @returns Array of workers marked as `"dead"`.
 */
export function checkHeartbeats(session: TeamSession): TeamWorker[] {
  const now = Date.now();
  const deadWorkers: TeamWorker[] = [];

  for (const worker of session.workers) {
    if (now - worker.lastHeartbeat > session.config.taskTimeoutMs) {
      worker.status = "dead";
      deadWorkers.push(worker);
    }
  }

  return deadWorkers;
}
