---
name: deploy-prep
description: Pre-deployment verification and readiness checklist
version: "1.0.0"
loop: false
---

## Step 1: Test Suite (agent: test-engineer)
Run the complete test suite including unit, integration, and e2e tests.
Verify all tests pass with no flaky failures.
Check test coverage meets deployment thresholds.
gate: test

## Step 2: Security Audit (agent: security-auditor)
Run dependency vulnerability scan.
Review any new code for security issues.
Check for exposed secrets or credentials in the codebase.
gate: review

## Step 3: Performance Check (agent: optimizer)
Run performance benchmarks if available.
Check for known performance regressions.
Verify resource usage is within acceptable bounds.
gate: review

## Step 4: Documentation (agent: documenter)
Verify README and API docs are up to date.
Check that CHANGELOG reflects all changes since last release.
Ensure migration guides exist for breaking changes.
gate: review

## Step 5: Final Review (agent: critic)
Evaluate overall deployment readiness.
Check all gates have been passed.
Produce a go/no-go recommendation with reasoning.
gate: pass
