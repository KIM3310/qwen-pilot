---
name: review-cycle
description: Multi-perspective code review with feedback incorporation
version: "1.0.0"
loop: true
maxIterations: 3
---

## Step 1: Code Review (agent: reviewer)
Review the changes for correctness, quality, and style.
Provide specific, actionable feedback organized by severity.
Identify any blocking issues that must be resolved.
gate: review

## Step 2: Security Review (agent: security-auditor)
Analyze changes for security vulnerabilities.
Check input validation, authentication, and data handling.
Flag any security concerns with severity rating.
gate: review

## Step 3: Address Feedback (agent: executor)
Address all blocking feedback from reviews.
Implement suggested improvements where appropriate.
Add comments explaining any feedback that was intentionally not addressed.
gate: none

## Step 4: Verification (agent: test-engineer)
Verify all review feedback has been properly addressed.
Run tests to ensure changes are correct.
Confirm no regressions were introduced.
gate: test
