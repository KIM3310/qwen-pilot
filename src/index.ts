// qwen-pilot — Multi-agent orchestration harness for Qwen CLI

export {
  type AgentDefinition,
  type AgentRole,
  BUILTIN_ROLES,
  listAgentDefinitions,
  loadAgentDefinition,
  resolveModelForRole,
} from "./agents/index.js";
export {
  loadConfig,
  ModelTier,
  type QwenPilotConfig,
  QwenPilotConfigSchema,
  SandboxMode,
  validateConfig,
} from "./config/index.js";
export { ERROR_CODES, type ErrorCode, formatErrorCode, QwenPilotError } from "./errors/index.js";
export { buildContextInjection, buildSessionArgs, createSession, type SessionState } from "./harness/index.js";
export { type HookEvent, hookManager } from "./hooks/index.js";
export { formatDuration, formatNumber, type HudState, renderHud, renderHudFull } from "./hud/index.js";
export { createMcpServer } from "./mcp/index.js";
export { createMetricsTracker, MetricsTracker, type SessionMetrics } from "./metrics/index.js";
export {
  buildPromptSearchDirs,
  buildWorkflowSearchDirs,
  discoverPlugins,
  getPluginDir,
  type PluginEntry,
} from "./plugins/index.js";
export { getPromptContent, listPrompts, showPrompt } from "./prompts/index.js";
export { createStateStore, initializeStateDir, type StateStore } from "./state/index.js";
export { addTask, assignTask, completeTask, createTeamSession, type TeamSession, type TeamTask } from "./team/index.js";
export {
  BENCHMARK_CASES,
  type BenchmarkCase,
  type BenchmarkSummary,
  buildCorrectionPrompt,
  type CoerceOptions,
  coerceToSchema,
  executeWithToolReliability,
  extractJsonSubstring,
  formatBenchmarkTable,
  type LlmCallFn,
  type ParsedToolCall,
  type ParseResult,
  parseToolCalls,
  type RetryConfig,
  type RetryMetrics,
  type RJsonOptions,
  repairJson,
  retryWithBackoff,
  rjsonParse,
  runBenchmark,
  type SimpleSchema,
  type ToolCallResult,
  type ToolDefinition,
  type ToolReliabilityConfig,
} from "./tool-reliability/index.js";
export { getVersion } from "./utils/version.js";
export {
  BUILTIN_WORKFLOWS,
  executeWorkflow,
  listWorkflows,
  loadWorkflow,
  type WorkflowDefinition,
  type WorkflowRunResult,
} from "./workflows/index.js";
