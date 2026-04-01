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

## Testing
- Tests in `__tests__/` directory
- Use descriptive test names: `it("should [behavior] when [condition]")`
- Test public interfaces, not implementation details
