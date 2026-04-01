import { describe, it, expect } from "vitest";
import { Command } from "commander";

describe("CLI Parsing", () => {
  function buildProgram() {
    const program = new Command();
    program
      .name("qp")
      .description("Multi-agent orchestration harness for Qwen CLI")
      .version("1.0.0");

    program
      .command("setup")
      .description("Initialize qwen-pilot in the current project");

    program
      .command("harness")
      .description("Launch an enhanced Qwen CLI session")
      .option("--max", "Use high-tier model")
      .option("--balanced", "Use balanced-tier model")
      .option("--turbo", "Use fast-tier model")
      .option("--sandbox-mode <mode>", "Sandbox mode");

    program
      .command("team <count>")
      .description("Launch multi-agent team")
      .option("--role <role>", "Agent role", "executor")
      .option("--task <task>", "Initial task");

    program
      .command("ask <prompt>")
      .description("Single-shot query")
      .option("--model <model>", "Model override")
      .option("--role <role>", "Agent role");

    const promptsCmd = program.command("prompts").description("Manage prompts");
    promptsCmd.command("list").description("List prompts");
    promptsCmd.command("show <name>").description("Show prompt");

    const workflowsCmd = program.command("workflows").description("Manage workflows");
    workflowsCmd.command("list").description("List workflows");
    workflowsCmd.command("run <name>").description("Run workflow");

    program.command("doctor").description("Verify installation");
    program.command("status").description("Show status");

    return program;
  }

  it("should register all top-level commands", () => {
    const program = buildProgram();
    const commandNames = program.commands.map((c) => c.name());
    expect(commandNames).toContain("setup");
    expect(commandNames).toContain("harness");
    expect(commandNames).toContain("team");
    expect(commandNames).toContain("ask");
    expect(commandNames).toContain("prompts");
    expect(commandNames).toContain("workflows");
    expect(commandNames).toContain("doctor");
    expect(commandNames).toContain("status");
  });

  it("should parse harness options via parent program", () => {
    const program = buildProgram();
    program.exitOverride();
    let parsedOpts: Record<string, unknown> = {};
    const harnessCmd = program.commands.find((c) => c.name() === "harness")!;
    harnessCmd.action((opts) => { parsedOpts = harnessCmd.opts(); });
    program.parse(["node", "qp", "harness", "--max", "--sandbox-mode", "full"]);
    expect(parsedOpts.max).toBe(true);
    expect(parsedOpts.sandboxMode).toBe("full");
  });

  it("should parse team command with count argument", () => {
    const program = buildProgram();
    program.exitOverride();
    let parsedArgs: string[] = [];
    let parsedOpts: Record<string, unknown> = {};
    const teamCmd = program.commands.find((c) => c.name() === "team")!;
    teamCmd.action((count, opts) => {
      parsedArgs = [count];
      parsedOpts = teamCmd.opts();
    });
    program.parse(["node", "qp", "team", "4", "--role", "reviewer"]);
    expect(parsedArgs[0]).toBe("4");
    expect(parsedOpts.role).toBe("reviewer");
  });

  it("should have prompts subcommands", () => {
    const program = buildProgram();
    const promptsCmd = program.commands.find((c) => c.name() === "prompts")!;
    const subNames = promptsCmd.commands.map((c) => c.name());
    expect(subNames).toContain("list");
    expect(subNames).toContain("show");
  });

  it("should have workflows subcommands", () => {
    const program = buildProgram();
    const wfCmd = program.commands.find((c) => c.name() === "workflows")!;
    const subNames = wfCmd.commands.map((c) => c.name());
    expect(subNames).toContain("list");
    expect(subNames).toContain("run");
  });
});
