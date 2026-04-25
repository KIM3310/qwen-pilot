import { getPromptContent } from "../../prompts/index.js";
import {
  formatBenchmarkTable,
  formatPromptBenchTable,
  runBenchmark,
  runPromptBench,
} from "../../tool-reliability/index.js";
import { logger } from "../../utils/index.js";

/**
 * CLI handler for `qp tool-bench`.
 *
 * Runs both:
 * 1. BFCL-style parsing benchmark (baseline vs middleware)
 * 2. Prompt-level benchmark (with vs without tool-calling prompt)
 */
export async function toolBenchCommand(options?: { verbose?: boolean }): Promise<void> {
  logger.banner("qwen-pilot tool-bench");

  // Phase 1: Parsing benchmark
  logger.info("Phase 1: BFCL-style tool-call reliability benchmark\n");
  const parsingSummary = runBenchmark();
  console.log(formatBenchmarkTable(parsingSummary));

  // Phase 2: Prompt-level benchmark
  console.log();
  logger.info("Phase 2: Prompt-level tool-calling benchmark\n");

  const promptContent = await getPromptContent("tool-calling");
  if (!promptContent) {
    logger.warn("tool-calling prompt not found — skipping prompt benchmark");
    return;
  }
  logger.success("tool-calling prompt loaded");

  const promptSummary = runPromptBench();
  console.log(formatPromptBenchTable(promptSummary));

  // Verbose: show failing cases
  if (options?.verbose) {
    const failures = promptSummary.results.filter((c) => !c.pass);
    if (failures.length > 0) {
      console.log(`\n  Failed prompt-bench cases (${failures.length}):`);
      for (const f of failures) {
        const mode = f.withPrompt ? "with-prompt" : "without-prompt";
        console.log(`    [${mode}] ${f.id}: ${f.errors.join(", ")}`);
      }
    }
  }
}
