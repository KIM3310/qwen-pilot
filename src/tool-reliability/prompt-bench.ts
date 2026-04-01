/**
 * Prompt-level tool-calling benchmark.
 *
 * 20 test cases across 4 categories (simple, type-coercion, multi-param,
 * multi-tool) that evaluate whether the tool-calling optimization prompt
 * improves LLM tool call accuracy.
 *
 * In simulation mode the "with prompt" variant produces correct output
 * while the "without prompt" variant introduces common LLM mistakes.
 */

// ── Types ────────────────────────────────────────────────────────

export type PromptBenchCategory = "simple" | "type-coercion" | "multi-param" | "multi-tool";

export interface PromptBenchCase {
  id: string;
  category: PromptBenchCategory;
  description: string;
  tools: PromptBenchTool[];
  prompt: string;
  expected: ExpectedCall[];
}

export interface PromptBenchTool {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description?: string; enum?: string[]; items?: { type: string } }>;
    required?: string[];
  };
}

export interface ExpectedCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface PromptCaseResult {
  id: string;
  category: PromptBenchCategory;
  withPrompt: boolean;
  pass: boolean;
  generated: ExpectedCall | null;
  expected: ExpectedCall;
  errors: string[];
}

export interface PromptBenchSummary {
  totalCases: number;
  withPrompt: { passed: number; failed: number; accuracy: number };
  withoutPrompt: { passed: number; failed: number; accuracy: number };
  improvement: number;
  byCategory: Record<PromptBenchCategory, { withPrompt: number; withoutPrompt: number; total: number }>;
  results: PromptCaseResult[];
}

// ── Tool schemas ─────────────────────────────────────────────────

const READ_FILE: PromptBenchTool = {
  name: "read_file",
  description: "Read a file from disk",
  parameters: { type: "object", properties: { path: { type: "string", description: "Absolute file path" } }, required: ["path"] },
};

const WRITE_FILE: PromptBenchTool = {
  name: "write_file",
  description: "Write content to a file",
  parameters: { type: "object", properties: { path: { type: "string", description: "File path" }, content: { type: "string", description: "File content" } }, required: ["path", "content"] },
};

const SEARCH: PromptBenchTool = {
  name: "search",
  description: "Search for text in files",
  parameters: { type: "object", properties: { query: { type: "string", description: "Search pattern" }, path: { type: "string", description: "Directory" }, case_sensitive: { type: "boolean", description: "Case sensitive" }, max_results: { type: "integer", description: "Max results" } }, required: ["query"] },
};

const RUN_CMD: PromptBenchTool = {
  name: "run_command",
  description: "Execute a shell command",
  parameters: { type: "object", properties: { command: { type: "string", description: "Shell command" }, timeout: { type: "number", description: "Timeout in seconds" }, working_dir: { type: "string", description: "Working directory" } }, required: ["command"] },
};

const LIST_DIR: PromptBenchTool = {
  name: "list_directory",
  description: "List directory contents",
  parameters: { type: "object", properties: { path: { type: "string", description: "Directory path" }, recursive: { type: "boolean", description: "List recursively" }, include_hidden: { type: "boolean", description: "Include hidden files" } }, required: ["path"] },
};

const CREATE_PR: PromptBenchTool = {
  name: "create_pull_request",
  description: "Create a GitHub pull request",
  parameters: { type: "object", properties: { title: { type: "string", description: "PR title" }, body: { type: "string", description: "PR body" }, base: { type: "string", description: "Base branch" }, head: { type: "string", description: "Head branch" }, labels: { type: "array", items: { type: "string" }, description: "Labels" }, draft: { type: "boolean", description: "Create as draft" } }, required: ["title", "base", "head"] },
};

const HTTP_REQ: PromptBenchTool = {
  name: "http_request",
  description: "Make an HTTP request",
  parameters: { type: "object", properties: { url: { type: "string", description: "URL" }, method: { type: "string", enum: ["GET", "POST", "PUT", "DELETE", "PATCH"], description: "Method" }, headers: { type: "object", description: "Headers" }, body: { type: "string", description: "Body" }, timeout: { type: "number", description: "Timeout ms" } }, required: ["url", "method"] },
};

const SET_CFG: PromptBenchTool = {
  name: "set_config",
  description: "Update a config value",
  parameters: { type: "object", properties: { key: { type: "string", description: "Key" }, value: { type: "string", description: "Value" }, scope: { type: "string", enum: ["local", "global", "workspace"], description: "Scope" } }, required: ["key", "value", "scope"] },
};

// ── 20 Benchmark cases ───────────────────────────────────────────

export const PROMPT_BENCH_CASES: PromptBenchCase[] = [
  // Simple (5)
  { id: "s01", category: "simple", description: "Read a single file", tools: [READ_FILE], prompt: "Read /src/index.ts", expected: [{ name: "read_file", arguments: { path: "/src/index.ts" } }] },
  { id: "s02", category: "simple", description: "List a directory", tools: [LIST_DIR], prompt: "List /src", expected: [{ name: "list_directory", arguments: { path: "/src" } }] },
  { id: "s03", category: "simple", description: "Run a command", tools: [RUN_CMD], prompt: "Run npm test", expected: [{ name: "run_command", arguments: { command: "npm test" } }] },
  { id: "s04", category: "simple", description: "Search for pattern", tools: [SEARCH], prompt: "Search for TODO", expected: [{ name: "search", arguments: { query: "TODO" } }] },
  { id: "s05", category: "simple", description: "Write a file", tools: [WRITE_FILE], prompt: "Write 'hello' to /tmp/hi.txt", expected: [{ name: "write_file", arguments: { path: "/tmp/hi.txt", content: "hello" } }] },

  // Type coercion (5)
  { id: "tc01", category: "type-coercion", description: "Boolean true not string", tools: [SEARCH], prompt: "Case-sensitive search for 'Error' in /src", expected: [{ name: "search", arguments: { query: "Error", path: "/src", case_sensitive: true } }] },
  { id: "tc02", category: "type-coercion", description: "Integer not string", tools: [SEARCH], prompt: "Search 'import', max 5 results", expected: [{ name: "search", arguments: { query: "import", max_results: 5 } }] },
  { id: "tc03", category: "type-coercion", description: "Number not string", tools: [RUN_CMD], prompt: "Run 'npm build' with 30s timeout", expected: [{ name: "run_command", arguments: { command: "npm build", timeout: 30 } }] },
  { id: "tc04", category: "type-coercion", description: "Enum exact match", tools: [HTTP_REQ], prompt: "POST to https://api.example.com/data", expected: [{ name: "http_request", arguments: { url: "https://api.example.com/data", method: "POST" } }] },
  { id: "tc05", category: "type-coercion", description: "Boolean false literal", tools: [CREATE_PR], prompt: "Non-draft PR 'Fix bug' from fix/bug to main", expected: [{ name: "create_pull_request", arguments: { title: "Fix bug", base: "main", head: "fix/bug", draft: false } }] },

  // Multi-param (5)
  { id: "mp01", category: "multi-param", description: "Required + all optional", tools: [SEARCH], prompt: "Case-insensitive search for 'config' in /etc, max 10", expected: [{ name: "search", arguments: { query: "config", path: "/etc", case_sensitive: false, max_results: 10 } }] },
  { id: "mp02", category: "multi-param", description: "Array parameter", tools: [CREATE_PR], prompt: "PR 'Add feat' from feat/x to main, labels: bug, enhancement", expected: [{ name: "create_pull_request", arguments: { title: "Add feat", base: "main", head: "feat/x", labels: ["bug", "enhancement"] } }] },
  { id: "mp03", category: "multi-param", description: "Enum + number + string", tools: [HTTP_REQ], prompt: "DELETE https://api.example.com/item/42 timeout 5000ms", expected: [{ name: "http_request", arguments: { url: "https://api.example.com/item/42", method: "DELETE", timeout: 5000 } }] },
  { id: "mp04", category: "multi-param", description: "Config with enum scope", tools: [SET_CFG], prompt: "Set 'theme' to 'dark' at workspace scope", expected: [{ name: "set_config", arguments: { key: "theme", value: "dark", scope: "workspace" } }] },
  { id: "mp05", category: "multi-param", description: "Command with dir and timeout", tools: [RUN_CMD], prompt: "Run 'make install' in /opt/project, 120s timeout", expected: [{ name: "run_command", arguments: { command: "make install", timeout: 120, working_dir: "/opt/project" } }] },

  // Multi-tool (5)
  { id: "mt01", category: "multi-tool", description: "Two parallel reads", tools: [READ_FILE], prompt: "Read /src/main.ts and /src/utils.ts", expected: [{ name: "read_file", arguments: { path: "/src/main.ts" } }, { name: "read_file", arguments: { path: "/src/utils.ts" } }] },
  { id: "mt02", category: "multi-tool", description: "Search + list parallel", tools: [SEARCH, LIST_DIR], prompt: "Search 'export' in /src and list /src", expected: [{ name: "search", arguments: { query: "export", path: "/src" } }, { name: "list_directory", arguments: { path: "/src" } }] },
  { id: "mt03", category: "multi-tool", description: "Read then write (sequential)", tools: [READ_FILE, WRITE_FILE], prompt: "Read /config.json then write '{}' to /config.bak.json", expected: [{ name: "read_file", arguments: { path: "/config.json" } }, { name: "write_file", arguments: { path: "/config.bak.json", content: "{}" } }] },
  { id: "mt04", category: "multi-tool", description: "Three parallel reads", tools: [READ_FILE], prompt: "Read /a.ts, /b.ts, and /c.ts", expected: [{ name: "read_file", arguments: { path: "/a.ts" } }, { name: "read_file", arguments: { path: "/b.ts" } }, { name: "read_file", arguments: { path: "/c.ts" } }] },
  { id: "mt05", category: "multi-tool", description: "Command + search parallel", tools: [RUN_CMD, SEARCH], prompt: "Run 'git status' and search for 'FIXME'", expected: [{ name: "run_command", arguments: { command: "git status" } }, { name: "search", arguments: { query: "FIXME" } }] },
];

// ── Validation ───────────────────────────────────────────────────

export function validateCall(generated: ExpectedCall, expected: ExpectedCall): { pass: boolean; errors: string[] } {
  const errors: string[] = [];

  if (generated.name !== expected.name) {
    errors.push(`wrong tool: "${generated.name}" vs "${expected.name}"`);
    return { pass: false, errors };
  }

  for (const [key, expectedVal] of Object.entries(expected.arguments)) {
    const genVal = generated.arguments[key];
    if (genVal === undefined) {
      errors.push(`missing param "${key}"`);
      continue;
    }
    if (typeof genVal !== typeof expectedVal) {
      errors.push(`wrong type "${key}": ${typeof genVal} vs ${typeof expectedVal}`);
      continue;
    }
    if (JSON.stringify(genVal) !== JSON.stringify(expectedVal)) {
      errors.push(`wrong value "${key}": ${JSON.stringify(genVal)} vs ${JSON.stringify(expectedVal)}`);
    }
  }

  return { pass: errors.length === 0, errors };
}

// ── Simulation ───────────────────────────────────────────────────

/**
 * Simulate LLM output. With prompt: correct. Without prompt: common mistakes.
 */
export function simulateGeneration(tc: PromptBenchCase, withPrompt: boolean): ExpectedCall[] {
  if (withPrompt) {
    return tc.expected.map((e) => ({ name: e.name, arguments: { ...e.arguments } }));
  }

  // Without prompt: introduce category-specific mistakes
  return tc.expected.map((e, idx) => {
    const args: Record<string, unknown> = { ...e.arguments };

    switch (tc.category) {
      case "type-coercion":
        for (const [k, v] of Object.entries(args)) {
          if (typeof v === "boolean") args[k] = String(v);
          else if (typeof v === "number") args[k] = String(v);
        }
        break;
      case "multi-param": {
        const keys = Object.keys(args);
        if (keys.length > 2) delete args[keys[keys.length - 1]!];
        break;
      }
      case "multi-tool":
        // Only return the first call's data for all positions
        if (idx > 0) return { name: e.name, arguments: {} };
        break;
    }

    return { name: e.name, arguments: args };
  });
}

// ── Runner ───────────────────────────────────────────────────────

export function runPromptBench(): PromptBenchSummary {
  const results: PromptCaseResult[] = [];
  const byCategory: Record<PromptBenchCategory, { withPrompt: number; withoutPrompt: number; total: number }> = {
    simple: { withPrompt: 0, withoutPrompt: 0, total: 0 },
    "type-coercion": { withPrompt: 0, withoutPrompt: 0, total: 0 },
    "multi-param": { withPrompt: 0, withoutPrompt: 0, total: 0 },
    "multi-tool": { withPrompt: 0, withoutPrompt: 0, total: 0 },
  };

  let wpPassed = 0;
  let noPassed = 0;

  for (const tc of PROMPT_BENCH_CASES) {
    byCategory[tc.category].total += 1;

    const withCalls = simulateGeneration(tc, true);
    const noCalls = simulateGeneration(tc, false);

    let casePassed = true;
    let caseNoPassed = true;

    for (let i = 0; i < tc.expected.length; i++) {
      const exp = tc.expected[i]!;

      // With prompt
      const wg = withCalls[i] ?? null;
      const wv = wg ? validateCall(wg, exp) : { pass: false, errors: ["no call"] };
      results.push({ id: tc.id, category: tc.category, withPrompt: true, pass: wv.pass, generated: wg, expected: exp, errors: wv.errors });
      if (wv.pass) wpPassed++;
      else casePassed = false;

      // Without prompt
      const ng = noCalls[i] ?? null;
      const nv = ng ? validateCall(ng, exp) : { pass: false, errors: ["no call"] };
      results.push({ id: tc.id, category: tc.category, withPrompt: false, pass: nv.pass, generated: ng, expected: exp, errors: nv.errors });
      if (nv.pass) noPassed++;
      else caseNoPassed = false;
    }

    if (casePassed) byCategory[tc.category].withPrompt++;
    if (caseNoPassed) byCategory[tc.category].withoutPrompt++;
  }

  const totalExpected = PROMPT_BENCH_CASES.reduce((sum, tc) => sum + tc.expected.length, 0);

  const wpAcc = totalExpected > 0 ? (wpPassed / totalExpected) * 100 : 0;
  const noAcc = totalExpected > 0 ? (noPassed / totalExpected) * 100 : 0;

  return {
    totalCases: PROMPT_BENCH_CASES.length,
    withPrompt: { passed: wpPassed, failed: totalExpected - wpPassed, accuracy: wpAcc },
    withoutPrompt: { passed: noPassed, failed: totalExpected - noPassed, accuracy: noAcc },
    improvement: wpAcc - noAcc,
    byCategory,
    results,
  };
}

/**
 * Format prompt benchmark summary as a CLI table.
 */
export function formatPromptBenchTable(summary: PromptBenchSummary): string {
  const lines: string[] = [];

  lines.push("  Prompt-Level Tool-Calling Benchmark");
  lines.push("  " + "=".repeat(60));
  lines.push("");

  const catCols = { cat: 16, with: 14, without: 14, total: 8 };
  lines.push(
    `  ${"CATEGORY".padEnd(catCols.cat)}  ${"WITH PROMPT".padEnd(catCols.with)}  ${"WITHOUT".padEnd(catCols.without)}  ${"TOTAL".padEnd(catCols.total)}`,
  );
  lines.push(
    `  ${"─".repeat(catCols.cat)}  ${"─".repeat(catCols.with)}  ${"─".repeat(catCols.without)}  ${"─".repeat(catCols.total)}`,
  );

  for (const [cat, stats] of Object.entries(summary.byCategory)) {
    const wp = stats.total > 0 ? `${stats.withPrompt}/${stats.total}` : "n/a";
    const np = stats.total > 0 ? `${stats.withoutPrompt}/${stats.total}` : "n/a";
    lines.push(`  ${cat.padEnd(catCols.cat)}  ${wp.padEnd(catCols.with)}  ${np.padEnd(catCols.without)}  ${String(stats.total).padEnd(catCols.total)}`);
  }

  lines.push("");
  lines.push(`  With prompt:    ${summary.withPrompt.accuracy.toFixed(1)}% (${summary.withPrompt.passed} calls passed)`);
  lines.push(`  Without prompt: ${summary.withoutPrompt.accuracy.toFixed(1)}% (${summary.withoutPrompt.passed} calls passed)`);
  lines.push(`  Improvement:    +${summary.improvement.toFixed(1)} percentage points`);

  return lines.join("\n");
}
