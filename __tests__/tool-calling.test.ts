import { describe, it, expect } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import { parseMarkdownWithFrontmatter } from "../src/utils/markdown.js";
import {
  PROMPT_BENCH_CASES,
  validateCall as validatePromptCall,
  simulateGeneration,
  runPromptBench,
  formatPromptBenchTable,
} from "../src/tool-reliability/prompt-bench.js";

const PROMPTS_DIR = path.resolve(__dirname, "..", "prompts");

// ── Test 1: tool-calling.md exists and has valid frontmatter ─────

describe("tool-calling prompt file", () => {
  it("should exist in the prompts directory", () => {
    const filePath = path.join(PROMPTS_DIR, "tool-calling.md");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("should have valid frontmatter with required fields", () => {
    const raw = fs.readFileSync(path.join(PROMPTS_DIR, "tool-calling.md"), "utf-8");
    const { frontmatter, body } = parseMarkdownWithFrontmatter(raw);
    expect(frontmatter.name).toBe("tool-calling");
    expect(frontmatter.description).toBeTruthy();
    expect(typeof frontmatter.description).toBe("string");
    expect(body.length).toBeGreaterThan(100);
  });

  it("should contain key sections for tool calling guidance", () => {
    const raw = fs.readFileSync(path.join(PROMPTS_DIR, "tool-calling.md"), "utf-8");
    expect(raw).toContain("Tool Calling Protocol");
    expect(raw).toContain("Parameter Type Enforcement");
    expect(raw).toContain("Multi-Tool Calling");
    expect(raw).toContain("Error Self-Correction");
    expect(raw).toContain("Pre-Call Verification Checklist");
  });
});

// ── Test 2: Prompt bench cases are well-formed ───────────────────

describe("prompt benchmark cases", () => {
  it("should have exactly 20 cases", () => {
    expect(PROMPT_BENCH_CASES).toHaveLength(20);
  });

  it("should have 5 cases per category", () => {
    const counts: Record<string, number> = {};
    for (const tc of PROMPT_BENCH_CASES) {
      counts[tc.category] = (counts[tc.category] ?? 0) + 1;
    }
    expect(counts.simple).toBe(5);
    expect(counts["type-coercion"]).toBe(5);
    expect(counts["multi-param"]).toBe(5);
    expect(counts["multi-tool"]).toBe(5);
  });

  it("should have unique IDs across all cases", () => {
    const ids = PROMPT_BENCH_CASES.map((tc) => tc.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every case should have at least one expected call", () => {
    for (const tc of PROMPT_BENCH_CASES) {
      expect(tc.expected.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("every expected call should have a non-empty name and arguments", () => {
    for (const tc of PROMPT_BENCH_CASES) {
      for (const exp of tc.expected) {
        expect(exp.name).toBeTruthy();
        expect(typeof exp.arguments).toBe("object");
      }
    }
  });
});

// ── Test 3: validateCall logic ───────────────────────────────────

describe("validateCall", () => {
  it("should pass for identical calls", () => {
    const call = { name: "read_file", arguments: { path: "/a.ts" } };
    const result = validatePromptCall(call, call);
    expect(result.pass).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should fail on wrong tool name", () => {
    const gen = { name: "write_file", arguments: { path: "/a.ts" } };
    const exp = { name: "read_file", arguments: { path: "/a.ts" } };
    const result = validatePromptCall(gen, exp);
    expect(result.pass).toBe(false);
    expect(result.errors[0]).toContain("wrong tool");
  });

  it("should fail on missing parameter", () => {
    const gen = { name: "search", arguments: { query: "test" } };
    const exp = { name: "search", arguments: { query: "test", max_results: 5 } };
    const result = validatePromptCall(gen, exp);
    expect(result.pass).toBe(false);
    expect(result.errors[0]).toContain("missing param");
  });

  it("should fail on wrong type (string vs number)", () => {
    const gen = { name: "search", arguments: { query: "test", max_results: "5" } };
    const exp = { name: "search", arguments: { query: "test", max_results: 5 } };
    const result = validatePromptCall(gen, exp);
    expect(result.pass).toBe(false);
    expect(result.errors[0]).toContain("wrong type");
  });

  it("should fail on wrong value", () => {
    const gen = { name: "read_file", arguments: { path: "/b.ts" } };
    const exp = { name: "read_file", arguments: { path: "/a.ts" } };
    const result = validatePromptCall(gen, exp);
    expect(result.pass).toBe(false);
    expect(result.errors[0]).toContain("wrong value");
  });
});

// ── Test 4: simulateGeneration ───────────────────────────────────

describe("simulateGeneration", () => {
  it("should produce correct output with prompt for simple cases", () => {
    const tc = PROMPT_BENCH_CASES.find((c) => c.id === "s01")!;
    const calls = simulateGeneration(tc, true);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.name).toBe("read_file");
    expect(calls[0]!.arguments.path).toBe("/src/index.ts");
  });

  it("should introduce type errors without prompt for type-coercion cases", () => {
    const tc = PROMPT_BENCH_CASES.find((c) => c.id === "tc01")!;
    const calls = simulateGeneration(tc, false);
    expect(calls).toHaveLength(1);
    // Without prompt, boolean true should become string "true"
    expect(typeof calls[0]!.arguments.case_sensitive).toBe("string");
  });

  it("should drop parameters without prompt for multi-param cases", () => {
    const tc = PROMPT_BENCH_CASES.find((c) => c.id === "mp01")!;
    const withCalls = simulateGeneration(tc, true);
    const noCalls = simulateGeneration(tc, false);
    expect(Object.keys(withCalls[0]!.arguments).length).toBeGreaterThan(
      Object.keys(noCalls[0]!.arguments).length,
    );
  });

  it("should produce incomplete calls without prompt for multi-tool cases", () => {
    const tc = PROMPT_BENCH_CASES.find((c) => c.id === "mt01")!;
    const calls = simulateGeneration(tc, false);
    // Second call should have empty arguments
    expect(Object.keys(calls[1]!.arguments).length).toBe(0);
  });
});

// ── Test 5: runPromptBench full suite ────────────────────────────

describe("runPromptBench", () => {
  it("should return a valid summary with all categories", () => {
    const summary = runPromptBench();
    expect(summary.totalCases).toBe(20);
    expect(summary.withPrompt.accuracy).toBe(100);
    expect(summary.withoutPrompt.accuracy).toBeLessThan(100);
    expect(summary.improvement).toBeGreaterThan(0);
  });

  it("should have all four categories in byCategory", () => {
    const summary = runPromptBench();
    expect(summary.byCategory.simple).toBeDefined();
    expect(summary.byCategory["type-coercion"]).toBeDefined();
    expect(summary.byCategory["multi-param"]).toBeDefined();
    expect(summary.byCategory["multi-tool"]).toBeDefined();
  });

  it("simple category should pass both with and without prompt", () => {
    const summary = runPromptBench();
    // Simple cases have no simulated mistakes
    expect(summary.byCategory.simple.withPrompt).toBe(5);
    expect(summary.byCategory.simple.withoutPrompt).toBe(5);
  });

  it("type-coercion category should fail without prompt", () => {
    const summary = runPromptBench();
    expect(summary.byCategory["type-coercion"].withPrompt).toBe(5);
    expect(summary.byCategory["type-coercion"].withoutPrompt).toBeLessThan(5);
  });

  it("formatPromptBenchTable should produce readable output", () => {
    const summary = runPromptBench();
    const table = formatPromptBenchTable(summary);
    expect(table).toContain("Prompt-Level Tool-Calling Benchmark");
    expect(table).toContain("CATEGORY");
    expect(table).toContain("WITH PROMPT");
    expect(table).toContain("Improvement");
  });
});
