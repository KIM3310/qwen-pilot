import { loadConfig } from "../../config/index.js";
import { createSession, buildSessionArgs } from "../../harness/index.js";
import { createMetricsTracker } from "../../metrics/index.js";
import { logger, commandExists, exec } from "../../utils/index.js";
import type { ModelTier } from "../../config/index.js";

/** Result from a single benchmark probe. */
interface BenchmarkResult {
  tier: string;
  model: string;
  latencyMs: number;
  outputLength: number;
  exitCode: number;
  error?: string;
}

/**
 * Run the same prompt against all three model tiers (max / plus / turbo)
 * and display a comparative table of response time and output size.
 *
 * @param prompt - The prompt to benchmark.
 */
export async function benchmarkCommand(prompt: string): Promise<void> {
  if (!prompt || prompt.trim().length === 0) {
    logger.error("Prompt cannot be empty");
    process.exit(1);
  }

  const config = await loadConfig();

  logger.banner("qwen-pilot benchmark");
  logger.info(`Prompt: ${prompt.slice(0, 80)}${prompt.length > 80 ? "..." : ""}`);
  logger.info(`Running across 3 tiers...\n`);

  const tiers: Array<{ tier: ModelTier; label: string }> = [
    { tier: "high", label: "max" },
    { tier: "balanced", label: "plus" },
    { tier: "fast", label: "turbo" },
  ];

  const hasQwen = await commandExists("qwen");
  const results: BenchmarkResult[] = [];

  for (const { tier, label } of tiers) {
    const session = createSession(config, tier);
    const args = buildSessionArgs(session, config);
    args.push("--prompt", prompt);

    logger.step(`[${label}] ${session.model}...`);

    if (!hasQwen) {
      results.push({
        tier: label,
        model: session.model,
        latencyMs: 0,
        outputLength: 0,
        exitCode: -1,
        error: "Qwen CLI not found",
      });
      continue;
    }

    const startMs = Date.now();
    const result = await exec("qwen", args);
    const latencyMs = Date.now() - startMs;

    results.push({
      tier: label,
      model: session.model,
      latencyMs,
      outputLength: result.stdout.length,
      exitCode: result.exitCode,
      error: result.exitCode !== 0 ? result.stderr.slice(0, 120) : undefined,
    });
  }

  // Output table
  console.log();
  const cols = { tier: 8, model: 20, latency: 12, output: 12, status: 10 };
  const header = [
    "TIER".padEnd(cols.tier),
    "MODEL".padEnd(cols.model),
    "LATENCY".padEnd(cols.latency),
    "OUTPUT".padEnd(cols.output),
    "STATUS".padEnd(cols.status),
  ].join("  ");
  const separator = [
    "─".repeat(cols.tier),
    "─".repeat(cols.model),
    "─".repeat(cols.latency),
    "─".repeat(cols.output),
    "─".repeat(cols.status),
  ].join("  ");

  console.log(`  ${header}`);
  console.log(`  ${separator}`);

  for (const r of results) {
    const latency = r.exitCode === -1 ? "n/a" : `${(r.latencyMs / 1000).toFixed(2)}s`;
    const output = r.exitCode === -1 ? "n/a" : `${r.outputLength} chars`;
    const status = r.exitCode === 0 ? "ok" : r.exitCode === -1 ? "skipped" : `err(${r.exitCode})`;

    console.log(
      `  ${r.tier.padEnd(cols.tier)}  ${r.model.padEnd(cols.model)}  ${latency.padEnd(cols.latency)}  ${output.padEnd(cols.output)}  ${status.padEnd(cols.status)}`,
    );
  }

  // Summary
  const successful = results.filter((r) => r.exitCode === 0);
  if (successful.length > 0) {
    const fastest = successful.reduce((a, b) => (a.latencyMs < b.latencyMs ? a : b));
    console.log(`\n  Fastest: ${fastest.tier} (${fastest.model}) at ${(fastest.latencyMs / 1000).toFixed(2)}s`);
  } else if (!hasQwen) {
    logger.warn("\nQwen CLI not found. Install it to run real benchmarks.");
    logger.info("Results above show the planned configuration for each tier.");
  }
}
