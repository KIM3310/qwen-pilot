import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { QwenPilotConfigSchema, DEFAULT_CONFIG, ModelTier, SandboxMode } from "../src/config/schema.js";
import { validateConfig, getUserConfigPath, getProjectConfigPath } from "../src/config/loader.js";

describe("QwenPilotConfigSchema", () => {
  it("should produce valid defaults when parsing empty object", () => {
    const config = QwenPilotConfigSchema.parse({});
    expect(config.models.high).toBe("qwen-max");
    expect(config.models.balanced).toBe("qwen-plus");
    expect(config.models.fast).toBe("qwen-turbo");
    expect(config.harness.defaultTier).toBe("balanced");
    expect(config.harness.sandboxMode).toBe("relaxed");
    expect(config.team.maxWorkers).toBe(4);
    expect(config.stateDir).toBe(".qwen-pilot");
  });

  it("should accept custom model names", () => {
    const config = QwenPilotConfigSchema.parse({
      models: { high: "qwen-max-latest", balanced: "qwen-plus-0125", fast: "qwen-turbo-latest" },
    });
    expect(config.models.high).toBe("qwen-max-latest");
    expect(config.models.balanced).toBe("qwen-plus-0125");
  });

  it("should reject invalid sandbox mode", () => {
    expect(() =>
      QwenPilotConfigSchema.parse({
        harness: { sandboxMode: "invalid" },
      }),
    ).toThrow();
  });

  it("should reject negative maxWorkers", () => {
    expect(() =>
      QwenPilotConfigSchema.parse({
        team: { maxWorkers: -1 },
      }),
    ).toThrow();
  });

  it("should reject maxWorkers above 16", () => {
    expect(() =>
      QwenPilotConfigSchema.parse({
        team: { maxWorkers: 20 },
      }),
    ).toThrow();
  });

  it("should accept valid temperature range", () => {
    const config = QwenPilotConfigSchema.parse({
      harness: { temperature: 1.5 },
    });
    expect(config.harness.temperature).toBe(1.5);
  });

  it("should reject temperature above 2", () => {
    expect(() =>
      QwenPilotConfigSchema.parse({
        harness: { temperature: 3 },
      }),
    ).toThrow();
  });
});

describe("validateConfig", () => {
  it("should validate a correct config", () => {
    const result = validateConfig(DEFAULT_CONFIG);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should report errors for invalid config", () => {
    const result = validateConfig({ harness: { sandboxMode: "bad" } });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("ModelTier", () => {
  it("should accept valid tiers", () => {
    expect(ModelTier.parse("high")).toBe("high");
    expect(ModelTier.parse("balanced")).toBe("balanced");
    expect(ModelTier.parse("fast")).toBe("fast");
  });

  it("should reject invalid tiers", () => {
    expect(() => ModelTier.parse("ultra")).toThrow();
  });
});

describe("SandboxMode", () => {
  it("should accept valid modes", () => {
    expect(SandboxMode.parse("full")).toBe("full");
    expect(SandboxMode.parse("relaxed")).toBe("relaxed");
    expect(SandboxMode.parse("none")).toBe("none");
  });
});

describe("Config paths", () => {
  it("should return user config path under home directory", () => {
    const userPath = getUserConfigPath();
    expect(userPath).toContain("qwen-pilot.json");
    expect(userPath).toContain(".config");
  });

  it("should return project config path under cwd", () => {
    const projectPath = getProjectConfigPath();
    expect(projectPath).toContain(".qwen-pilot");
    expect(projectPath).toContain("qwen-pilot.json");
  });
});

describe("validateConfig edge cases", () => {
  it("should validate partial config objects", () => {
    const result = validateConfig({ models: { high: "custom-model" } });
    expect(result.valid).toBe(true);
  });

  it("should reject completely invalid types", () => {
    const result = validateConfig("not an object");
    expect(result.valid).toBe(false);
  });

  it("should reject null input", () => {
    const result = validateConfig(null);
    expect(result.valid).toBe(false);
  });

  it("should reject invalid nested values", () => {
    const result = validateConfig({ harness: { maxTokens: -100 } });
    expect(result.valid).toBe(false);
  });
});
