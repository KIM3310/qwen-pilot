import { join } from "node:path";
import { ensureDir, writeJsonFile, writeTextFile, fileExists, logger } from "../../utils/index.js";
import { DEFAULT_CONFIG } from "../../config/index.js";

export async function setupCommand(): Promise<void> {
  logger.banner("qwen-pilot setup");

  const cwd = process.cwd();
  const stateDir = join(cwd, ".qwen-pilot");
  const promptsDir = join(cwd, "prompts");
  const workflowsDir = join(cwd, "workflows");

  // Create directories
  logger.step("Creating .qwen-pilot/ state directory...");
  await ensureDir(stateDir);
  await ensureDir(join(stateDir, "sessions"));
  await ensureDir(join(stateDir, "memory"));
  await ensureDir(join(stateDir, "history"));

  // Create config
  const configPath = join(stateDir, "qwen-pilot.json");
  if (!(await fileExists(configPath))) {
    logger.step("Creating default configuration...");
    await writeJsonFile(configPath, DEFAULT_CONFIG);
    logger.success(`Config written to ${configPath}`);
  } else {
    logger.info("Config already exists, skipping.");
  }

  // Create prompts dir
  if (!(await fileExists(promptsDir))) {
    logger.step("Creating prompts/ directory...");
    await ensureDir(promptsDir);
  }

  // Create workflows dir
  if (!(await fileExists(workflowsDir))) {
    logger.step("Creating workflows/ directory...");
    await ensureDir(workflowsDir);
  }

  // Create AGENTS.md if not present
  const agentsPath = join(cwd, "AGENTS.md");
  if (!(await fileExists(agentsPath))) {
    logger.step("Creating AGENTS.md...");
    await writeTextFile(
      agentsPath,
      `# Project Agents Configuration

## Overview
This file provides context for qwen-pilot agent sessions.

## Guidelines
- Follow the project's coding conventions
- Write tests for new functionality
- Keep changes focused and atomic

## Architecture
Describe your project architecture here.
`,
    );
    logger.success("AGENTS.md created");
  }

  // Update .gitignore
  const gitignorePath = join(cwd, ".gitignore");
  if (await fileExists(gitignorePath)) {
    const { readTextFile } = await import("../../utils/index.js");
    const content = await readTextFile(gitignorePath);
    if (!content.includes(".qwen-pilot/")) {
      await writeTextFile(gitignorePath, content.trimEnd() + "\n.qwen-pilot/\n");
      logger.success("Added .qwen-pilot/ to .gitignore");
    }
  }

  logger.success("Setup complete! Run 'qp doctor' to verify installation.");
}
