---
name: requirement-to-design
description: Turn a rough product or feature request into a concrete implementation-oriented design brief. Use when Codex receives requests like adding a mini-game, page, feature, dashboard, workflow, or tool and should respond with structured feature design, screen breakdown, interaction flow, state changes, edge cases, and delivery scope before or alongside implementation.
---

# Requirement To Design

## Overview

Translate a vague request into a concrete design package that an engineer or designer can act on immediately.
Match the user's language. Keep the output specific, execution-oriented, and free of filler.

## Output Contract

When this skill is used, produce a structured answer with these sections in this order:

1. `Goal`
2. `Scope`
3. `Core Gameplay` or `Core Functionality`
4. `Screen Structure`
5. `Interaction Flow`
6. `States And Feedback`
7. `Rules And Edge Cases`
8. `Data And Technical Notes`
9. `Delivery Slices`

If the request is clearly a game, use `Core Gameplay`.
If the request is not a game, use `Core Functionality`.

If the user explicitly asks only for design or flow, stop after the design package.
If the user appears to want implementation, present the design package first, then continue into code changes unless another instruction blocks implementation.

## Operating Rules

- Infer reasonable defaults instead of blocking on minor ambiguities.
- State assumptions explicitly when they affect interaction or scope.
- Prefer concrete nouns, buttons, screens, timers, counters, and transitions over abstract language.
- Describe what the user sees, what they can do, and what happens next.
- Keep every section actionable enough that it can be converted into tickets or code without another planning pass.
- Do not produce generic UX advice.
- If the request is small, keep the response compact while still covering all sections.

## Requirement Classification

Classify the request before writing:

- `Mini-game`:
  Use gameplay loop, controls, scoring, fail conditions, restart flow, pacing, and feedback.
- `Single feature`:
  Use entry point, primary action, success path, failure path, and empty/loading/error states.
- `Page or dashboard`:
  Use layout zones, modules, filters, key actions, and drill-down paths.
- `Workflow or tool`:
  Use steps, branching, validation, recovery, and completion states.

Choose the closest class and tailor the wording. Do not dump all classes into the response.

## Section Guidance

### Goal

Write one short paragraph covering:

- what is being added
- who it is for if inferable
- what successful usage looks like

### Scope

Split scope into:

- `In scope`
- `Out of scope`

Keep the first version intentionally tight. If needed, mention later enhancements separately instead of inflating v1.

### Core Gameplay Or Core Functionality

Describe the main loop in sequence.

For games, cover:

- start condition
- controls
- objective
- scoring
- loss condition
- restart or replay

For non-game features, cover:

- trigger
- primary action
- system response
- completion condition

### Screen Structure

List the visible regions from top to bottom or left to right.
For each region, describe:

- purpose
- main elements
- priority

Example labels:

- header
- canvas
- stats bar
- primary action area
- result panel
- footer actions

### Interaction Flow

Write a stepwise flow from entry to completion.
Use short numbered steps.
Include transitions such as:

- initial load
- first interaction
- ongoing interaction
- success
- failure
- retry

### States And Feedback

Cover the exact UI feedback the user gets in important states:

- idle
- loading
- active
- paused
- success
- failure
- empty
- invalid input

Mention concrete signals such as disabled buttons, countdown text, color changes, score animation, toast text, collision flash, or modal copy.

### Rules And Edge Cases

List non-obvious behaviors that often get skipped.
Examples:

- minimum and maximum boundaries
- repeated clicks
- collision handling
- timer expiry
- mobile input behavior
- keyboard focus
- restart behavior
- persistence or reset rules

### Data And Technical Notes

Keep this implementation-oriented, not exhaustive.
Include only what helps engineering:

- local state model
- timers or intervals
- storage needs
- rendering constraints
- responsiveness notes
- accessibility considerations
- metrics or logging if obviously useful

### Delivery Slices

Break the work into 3 short phases:

1. `MVP`
2. `Polish`
3. `Optional Enhancements`

Each phase should be shippable and concrete.

## Mini-Game Pattern

When the request is for a small game such as snake, tetris-like mechanics, clicker loops, or reaction tests, bias toward this structure:

- summarize the one-sentence gameplay fantasy
- define the playfield and controls
- define the scoring loop
- define fail and restart
- define moment-to-moment feedback
- define mobile fallback controls if relevant

For snake specifically, make sure the output covers:

- grid or canvas size assumption
- snake spawn behavior
- food spawn rule
- movement cadence and speed changes
- self-collision and wall-collision behavior
- score display
- restart CTA
- keyboard controls and touch alternative if mobile matters

## Writing Standard

- Prefer short paragraphs and flat bullet lists.
- Avoid nested bullets.
- Avoid filler like "can further improve user experience."
- Use crisp labels the user could turn into tickets.
- If the user gave one example request, adapt the whole response to that example instead of staying generic.

## Reference

Use the output skeleton in [references/output-template.md](references/output-template.md) as the default response frame, then fill it with request-specific content.
