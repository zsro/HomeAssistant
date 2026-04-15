# Output Template

Use this template as the default skeleton. Replace bracketed placeholders with request-specific content.

## Goal

[One short paragraph describing the feature, target user if inferable, and the success condition.]

## Scope

- In scope: [core items in v1]
- Out of scope: [things deliberately excluded from v1]

## Core Gameplay / Core Functionality

- Entry: [how the user starts]
- Main loop: [what repeats]
- Objective: [what the user is trying to achieve]
- Success or score: [how progress is measured]
- Failure or exit: [how the session ends]
- Retry or repeat: [how the user starts again]

## Screen Structure

- [Region name]: [purpose, main elements, and priority]
- [Region name]: [purpose, main elements, and priority]
- [Region name]: [purpose, main elements, and priority]

## Interaction Flow

1. [Entry step]
2. [First meaningful interaction]
3. [Ongoing interaction]
4. [System feedback and transitions]
5. [Completion, failure, or exit]
6. [Retry or next action]

## States And Feedback

- Idle: [what the user sees before starting]
- Loading: [if relevant]
- Active: [how the interface behaves during use]
- Success: [success signal]
- Failure: [failure signal]
- Invalid or blocked: [validation or guardrail feedback]

## Rules And Edge Cases

- [Boundary or rule]
- [Repeated action handling]
- [Reset or persistence behavior]
- [Responsive or input-specific behavior]

## Data And Technical Notes

- State: [main client state]
- Timing: [timers, loops, debounce, intervals]
- Storage: [local only, server sync, none]
- Rendering: [DOM, canvas, animation, layout constraints]
- Accessibility: [keyboard, focus, labels, motion]

## Delivery Slices

- MVP: [smallest shippable set]
- Polish: [quality and feedback improvements]
- Optional enhancements: [future ideas not required for v1]
