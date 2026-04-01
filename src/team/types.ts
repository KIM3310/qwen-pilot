export type TaskStatus = "pending" | "assigned" | "running" | "completed" | "failed";
export type PhaseType = "plan" | "execute" | "verify" | "fix";

export interface TeamTask {
  id: string;
  description: string;
  status: TaskStatus;
  assignedWorker?: string;
  phase: PhaseType;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  output?: string;
  error?: string;
  retries: number;
}

export interface TeamWorker {
  id: string;
  role: string;
  tmuxPane: string;
  status: "idle" | "busy" | "dead";
  lastHeartbeat: number;
  tasksCompleted: number;
}

export interface TeamSession {
  id: string;
  tmuxSession: string;
  workers: TeamWorker[];
  taskQueue: TeamTask[];
  currentPhase: PhaseType;
  createdAt: number;
  config: {
    maxWorkers: number;
    heartbeatIntervalMs: number;
    taskTimeoutMs: number;
  };
}

export interface PhaseResult {
  phase: PhaseType;
  tasksCompleted: number;
  tasksFailed: number;
  duration: number;
}
