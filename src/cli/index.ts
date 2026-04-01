#!/usr/bin/env node

import { Command } from "commander";
import { setupCommand } from "./commands/setup.js";
import { harnessCommand } from "./commands/harness.js";
import { teamCommand } from "./commands/team.js";
import { askCommand } from "./commands/ask.js";
import { promptsListCommand, promptsShowCommand } from "./commands/prompts-cmd.js";
import { workflowsListCommand, workflowsShowCommand, workflowsRunCommand } from "./commands/workflows-cmd.js";
import { doctorCommand } from "./commands/doctor.js";
import { configShowCommand, configValidateCommand } from "./commands/config-cmd.js";
import { statusCommand } from "./commands/status.js";
import { benchmarkCommand } from "./commands/benchmark.js";
import { initCommand } from "./commands/init.js";
import { startMcpServer } from "../mcp/index.js";
import { getVersion } from "../utils/index.js";

const program = new Command();

program
  .name("qp")
  .description("Multi-agent orchestration harness for Qwen CLI")
  .version(getVersion());

// setup
program
  .command("setup")
  .description("Initialize qwen-pilot in the current project")
  .action(setupCommand);

// init
program
  .command("init")
  .description("Initialize project with a pre-configured template")
  .option("--template <template>", "Template to use: node, python, fullstack", "node")
  .action((opts) => initCommand({ template: opts.template }));

// harness
program
  .command("harness")
  .description("Launch an enhanced Qwen CLI session")
  .option("--max", "Use high-tier model (qwen-max)")
  .option("--balanced", "Use balanced-tier model (qwen-plus)")
  .option("--turbo", "Use fast-tier model (qwen-turbo)")
  .option("--sandbox-mode <mode>", "Sandbox mode: full, relaxed, none")
  .option("--dry-run", "Show what would happen without executing")
  .action((opts) =>
    harnessCommand({
      max: opts.max,
      balanced: opts.balanced,
      turbo: opts.turbo,
      sandbox: opts.sandboxMode,
      dryRun: opts.dryRun,
    }),
  );

// team
program
  .command("team <count>")
  .description("Launch multi-agent team with tmux")
  .option("--role <role>", "Agent role for workers", "executor")
  .option("--task <task>", "Initial task description")
  .option("--dry-run", "Show what would happen without executing")
  .action((count, opts) => teamCommand(count, { role: opts.role, task: opts.task, dryRun: opts.dryRun }));

// ask
program
  .command("ask <prompt>")
  .description("Single-shot query to Qwen")
  .option("--model <model>", "Model override")
  .option("--role <role>", "Agent role to use")
  .option("--dry-run", "Show what would happen without executing")
  .action((prompt, opts) => askCommand(prompt, { model: opts.model, role: opts.role, dryRun: opts.dryRun }));

// prompts
const promptsCmd = program.command("prompts").description("Manage agent prompts");

promptsCmd
  .command("list")
  .description("List available agent prompts")
  .action(promptsListCommand);

promptsCmd
  .command("show <name>")
  .description("Show details of a specific prompt")
  .action(promptsShowCommand);

// workflows
const workflowsCmd = program.command("workflows").description("Manage workflows");

workflowsCmd
  .command("list")
  .description("List available workflows")
  .action(workflowsListCommand);

workflowsCmd
  .command("show <name>")
  .description("Show details of a specific workflow")
  .action(workflowsShowCommand);

workflowsCmd
  .command("run <name>")
  .description("Run a workflow")
  .argument("[context]", "Additional context for the workflow")
  .option("--dry-run", "Show what would happen without executing")
  .action((name, context, opts) => workflowsRunCommand(name, context, { dryRun: opts.dryRun }));

// benchmark
program
  .command("benchmark <prompt>")
  .description("Run same prompt across all 3 model tiers and compare")
  .action(benchmarkCommand);

// doctor
program
  .command("doctor")
  .description("Verify qwen-pilot installation")
  .action(doctorCommand);

// config
const configCmd = program.command("config").description("Configuration management");

configCmd
  .command("show")
  .description("Show current configuration")
  .action(configShowCommand);

configCmd
  .command("validate")
  .description("Validate current configuration")
  .action(configValidateCommand);

// status
program
  .command("status")
  .description("Show active sessions and status")
  .action(statusCommand);

// mcp (hidden — invoked by MCP clients)
program
  .command("mcp", { hidden: true })
  .description("Start MCP server (stdio)")
  .action(startMcpServer);

program.parse();
