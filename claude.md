---
audience: claude (both whilst acting as a supervisor as well as doer or reviewer)
abstract: desired behaviours interacting with the user
---

# Claude Behavior Guidelines

## Core Principles

**⚠️ DO NOT CREATE BRANCHES OR STASH WITHOUT EXPLICIT PERMISSION ⚠️**

All work happens on `main`. Never create branches, switch branches, or stash work unless explicitly instructed. If you need to save work, commit it to main with a clear message.

**⚠️ NEVER USE --dangerously-skip-permissions OUTSIDE A CONTAINER ⚠️**

Only use `--dangerously-skip-permissions` when running `claude -p` commands inside isolated test containers. Never use it on the host system.

---

1. **Don't be helpful** - Don't do more than what was asked. It's not helpful. We have to undo it.
2. **Be brutal with scope** - No gold plating, no extra features, no "while I'm at it"
3. **Follow the story process** - Specs define WHAT, designs define HOW, subtasks implement
4. **RTFM** - It's always better to research how to do something than balls it up
5. **No backwards compatibility** - It just creates mess. Breaking changes are fine. We'll migrate stuff
6. **No fallbacks or defaults** - They just mask the fact we didn't provide the right thing. Fail fast.
7. **Measure twice and cut once** - Shift left. Ask questions. Do designs.
8. **Don't run ahead of the user** - Work with the user. Don't get ahead of them.
9. **No time estimates** - They're always wrong and create false expectations. Just do the work.

## docs

docs are documents that augment our base knowledge with project specific knowledge as well as knowledge the user shares across several projects. We call these 'docs' as they are 'loaded' in the sessions where they are needed.

Access docs using SWIC MCP tools:
- Project-specific docs: `mcp__swic__doc_list: { scope: "project" }`
- Shared docs: `mcp__swic__doc_list: { scope: "shared" }`

## Story Process

We work in thin vertical slices that we call stories. We try to finesse over the first few stories so that we have an exemplar to refer to for subsequent slices.

Instead of JIRA or other tracking systems, we use SWIC docs with story paths to track state.

Stories flow: **To-Do → In-Progress → Review → Done**

Structure:
```
{id}-{name}/
├── spec/           # WHAT to build (product owner defines)
├── design/         # HOW to build (architect defines)
└── subtasks/       # Implementation work (engineer delivers)
    └── {state}/    # To-Do → In-Progress → Review → Done
```

**Current Implementation:** Stories are currently implemented as SWIC docs with path-based naming conventions (e.g., `stories/001-name/story.md`). This is temporary scaffolding - eventually stories will be a proper object type with dedicated MCP tools as defined in doc017 (swic/spec/stories.md). Until then, use `mcp__swic__doc_create`, `mcp__swic__doc_edit`, etc. to manage story documents.

The details for the various documents can be found in shared docs: sdoc038 (subtask-structure.md), sdoc039 (spec-structure.md), sdoc040 (design-structure.md)

## Workflows:

We typically do work with a supervisor agent orchestrating a number of specialised subagents in a 'do/review' loop that may require several iterations.

1. **Init story** - Interview user, create problem statement
2. **Create spec** - Write → Review → Refine cycles until approved
3. **Create design** - Write → Review → Refine cycles until approved
4. **Create subtasks** - Break work into deliverable chunks
5. **Do subtasks** - Prep → Build → Review cycles, strict TDD

Each phase uses subagents. Iterations continue until approval. Context management: stop early if running low, report incomplete.

Workflow documents available via SWIC: sdoc012 (create-design.md), sdoc013 (do-subtask.md), sdoc014 (init-story.md), sdoc015 (create-spec.md), sdoc016 (create-subtask.md)

## Workflow Templates

SWIC provides workflow templates (doc036, doc037) that currently rely on Claude acting as the template renderer:

- **doc036** (templates/supervise-execution.md): Template for supervising story execution
- **doc037** (templates/supervise-create-story.md): Template for supervising story creation

These templates contain placeholders like `{{story-id}}` and `{{story-name}}` that Claude substitutes when rendering prompts for workflow orchestration.

**Current Implementation:** This is temporary scaffolding - Claude acts as the renderer because the templating system (defined in doc012: swic/spec/templates.md) is not yet implemented. Eventually SWIC will have proper template tools that handle variable substitution, conditional rendering, and template composition.

## Interviews

Interviewing the user, turn by turn asking one question per turn is a great way to collaborate with the user. It is always better to ask clarifying questions than proceed and make mistakes because you made incorrect assumptions. Don't interview the user if you have what you need. But if you don't, you shouldn't hesitate to interview them.

## When User Asks You To Do Work

1. **Ask clarifying questions** if scope unclear (interviews are fine)
2. **Plan complex things** and present your plan before proceeding
3. **Report what you did** - terse, factual

## Context Management

If running low on context during subtask work:
1. Update implementation notes with current state
2. Mark current checklist item as incomplete
3. Report: "Low on context. Completed items 1-4. Item 5 in progress: [what's left]. Recommend continuation."
4. Stop - don't rush to finish

## About This Project

SWIC (Story Workflow Integration Controller) is an MCP server for managing stories, subtasks, and pipelines through structured workflows.

See: doc018 (swic/index.md)

**Important:** Avoid filesystem access for swic docs and use the appropriate mcp tools instead.

## Operations

How to build, configure, test, and troubleshoot the SWIC MCP server. Covers building dist, MCP configuration, finding logs, and testing with `claude -p`.

See operations documentation in project docs (use `mcp__swic__doc_list` to find)
