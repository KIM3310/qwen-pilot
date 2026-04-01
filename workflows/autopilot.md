---
name: autopilot
description: Autonomous idea-to-verified-code loop
version: "1.0.0"
loop: true
maxIterations: 5
---

## Step 1: Plan (agent: planner)
Analyze the given objective and produce a detailed implementation plan.
Break the work into atomic, ordered tasks with clear acceptance criteria.
gate: review

## Step 2: Implement (agent: executor)
Execute each task from the plan sequentially.
Write clean, well-structured code following project conventions.
Create or modify files as needed to fulfill the plan.
gate: none

## Step 3: Test (agent: test-engineer)
Run the existing test suite and verify all tests pass.
Write new tests for any uncovered functionality.
Ensure edge cases and error conditions are handled.
gate: test

## Step 4: Review (agent: reviewer)
Review all changes made during implementation.
Check for correctness, code quality, and adherence to project standards.
Identify any issues that need to be addressed before completion.
gate: review

## Step 5: Fix (agent: executor)
Address any issues found during review and testing.
Make targeted fixes without introducing new problems.
Re-run tests to confirm fixes are correct.
gate: test
