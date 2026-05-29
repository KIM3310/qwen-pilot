# Review Guide - qwen-pilot

Updated: 2026-05-30

Use this page as the short path through the repository. It keeps the review grounded in the code, docs, commands, and boundaries that are already present.

## Summary

| Field | Notes |
|---|---|
| Lane | B2B developer automation |
| Core idea | Qwen-focused orchestration harness with typed workflows, prompts, and team coordination. |
| Primary reader | Developer-tool builders and teams standardizing Qwen CLI agent usage. |
| Stack | TypeScript/JavaScript |

## Open First

1. Start with the README fast path and architecture section.
2. Open `docs/monetization-playbook.md` only when reviewing the product or service angle.
3. Check the commands below before making claims about quality.
4. Skim the CI workflows and fixture data before deeper implementation review.
5. Read the boundaries section before presenting the project externally.

## Checks

| Purpose | Command |
|---|---|
| Full local gate | `npm run verify` |
| Test suite | `npm test` |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Production build | `npm run build` |

## CI

- .github/workflows/architecture-blueprint.yml
- .github/workflows/ci.yml
- .github/workflows/dependency-review.yml
- .github/workflows/repository-health.yml
- .github/workflows/repository-surface.yml
- .github/workflows/secret-scan.yml

## Evidence

- package scripts and web/runtime checks
- npm run verify passes
- qp doctor path is documented
- Fixtures are deterministic

## Commercial Notes

| Possible offer | Working price assumption |
|---|---|
| Internal automation harness | $1k-$5k setup |
| Workflow template library | $8k-$25k rollout |
| Agent-ops setup engagement | $1k-$5k/month workflow maintenance |

## Boundaries

- Provider-specific behavior isolated
- Customer secrets stay local
- Human approval required

## Useful Metrics

- Workflow success
- Prompt reuse
- Review handoff quality
