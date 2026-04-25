import { join } from "node:path";
import { DEFAULT_CONFIG } from "../../config/index.js";
import { ensureDir, fileExists, logger, writeJsonFile, writeTextFile } from "../../utils/index.js";

/** Template identifiers accepted by `--template`. */
export type TemplateName = "node" | "python" | "fullstack";

const VALID_TEMPLATES: TemplateName[] = ["node", "python", "fullstack"];

/** Workflow definition generated for a template. */
interface TemplateWorkflow {
  filename: string;
  frontmatter: string;
  body: string;
}

/**
 * Return the set of pre-configured workflows for a given template.
 */
function getTemplateWorkflows(template: TemplateName): TemplateWorkflow[] {
  switch (template) {
    case "node":
      return [
        {
          filename: "lint-fix.md",
          frontmatter: `---\ndescription: Run ESLint, fix issues, then verify\n---`,
          body: `## Step 1: Lint (agent: executor)\nRun the project linter and capture output.\ngate: test\n\n## Step 2: Fix (agent: executor)\nApply automatic fixes for lint warnings.\ngate: pass\n\n## Step 3: Verify (agent: reviewer)\nReview the changes and confirm no regressions.\ngate: review`,
        },
        {
          filename: "test-cycle.md",
          frontmatter: `---\ndescription: Run tests, diagnose failures, fix, re-run\nloop: true\nmaxIterations: 3\n---`,
          body: `## Step 1: Run Tests (agent: test-engineer)\nExecute the full test suite using npm test.\ngate: test\nretries: 1\n\n## Step 2: Diagnose (agent: debugger)\nAnalyze any failing tests and identify root causes.\ngate: pass\n\n## Step 3: Fix (agent: executor)\nApply fixes for the diagnosed issues.\ngate: pass`,
        },
      ];
    case "python":
      return [
        {
          filename: "pytest-cycle.md",
          frontmatter: `---\ndescription: Run pytest, diagnose, fix, re-run\nloop: true\nmaxIterations: 3\n---`,
          body: `## Step 1: Run Tests (agent: test-engineer)\nRun pytest with verbose output.\ngate: test\nretries: 1\n\n## Step 2: Diagnose (agent: debugger)\nAnalyze failures from pytest output.\ngate: pass\n\n## Step 3: Fix (agent: executor)\nApply targeted fixes.\ngate: pass`,
        },
        {
          filename: "type-check.md",
          frontmatter: `---\ndescription: Run mypy type checking and resolve issues\n---`,
          body: `## Step 1: Type Check (agent: executor)\nRun mypy on the project source.\ngate: test\n\n## Step 2: Fix Types (agent: executor)\nResolve type errors found by mypy.\ngate: pass\n\n## Step 3: Verify (agent: reviewer)\nConfirm type issues are resolved.\ngate: review`,
        },
      ];
    case "fullstack":
      return [
        {
          filename: "full-ci.md",
          frontmatter: `---\ndescription: Lint, test backend, test frontend, build\n---`,
          body: `## Step 1: Lint (agent: executor)\nRun linters for both frontend and backend.\ngate: test\n\n## Step 2: Backend Tests (agent: test-engineer)\nRun backend test suite.\ngate: test\nretries: 1\n\n## Step 3: Frontend Tests (agent: test-engineer)\nRun frontend test suite.\ngate: test\nretries: 1\n\n## Step 4: Build (agent: executor)\nBuild the production bundle.\ngate: pass`,
        },
        {
          filename: "deploy-check.md",
          frontmatter: `---\ndescription: Pre-deploy verification checklist\n---`,
          body: `## Step 1: Security Scan (agent: security-auditor)\nRun dependency audit and security scan.\ngate: test\n\n## Step 2: Performance Check (agent: optimizer)\nCheck for performance regressions.\ngate: review\n\n## Step 3: Documentation (agent: documenter)\nVerify API documentation is up to date.\ngate: review`,
        },
      ];
  }
}

/**
 * Initialize a project with a pre-configured template.
 *
 * Creates `.qwen-pilot/`, `prompts/`, `workflows/`, `AGENTS.md`,
 * and populates the workflows directory with template-specific
 * workflow definitions.
 *
 * @param options - Template name and working directory.
 */
export async function initCommand(options: { template?: string }): Promise<void> {
  const template = (options.template ?? "node") as TemplateName;

  if (!VALID_TEMPLATES.includes(template)) {
    logger.error(`Unknown template "${template}". Valid templates: ${VALID_TEMPLATES.join(", ")}`);
    process.exit(1);
  }

  logger.banner(`qwen-pilot init (template: ${template})`);

  const cwd = process.cwd();
  const stateDir = join(cwd, ".qwen-pilot");
  const promptsDir = join(cwd, "prompts");
  const workflowsDir = join(cwd, "workflows");

  // Create directories
  logger.step("Creating directories...");
  await ensureDir(stateDir);
  await ensureDir(join(stateDir, "sessions"));
  await ensureDir(join(stateDir, "memory"));
  await ensureDir(join(stateDir, "history"));
  await ensureDir(join(stateDir, "prompts"));
  await ensureDir(join(stateDir, "workflows"));
  await ensureDir(promptsDir);
  await ensureDir(workflowsDir);

  // Write config
  const configPath = join(stateDir, "qwen-pilot.json");
  if (!(await fileExists(configPath))) {
    logger.step("Writing configuration...");
    await writeJsonFile(configPath, DEFAULT_CONFIG);
  }

  // Write AGENTS.md
  const agentsPath = join(cwd, "AGENTS.md");
  if (!(await fileExists(agentsPath))) {
    logger.step("Creating AGENTS.md...");
    const agentsContent = `# Project Agents Configuration

## Overview
This file provides context for qwen-pilot agent sessions.
Template: ${template}

## Guidelines
- Follow the project's coding conventions
- Write tests for new functionality
- Keep changes focused and atomic

## Architecture
Describe your project architecture here.
`;
    await writeTextFile(agentsPath, agentsContent);
  }

  // Write template workflows
  const templateWorkflows = getTemplateWorkflows(template);
  for (const wf of templateWorkflows) {
    const wfPath = join(workflowsDir, wf.filename);
    if (!(await fileExists(wfPath))) {
      logger.step(`Creating workflow: ${wf.filename}`);
      await writeTextFile(wfPath, `${wf.frontmatter}\n\n${wf.body}\n`);
    }
  }

  // Update .gitignore
  const gitignorePath = join(cwd, ".gitignore");
  if (await fileExists(gitignorePath)) {
    const { readTextFile } = await import("../../utils/index.js");
    const content = await readTextFile(gitignorePath);
    if (!content.includes(".qwen-pilot/")) {
      await writeTextFile(gitignorePath, `${content.trimEnd()}\n.qwen-pilot/\n`);
      logger.success("Added .qwen-pilot/ to .gitignore");
    }
  }

  logger.success(`Initialized with "${template}" template`);
  logger.info(`\nCreated ${templateWorkflows.length} workflow(s):`);
  for (const wf of templateWorkflows) {
    logger.info(`  - workflows/${wf.filename}`);
  }
  logger.info(`\nRun 'qp doctor' to verify installation.`);
}
