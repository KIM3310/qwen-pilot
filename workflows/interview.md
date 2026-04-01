---
name: interview
description: Socratic requirements clarification through structured questioning
version: "1.0.0"
loop: true
maxIterations: 5
---

## Step 1: Understand Context (agent: mentor)
Ask clarifying questions about the objective and its context.
Identify who the stakeholders are and what problem is being solved.
Establish the scope and boundaries of the work.
gate: none

## Step 2: Explore Requirements (agent: analyst)
Dig deeper into functional requirements.
Ask about edge cases, error handling expectations, and constraints.
Identify implicit requirements that were not stated.
gate: none

## Step 3: Challenge Assumptions (agent: critic)
Question assumptions embedded in the requirements.
Identify potential contradictions or ambiguities.
Ask about priorities and trade-offs.
gate: none

## Step 4: Synthesize (agent: planner)
Summarize the requirements as understood.
Present them in a structured format for confirmation.
Highlight any remaining open questions.
gate: review
