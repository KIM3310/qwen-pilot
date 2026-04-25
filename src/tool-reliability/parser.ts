/**
 * Tool call parser — extract tool invocations from LLM output in
 * JSON, XML, or markdown-wrapped formats, validate against a tool
 * schema, and apply coercion.
 */

import { extractJsonSubstring, repairJson, rjsonParse } from "./rjson.js";
import { type CoerceOptions, coerceToSchema, type SimpleSchema } from "./schema-coerce.js";

// ── Public types ──────────────────────────────────────────────────

/** A tool definition for validation. */
export interface ToolDefinition {
  name: string;
  description?: string;
  parameters: SimpleSchema;
}

/** A parsed (and optionally coerced) tool call. */
export interface ParsedToolCall {
  name: string;
  arguments: Record<string, unknown>;
  /** Which extraction strategy succeeded. */
  source: "json" | "xml" | "markdown" | "plain";
}

/** Result of parsing tool calls from LLM output. */
export interface ParseResult {
  calls: ParsedToolCall[];
  errors: string[];
}

// ── Main entry point ──────────────────────────────────────────────

/**
 * Extract tool calls from raw LLM output.
 *
 * Tries JSON, XML, and markdown strategies, validates each call
 * against the provided tool definitions, and applies schema coercion.
 */
export function parseToolCalls(output: string, tools: ToolDefinition[], coerceOpts?: CoerceOptions): ParseResult {
  const errors: string[] = [];
  let calls: ParsedToolCall[] = [];

  // Strategy 1: JSON format
  const jsonCalls = extractJsonToolCalls(output);
  if (jsonCalls.length > 0) {
    calls = jsonCalls;
  }

  // Strategy 2: XML format (<tool_call>...</tool_call>)
  if (calls.length === 0) {
    const xmlCalls = extractXmlToolCalls(output);
    if (xmlCalls.length > 0) {
      calls = xmlCalls;
    }
  }

  // Strategy 3: Markdown-wrapped JSON
  if (calls.length === 0) {
    const mdCalls = extractMarkdownToolCalls(output);
    if (mdCalls.length > 0) {
      calls = mdCalls;
    }
  }

  // Validate and coerce
  const toolMap = new Map(tools.map((t) => [t.name, t]));
  const validated: ParsedToolCall[] = [];

  for (const call of calls) {
    const tool = toolMap.get(call.name);
    if (!tool) {
      errors.push(`Unknown tool: "${call.name}"`);
      continue;
    }

    // Coerce arguments to match schema
    const coerced = coerceToSchema(call.arguments, tool.parameters, coerceOpts);
    if (typeof coerced === "object" && coerced !== null && !Array.isArray(coerced)) {
      call.arguments = coerced as Record<string, unknown>;
    }

    // Check required fields
    const missing = checkRequired(call.arguments, tool.parameters);
    if (missing.length > 0) {
      errors.push(`Tool "${call.name}" missing required fields: ${missing.join(", ")}`);
      continue;
    }

    validated.push(call);
  }

  return { calls: validated, errors };
}

// ── JSON extraction ───────────────────────────────────────────────

function extractJsonToolCalls(output: string): ParsedToolCall[] {
  const calls: ParsedToolCall[] = [];

  // Try parsing the whole output as a tool call or array of tool calls
  const parsed = rjsonParse(output);

  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      const call = normalizeToolCallObject(item, "json");
      if (call) calls.push(call);
    }
    return calls;
  }

  if (isToolCallShape(parsed)) {
    const call = normalizeToolCallObject(parsed, "json");
    if (call) calls.push(call);
    return calls;
  }

  // Try extracting from substrings
  const candidates = extractJsonSubstring(output);
  for (const candidate of candidates) {
    const repaired = repairJson(candidate);
    const p = rjsonParse(repaired);
    if (isToolCallShape(p)) {
      const call = normalizeToolCallObject(p, "json");
      if (call) {
        calls.push(call);
        break;
      }
    }
  }

  return calls;
}

// ── XML extraction ────────────────────────────────────────────────

function extractXmlToolCalls(output: string): ParsedToolCall[] {
  const calls: ParsedToolCall[] = [];
  const xmlRe = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/gi;
  let m = xmlRe.exec(output);

  while (m !== null) {
    const content = m[1]?.trim();
    if (!content) {
      m = xmlRe.exec(output);
      continue;
    }

    // XML content might be JSON inside the tags
    const parsed = rjsonParse(content);
    if (isToolCallShape(parsed)) {
      const call = normalizeToolCallObject(parsed, "xml");
      if (call) calls.push(call);
      continue;
    }

    // Try XML key-value extraction: <name>...</name> <arguments>...</arguments>
    const nameMatch = /<name>\s*(.*?)\s*<\/name>/i.exec(content);
    const argsMatch = /<arguments>\s*([\s\S]*?)\s*<\/arguments>/i.exec(content);
    if (nameMatch?.[1]) {
      const args = argsMatch?.[1] ? rjsonParse(argsMatch[1]) : {};
      calls.push({
        name: nameMatch[1],
        arguments: (typeof args === "object" && args !== null && !Array.isArray(args) ? args : {}) as Record<
          string,
          unknown
        >,
        source: "xml",
      });
    }
    m = xmlRe.exec(output);
  }

  return calls;
}

// ── Markdown extraction ───────────────────────────────────────────

function extractMarkdownToolCalls(output: string): ParsedToolCall[] {
  const calls: ParsedToolCall[] = [];
  const fenceRe = /```(?:json|tool_call)?\s*\n?([\s\S]*?)```/gi;
  let m = fenceRe.exec(output);

  while (m !== null) {
    const content = m[1]?.trim();
    if (!content) {
      m = fenceRe.exec(output);
      continue;
    }

    const parsed = rjsonParse(content);
    if (isToolCallShape(parsed)) {
      const call = normalizeToolCallObject(parsed, "markdown");
      if (call) calls.push(call);
    }
    m = fenceRe.exec(output);
  }

  return calls;
}

// ── Helpers ───────────────────────────────────────────────────────

function isToolCallShape(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  // Must have a "name" or "function" or "tool" field
  return (
    typeof obj.name === "string" ||
    typeof obj.function === "string" ||
    typeof obj.tool === "string" ||
    typeof obj.tool_name === "string"
  );
}

function normalizeToolCallObject(obj: unknown, source: ParsedToolCall["source"]): ParsedToolCall | undefined {
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return undefined;
  const o = obj as Record<string, unknown>;

  const name =
    (typeof o.name === "string" && o.name) ||
    (typeof o.function === "string" && o.function) ||
    (typeof o.tool === "string" && o.tool) ||
    (typeof o.tool_name === "string" && o.tool_name);

  if (!name) return undefined;

  let args: Record<string, unknown> = {};
  const rawArgs = o.arguments ?? o.parameters ?? o.params ?? o.input ?? {};
  if (typeof rawArgs === "string") {
    const parsed = rjsonParse(rawArgs);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      args = parsed as Record<string, unknown>;
    }
  } else if (typeof rawArgs === "object" && rawArgs !== null && !Array.isArray(rawArgs)) {
    args = rawArgs as Record<string, unknown>;
  }

  return { name, arguments: args, source };
}

function checkRequired(args: Record<string, unknown>, schema: SimpleSchema): string[] {
  if (!schema.required) return [];
  return schema.required.filter((key) => !(key in args));
}
