---
audience: claude (both whilst acting as a supervisor as well as doer or reviewer)
abstract: desired behaviours interacting with the user
---

# Claude Behavior Guidelines

## Core Principles

1. **Don't be helpful** - Don't do more than what was asked. It's not helpful. We have to undo it.
2. **Be brutal with scope** - No gold plating, no extra features, no "while I'm at it"
3. **Follow the story process** - Specs define WHAT, designs define HOW, subtasks implement
4. **RTFM** - It's always better to research how to do something than balls it up
5. **No backwards compatibility** - It just creates mess. Breaking changes are fine. We'll migrate stuff
6. **No fallbacks or defaults** - They just mask the fact we didn't provide the right thing. Fail fast.
7. **Measure twice and cut once** - Shift left. Ask questions. Do designs.
8. **Don't run ahead of the user** - Work with the user. Don't get ahead of them.

## Cartridges

Cartridges are documents that augment our base knowledge with project specific knowledge as well as knowledge the user shares across several projects. We call these 'cartridges' as they are 'loaded' in the sessions where they are needed.

They are located in:
- `.data/project/cartridges/` - project-specific cartridges
- `.data/shared/cartridges/` - cartridges shared across multiple projects

## Story Process

We work in thin vertical slices that we call stories. We try to finesse over the first few stories so that we have an exemplar to refer to for subsequent slices.

Instead of JIRA or other tracking systems, we use a .data/project/stories/ folder in the project root and a folder structure to specify state.

Stories flow: **To-Do → In-Progress → Review → Done**

Structure:
```
{id}-{name}/
├── spec/           # WHAT to build (product owner defines)
├── design/         # HOW to build (architect defines)
└── subtasks/       # Implementation work (engineer delivers)
    └── {state}/    # To-Do → In-Progress → Review → Done
```

The details for the various documents can be found in .data/shared/cartridges/story-documents/

## Workflows:

We typically do work with a supervisor agent orchestrating a number of specialised subagents in a 'do/review' loop that may require several iterations.

1. **Init story** - Interview user, create problem statement
2. **Create spec** - Write → Review → Refine cycles until approved
3. **Create design** - Write → Review → Refine cycles until approved
4. **Create subtasks** - Break work into deliverable chunks
5. **Do subtasks** - Prep → Build → Review cycles, strict TDD

Each phase uses subagents. Iterations continue until approval. Context management: stop early if running low, report incomplete.

Documents describing the workflows are in .data/shared/cartridges/workflows/

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

See: @.data/project/cartridges/swic/index.md

Note: The direct access to `.data/` folders and manual processes described in this document will be phased out as we build the SWIC system. These will be replaced with MCP tools and automated workflows.

## Operations

How to build, configure, test, and troubleshoot the SWIC MCP server. Covers building dist, MCP configuration, finding logs, and testing with `claude -p`.

See: [.data/project/cartridges/operations.md](.data/project/cartridges/operations.md)
