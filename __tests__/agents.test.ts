import { describe, it, expect } from "vitest";
import { AgentRoleSchema, BUILTIN_ROLES } from "../src/agents/types.js";
import { resolveModelForRole, type AgentRole } from "../src/agents/loader.js";

describe("AgentRoleSchema", () => {
  it("should validate a correct agent role", () => {
    const result = AgentRoleSchema.safeParse({
      name: "architect",
      description: "Plans system architecture",
      model: "qwen3.5-plus",
      reasoning_effort: "high",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("architect");
      expect(result.data.model).toBe("qwen3.5-plus");
    }
  });

  it("should apply defaults for model and reasoning_effort", () => {
    const result = AgentRoleSchema.parse({
      name: "test",
      description: "Test agent",
    });
    expect(result.model).toBe("qwen3-coder-plus");
    expect(result.reasoning_effort).toBe("medium");
  });

  it("should reject missing required fields", () => {
    const result = AgentRoleSchema.safeParse({ name: "test" });
    expect(result.success).toBe(false);
  });

  it("should reject invalid reasoning_effort", () => {
    const result = AgentRoleSchema.safeParse({
      name: "test",
      description: "desc",
      reasoning_effort: "ultra",
    });
    expect(result.success).toBe(false);
  });
});

describe("BUILTIN_ROLES", () => {
  it("should contain expected built-in roles", () => {
    expect(BUILTIN_ROLES).toContain("architect");
    expect(BUILTIN_ROLES).toContain("executor");
    expect(BUILTIN_ROLES).toContain("debugger");
    expect(BUILTIN_ROLES).toContain("reviewer");
    expect(BUILTIN_ROLES.length).toBe(15);
  });
});

describe("resolveModelForRole", () => {
  const models = { high: "qwen3.5-plus", balanced: "qwen3-coder-plus", fast: "qwen3-coder-next" };

  it("should resolve high-tier model for qwen3.5 keywords", () => {
    const role: AgentRole = { name: "arch", description: "d", model: "qwen3.5-plus", reasoning_effort: "high" };
    expect(resolveModelForRole(role, models)).toBe("qwen3.5-plus");
  });

  it("should resolve fast-tier model for coder-next keywords", () => {
    const role: AgentRole = { name: "quick", description: "d", model: "qwen3-coder-next", reasoning_effort: "low" };
    expect(resolveModelForRole(role, models)).toBe("qwen3-coder-next");
  });

  it("should default to balanced model", () => {
    const role: AgentRole = { name: "gen", description: "d", model: "qwen3-coder-plus", reasoning_effort: "medium" };
    expect(resolveModelForRole(role, models)).toBe("qwen3-coder-plus");
  });
});
