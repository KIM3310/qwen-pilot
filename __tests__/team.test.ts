import { describe, it, expect } from "vitest";
import {
  createTeamSession,
  addTask,
  assignTask,
  completeTask,
  failTask,
  getNextPhase,
  advancePhase,
  getPendingTasks,
  getIdleWorkers,
  getPhaseResult,
  spawnWorker,
  checkHeartbeats,
} from "../src/team/coordinator.js";
import { DEFAULT_CONFIG } from "../src/config/schema.js";

function makeSession() {
  return createTeamSession(DEFAULT_CONFIG, 3);
}

describe("Team Session", () => {
  it("should create a session with correct defaults", () => {
    const session = makeSession();
    expect(session.id).toBeTruthy();
    expect(session.currentPhase).toBe("plan");
    expect(session.workers).toHaveLength(0);
    expect(session.taskQueue).toHaveLength(0);
    expect(session.config.maxWorkers).toBe(3);
  });

  it("should cap worker count at config max", () => {
    const session = createTeamSession(DEFAULT_CONFIG, 100);
    expect(session.config.maxWorkers).toBe(DEFAULT_CONFIG.team.maxWorkers);
  });
});

describe("Task Management", () => {
  it("should add tasks to the queue", () => {
    const session = makeSession();
    const task = addTask(session, "Implement feature X");
    expect(task.status).toBe("pending");
    expect(task.description).toBe("Implement feature X");
    expect(session.taskQueue).toHaveLength(1);
  });

  it("should add tasks with a specific phase", () => {
    const session = makeSession();
    const task = addTask(session, "Verify output", "verify");
    expect(task.phase).toBe("verify");
  });

  it("should assign a task to a worker", () => {
    const session = makeSession();
    const worker = spawnWorker(session, "executor", "%1");
    const task = addTask(session, "Do work");
    const result = assignTask(session, task.id, worker.id);
    expect(result).toBe(true);
    expect(task.status).toBe("assigned");
    expect(worker.status).toBe("busy");
  });

  it("should not assign to a busy worker", () => {
    const session = makeSession();
    const w = spawnWorker(session, "executor", "%1");
    const t1 = addTask(session, "Task 1");
    assignTask(session, t1.id, w.id);
    const t2 = addTask(session, "Task 2");
    expect(assignTask(session, t2.id, w.id)).toBe(false);
  });

  it("should complete a task and free the worker", () => {
    const session = makeSession();
    const w = spawnWorker(session, "executor", "%1");
    const t = addTask(session, "Task");
    assignTask(session, t.id, w.id);
    const ok = completeTask(session, t.id, "done");
    expect(ok).toBe(true);
    expect(t.status).toBe("completed");
    expect(w.status).toBe("idle");
    expect(w.tasksCompleted).toBe(1);
  });

  it("should fail a task and free the worker", () => {
    const session = makeSession();
    const w = spawnWorker(session, "executor", "%1");
    const t = addTask(session, "Task");
    assignTask(session, t.id, w.id);
    const ok = failTask(session, t.id, "something broke");
    expect(ok).toBe(true);
    expect(t.status).toBe("failed");
    expect(t.error).toBe("something broke");
    expect(w.status).toBe("idle");
  });
});

describe("Phase Management", () => {
  it("should advance phases in correct order", () => {
    expect(getNextPhase("plan")).toBe("execute");
    expect(getNextPhase("execute")).toBe("verify");
    expect(getNextPhase("verify")).toBe("fix");
    expect(getNextPhase("fix")).toBe("plan");
  });

  it("should advance session phase", () => {
    const session = makeSession();
    expect(session.currentPhase).toBe("plan");
    advancePhase(session);
    expect(session.currentPhase).toBe("execute");
  });

  it("should get phase result summary", () => {
    const session = makeSession();
    const w = spawnWorker(session, "executor", "%1");
    const t = addTask(session, "Build it", "execute");
    assignTask(session, t.id, w.id);
    completeTask(session, t.id, "ok");

    const result = getPhaseResult(session, "execute");
    expect(result.tasksCompleted).toBe(1);
    expect(result.tasksFailed).toBe(0);
  });
});

describe("Worker Helpers", () => {
  it("should list idle workers", () => {
    const session = makeSession();
    spawnWorker(session, "executor", "%1");
    spawnWorker(session, "reviewer", "%2");
    expect(getIdleWorkers(session)).toHaveLength(2);
  });

  it("should list pending tasks optionally filtered by phase", () => {
    const session = makeSession();
    addTask(session, "Plan A", "plan");
    addTask(session, "Execute B", "execute");
    expect(getPendingTasks(session)).toHaveLength(2);
    expect(getPendingTasks(session, "plan")).toHaveLength(1);
  });

  it("should detect dead workers via heartbeat check", () => {
    const session = makeSession();
    const w = spawnWorker(session, "executor", "%1");
    // Simulate a stale heartbeat
    w.lastHeartbeat = Date.now() - session.config.taskTimeoutMs - 1000;
    const dead = checkHeartbeats(session);
    expect(dead).toHaveLength(1);
    expect(dead[0].id).toBe(w.id);
    expect(w.status).toBe("dead");
  });
});
