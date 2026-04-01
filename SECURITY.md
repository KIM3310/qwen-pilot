# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | Yes                |
| < 1.0   | No                 |

## Reporting a Vulnerability

If you discover a security vulnerability in qwen-pilot, please report it
responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email **security@example.com** (replace with your actual
contact) with:

1. A description of the vulnerability
2. Steps to reproduce
3. The potential impact
4. Any suggested fixes (optional)

We will acknowledge your report within 48 hours and aim to provide an
initial assessment within 5 business days.

## Security Considerations

### API Keys and Credentials

- qwen-pilot does **not** store API keys or credentials itself.
- Authentication is delegated to the underlying Qwen CLI.
- Never commit `.qwen-pilot/` directories that may contain session state
  with sensitive context to version control.

### Sandbox Mode

qwen-pilot supports three sandbox modes:

| Mode      | Description                                        |
| --------- | -------------------------------------------------- |
| `full`    | Qwen CLI runs with `--sandbox` (most restrictive)  |
| `relaxed` | Default — no explicit sandbox flag                 |
| `none`    | Qwen CLI runs with `--no-sandbox` (least safe)     |

Use `full` sandbox mode when running untrusted prompts or in CI
environments.

### State Directory

The `.qwen-pilot/` directory stores:

- Session metadata (IDs, models, timestamps)
- Memory store key-value pairs
- History entries

Ensure this directory is listed in `.gitignore` (the `qp setup` and
`qp init` commands do this automatically).

### MCP Server

The MCP server (`qp mcp`) communicates over stdio and is intended for
local use by MCP-compatible clients. It does not open network ports.

### Plugin Security

Custom prompts and workflows loaded from `.qwen-pilot/prompts/` and
`.qwen-pilot/workflows/` are treated as trusted project-local content.
Only add plugins from sources you trust.

### Dependencies

We keep the dependency tree minimal:

- `commander` — CLI framework
- `zod` — Schema validation
- `@modelcontextprotocol/sdk` — MCP protocol

All dependencies are regularly audited via `npm audit`.

## Best Practices

1. **Use sandbox mode** for untrusted prompts: `qp harness --sandbox-mode full`
2. **Review workflows** before running them: `qp workflows show <name>`
3. **Use --dry-run** to preview actions: `qp ask "prompt" --dry-run`
4. **Keep dependencies updated**: `npm audit && npm update`
5. **Do not commit secrets** in AGENTS.md or workflow files
