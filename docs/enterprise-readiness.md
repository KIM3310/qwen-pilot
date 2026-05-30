# Enterprise Readiness Notes - qwen-pilot

Updated: 2026-05-30

This repository is archived as supporting material. It should not be positioned as a maintained enterprise product without a fresh revival scope.

## Scope

| Field | Notes |
|---|---|
| Repository | `qwen-pilot` |
| Status | Archived supporting proof |
| Lane | B2B developer automation |
| Primary reader or buyer | Developer-tool builders and teams standardizing Qwen CLI agent usage. |
| Current successor | stage-pilot, multi-cli-pilot, and agent-runtime-go |
| Readiness posture | Historical or optional proof; not a current production-readiness claim. |

## Revival Requirements

- Re-check dependencies, build path, secrets posture, and live demo status.
- Reconfirm the buyer, data boundary, identity/access needs, monitoring, and support owner.
- Replace broad consumer or experimental positioning with one narrow paid or reviewable use case.
- Keep the active flagship repositories as the main portfolio story unless this domain is explicitly requested.

## Proof Points

- npm run verify passes
- qp doctor path is documented
- Fixtures are deterministic

## Open Risks

- Provider-specific behavior isolated
- Customer secrets stay local
- Human approval required
- Vendor-specific CLI spike is redundant beside the stronger multi-agent and tool-call reliability repos.
