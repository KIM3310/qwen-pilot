import { runBenchmark, formatBenchmarkTable } from "../../tool-reliability/index.js";
import { logger } from "../../utils/index.js";

/**
 * CLI handler for `qp tool-bench`.
 *
 * Runs the BFCL-style tool-call reliability benchmark and prints
 * a comparison table of baseline vs middleware success rates.
 */
export function toolBenchCommand(): void {
  logger.banner("qwen-pilot tool-bench");
  logger.info("Running BFCL-style tool-call reliability benchmark...\n");

  const summary = runBenchmark();
  console.log(formatBenchmarkTable(summary));
}
