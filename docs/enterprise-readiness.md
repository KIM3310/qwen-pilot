# Enterprise Readiness Notes - qwen-pilot

Updated: 2026-05-30

This note defines what an enterprise buyer, public-sector reviewer, serious user, or technical evaluator can safely infer from this repository today. It is intentionally conservative: public proof is separated from production claims.

## Scope

| Field | Notes |
|---|---|
| Repository | `qwen-pilot` |
| Lane | B2B developer automation |
| Primary reader or buyer | Developer-tool builders and teams standardizing Qwen CLI agent usage. |
| Core wedge | Qwen-focused orchestration harness with typed workflows, prompts, and team coordination. |
| Stack | TypeScript/JavaScript |
| Readiness posture | Pilot-ready technical surface; production use requires customer-specific identity, monitoring, data, and support controls. |

## Enterprise Controls

| Control | Current expectation |
|---|---|
| Data boundary | Public artifacts should use demo, fixture, or synthetic data until the buyer approves data handling, retention, and access controls. |
| Identity and access | Production pilots should add SSO/OIDC, RBAC, scoped service accounts, secret rotation, and admin-visible access reviews. |
| Auditability | Keep decision logs, generated reports, CI results, eval outputs, and operator handoff artifacts reviewable. |
| Observability | Track health checks, latency, error budget, cost, eval pass rate, audit-log completeness, and handoff/report generation status. |
| Release gate | Full local gate: npm run verify; Test suite: npm test; Lint: npm run lint; Typecheck: npm run typecheck |
| Support handoff | Name the owner, escalation path, rollback path, known limits, and review cadence before a paid or production pilot. |

## Verification Surface

| Purpose | Command |
|---|---|
| Full local gate | `npm run verify` |
| Test suite | `npm test` |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Production build | `npm run build` |

## CI Surface

- .github/workflows/architecture-blueprint.yml
- .github/workflows/ci.yml
- .github/workflows/dependency-review.yml
- .github/workflows/repository-health.yml
- .github/workflows/repository-surface.yml
- .github/workflows/secret-scan.yml

## Acceptance Criteria

- npm run verify can be run or the equivalent CI gate is visible.
- README, review guide, quality notes, revenue model, and this readiness note agree on the same scope.
- Demo, fixture, synthetic, or public-data boundaries are explicit before a buyer sees outputs.
- A reviewer can identify the first useful outcome without reading implementation details.
- Production claims stay behind customer-specific validation, access control, monitoring, and support handoff.

## Integration Path

- Run a synthetic-data walkthrough with the buyer and document the acceptance criteria.
- Scope a controlled pilot using approved data, named users, secrets, and rollback paths.
- Convert the pilot into an operating handoff with monitoring, review cadence, support owner, and renewal metric.

## Proof Points

- npm run verify passes
- qp doctor path is documented
- Fixtures are deterministic

## Operating Metrics

- Workflow success
- Prompt reuse
- Review handoff quality

## Open Risks

- Provider-specific behavior isolated
- Customer secrets stay local
- Human approval required

## Finish Line

- Keep the public repository honest, runnable, and easy to review.
- Keep sensitive data, secrets, private tenant details, and unsupported claims out of public artifacts.
- Treat this repository as a proof surface until an approved pilot defines users, data, access, monitoring, support, and success metrics.
