---
name: team-sync
description: Multi-agent parallel coordination with convergence
version: "1.0.0"
loop: false
---

## Step 1: Distribute (agent: planner)
Analyze the objective and decompose into parallelizable subtasks.
Assign each subtask to the most appropriate agent role.
Define interfaces between parallel work streams.
gate: review

## Step 2: Execute in Parallel (agent: executor)
Each assigned agent works on their subtask independently.
Follow the interface contracts defined in the distribution phase.
Report progress and any blockers encountered.
gate: none

## Step 3: Integrate (agent: architect)
Merge outputs from all parallel work streams.
Resolve any interface conflicts or inconsistencies.
Ensure the integrated result is coherent.
gate: review

## Step 4: Verify (agent: test-engineer)
Test the integrated result as a complete unit.
Verify all interfaces work correctly between modules.
Run regression tests to catch integration issues.
gate: test

## Step 5: Retrospective (agent: analyst)
Evaluate the team coordination process.
Identify what worked well and what could improve.
Document lessons learned for future team-sync runs.
gate: pass
