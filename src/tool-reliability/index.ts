/**
 * Tool-reliability middleware — robust parsing, schema coercion,
 * and bounded retry for LLM tool calls.
 */

export { rjsonParse, extractJsonSubstring, repairJson, type RJsonOptions } from "./rjson.js";
export {
  coerceToSchema,
  toSnakeCase,
  toCamelCase,
  type SimpleSchema,
  type CoerceOptions,
} from "./schema-coerce.js";
export {
  parseToolCalls,
  type ToolDefinition,
  type ParsedToolCall,
  type ParseResult,
} from "./parser.js";
export {
  retryWithBackoff,
  buildCorrectionPrompt,
  type RetryConfig,
  type RetryMetrics,
  type AttemptResult,
  type AttemptFn,
} from "./retry.js";
export {
  executeWithToolReliability,
  type ToolReliabilityConfig,
  type ToolCallResult,
  type LlmCallFn,
} from "./middleware.js";
export {
  runBenchmark,
  formatBenchmarkTable,
  BENCHMARK_CASES,
  type BenchmarkCase,
  type BenchmarkResult,
  type BenchmarkSummary,
} from "./benchmark.js";
export {
  runPromptBench,
  formatPromptBenchTable,
  validateCall as validatePromptCall,
  simulateGeneration,
  PROMPT_BENCH_CASES,
  type PromptBenchCategory,
  type PromptBenchCase,
  type PromptBenchSummary,
  type PromptCaseResult,
  type ExpectedCall,
} from "./prompt-bench.js";
