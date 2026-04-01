import { describe, it, expect } from "vitest";
import { rjsonParse, extractJsonSubstring, repairJson } from "../src/tool-reliability/rjson.js";
import {
  coerceToSchema,
  toSnakeCase,
  toCamelCase,
  type SimpleSchema,
} from "../src/tool-reliability/schema-coerce.js";
import {
  parseToolCalls,
  type ToolDefinition,
} from "../src/tool-reliability/parser.js";
import {
  retryWithBackoff,
  buildCorrectionPrompt,
  type AttemptResult,
} from "../src/tool-reliability/retry.js";
import { executeWithToolReliability } from "../src/tool-reliability/middleware.js";
import { runBenchmark, formatBenchmarkTable, BENCHMARK_CASES } from "../src/tool-reliability/benchmark.js";

// ── Shared fixtures ───────────────────────────────────────────────

const TEST_TOOLS: ToolDefinition[] = [
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
];

// ═══════════════════════════════════════════════════════════════════
// rjson.ts
// ═══════════════════════════════════════════════════════════════════

describe("rjsonParse", () => {
  it("parses valid JSON", () => {
    expect(rjsonParse('{"a": 1}')).toEqual({ a: 1 });
  });

  it("returns undefined for empty input", () => {
    expect(rjsonParse("")).toBeUndefined();
  });

  it("handles trailing commas", () => {
    expect(rjsonParse('{"a": 1, "b": 2,}')).toEqual({ a: 1, b: 2 });
  });

  it("handles single quotes", () => {
    expect(rjsonParse("{'key': 'value'}")).toEqual({ key: "value" });
  });

  it("handles unquoted keys", () => {
    expect(rjsonParse('{name: "test"}')).toEqual({ name: "test" });
  });

  it("handles single-line comments", () => {
    const input = '{\n  "a": 1, // comment\n  "b": 2\n}';
    expect(rjsonParse(input)).toEqual({ a: 1, b: 2 });
  });

  it("handles multi-line comments", () => {
    const input = '{\n  /* comment */\n  "a": 1\n}';
    expect(rjsonParse(input)).toEqual({ a: 1 });
  });

  it("extracts JSON from markdown fences", () => {
    const input = 'Some text\n```json\n{"x": 42}\n```\nMore text';
    expect(rjsonParse(input)).toEqual({ x: 42 });
  });

  it("recovers from missing closing brace", () => {
    expect(rjsonParse('{"a": 1')).toEqual({ a: 1 });
  });

  it("recovers from missing closing bracket", () => {
    expect(rjsonParse("[1, 2, 3")).toEqual([1, 2, 3]);
  });
});

describe("extractJsonSubstring", () => {
  it("extracts from code fences", () => {
    const text = 'Before\n```json\n{"a":1}\n```\nAfter';
    const candidates = extractJsonSubstring(text);
    expect(candidates.some((c) => c.includes('"a"'))).toBe(true);
  });

  it("extracts brace-delimited blocks", () => {
    const text = 'Here is the result: {"value": true} done.';
    const candidates = extractJsonSubstring(text);
    expect(candidates.some((c) => c.startsWith("{"))).toBe(true);
  });
});

describe("repairJson", () => {
  it("removes trailing commas", () => {
    expect(repairJson('{"a": 1,}')).toBe('{"a": 1}');
  });

  it("removes comments", () => {
    expect(repairJson('{"a": 1} // test')).toBe('{"a": 1} ');
  });
});

// ═══════════════════════════════════════════════════════════════════
// schema-coerce.ts
// ═══════════════════════════════════════════════════════════════════

describe("coerceToSchema", () => {
  it("coerces string to number", () => {
    const schema: SimpleSchema = { type: "number" };
    expect(coerceToSchema("42", schema)).toBe(42);
  });

  it("coerces string to boolean", () => {
    const schema: SimpleSchema = { type: "boolean" };
    expect(coerceToSchema("true", schema)).toBe(true);
    expect(coerceToSchema("false", schema)).toBe(false);
    expect(coerceToSchema("yes", schema)).toBe(true);
  });

  it("wraps single value in array", () => {
    const schema: SimpleSchema = { type: "array", items: { type: "string" } };
    expect(coerceToSchema("hello", schema)).toEqual(["hello"]);
  });

  it("coerces nested object properties", () => {
    const schema: SimpleSchema = {
      type: "object",
      properties: {
        count: { type: "number" },
        active: { type: "boolean" },
      },
    };
    expect(coerceToSchema({ count: "5", active: "true" }, schema)).toEqual({
      count: 5,
      active: true,
    });
  });

  it("normalizes snake_case to camelCase keys", () => {
    const schema: SimpleSchema = {
      type: "object",
      properties: {
        maxResults: { type: "number" },
      },
    };
    const result = coerceToSchema({ max_results: "10" }, schema);
    expect(result).toEqual({ maxResults: 10 });
  });

  it("handles case-insensitive enum matching", () => {
    const schema: SimpleSchema = {
      type: "string",
      enum: ["celsius", "fahrenheit"],
    };
    expect(coerceToSchema("Celsius", schema)).toBe("celsius");
  });

  it("respects depth limit", () => {
    const schema: SimpleSchema = {
      type: "object",
      properties: { nested: { type: "number" } },
    };
    // Should still coerce at shallow depth
    const result = coerceToSchema({ nested: "5" }, schema, { maxDepth: 1 });
    expect(result).toEqual({ nested: 5 });
  });
});

describe("key normalization helpers", () => {
  it("converts camelCase to snake_case", () => {
    expect(toSnakeCase("maxResults")).toBe("max_results");
    expect(toSnakeCase("includeHiddenFiles")).toBe("include_hidden_files");
  });

  it("converts snake_case to camelCase", () => {
    expect(toCamelCase("max_results")).toBe("maxResults");
    expect(toCamelCase("include_hidden")).toBe("includeHidden");
  });
});

// ═══════════════════════════════════════════════════════════════════
// parser.ts
// ═══════════════════════════════════════════════════════════════════

describe("parseToolCalls", () => {
  it("parses clean JSON tool call", () => {
    const output = '{"name": "get_weather", "arguments": {"location": "Seoul"}}';
    const result = parseToolCalls(output, TEST_TOOLS);
    expect(result.calls).toHaveLength(1);
    expect(result.calls[0]!.name).toBe("get_weather");
    expect(result.calls[0]!.arguments["location"]).toBe("Seoul");
  });

  it("parses XML format", () => {
    const output = '<tool_call>\n{"name": "get_weather", "arguments": {"location": "Tokyo"}}\n</tool_call>';
    const result = parseToolCalls(output, TEST_TOOLS);
    expect(result.calls).toHaveLength(1);
    expect(result.calls[0]!.name).toBe("get_weather");
  });

  it("parses markdown-wrapped JSON", () => {
    const output = '```json\n{"name": "search_files", "arguments": {"query": "*.ts"}}\n```';
    const result = parseToolCalls(output, TEST_TOOLS);
    expect(result.calls).toHaveLength(1);
    expect(result.calls[0]!.name).toBe("search_files");
  });

  it("applies schema coercion during parsing", () => {
    const output = '{"name": "search_files", "arguments": {"query": "test", "maxResults": "10"}}';
    const result = parseToolCalls(output, TEST_TOOLS);
    expect(result.calls[0]!.arguments["maxResults"]).toBe(10);
  });

  it("reports unknown tools", () => {
    const output = '{"name": "nonexistent_tool", "arguments": {}}';
    const result = parseToolCalls(output, TEST_TOOLS);
    expect(result.calls).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Unknown tool");
  });

  it("reports missing required fields", () => {
    const output = '{"name": "get_weather", "arguments": {"unit": "celsius"}}';
    const result = parseToolCalls(output, TEST_TOOLS);
    expect(result.calls).toHaveLength(0);
    expect(result.errors.some((e) => e.includes("missing required"))).toBe(true);
  });

  it("handles tool_name and parameters keys", () => {
    const output = '{"tool_name": "get_weather", "parameters": {"location": "Paris"}}';
    const result = parseToolCalls(output, TEST_TOOLS);
    expect(result.calls).toHaveLength(1);
    expect(result.calls[0]!.name).toBe("get_weather");
  });

  it("handles arguments as JSON string", () => {
    const output = '{"name": "get_weather", "arguments": "{\\"location\\": \\"Berlin\\"}"}';
    const result = parseToolCalls(output, TEST_TOOLS);
    expect(result.calls).toHaveLength(1);
    expect(result.calls[0]!.arguments["location"]).toBe("Berlin");
  });

  it("handles XML with nested name/arguments tags", () => {
    const output =
      "<tool_call>\n<name>search_files</name>\n<arguments>{\"query\": \"README\"}</arguments>\n</tool_call>";
    const result = parseToolCalls(output, TEST_TOOLS);
    expect(result.calls).toHaveLength(1);
    expect(result.calls[0]!.name).toBe("search_files");
  });
});

// ═══════════════════════════════════════════════════════════════════
// retry.ts
// ═══════════════════════════════════════════════════════════════════

describe("retryWithBackoff", () => {
  it("succeeds on first attempt", async () => {
    const { value, metrics } = await retryWithBackoff(
      async () => ({ ok: true, value: "done" }),
      { noDelay: true },
    );
    expect(value).toBe("done");
    expect(metrics.totalAttempts).toBe(1);
    expect(metrics.retriesUsed).toBe(0);
    expect(metrics.succeeded).toBe(true);
  });

  it("retries on failure and succeeds", async () => {
    let attempt = 0;
    const { value, metrics } = await retryWithBackoff<string>(
      async () => {
        attempt++;
        if (attempt < 3) return { ok: false, error: `fail ${attempt}` };
        return { ok: true, value: "recovered" };
      },
      { maxRetries: 3, noDelay: true },
    );
    expect(value).toBe("recovered");
    expect(metrics.totalAttempts).toBe(3);
    expect(metrics.retriesUsed).toBe(2);
    expect(metrics.succeeded).toBe(true);
  });

  it("exhausts retries and fails", async () => {
    const { value, metrics } = await retryWithBackoff<string>(
      async (_attempt, _errors) => ({ ok: false, error: "always fails" }),
      { maxRetries: 2, noDelay: true },
    );
    expect(value).toBeUndefined();
    expect(metrics.totalAttempts).toBe(3); // initial + 2 retries
    expect(metrics.succeeded).toBe(false);
    expect(metrics.attemptErrors).toHaveLength(3);
  });

  it("passes prior errors to attempt function", async () => {
    const received: string[][] = [];
    await retryWithBackoff<string>(
      async (attempt, priorErrors) => {
        received.push([...priorErrors]);
        if (attempt < 2) return { ok: false, error: `error-${attempt}` };
        return { ok: true, value: "ok" };
      },
      { maxRetries: 3, noDelay: true },
    );
    expect(received[0]).toEqual([]);
    expect(received[1]).toEqual(["error-0"]);
    expect(received[2]).toEqual(["error-0", "error-1"]);
  });
});

describe("buildCorrectionPrompt", () => {
  it("includes original prompt, errors, and schemas", () => {
    const prompt = buildCorrectionPrompt("Do something", ["bad format"], [
      { name: "tool_a", parameters: { type: "object" } },
    ]);
    expect(prompt).toContain("Do something");
    expect(prompt).toContain("bad format");
    expect(prompt).toContain("tool_a");
  });
});

// ═══════════════════════════════════════════════════════════════════
// middleware.ts
// ═══════════════════════════════════════════════════════════════════

describe("executeWithToolReliability", () => {
  it("succeeds on clean output", async () => {
    const llmCall = async () =>
      '{"name": "get_weather", "arguments": {"location": "Seoul"}}';

    const result = await executeWithToolReliability("Get weather", TEST_TOOLS, llmCall);
    expect(result.calls).toHaveLength(1);
    expect(result.calls[0]!.name).toBe("get_weather");
    expect(result.metrics.succeeded).toBe(true);
    expect(result.metrics.retriesUsed).toBe(0);
  });

  it("retries and recovers from bad first output", async () => {
    let callCount = 0;
    const llmCall = async () => {
      callCount++;
      if (callCount === 1) return "I will call a tool for you";
      return '{"name": "get_weather", "arguments": {"location": "Tokyo"}}';
    };

    const result = await executeWithToolReliability("Get weather", TEST_TOOLS, llmCall, {
      retry: { noDelay: true },
    });
    expect(result.calls).toHaveLength(1);
    expect(result.metrics.retriesUsed).toBe(1);
    expect(result.metrics.succeeded).toBe(true);
  });

  it("fails after exhausting retries", async () => {
    const llmCall = async () => "No tool calls here, just text.";

    const result = await executeWithToolReliability("Get weather", TEST_TOOLS, llmCall, {
      retry: { maxRetries: 1, noDelay: true },
    });
    expect(result.calls).toHaveLength(0);
    expect(result.metrics.succeeded).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// benchmark.ts
// ═══════════════════════════════════════════════════════════════════

describe("benchmark", () => {
  it("has at least 20 test cases", () => {
    expect(BENCHMARK_CASES.length).toBeGreaterThanOrEqual(20);
  });

  it("runs and produces a summary", () => {
    const summary = runBenchmark();
    expect(summary.totalCases).toBeGreaterThanOrEqual(20);
    expect(summary.middlewarePass).toBeGreaterThan(summary.baselinePass);
  });

  it("middleware achieves 10%+ improvement over baseline", () => {
    const summary = runBenchmark();
    expect(summary.improvement).toBeGreaterThanOrEqual(10);
  });

  it("formats a table without errors", () => {
    const summary = runBenchmark();
    const table = formatBenchmarkTable(summary);
    expect(table).toContain("Baseline pass");
    expect(table).toContain("Middleware pass");
    expect(table).toContain("Improvement");
  });
});
