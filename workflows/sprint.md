---
name: sprint
description: Focused execution with verification gates between phases
version: "1.0.0"
loop: false
---

## Step 1: Sprint Planning (agent: planner)
Review the sprint goal and break it into deliverable tasks.
Prioritize by value and dependency order.
Define done criteria for each task.
gate: review

## Step 2: Implementation (agent: executor)
Implement tasks in priority order.
Follow project coding standards and patterns.
Keep changes atomic and well-documented.
gate: none

## Step 3: Quality Gate (agent: reviewer)
Review all implemented changes for quality.
Run static analysis and linting checks.
Verify coding standards compliance.
gate: review

## Step 4: Testing (agent: test-engineer)
Run full test suite and verify no regressions.
Add tests for new functionality.
Check coverage meets project thresholds.
gate: test

## Step 5: Sprint Review (agent: critic)
Evaluate sprint deliverables against acceptance criteria.
Assess overall quality and completeness.
Document any carry-over items for the next sprint.
gate: pass
