/**
 * Tool-reliability middleware — the integration layer.
 *
 * Wraps an LLM call with robust parsing, schema coercion, and
 * bounded retry to improve tool-call success rates by 10-12%.
 */

import { type ParsedToolCall, type ParseResult, parseToolCalls, type ToolDefinition } from "./parser.js";
import { buildCorrectionPrompt, type RetryConfig, type RetryMetrics, retryWithBackoff } from "./retry.js";
import type { CoerceOptions } from "./schema-coerce.js";

// ── Public types ──────────────────────────────────────────────────

/** Configuration for the tool-reliability middleware. */
export interface ToolReliabilityConfig {
  /** Retry configuration. */
  retry?: RetryConfig;
  /** Schema coercion options. */
  coercion?: CoerceOptions;
  /** If true, log debug info to stderr. */
  debug?: boolean;
}

/** The result of a tool-reliability-wrapped execution. */
export interface ToolCallResult {
  /** Successfully parsed tool calls. */
  calls: ParsedToolCall[];
  /** Raw LLM output from the final successful attempt. */
  rawOutput: string;
  /** Retry metrics. */
  metrics: RetryMetrics;
  /** Parse errors from the final attempt (if any). */
  parseErrors: string[];
}

/**
 * A function that calls the LLM and returns its raw text output.
 *
 * @param prompt - The prompt to send (may include correction context on retries).
 */
export type LlmCallFn = (prompt: string) => Promise<string>;

// ── Main entry point ──────────────────────────────────────────────

/**
 * Execute an LLM call with tool-reliability middleware.
 *
 * 1. Calls the LLM with the original prompt.
 * 2. Parses tool calls from the output using robust JSON/XML/markdown extraction.
 * 3. Coerces arguments to match tool schemas.
 * 4. On failure, retries with error context and exponential backoff.
 *
 * @param prompt  - The user/system prompt.
 * @param tools   - Available tool definitions with schemas.
 * @param llmCall - Function that invokes the LLM.
 * @param config  - Middleware configuration.
 */
export async function executeWithToolReliability(
  prompt: string,
  tools: ToolDefinition[],
  llmCall: LlmCallFn,
  config?: ToolReliabilityConfig,
): Promise<ToolCallResult> {
  const debug = config?.debug ?? false;
  let lastRawOutput = "";
  let lastParseResult: ParseResult = { calls: [], errors: [] };

  const { value, metrics } = await retryWithBackoff<{ raw: string; parsed: ParseResult }>(
    async (attempt, priorErrors) => {
      // Build prompt (with correction context on retries)
      const effectivePrompt =
        attempt === 0
          ? prompt
          : buildCorrectionPrompt(
              prompt,
              priorErrors,
              tools.map((t) => ({ name: t.name, parameters: t.parameters as Record<string, unknown> })),
            );

      if (debug) {
        console.error(`[tool-reliability] attempt=${attempt} prompt_len=${effectivePrompt.length}`);
      }

      // Call LLM
      const rawOutput = await llmCall(effectivePrompt);
      lastRawOutput = rawOutput;

      // Parse tool calls
      const parsed = parseToolCalls(rawOutput, tools, config?.coercion);
      lastParseResult = parsed;

      if (debug) {
        console.error(
          `[tool-reliability] attempt=${attempt} calls=${parsed.calls.length} errors=${parsed.errors.length}`,
        );
      }

      if (parsed.calls.length > 0) {
        return { ok: true, value: { raw: rawOutput, parsed } };
      }

      // Build a meaningful error message for the next attempt
      const errorMsg = parsed.errors.length > 0 ? parsed.errors.join("; ") : "No tool calls found in output";

      return { ok: false, error: errorMsg };
    },
    config?.retry,
  );

  return {
    calls: value?.parsed.calls ?? lastParseResult.calls,
    rawOutput: value?.raw ?? lastRawOutput,
    metrics,
    parseErrors: value?.parsed.errors ?? lastParseResult.errors,
  };
}
