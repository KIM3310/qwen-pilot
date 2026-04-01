/**
 * Schema coercion — normalize LLM-produced tool arguments to match
 * the expected JSON Schema types.
 *
 * Handles: string->number, string->boolean, value->array wrapping,
 * snake_case <-> camelCase key normalization, unknown field stripping,
 * and nested coercion with a configurable depth limit.
 */

/** Minimal JSON Schema subset we operate on. */
export interface SimpleSchema {
  type?: string | string[];
  properties?: Record<string, SimpleSchema>;
  items?: SimpleSchema;
  required?: string[];
  additionalProperties?: boolean;
  enum?: unknown[];
}

/** Options for schema coercion. */
export interface CoerceOptions {
  /** Maximum nesting depth (default: 10). */
  maxDepth?: number;
  /** Strip keys not declared in `properties` (default: true). */
  stripUnknown?: boolean;
  /** Attempt camelCase <-> snake_case key normalization (default: true). */
  normalizeKeys?: boolean;
}

const DEFAULT_MAX_DEPTH = 10;

/**
 * Coerce a value to match the given schema.
 *
 * @returns The coerced value, or the original if coercion is impossible.
 */
export function coerceToSchema(
  value: unknown,
  schema: SimpleSchema,
  opts?: CoerceOptions,
): unknown {
  const maxDepth = opts?.maxDepth ?? DEFAULT_MAX_DEPTH;
  const stripUnknown = opts?.stripUnknown ?? true;
  const normalizeKeys = opts?.normalizeKeys ?? true;
  return coerceInternal(value, schema, 0, maxDepth, stripUnknown, normalizeKeys);
}

function coerceInternal(
  value: unknown,
  schema: SimpleSchema,
  depth: number,
  maxDepth: number,
  stripUnknown: boolean,
  normalizeKeys: boolean,
): unknown {
  if (depth > maxDepth) return value;

  const types = resolveTypes(schema);

  // Enum check — try matching first
  if (schema.enum && schema.enum.length > 0) {
    return coerceEnum(value, schema.enum);
  }

  // Type-specific coercion
  if (types.includes("object") && schema.properties) {
    return coerceObject(value, schema, depth, maxDepth, stripUnknown, normalizeKeys);
  }
  if (types.includes("array")) {
    return coerceArray(value, schema, depth, maxDepth, stripUnknown, normalizeKeys);
  }
  if (types.includes("number") || types.includes("integer")) {
    return coerceNumber(value);
  }
  if (types.includes("boolean")) {
    return coerceBoolean(value);
  }
  if (types.includes("string")) {
    return coerceString(value);
  }

  return value;
}

function resolveTypes(schema: SimpleSchema): string[] {
  if (!schema.type) return [];
  return Array.isArray(schema.type) ? schema.type : [schema.type];
}

function coerceNumber(value: unknown): unknown {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return value;
    const n = Number(trimmed);
    if (!Number.isNaN(n)) return n;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  return value;
}

function coerceBoolean(value: unknown): unknown {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();
    if (lower === "true" || lower === "1" || lower === "yes") return true;
    if (lower === "false" || lower === "0" || lower === "no") return false;
  }
  if (typeof value === "number") return value !== 0;
  return value;
}

function coerceString(value: unknown): unknown {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return value;
}

function coerceArray(
  value: unknown,
  schema: SimpleSchema,
  depth: number,
  maxDepth: number,
  stripUnknown: boolean,
  normalizeKeys: boolean,
): unknown {
  // Wrap non-array in an array
  const arr = Array.isArray(value) ? value : [value];

  if (!schema.items) return arr;

  return arr.map((item) =>
    coerceInternal(item, schema.items!, depth + 1, maxDepth, stripUnknown, normalizeKeys),
  );
}

function coerceObject(
  value: unknown,
  schema: SimpleSchema,
  depth: number,
  maxDepth: number,
  stripUnknown: boolean,
  normalizeKeys: boolean,
): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return value;
  }

  const input = value as Record<string, unknown>;
  const props = schema.properties ?? {};
  const result: Record<string, unknown> = {};

  // Build a lookup from normalized key -> schema key
  const schemaKeyMap = new Map<string, string>();
  for (const key of Object.keys(props)) {
    schemaKeyMap.set(key, key);
    if (normalizeKeys) {
      schemaKeyMap.set(toSnakeCase(key), key);
      schemaKeyMap.set(toCamelCase(key), key);
    }
  }

  // Map input keys to schema keys
  const mappedKeys = new Set<string>();
  for (const [inputKey, inputValue] of Object.entries(input)) {
    const schemaKey = schemaKeyMap.get(inputKey);
    if (schemaKey && props[schemaKey]) {
      result[schemaKey] = coerceInternal(
        inputValue,
        props[schemaKey],
        depth + 1,
        maxDepth,
        stripUnknown,
        normalizeKeys,
      );
      mappedKeys.add(inputKey);
    } else if (!stripUnknown || schema.additionalProperties !== false) {
      result[inputKey] = inputValue;
    }
  }

  return result;
}

function coerceEnum(value: unknown, options: unknown[]): unknown {
  // Exact match
  if (options.includes(value)) return value;

  // Case-insensitive string match
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    for (const opt of options) {
      if (typeof opt === "string" && opt.toLowerCase() === lower) return opt;
    }
  }

  // Numeric coercion
  if (typeof value === "string") {
    const n = Number(value);
    if (!Number.isNaN(n) && options.includes(n)) return n;
  }

  return value;
}

// ── Key normalization helpers ─────────────────────────────────────

/** Convert camelCase to snake_case. */
export function toSnakeCase(s: string): string {
  return s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

/** Convert snake_case to camelCase. */
export function toCamelCase(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}
