---
name: investigate
description: Evidence-driven debugging and root cause analysis
version: "1.0.0"
loop: true
maxIterations: 3
---

## Step 1: Reproduce (agent: debugger)
Attempt to reproduce the reported issue.
Gather all available evidence: error messages, logs, stack traces.
Document exact reproduction steps.
gate: none

## Step 2: Hypothesize (agent: scientist)
Based on the evidence, form testable hypotheses about the root cause.
Rank hypotheses by likelihood.
Design specific tests to confirm or refute each hypothesis.
gate: none

## Step 3: Investigate (agent: debugger)
Test each hypothesis systematically.
Trace code execution paths related to the issue.
Narrow down to the root cause with evidence.
gate: none

## Step 4: Fix (agent: executor)
Implement a targeted fix for the confirmed root cause.
Ensure the fix is minimal and does not introduce side effects.
Add a regression test that would have caught this bug.
gate: test

## Step 5: Verify (agent: test-engineer)
Confirm the original issue is resolved.
Run the full test suite to check for regressions.
Verify the new regression test catches the original bug.
gate: test
