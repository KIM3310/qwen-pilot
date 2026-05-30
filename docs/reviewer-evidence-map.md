# Review Guide - qwen-pilot

Updated: 2026-05-30

This repository is now curated as supporting material. Review it only after the flagship enterprise AI, operations, security, data, and runtime reliability projects have established the main story.

## Summary

| Field | Notes |
|---|---|
| Repository | `qwen-pilot` |
| Status | Archived supporting repository |
| Lane | B2B developer automation |
| Primary reader | Developer-tool builders and teams standardizing Qwen CLI agent usage. |
| Why it moved back | Vendor-specific CLI spike is redundant beside the stronger multi-agent and tool-call reliability repos. |
| Current successor | stage-pilot, multi-cli-pilot, and agent-runtime-go |

## Open First

1. Start with the successor repositories named above.
2. Use this repository only for optional domain breadth or historical product exploration.
3. Check `docs/portfolio-fit.md` before presenting it externally.
4. Keep the archived/supporting status visible in any resume, portfolio, or buyer conversation.

## Evidence

- npm run verify passes
- qp doctor path is documented
- Fixtures are deterministic

## Commercial Notes

| Possible offer | Working price assumption | Scope |
|---|---|---|
| Internal automation harness | $1k-$5k setup | Scoped after review. |
| Workflow template library | $8k-$25k rollout | Scoped after review. |
| Agent-ops setup engagement | $1k-$5k/month workflow maintenance | Scoped after review. |

## Boundaries

- Provider-specific behavior isolated
- Customer secrets stay local
- Human approval required
- Vendor-specific CLI spike is redundant beside the stronger multi-agent and tool-call reliability repos.
- Do not present this as a current flagship or maintained product surface.

## Useful Metrics

- Workflow success
- Prompt reuse
- Review handoff quality
