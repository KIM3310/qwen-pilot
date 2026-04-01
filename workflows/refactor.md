---
name: refactor
description: Safe refactoring with regression verification
version: "1.0.0"
loop: false
---

## Step 1: Analysis (agent: analyst)
Analyze the target code for refactoring opportunities.
Identify code smells, duplication, and structural issues.
Prioritize refactorings by impact and risk.
gate: none

## Step 2: Test Baseline (agent: test-engineer)
Ensure adequate test coverage exists for the code being refactored.
Write additional tests if coverage is insufficient.
Record the test baseline for regression comparison.
gate: test

## Step 3: Refactor (agent: refactorer)
Apply refactorings in small, incremental steps.
Run tests after each step to catch regressions early.
Keep each change focused on a single improvement.
gate: test

## Step 4: Regression Check (agent: test-engineer)
Run the complete test suite and compare with the baseline.
Verify no behavior has changed unintentionally.
Check performance has not degraded.
gate: test

## Step 5: Review (agent: reviewer)
Review the refactored code for quality and clarity.
Verify the refactoring achieved its goals.
Confirm the code is more maintainable than before.
gate: pass
