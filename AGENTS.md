# qwen-pilot Agent Guidelines

## Project Overview
qwen-pilot is a multi-agent orchestration harness for Alibaba Qwen CLI. It provides prompt management, workflow execution, and team coordination capabilities.

## Architecture
- **CLI Layer** (`src/cli/`) — Commander.js-based command interface
- **Agent System** (`src/agents/`) — Role definitions and model routing
- **Workflow Engine** (`src/workflows/`) — Step-based workflow execution with gates
- **Harness** (`src/harness/`) — Session management with model tier routing
- **Team Coordinator** (`src/team/`) — tmux-based parallel agent execution
- **State Store** (`src/state/`) — File-based persistent state
- **MCP Server** (`src/mcp/`) — Model Context Protocol integration
- **Hooks** (`src/hooks/`) — Event-driven lifecycle hooks

## Coding Standards
- TypeScript strict mode with ES2022 target
- NodeNext module resolution
- Zod for runtime validation
- Vitest for testing
- No default exports — use named exports everywhere
- Prefer `const` and immutable patterns
- Handle errors explicitly — no swallowed exceptions

## Model Tiers
- **High** (qwen3.5-plus) — Complex reasoning, architecture, planning (256K context, 201 languages)
- **Balanced** (qwen3-coder-plus) — General implementation, review (coding-optimized)
- **Fast** (qwen3-coder-next) — Quick tasks, formatting, simple queries (fast coding model)

## Tool Calling Standards

All agents follow a unified tool-calling protocol optimized for first-call accuracy:

### JSON Format
- Valid JSON only — no trailing commas, no single quotes, no comments
- Wrap tool-call JSON in ```json code fences
- Ensure JSON is complete and parseable before submission

### Parameter Discipline
- Match parameter types exactly: `number` for numeric values, `string` for text, `boolean` for flags
- Include all required parameters — never omit required fields
- Use exact parameter names from the schema — no renaming or aliasing
- Omit optional parameters rather than passing `null` or empty strings (unless schema allows)

### Structured Thinking (Before Every Tool Call)
1. **Goal** — State the objective
2. **Tool** — Identify the correct tool
3. **Parameters** — List required and relevant optional parameters with expected types
4. **Arguments** — Construct exact JSON arguments, verifying types match schema
5. **Execute** — Make the call

### Parallel vs Sequential Execution
- Independent operations (e.g., reading multiple unrelated files) — call in parallel
- Dependent operations (e.g., read then modify) — execute sequentially, wait for results
- Never guess dependent values — always wait for the prior call to complete

### Error Recovery
1. Read the error message carefully
2. Identify the incorrect parameter
3. Fix only that parameter
4. Retry — do not change correct parameters

### Role-Specific Guidance
Each agent prompt includes tool guidance specific to its role:
- **architect** — API schema validation, configuration type correctness
- **executor** — File path verification, proper JSON string escaping
- **debugger** — Precise regex patterns, stack trace handling
- **test-engineer** — Exact assertion types, mock return value types
- **planner** — Task dependency arrays, date format strings
- **analyst** — Numeric thresholds, aggregation patterns
- **critic** — Severity enums, scoring as numbers
- **designer** — Type definition structures, schema generation
- **documenter** — Markdown content escaping, template variables
- **mentor** — Code example formatting, difficulty enums
- **optimizer** — Benchmark numeric parameters, timeout values
- **refactorer** — Regex escaping in search/replace, dry-run booleans
- **reviewer** — Diff parameters, line-number annotations
- **scientist** — Statistical parameters, experiment reproducibility seeds
- **security-auditor** — Vulnerability rule arrays, secret-pattern regex

## Testing
- Tests in `__tests__/` directory
- Use descriptive test names: `it("should [behavior] when [condition]")`
- Test public interfaces, not implementation details
