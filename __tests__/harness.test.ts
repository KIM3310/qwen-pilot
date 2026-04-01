import { describe, it, expect } from "vitest";
import {
  createSession,
  resolveModelFromTier,
  buildSessionArgs,
  buildContextInjection,
} from "../src/harness/session.js";
import { DEFAULT_CONFIG } from "../src/config/schema.js";

describe("createSession", () => {
  it("should create a session with balanced defaults", () => {
    const session = createSession(DEFAULT_CONFIG);
    expect(session.tier).toBe("balanced");
    expect(session.model).toBe("qwen3-coder-plus");
    expect(session.sandboxMode).toBe("relaxed");
    expect(session.promptCount).toBe(0);
    expect(session.context).toEqual([]);
    expect(session.id).toBeTruthy();
  });

  it("should allow tier override", () => {
    const session = createSession(DEFAULT_CONFIG, "high");
    expect(session.tier).toBe("high");
    expect(session.model).toBe("qwen3.5-plus");
  });

  it("should use fast tier when requested", () => {
    const session = createSession(DEFAULT_CONFIG, "fast");
    expect(session.tier).toBe("fast");
    expect(session.model).toBe("qwen3-coder-next");
  });
});

describe("resolveModelFromTier", () => {
  it("should resolve all three tiers correctly", () => {
    expect(resolveModelFromTier("high", DEFAULT_CONFIG)).toBe("qwen3.5-plus");
    expect(resolveModelFromTier("balanced", DEFAULT_CONFIG)).toBe("qwen3-coder-plus");
    expect(resolveModelFromTier("fast", DEFAULT_CONFIG)).toBe("qwen3-coder-next");
  });
});

describe("buildSessionArgs", () => {
  it("should include model flag", () => {
    const session = createSession(DEFAULT_CONFIG);
    const args = buildSessionArgs(session, DEFAULT_CONFIG);
    expect(args).toContain("--model");
    expect(args).toContain("qwen3-coder-plus");
  });

  it("should add --sandbox for full sandbox mode", () => {
    const session = createSession(DEFAULT_CONFIG);
    session.sandboxMode = "full";
    const args = buildSessionArgs(session, DEFAULT_CONFIG);
    expect(args).toContain("--sandbox");
  });

  it("should add --no-sandbox for none mode", () => {
    const session = createSession(DEFAULT_CONFIG);
    session.sandboxMode = "none";
    const args = buildSessionArgs(session, DEFAULT_CONFIG);
    expect(args).toContain("--no-sandbox");
  });

  it("should not add sandbox flags for relaxed mode", () => {
    const session = createSession(DEFAULT_CONFIG);
    session.sandboxMode = "relaxed";
    const args = buildSessionArgs(session, DEFAULT_CONFIG);
    expect(args).not.toContain("--sandbox");
    expect(args).not.toContain("--no-sandbox");
  });
});

describe("buildContextInjection", () => {
  it("should include session id and model info", () => {
    const session = createSession(DEFAULT_CONFIG);
    const ctx = buildContextInjection(session);
    expect(ctx).toContain(session.id);
    expect(ctx).toContain("qwen3-coder-plus");
    expect(ctx).toContain("balanced");
  });

  it("should include AGENTS.md content when provided", () => {
    const session = createSession(DEFAULT_CONFIG);
    const ctx = buildContextInjection(session, "# My Agents\nSome content");
    expect(ctx).toContain("AGENTS.md");
    expect(ctx).toContain("Some content");
  });

  it("should include session context entries", () => {
    const session = createSession(DEFAULT_CONFIG);
    session.context.push("Important context line");
    const ctx = buildContextInjection(session);
    expect(ctx).toContain("Important context line");
  });
});
