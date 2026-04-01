import { describe, it, expect } from "vitest";
import { WorkflowStepSchema, WorkflowMetaSchema, BUILTIN_WORKFLOWS } from "../src/workflows/types.js";

describe("WorkflowStepSchema", () => {
  it("should validate a minimal step", () => {
    const step = WorkflowStepSchema.parse({
      name: "Plan",
      prompt: "Create an implementation plan",
    });
    expect(step.name).toBe("Plan");
    expect(step.gate).toBe("none");
    expect(step.retries).toBe(0);
    expect(step.agent).toBeUndefined();
  });

  it("should accept optional agent and gate", () => {
    const step = WorkflowStepSchema.parse({
      name: "Review",
      prompt: "Review the code",
      agent: "reviewer",
      gate: "review",
      retries: 2,
    });
    expect(step.agent).toBe("reviewer");
    expect(step.gate).toBe("review");
    expect(step.retries).toBe(2);
  });

  it("should reject invalid gate value", () => {
    const result = WorkflowStepSchema.safeParse({
      name: "Step",
      prompt: "Do stuff",
      gate: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("should reject retries above 5", () => {
    const result = WorkflowStepSchema.safeParse({
      name: "Step",
      prompt: "Retry",
      retries: 10,
    });
    expect(result.success).toBe(false);
  });
});

describe("WorkflowMetaSchema", () => {
  it("should validate with defaults", () => {
    const meta = WorkflowMetaSchema.parse({
      name: "test-workflow",
      description: "A test workflow",
    });
    expect(meta.version).toBe("1.0.0");
    expect(meta.loop).toBe(false);
    expect(meta.maxIterations).toBe(10);
  });

  it("should accept loop config", () => {
    const meta = WorkflowMetaSchema.parse({
      name: "looping",
      description: "A looping workflow",
      loop: true,
      maxIterations: 5,
    });
    expect(meta.loop).toBe(true);
    expect(meta.maxIterations).toBe(5);
  });
});

describe("BUILTIN_WORKFLOWS", () => {
  it("should contain expected built-in workflows", () => {
    expect(BUILTIN_WORKFLOWS).toContain("autopilot");
    expect(BUILTIN_WORKFLOWS).toContain("tdd");
    expect(BUILTIN_WORKFLOWS).toContain("sprint");
    expect(BUILTIN_WORKFLOWS).toContain("refactor");
    expect(BUILTIN_WORKFLOWS.length).toBe(10);
  });
});

describe("WorkflowStepSchema edge cases", () => {
  it("should accept retries at boundary value 5", () => {
    const step = WorkflowStepSchema.parse({
      name: "Retry Step",
      prompt: "Try hard",
      retries: 5,
    });
    expect(step.retries).toBe(5);
  });

  it("should accept retries at boundary value 0", () => {
    const step = WorkflowStepSchema.parse({
      name: "No Retry",
      prompt: "Once only",
      retries: 0,
    });
    expect(step.retries).toBe(0);
  });

  it("should reject negative retries", () => {
    const result = WorkflowStepSchema.safeParse({
      name: "Bad",
      prompt: "Negative",
      retries: -1,
    });
    expect(result.success).toBe(false);
  });
});

describe("WorkflowMetaSchema edge cases", () => {
  it("should reject missing name", () => {
    const result = WorkflowMetaSchema.safeParse({
      description: "No name",
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing description", () => {
    const result = WorkflowMetaSchema.safeParse({
      name: "no-desc",
    });
    expect(result.success).toBe(false);
  });

  it("should accept tags array", () => {
    const meta = WorkflowMetaSchema.parse({
      name: "tagged",
      description: "Has tags",
      tags: ["ci", "deploy"],
    });
    expect(meta.tags).toEqual(["ci", "deploy"]);
  });
});
