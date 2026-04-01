# qwen-pilot

[English](README.md) | [한국어](README.ko.md)

Multi-agent orchestration harness for Alibaba Qwen CLI. Provides prompt management, workflow execution, and team coordination for Qwen-powered development workflows.

## Features

- **Agent System** -- 15 built-in agent roles (architect, executor, reviewer, debugger, etc.) with Zod-validated definitions and model tier routing
- **Workflow Engine** -- Step-based workflow execution with gates (pass/review/test), retries, and loop support
- **Team Coordination** -- tmux-based parallel agent execution with task queuing, heartbeat monitoring, and phase management (plan/execute/verify/fix)
- **Harness Sessions** -- Enhanced Qwen CLI sessions with model tier selection (high/balanced/fast), sandbox modes, and context injection
- **State Store** -- File-based persistent state with namespaced key-value storage
- **Hook System** -- Event-driven lifecycle hooks for session, workflow, team, and task events
- **MCP Integration** -- Model Context Protocol server for tool-based interaction
- **Prompt Management** -- Markdown-based prompt definitions with YAML frontmatter

## Requirements

- Node.js >= 20.0.0
- Qwen CLI installed and configured
- tmux (optional, for team coordination)

## Installation

```bash
npm install -g qwen-pilot
```

Or use locally in a project:

```bash
npm install qwen-pilot
```

## Quick Start

```bash
# Initialize in your project
qp setup

# Launch an enhanced session
qp harness

# Use a high-tier model
qp harness --max

# Single-shot query
qp ask "Explain this codebase"

# Run a workflow
qp workflows run autopilot

# Launch a 3-worker team
qp team 3 --role executor --task "Implement feature X"
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `qp setup` | Initialize qwen-pilot in the current project |
| `qp harness` | Launch an enhanced Qwen CLI session |
| `qp ask <prompt>` | Single-shot query to Qwen |
| `qp team <count>` | Launch multi-agent team with tmux |
| `qp prompts list` | List available agent prompts |
| `qp prompts show <name>` | Show details of a specific prompt |
| `qp workflows list` | List available workflows |
| `qp workflows show <name>` | Show details of a specific workflow |
| `qp workflows run <name>` | Run a workflow |
| `qp config show` | Show current configuration |
| `qp config validate` | Validate current configuration |
| `qp doctor` | Verify qwen-pilot installation |
| `qp status` | Show active sessions and status |

## Configuration

Configuration is layered (user-level, project-level, environment variables):

```json
{
  "models": {
    "high": "qwen-max",
    "balanced": "qwen-plus",
    "fast": "qwen-turbo"
  },
  "harness": {
    "defaultTier": "balanced",
    "sandboxMode": "relaxed",
    "maxTokens": 8192,
    "temperature": 0.7
  },
  "team": {
    "maxWorkers": 4,
    "heartbeatIntervalMs": 5000,
    "taskTimeoutMs": 300000
  }
}
```

Configuration files are loaded from:
1. `~/.config/qwen-pilot/qwen-pilot.json` (user-level)
2. `.qwen-pilot/qwen-pilot.json` (project-level)

Environment variable overrides: `QP_MODEL_HIGH`, `QP_MODEL_BALANCED`, `QP_MODEL_FAST`, `QP_SANDBOX_MODE`, `QP_MAX_WORKERS`.

## Model Tiers

| Tier | Default Model | Use Case |
|------|---------------|----------|
| High | qwen-max | Complex reasoning, architecture, planning |
| Balanced | qwen-plus | General implementation, review |
| Fast | qwen-turbo | Quick tasks, formatting, simple queries |

## Built-in Agent Roles

architect, planner, executor, debugger, reviewer, security-auditor, test-engineer, optimizer, documenter, designer, analyst, scientist, refactorer, critic, mentor

## Built-in Workflows

autopilot, deep-plan, sprint, investigate, tdd, review-cycle, refactor, deploy-prep, interview, team-sync

## Project Structure

```
src/
  agents/     -- Agent role definitions and model routing
  cli/        -- Commander.js CLI interface
  config/     -- Zod-validated configuration with layered loading
  harness/    -- Session management and context injection
  hooks/      -- Event-driven lifecycle hooks
  mcp/        -- Model Context Protocol server
  prompts/    -- Prompt management
  state/      -- File-based persistent state store
  team/       -- tmux-based team coordination
  utils/      -- Shared utilities (fs, logger, markdown, process)
  workflows/  -- Step-based workflow engine
prompts/      -- Built-in agent prompt definitions (.md)
workflows/    -- Built-in workflow definitions (.md)
__tests__/    -- Vitest test suite
```

## Development

```bash
npm install
npm run build
npm test
npm run dev    # watch mode
```

## License

MIT -- see [LICENSE](LICENSE) for details.
