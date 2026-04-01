import { randomUUID } from "node:crypto";
import { type TeamSession, type TeamTask, type TeamWorker, type PhaseType, type PhaseResult } from "./types.js";
import { type QwenPilotConfig } from "../config/index.js";
import { exec, commandExists, logger } from "../utils/index.js";

const PHASE_ORDER: PhaseType[] = ["plan", "execute", "verify", "fix"];

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

export function getNextPhase(current: PhaseType): PhaseType {
  const idx = PHASE_ORDER.indexOf(current);
  if (idx === -1 || idx >= PHASE_ORDER.length - 1) return "plan";
  return PHASE_ORDER[idx + 1] ?? "plan";
}

export function advancePhase(session: TeamSession): PhaseType {
  session.currentPhase = getNextPhase(session.currentPhase);
  return session.currentPhase;
}

export function getPendingTasks(session: TeamSession, phase?: PhaseType): TeamTask[] {
  return session.taskQueue.filter(
    (t) => t.status === "pending" && (phase === undefined || t.phase === phase),
  );
}

export function getIdleWorkers(session: TeamSession): TeamWorker[] {
  return session.workers.filter((w) => w.status === "idle");
}

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

export async function checkTmuxAvailable(): Promise<boolean> {
  return commandExists("tmux");
}

export async function createTmuxSession(sessionName: string): Promise<boolean> {
  const result = await exec("tmux", ["new-session", "-d", "-s", sessionName]);
  return result.exitCode === 0;
}

export async function createTmuxPane(sessionName: string, paneLabel: string): Promise<string> {
  const result = await exec("tmux", ["split-window", "-t", sessionName, "-P", "-F", "#{pane_id}"]);
  if (result.exitCode !== 0) {
    throw new Error(`Failed to create tmux pane: ${result.stderr}`);
  }
  return result.stdout.trim();
}

export async function sendToPane(paneId: string, command: string): Promise<void> {
  await exec("tmux", ["send-keys", "-t", paneId, command, "Enter"]);
}

export async function killTmuxSession(sessionName: string): Promise<void> {
  await exec("tmux", ["kill-session", "-t", sessionName]);
}

export async function listTmuxSessions(prefix: string): Promise<string[]> {
  const result = await exec("tmux", ["list-sessions", "-F", "#{session_name}"]);
  if (result.exitCode !== 0) return [];
  return result.stdout
    .trim()
    .split("\n")
    .filter((s) => s.startsWith(prefix));
}

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
