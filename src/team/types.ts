/** Possible statuses for a queued task. */
export type TaskStatus = "pending" | "assigned" | "running" | "completed" | "failed";

/** Phase labels used during team-mode orchestration. */
export type PhaseType = "plan" | "execute" | "verify" | "fix";

/** A single task in the team work queue. */
export interface TeamTask {
  /** Short unique identifier. */
  id: string;
  /** Human-readable description of the task. */
  description: string;
  /** Current lifecycle status. */
  status: TaskStatus;
  /** ID of the worker assigned to this task. */
  assignedWorker?: string;
  /** Which orchestration phase the task belongs to. */
  phase: PhaseType;
  /** Unix timestamp when the task was created. */
  createdAt: number;
  /** Unix timestamp when work started. */
  startedAt?: number;
  /** Unix timestamp when the task finished. */
  completedAt?: number;
  /** Standard output or result text. */
  output?: string;
  /** Error message if the task failed. */
  error?: string;
  /** How many times the task has been retried. */
  retries: number;
}

/** A worker process running inside a tmux pane. */
export interface TeamWorker {
  /** Short unique identifier. */
  id: string;
  /** Agent role assigned to this worker. */
  role: string;
  /** tmux pane identifier. */
  tmuxPane: string;
  /** Current worker status. */
  status: "idle" | "busy" | "dead";
  /** Unix timestamp of the last heartbeat. */
  lastHeartbeat: number;
  /** Cumulative count of completed tasks. */
  tasksCompleted: number;
}

/** Full state of a team orchestration session. */
export interface TeamSession {
  /** Unique session identifier. */
  id: string;
  /** Name of the tmux session. */
  tmuxSession: string;
  /** Active worker instances. */
  workers: TeamWorker[];
  /** Ordered queue of tasks. */
  taskQueue: TeamTask[];
  /** Current orchestration phase. */
  currentPhase: PhaseType;
  /** Unix timestamp when the session was created. */
  createdAt: number;
  /** Runtime configuration snapshot. */
  config: {
    maxWorkers: number;
    heartbeatIntervalMs: number;
    taskTimeoutMs: number;
  };
}

/** Summary metrics for a completed phase. */
export interface PhaseResult {
  /** The phase these metrics describe. */
  phase: PhaseType;
  /** Number of tasks completed in this phase. */
  tasksCompleted: number;
  /** Number of tasks that failed in this phase. */
  tasksFailed: number;
  /** Total wall-clock duration in milliseconds. */
  duration: number;
}
