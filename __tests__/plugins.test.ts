import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { discoverPlugins, getPluginDir, buildPromptSearchDirs, buildWorkflowSearchDirs } from "../src/plugins/loader.js";

describe("Plugin System", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "qp-plugin-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should return empty array when no plugin dirs exist", async () => {
    const entries = await discoverPlugins(tempDir);
    expect(entries).toEqual([]);
  });

  it("should discover prompt plugins from .qwen-pilot/prompts/", async () => {
    const pluginDir = path.join(tempDir, ".qwen-pilot", "prompts");
    fs.mkdirSync(pluginDir, { recursive: true });
    fs.writeFileSync(
      path.join(pluginDir, "custom-agent.md"),
      "---\ndescription: My custom agent\n---\nYou are a custom agent.",
    );

    const entries = await discoverPlugins(tempDir);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.name).toBe("custom-agent");
    expect(entries[0]!.kind).toBe("prompt");
  });

  it("should discover workflow plugins from .qwen-pilot/workflows/", async () => {
    const pluginDir = path.join(tempDir, ".qwen-pilot", "workflows");
    fs.mkdirSync(pluginDir, { recursive: true });
    fs.writeFileSync(
      path.join(pluginDir, "custom-flow.md"),
      "---\ndescription: My custom workflow\n---\n## Step 1: Do stuff",
    );

    const entries = await discoverPlugins(tempDir);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.name).toBe("custom-flow");
    expect(entries[0]!.kind).toBe("workflow");
  });

  it("should discover both prompts and workflows", async () => {
    fs.mkdirSync(path.join(tempDir, ".qwen-pilot", "prompts"), { recursive: true });
    fs.mkdirSync(path.join(tempDir, ".qwen-pilot", "workflows"), { recursive: true });
    fs.writeFileSync(path.join(tempDir, ".qwen-pilot", "prompts", "a.md"), "---\ndescription: A\n---\nA");
    fs.writeFileSync(path.join(tempDir, ".qwen-pilot", "workflows", "b.md"), "---\ndescription: B\n---\nB");

    const entries = await discoverPlugins(tempDir);
    expect(entries).toHaveLength(2);
    const kinds = entries.map((e) => e.kind).sort();
    expect(kinds).toEqual(["prompt", "workflow"]);
  });

  it("should return correct plugin directory paths", () => {
    const promptsDir = getPluginDir("prompts", "/my/project");
    expect(promptsDir).toBe(path.join("/my/project", ".qwen-pilot", "prompts"));

    const workflowsDir = getPluginDir("workflows", "/my/project");
    expect(workflowsDir).toBe(path.join("/my/project", ".qwen-pilot", "workflows"));
  });

  it("should include plugin dir in prompt search dirs when it exists", async () => {
    const pluginDir = path.join(tempDir, ".qwen-pilot", "prompts");
    fs.mkdirSync(pluginDir, { recursive: true });

    const dirs = await buildPromptSearchDirs("/builtin/prompts", tempDir);
    expect(dirs[0]).toBe(pluginDir);
    expect(dirs).toContain("/builtin/prompts");
  });

  it("should not include plugin dir in search dirs when absent", async () => {
    const dirs = await buildPromptSearchDirs("/builtin/prompts", tempDir);
    expect(dirs).not.toContain(path.join(tempDir, ".qwen-pilot", "prompts"));
  });

  it("should include plugin dir in workflow search dirs when it exists", async () => {
    const pluginDir = path.join(tempDir, ".qwen-pilot", "workflows");
    fs.mkdirSync(pluginDir, { recursive: true });

    const dirs = await buildWorkflowSearchDirs("/builtin/workflows", tempDir);
    expect(dirs[0]).toBe(pluginDir);
  });
});
