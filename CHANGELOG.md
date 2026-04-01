# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-05-01

### Added

- 15 built-in agent roles with Zod-validated definitions and model tier routing
- Step-based workflow engine with gates, retries, and loop support
- tmux-based team coordination with task queuing and heartbeat monitoring
- Enhanced Qwen CLI session harness with model tier selection and sandbox modes
- File-based persistent state store with namespaced key-value storage
- Event-driven lifecycle hook system
- Model Context Protocol (MCP) server integration
- Markdown-based prompt management with YAML frontmatter
- 10 built-in workflows: autopilot, deep-plan, sprint, investigate, tdd, review-cycle, refactor, deploy-prep, interview, team-sync
- Full CLI with `qp` command: setup, harness, ask, team, prompts, workflows, config, doctor, status
- GitHub Actions CI pipeline
