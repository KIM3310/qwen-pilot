---
name: tdd
description: Test-driven development cycle — red, green, refactor
version: "1.0.0"
loop: true
maxIterations: 10
---

## Step 1: Red — Write Failing Test (agent: test-engineer)
Write a test that describes the desired behavior.
The test must fail because the feature does not exist yet.
Keep the test focused on one specific behavior.
gate: test

## Step 2: Green — Make It Pass (agent: executor)
Write the minimum code required to make the failing test pass.
Do not optimize or refactor yet.
Focus solely on correctness.
gate: test

## Step 3: Refactor (agent: refactorer)
Improve the code structure while keeping all tests green.
Remove duplication, improve naming, simplify logic.
Run tests after each refactoring step to ensure nothing breaks.
gate: test
