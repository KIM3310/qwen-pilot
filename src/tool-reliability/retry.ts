/**
 * Bounded retry with exponential backoff and error-context feedback.
 *
 * Designed for re-prompting an LLM when tool-call parsing or
 * validation fails, giving the model structured feedback about
 * what went wrong.
 */

// ── Types ─────────────────────────────────────────────────────────

/** Configuration for bounded retry. */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3). */
  maxRetries?: number;
  /** Initial backoff delay in milliseconds (default: 200). */
  initialDelayMs?: number;
  /** Backoff multiplier (default: 2). */
  backoffMultiplier?: number;
  /** Maximum delay cap in milliseconds (default: 5000). */
  maxDelayMs?: number;
  /** If true, skip the delay (useful for testing). */
  noDelay?: boolean;
}

/** Outcome of a single attempt. */
export interface AttemptResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
}

/** Aggregated metrics from retry execution. */
export interface RetryMetrics {
  /** Total number of attempts (1 = succeeded first try). */
  totalAttempts: number;
  /** Number of retries (totalAttempts - 1). */
  retriesUsed: number;
  /** Whether the final attempt succeeded. */
  succeeded: boolean;
  /** Per-attempt error messages (empty for successes). */
  attemptErrors: string[];
  /** Total elapsed time in milliseconds. */
  totalElapsedMs: number;
}

/**
 * A function that performs one attempt.
 *
 * @param attempt      - 0-indexed attempt number.
 * @param priorErrors  - Errors from all prior attempts (for context injection).
 */
export type AttemptFn<T> = (attempt: number, priorErrors: string[]) => Promise<AttemptResult<T>>;

// ── Core ──────────────────────────────────────────────────────────

/**
 * Execute an operation with bounded retry and exponential backoff.
 *
 * On each failure, the `attemptFn` receives accumulated error context
 * so it can build a corrective re-prompt.
 */
export async function retryWithBackoff<T>(
  attemptFn: AttemptFn<T>,
  config?: RetryConfig,
): Promise<{ value?: T; metrics: RetryMetrics }> {
  const maxRetries = config?.maxRetries ?? 3;
  const initialDelay = config?.initialDelayMs ?? 200;
  const multiplier = config?.backoffMultiplier ?? 2;
  const maxDelay = config?.maxDelayMs ?? 5_000;
  const noDelay = config?.noDelay ?? false;

  const attemptErrors: string[] = [];
  const startMs = Date.now();
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await attemptFn(attempt, [...attemptErrors]);

    if (result.ok) {
      return {
        value: result.value,
        metrics: {
          totalAttempts: attempt + 1,
          retriesUsed: attempt,
          succeeded: true,
          attemptErrors: [...attemptErrors],
          totalElapsedMs: Date.now() - startMs,
        },
      };
    }

    attemptErrors.push(result.error ?? `Attempt ${attempt + 1} failed`);

    // Don't delay after the last attempt
    if (attempt < maxRetries && !noDelay) {
      await sleep(delay);
      delay = Math.min(delay * multiplier, maxDelay);
    }
  }

  return {
    value: undefined,
    metrics: {
      totalAttempts: maxRetries + 1,
      retriesUsed: maxRetries,
      succeeded: false,
      attemptErrors,
      totalElapsedMs: Date.now() - startMs,
    },
  };
}

/**
 * Build a corrective prompt that includes prior error context.
 *
 * This helps the LLM understand what went wrong and produce a
 * valid tool call on retry.
 */
export function buildCorrectionPrompt(
  originalPrompt: string,
  errors: string[],
  toolSchemas: Array<{ name: string; parameters: Record<string, unknown> }>,
): string {
  const errorBlock = errors.map((e, i) => `  Attempt ${i + 1}: ${e}`).join("\n");

  const schemaBlock = toolSchemas.map((t) => `  ${t.name}: ${JSON.stringify(t.parameters)}`).join("\n");

  return [
    originalPrompt,
    "",
    "IMPORTANT: Your previous tool call(s) failed. Please fix the errors below and respond with a valid tool call.",
    "",
    "Previous errors:",
    errorBlock,
    "",
    "Expected tool schemas:",
    schemaBlock,
    "",
    'Respond with valid JSON: {"name": "<tool_name>", "arguments": {...}}',
  ].join("\n");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
