/**
 * BFCL-style tool-call reliability benchmark.
 *
 * Runs 20+ test cases across categories (valid JSON, malformed JSON,
 * XML format, markdown-wrapped, coercion needed, etc.) and compares
 * baseline (native JSON.parse only) vs middleware (robust parsing +
 * coercion) success rates.
 */

import { parseToolCalls, type ToolDefinition } from "./parser.js";

// ── Types ─────────────────────────────────────────────────────────

export interface BenchmarkCase {
  id: string;
  category: string;
  description: string;
  /** Raw LLM output to parse. */
  rawOutput: string;
  /** Expected tool name. */
  expectedTool: string;
  /** Expected argument keys (subset check). */
  expectedArgKeys: string[];
}

export interface BenchmarkResult {
  id: string;
  category: string;
  description: string;
  baselinePass: boolean;
  middlewarePass: boolean;
}

export interface BenchmarkSummary {
  totalCases: number;
  baselinePass: number;
  middlewarePass: number;
  baselineRate: number;
  middlewareRate: number;
  improvement: number;
  results: BenchmarkResult[];
}

// ── Test tools used by the benchmark ──────────────────────────────

const BENCH_TOOLS: ToolDefinition[] = [
  {
    name: "get_weather",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string" },
        unit: { type: "string", enum: ["celsius", "fahrenheit"] },
      },
      required: ["location"],
    },
  },
  {
    name: "search_files",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        maxResults: { type: "number" },
        includeHidden: { type: "boolean" },
      },
      required: ["query"],
    },
  },
  {
    name: "create_task",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        priority: { type: "number" },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["title"],
    },
  },
  {
    name: "execute_command",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string" },
        workingDir: { type: "string" },
        timeout: { type: "number" },
      },
      required: ["command"],
    },
  },
];

// ── Test cases ────────────────────────────────────────────────────

export const BENCHMARK_CASES: BenchmarkCase[] = [
  // Category: Valid JSON
  {
    id: "valid-01",
    category: "valid-json",
    description: "Clean JSON tool call",
    rawOutput: '{"name": "get_weather", "arguments": {"location": "Seoul", "unit": "celsius"}}',
    expectedTool: "get_weather",
    expectedArgKeys: ["location"],
  },
  {
    id: "valid-02",
    category: "valid-json",
    description: "Clean JSON with function key",
    rawOutput: '{"function": "search_files", "arguments": {"query": "*.ts", "maxResults": 10}}',
    expectedTool: "search_files",
    expectedArgKeys: ["query"],
  },

  // Category: Trailing commas
  {
    id: "trailing-01",
    category: "trailing-commas",
    description: "Trailing comma in object",
    rawOutput: '{"name": "get_weather", "arguments": {"location": "Tokyo", "unit": "celsius",}}',
    expectedTool: "get_weather",
    expectedArgKeys: ["location"],
  },
  {
    id: "trailing-02",
    category: "trailing-commas",
    description: "Trailing comma in array",
    rawOutput: '{"name": "create_task", "arguments": {"title": "test", "tags": ["a", "b",]}}',
    expectedTool: "create_task",
    expectedArgKeys: ["title"],
  },

  // Category: Single quotes
  {
    id: "squote-01",
    category: "single-quotes",
    description: "Single-quoted strings",
    rawOutput: "{'name': 'get_weather', 'arguments': {'location': 'Paris'}}",
    expectedTool: "get_weather",
    expectedArgKeys: ["location"],
  },

  // Category: Unquoted keys
  {
    id: "unquoted-01",
    category: "unquoted-keys",
    description: "Unquoted object keys",
    rawOutput: '{name: "search_files", arguments: {query: "test", maxResults: 5}}',
    expectedTool: "search_files",
    expectedArgKeys: ["query"],
  },

  // Category: Comments
  {
    id: "comment-01",
    category: "comments",
    description: "Single-line comment in JSON",
    rawOutput: '{\n  "name": "get_weather", // tool name\n  "arguments": {"location": "London"}\n}',
    expectedTool: "get_weather",
    expectedArgKeys: ["location"],
  },
  {
    id: "comment-02",
    category: "comments",
    description: "Multi-line comment in JSON",
    rawOutput: '{\n  "name": "get_weather",\n  /* weather lookup */\n  "arguments": {"location": "Berlin"}\n}',
    expectedTool: "get_weather",
    expectedArgKeys: ["location"],
  },

  // Category: Markdown wrapping
  {
    id: "markdown-01",
    category: "markdown",
    description: "JSON in markdown code fence",
    rawOutput:
      'Sure, I\'ll call the tool:\n\n```json\n{"name": "get_weather", "arguments": {"location": "NYC"}}\n```\n\nThis will get the weather.',
    expectedTool: "get_weather",
    expectedArgKeys: ["location"],
  },
  {
    id: "markdown-02",
    category: "markdown",
    description: "Tool call in plain code fence",
    rawOutput: '```\n{"name": "search_files", "arguments": {"query": "README"}}\n```',
    expectedTool: "search_files",
    expectedArgKeys: ["query"],
  },

  // Category: XML format
  {
    id: "xml-01",
    category: "xml",
    description: "XML tool_call tags with JSON body",
    rawOutput: '<tool_call>\n{"name": "get_weather", "arguments": {"location": "Sydney"}}\n</tool_call>',
    expectedTool: "get_weather",
    expectedArgKeys: ["location"],
  },
  {
    id: "xml-02",
    category: "xml",
    description: "XML with name and arguments tags",
    rawOutput:
      '<tool_call>\n<name>search_files</name>\n<arguments>{"query": "*.md", "maxResults": 20}</arguments>\n</tool_call>',
    expectedTool: "search_files",
    expectedArgKeys: ["query"],
  },

  // Category: Mixed text
  {
    id: "mixed-01",
    category: "mixed-text",
    description: "JSON embedded in prose",
    rawOutput:
      'I will look up the weather for you.\n\n{"name": "get_weather", "arguments": {"location": "Seoul"}}\n\nLet me know if you need anything else.',
    expectedTool: "get_weather",
    expectedArgKeys: ["location"],
  },

  // Category: Schema coercion
  {
    id: "coerce-01",
    category: "coercion",
    description: "String to number coercion",
    rawOutput: '{"name": "search_files", "arguments": {"query": "test", "maxResults": "10"}}',
    expectedTool: "search_files",
    expectedArgKeys: ["query", "maxResults"],
  },
  {
    id: "coerce-02",
    category: "coercion",
    description: "String to boolean coercion",
    rawOutput: '{"name": "search_files", "arguments": {"query": "test", "includeHidden": "true"}}',
    expectedTool: "search_files",
    expectedArgKeys: ["query", "includeHidden"],
  },
  {
    id: "coerce-03",
    category: "coercion",
    description: "Single value to array wrapping",
    rawOutput: '{"name": "create_task", "arguments": {"title": "deploy", "tags": "urgent"}}',
    expectedTool: "create_task",
    expectedArgKeys: ["title", "tags"],
  },
  {
    id: "coerce-04",
    category: "coercion",
    description: "Snake_case key to camelCase",
    rawOutput: '{"name": "search_files", "arguments": {"query": "test", "max_results": 5, "include_hidden": true}}',
    expectedTool: "search_files",
    expectedArgKeys: ["query"],
  },
  {
    id: "coerce-05",
    category: "coercion",
    description: "Case-insensitive enum",
    rawOutput: '{"name": "get_weather", "arguments": {"location": "Oslo", "unit": "Celsius"}}',
    expectedTool: "get_weather",
    expectedArgKeys: ["location", "unit"],
  },

  // Category: Missing bracket recovery
  {
    id: "bracket-01",
    category: "missing-brackets",
    description: "Missing closing brace",
    rawOutput: '{"name": "get_weather", "arguments": {"location": "Rome"}',
    expectedTool: "get_weather",
    expectedArgKeys: ["location"],
  },

  // Category: Alternative key names
  {
    id: "altkey-01",
    category: "alt-keys",
    description: "tool_name instead of name",
    rawOutput: '{"tool_name": "get_weather", "parameters": {"location": "Madrid"}}',
    expectedTool: "get_weather",
    expectedArgKeys: ["location"],
  },
  {
    id: "altkey-02",
    category: "alt-keys",
    description: "tool key and input key",
    rawOutput: '{"tool": "execute_command", "input": {"command": "ls -la"}}',
    expectedTool: "execute_command",
    expectedArgKeys: ["command"],
  },

  // Category: Arguments as string
  {
    id: "argstr-01",
    category: "args-as-string",
    description: "Arguments serialized as JSON string",
    rawOutput: '{"name": "get_weather", "arguments": "{\\"location\\": \\"Vienna\\"}"}',
    expectedTool: "get_weather",
    expectedArgKeys: ["location"],
  },

  // Category: Combined issues
  {
    id: "combo-01",
    category: "combined",
    description: "Markdown + trailing comma + unquoted keys",
    rawOutput: 'Here\'s the call:\n```json\n{name: "get_weather", arguments: {location: "Lisbon",}}\n```',
    expectedTool: "get_weather",
    expectedArgKeys: ["location"],
  },
];

// ── Benchmark runner ──────────────────────────────────────────────

/**
 * Run the baseline check: native JSON.parse only.
 */
function checkBaseline(tc: BenchmarkCase): boolean {
  try {
    const parsed = JSON.parse(tc.rawOutput);
    if (typeof parsed !== "object" || parsed === null) return false;
    const name = parsed.name ?? parsed.function ?? parsed.tool ?? parsed.tool_name;
    if (name !== tc.expectedTool) return false;
    const args = parsed.arguments ?? parsed.parameters ?? parsed.input ?? {};
    if (typeof args !== "object" || args === null) return false;
    for (const key of tc.expectedArgKeys) {
      if (!(key in args)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Run the middleware check: robust parsing + coercion.
 */
function checkMiddleware(tc: BenchmarkCase): boolean {
  const result = parseToolCalls(tc.rawOutput, BENCH_TOOLS);
  if (result.calls.length === 0) return false;
  const call = result.calls[0];
  if (!call) return false;
  if (call.name !== tc.expectedTool) return false;
  for (const key of tc.expectedArgKeys) {
    if (!(key in call.arguments)) return false;
  }
  return true;
}

/**
 * Run the full benchmark and return a summary.
 */
export function runBenchmark(cases?: BenchmarkCase[]): BenchmarkSummary {
  const testCases = cases ?? BENCHMARK_CASES;
  const results: BenchmarkResult[] = [];
  let baselinePass = 0;
  let middlewarePass = 0;

  for (const tc of testCases) {
    const bp = checkBaseline(tc);
    const mp = checkMiddleware(tc);
    if (bp) baselinePass++;
    if (mp) middlewarePass++;
    results.push({
      id: tc.id,
      category: tc.category,
      description: tc.description,
      baselinePass: bp,
      middlewarePass: mp,
    });
  }

  const total = testCases.length;
  const baselineRate = total > 0 ? (baselinePass / total) * 100 : 0;
  const middlewareRate = total > 0 ? (middlewarePass / total) * 100 : 0;

  return {
    totalCases: total,
    baselinePass,
    middlewarePass,
    baselineRate,
    middlewareRate,
    improvement: middlewareRate - baselineRate,
    results,
  };
}

/**
 * Format the benchmark summary as a CLI table.
 */
export function formatBenchmarkTable(summary: BenchmarkSummary): string {
  const lines: string[] = [];

  lines.push("  BFCL-style Tool-Call Reliability Benchmark");
  lines.push(`  ${"=".repeat(70)}`);
  lines.push("");

  // Per-case table
  const cols = { id: 14, category: 18, desc: 30, baseline: 10, mw: 10 };
  const header = [
    "ID".padEnd(cols.id),
    "CATEGORY".padEnd(cols.category),
    "DESCRIPTION".padEnd(cols.desc),
    "BASELINE".padEnd(cols.baseline),
    "MIDDLEWARE".padEnd(cols.mw),
  ].join("  ");
  const sep = [
    "-".repeat(cols.id),
    "-".repeat(cols.category),
    "-".repeat(cols.desc),
    "-".repeat(cols.baseline),
    "-".repeat(cols.mw),
  ].join("  ");

  lines.push(`  ${header}`);
  lines.push(`  ${sep}`);

  for (const r of summary.results) {
    const bl = r.baselinePass ? "PASS" : "FAIL";
    const mw = r.middlewarePass ? "PASS" : "FAIL";
    lines.push(
      `  ${r.id.padEnd(cols.id)}  ${r.category.padEnd(cols.category)}  ${r.description.slice(0, cols.desc).padEnd(cols.desc)}  ${bl.padEnd(cols.baseline)}  ${mw.padEnd(cols.mw)}`,
    );
  }

  lines.push(`  ${sep}`);
  lines.push("");

  // Summary
  lines.push("  Summary:");
  lines.push(`    Total cases:       ${summary.totalCases}`);
  lines.push(
    `    Baseline pass:     ${summary.baselinePass}/${summary.totalCases} (${summary.baselineRate.toFixed(1)}%)`,
  );
  lines.push(
    `    Middleware pass:    ${summary.middlewarePass}/${summary.totalCases} (${summary.middlewareRate.toFixed(1)}%)`,
  );
  lines.push(`    Improvement:       +${summary.improvement.toFixed(1)} percentage points`);
  lines.push("");

  if (summary.improvement >= 10) {
    lines.push("  Target met: 10%+ improvement achieved.");
  } else {
    lines.push(`  Target NOT met: improvement is ${summary.improvement.toFixed(1)}% (target: 10%+).`);
  }

  return lines.join("\n");
}
