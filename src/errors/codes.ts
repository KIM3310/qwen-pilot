/**
 * Standardized error codes for qwen-pilot.
 *
 * Each code follows the format QP_NNN and maps to a human-readable
 * message template.  Throw or log via {@link QwenPilotError}.
 */
export const ERROR_CODES = {
  QP_001: "Configuration file is invalid or missing: {detail}",
  QP_002: "Qwen CLI not found in PATH — install it or use --dry-run",
  QP_003: "Agent role not found: {detail}",
  QP_004: "Workflow not found: {detail}",
  QP_005: "Workflow step failed: {detail}",
  QP_006: "tmux is required for team mode but was not found",
  QP_007: "Session not found: {detail}",
  QP_008: "State directory could not be initialized: {detail}",
  QP_009: "Plugin load failed: {detail}",
  QP_010: "Benchmark execution failed: {detail}",
  QP_011: "Template not found: {detail}",
  QP_012: "Prompt is empty or invalid",
  QP_013: "Worker spawn failed: {detail}",
  QP_014: "Gate condition not met: {detail}",
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

/**
 * Structured error class for qwen-pilot.
 *
 * Every error carries a machine-readable {@link code} (e.g. `QP_001`)
 * and a formatted human-readable message.
 */
export class QwenPilotError extends Error {
  /** Machine-readable error code, e.g. `"QP_001"`. */
  readonly code: ErrorCode;

  constructor(code: ErrorCode, detail?: string) {
    const template = ERROR_CODES[code];
    const message = detail ? template.replace("{detail}", detail) : template.replace(": {detail}", "");
    super(`[${code}] ${message}`);
    this.code = code;
    this.name = "QwenPilotError";
  }
}

/**
 * Format an error code and optional detail into a display string
 * without throwing.
 */
export function formatErrorCode(code: ErrorCode, detail?: string): string {
  const template = ERROR_CODES[code];
  const message = detail ? template.replace("{detail}", detail) : template.replace(": {detail}", "");
  return `[${code}] ${message}`;
}
