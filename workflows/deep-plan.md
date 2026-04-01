---
name: deep-plan
description: Multi-phase strategic planning with architecture review
version: "1.0.0"
loop: false
---

## Step 1: Requirements Analysis (agent: analyst)
Gather and analyze all requirements for the objective.
Identify constraints, dependencies, and success criteria.
Produce a requirements summary document.
gate: review

## Step 2: Architecture Design (agent: architect)
Design the high-level architecture to fulfill requirements.
Define module boundaries, interfaces, and data flow.
Document key architectural decisions with rationale.
gate: review

## Step 3: Risk Assessment (agent: critic)
Evaluate the proposed architecture for weaknesses and risks.
Identify potential failure modes and scalability concerns.
Suggest mitigations for identified risks.
gate: review

## Step 4: Task Decomposition (agent: planner)
Break the architecture into implementable tasks.
Order tasks by dependency and priority.
Estimate complexity and assign to appropriate agent roles.
gate: review

## Step 5: Plan Validation (agent: architect)
Review the complete plan for coherence and completeness.
Verify all requirements are addressed.
Produce the final approved implementation plan.
gate: pass
