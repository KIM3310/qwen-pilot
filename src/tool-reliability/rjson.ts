/**
 * Robust JSON parser that recovers from common LLM output mistakes.
 *
 * Handles: trailing commas, single quotes, unquoted keys, comments,
 * missing brackets, extra commas, markdown code-fence wrapping,
 * and mixed text surrounding JSON.
 */

/** Options for robust JSON parsing. */
export interface RJsonOptions {
  /** Maximum input length to process (default: 100_000). */
  maxLength?: number;
}

const DEFAULT_MAX_LENGTH = 100_000;

/**
 * Attempt to parse JSON from potentially malformed LLM output.
 *
 * @param input - Raw string that may contain JSON.
 * @param opts  - Parsing options.
 * @returns The parsed value, or `undefined` if nothing could be recovered.
 */
export function rjsonParse(input: string, opts?: RJsonOptions): unknown {
  const maxLen = opts?.maxLength ?? DEFAULT_MAX_LENGTH;
  if (!input || input.length === 0) return undefined;
  const text = input.length > maxLen ? input.slice(0, maxLen) : input;

  // 1. Try native parse first (fast path)
  const native = tryNativeParse(text);
  if (native.ok) return native.value;

  // 2. Extract JSON from markdown fences or mixed text
  const extracted = extractJsonSubstring(text);

  // 3. Apply repairs and retry
  for (const candidate of extracted) {
    const repaired = repairJson(candidate);
    const result = tryNativeParse(repaired);
    if (result.ok) return result.value;
  }

  return undefined;
}

/**
 * Extract all potential JSON substrings from mixed text.
 * Returns candidates ordered by likelihood.
 */
export function extractJsonSubstring(text: string): string[] {
  const candidates: string[] = [];

  // Strip markdown code fences: ```json ... ``` or ```...```
  const fenceRe = /```(?:json|jsonc|javascript|js|ts)?\s*\n?([\s\S]*?)```/gi;
  let m = fenceRe.exec(text);
  while (m !== null) {
    if (m[1]?.trim()) candidates.push(m[1].trim());
    m = fenceRe.exec(text);
  }

  // Find brace/bracket-delimited blocks
  for (const open of ["{", "["]) {
    const close = open === "{" ? "}" : "]";
    const start = text.indexOf(open);
    if (start === -1) continue;
    const end = text.lastIndexOf(close);
    if (end > start) {
      candidates.push(text.slice(start, end + 1));
    }
  }

  // Whole text as last resort
  candidates.push(text.trim());

  return candidates;
}

/** Repair common JSON issues. */
export function repairJson(input: string): string {
  let s = input;

  // Remove single-line comments (// ...)
  s = s.replace(/\/\/[^\n]*/g, "");

  // Remove multi-line comments (/* ... */)
  s = s.replace(/\/\*[\s\S]*?\*\//g, "");

  // Replace single quotes with double quotes (outside of double-quoted strings)
  s = replaceSingleQuotes(s);

  // Quote unquoted keys: { key: value } -> { "key": value }
  s = s.replace(/([{,]\s*)([a-zA-Z_$][\w$]*)\s*:/g, '$1"$2":');

  // Remove trailing commas before } or ]
  s = s.replace(/,\s*([}\]])/g, "$1");

  // Fix missing closing brackets/braces
  s = balanceBrackets(s);

  return s;
}

/** Replace single-quoted strings with double-quoted strings. */
function replaceSingleQuotes(input: string): string {
  const chars: string[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i] ?? "";
    if (ch === '"') {
      // Skip double-quoted string
      chars.push(ch);
      i++;
      while (i < input.length && input[i] !== '"') {
        if (input[i] === "\\") {
          chars.push(input[i] ?? "");
          i++;
        }
        if (i < input.length) {
          chars.push(input[i] ?? "");
          i++;
        }
      }
      if (i < input.length) {
        chars.push(input[i] ?? "");
        i++;
      }
    } else if (ch === "'") {
      // Convert single-quoted string to double-quoted
      chars.push('"');
      i++;
      while (i < input.length && input[i] !== "'") {
        if (input[i] === "\\") {
          chars.push(input[i] ?? "");
          i++;
        }
        // Escape any unescaped double quotes inside
        if (i < input.length && input[i] === '"') {
          chars.push("\\");
        }
        if (i < input.length) {
          chars.push(input[i] ?? "");
          i++;
        }
      }
      chars.push('"');
      if (i < input.length) i++; // skip closing '
    } else {
      chars.push(ch);
      i++;
    }
  }
  return chars.join("");
}

/** Add missing closing brackets/braces. */
function balanceBrackets(input: string): string {
  const stack: string[] = [];
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i] ?? "";
    if (isEscaped) {
      isEscaped = false;
      continue;
    }
    if (ch === "\\") {
      isEscaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") {
      if (stack.length > 0 && stack[stack.length - 1] === ch) {
        stack.pop();
      }
    }
  }

  // Close any unclosed brackets
  return input + stack.reverse().join("");
}

function tryNativeParse(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}
