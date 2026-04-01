import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import * as path from "node:path";

const CLI_PATH = path.resolve(__dirname, "..", "dist", "cli", "index.js");

describe("CLI Integration", () => {
  it("should run --help and exit 0 with expected output", () => {
    const result = execFileSync("node", [CLI_PATH, "--help"], {
      encoding: "utf-8",
      timeout: 10000,
    });
    expect(result).toContain("qp");
    expect(result).toContain("Multi-agent orchestration harness");
    expect(result).toContain("harness");
    expect(result).toContain("team");
    expect(result).toContain("ask");
    expect(result).toContain("workflows");
    expect(result).toContain("doctor");
    expect(result).toContain("status");
    expect(result).toContain("benchmark");
    expect(result).toContain("init");
  });

  it("should show version with --version", () => {
    const result = execFileSync("node", [CLI_PATH, "--version"], {
      encoding: "utf-8",
      timeout: 10000,
    });
    // Should be a semver-like version
    expect(result.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("should show harness help with expected options", () => {
    const result = execFileSync("node", [CLI_PATH, "harness", "--help"], {
      encoding: "utf-8",
      timeout: 10000,
    });
    expect(result).toContain("--dry-run");
    expect(result).toContain("--max");
    expect(result).toContain("--turbo");
    expect(result).toContain("--sandbox-mode");
  });

  it("should show ask help with --dry-run option", () => {
    const result = execFileSync("node", [CLI_PATH, "ask", "--help"], {
      encoding: "utf-8",
      timeout: 10000,
    });
    expect(result).toContain("--dry-run");
    expect(result).toContain("--model");
    expect(result).toContain("--role");
  });
});
