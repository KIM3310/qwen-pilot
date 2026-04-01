import { describe, it, expect } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import { parseMarkdownWithFrontmatter } from "../src/utils/markdown.js";

const PROMPTS_DIR = path.resolve(__dirname, "..", "prompts");

describe("Builtin Prompts", () => {
  it("should have prompt files for all expected roles", () => {
    const expectedRoles = [
      "architect", "planner", "executor", "debugger", "reviewer",
      "security-auditor", "test-engineer", "optimizer", "documenter",
      "designer", "analyst", "scientist", "refactorer", "critic", "mentor",
    ];
    const files = fs.readdirSync(PROMPTS_DIR).map((f) => f.replace(/\.md$/, ""));
    for (const role of expectedRoles) {
      expect(files).toContain(role);
    }
  });

  it("should have valid frontmatter in architect prompt", () => {
    const raw = fs.readFileSync(path.join(PROMPTS_DIR, "architect.md"), "utf-8");
    const { frontmatter, body } = parseMarkdownWithFrontmatter(raw);
    expect(frontmatter.description).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);
  });

  it("should have valid frontmatter in executor prompt", () => {
    const raw = fs.readFileSync(path.join(PROMPTS_DIR, "executor.md"), "utf-8");
    const { frontmatter, body } = parseMarkdownWithFrontmatter(raw);
    expect(frontmatter.description).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);
  });
});

describe("Builtin Workflows directory", () => {
  const WORKFLOWS_DIR = path.resolve(__dirname, "..", "workflows");

  it("should have workflow files for all expected workflows", () => {
    const expectedWorkflows = [
      "autopilot", "deep-plan", "sprint", "investigate", "tdd",
      "review-cycle", "refactor", "deploy-prep", "interview", "team-sync",
    ];
    const files = fs.readdirSync(WORKFLOWS_DIR).map((f) => f.replace(/\.md$/, ""));
    for (const wf of expectedWorkflows) {
      expect(files).toContain(wf);
    }
  });

  it("should have valid frontmatter in autopilot workflow", () => {
    const raw = fs.readFileSync(path.join(WORKFLOWS_DIR, "autopilot.md"), "utf-8");
    const { frontmatter, body } = parseMarkdownWithFrontmatter(raw);
    expect(frontmatter.description).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);
  });
});
