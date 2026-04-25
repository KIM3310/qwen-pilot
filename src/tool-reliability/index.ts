/**
 * Tool-reliability middleware — robust parsing, schema coercion,
 * and bounded retry for LLM tool calls.
 */

export {
  BENCHMARK_CASES,
  type BenchmarkCase,
  type BenchmarkResult,
  type BenchmarkSummary,
  formatBenchmarkTable,
  runBenchmark,
} from "./benchmark.js";
export {
  executeWithToolReliability,
  type LlmCallFn,
  type ToolCallResult,
  type ToolReliabilityConfig,
} from "./middleware.js";
export {
  type ParsedToolCall,
  type ParseResult,
  parseToolCalls,
  type ToolDefinition,
} from "./parser.js";
export {
  type ExpectedCall,
  formatPromptBenchTable,
  PROMPT_BENCH_CASES,
  type PromptBenchCase,
  type PromptBenchCategory,
  type PromptBenchSummary,
  type PromptCaseResult,
  runPromptBench,
  simulateGeneration,
  validateCall as validatePromptCall,
} from "./prompt-bench.js";
export {
  type AttemptFn,
  type AttemptResult,
  buildCorrectionPrompt,
  type RetryConfig,
  type RetryMetrics,
  retryWithBackoff,
} from "./retry.js";
export { extractJsonSubstring, type RJsonOptions, repairJson, rjsonParse } from "./rjson.js";
export {
  type CoerceOptions,
  coerceToSchema,
  type SimpleSchema,
  toCamelCase,
  toSnakeCase,
} from "./schema-coerce.js";
