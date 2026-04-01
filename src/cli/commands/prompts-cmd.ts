import { listPrompts, showPrompt } from "../../prompts/index.js";
import { logger } from "../../utils/index.js";

export async function promptsListCommand(): Promise<void> {
  const prompts = await listPrompts();

  if (prompts.length === 0) {
    logger.info("No prompts found. Run 'qp setup' to initialize.");
    return;
  }

  logger.banner("Available Agent Prompts");

  const maxName = Math.max(...prompts.map((p) => p.name.length), 10);
  const maxModel = Math.max(...prompts.map((p) => p.model.length), 5);

  console.log(
    `  ${"NAME".padEnd(maxName)}  ${"MODEL".padEnd(maxModel)}  ${"EFFORT".padEnd(8)}  DESCRIPTION`,
  );
  console.log(`  ${"─".repeat(maxName)}  ${"─".repeat(maxModel)}  ${"─".repeat(8)}  ${"─".repeat(40)}`);

  for (const p of prompts) {
    console.log(
      `  ${p.name.padEnd(maxName)}  ${p.model.padEnd(maxModel)}  ${p.reasoning_effort.padEnd(8)}  ${p.description.slice(0, 60)}`,
    );
  }

  console.log(`\n  Total: ${prompts.length} prompts`);
}

export async function promptsShowCommand(name: string): Promise<void> {
  const parsed = await showPrompt(name);
  if (!parsed) {
    logger.error(`Prompt "${name}" not found`);
    process.exit(1);
  }

  logger.banner(`Prompt: ${name}`);

  if (Object.keys(parsed.frontmatter).length > 0) {
    console.log("Metadata:");
    for (const [k, v] of Object.entries(parsed.frontmatter)) {
      console.log(`  ${k}: ${v}`);
    }
    console.log();
  }

  console.log("System Prompt:");
  console.log("─".repeat(60));
  console.log(parsed.body);
}
