---
audience: claude code
abstract: Historical overview of the mcp-stories project and why swic was created
---

# mcp-stories Project Overview

## What was mcp-stories?

mcp-stories was an experimental system for AI-driven software development lifecycle (SDLC) management. It aimed to facilitate agentic/human workflows within software teams using a story-based approach.

**Core concept:** Enable AI agents to collaborate with humans on software development by providing:
- Structured context delivery (cartridges)
- Workflow orchestration (prompts, templates, state machines)
- Story and subtask management
- Multiple interaction modes (MCP tools, CLI, web UI)

## Project Structure

Located at: `/Users/paulkelcey/Dev/gh/kelceyp-mcp-servers/mcp-stories`

**Main subprojects:**
- `subprojects/stories-lite/` - Single-player MCP server (stdio transport)
- `subprojects/server/` - Multiplayer server (HTTP, database-backed)
- `subprojects/client/` - React SPA client for the multiplayer server

**Associated repositories:**
- `sdlc-system/` - Foundational infrastructure (templates, cartridges, agents, commands)
- `sdlc-shared/` - Cross-project reusable patterns (33 cartridges on testing, code style, etc.)
- `mcp-stories-sdlc/` - Project-specific data (52 stories, 23 cartridges, workslips)

## What Problem Did It Solve?

**Primary goals:**
1. **Context engineering** - Give agents the right context at the right time
2. **Workflow automation** - Orchestrate agents through development phases (spec → design → plan → build → review)
3. **Knowledge management** - Cartridges as modular knowledge units for AI consumption
4. **Template-driven prompts** - Parameterized prompts with Handlebars for consistency

**Key innovations:**
- Template rendering system (render_template MCP tool)
- Supervisor agent pattern (orchestrating multiple specialized agents)
- Iteration/continuation tracking (resuming work across sessions)
- State-based workflow machines (9 states in subtask supervision)

## Development Timeline

- **2025-06-01**: claude-agent (earliest experiment)
- **2025-06-06**: mcp-stories-fe (front-end experiments)
- **2025-10-06**: sdlc-system, sdlc-shared (infrastructure repos)
- **2025-10-08**: mcp-stories-sdlc (project data repo)
- **2025-10-09**: mcp-stories (main project)
- **2025-10-18**: swic (current iteration)

## Why Rebuild as swic?

**The problem:**
mcp-stories got messy because the first slice wasn't properly finessed. Without careful review and refinement of the initial implementation, complexity accumulated.

**swic's approach:**
- **Finesse the first slice** - Build a thin, exemplary vertical slice before expanding
- **Clean start with learnings** - Apply lessons from mcp-stories without cargo-culting messy implementations
- **Centralized data** - All data in `~/.swic/` instead of multiple repos
- **Composition root pattern** - Better dependency management
- **Logical path APIs** - Cleaner abstractions for cartridge access

## Evolution Phases

**Phase 1 (mcp-stories-lite):** Single-player mode
- Stdio MCP server
- 50+ tools for document/story/subtask/template management
- Direct filesystem access
- Used for solo development

**Phase 2 (server/client):** Multiplayer mode (in progress)
- HTTP-based MCP server
- REST API for web UI
- Database-backed (SQLite)
- OAuth authentication
- Multi-agent coordination

**Phase 3 (swic):** Refined implementation
- Learning from mcp-stories mistakes
- Better architecture from the start
- Focus on exemplary first slice
- Same goals, cleaner execution

## What mcp-stories Proved

**Successful patterns:**
- Cartridges as knowledge delivery mechanism
- Template rendering for prompt consistency
- Supervisor orchestration with specialized agents
- Iteration/continuation tracking for long-running work
- YAML frontmatter for parameter validation

**Areas that got messy:**
- Code organization (not properly reviewed/finessed)
- Unclear separation between historical and current approaches
- Multiple template syntaxes (${} vs {{}})
- Accumulation of technical debt

## Relationship to swic

These mcp-stories cartridges serve as **historical reference only:**
- Document what existed, where, and why
- Provide code references when exploring problem space
- Inform intent without prescribing implementation
- Help avoid forgetting prior learnings

**Not intended as:**
- Implementation guide to copy
- Best practices documentation
- Architectural blueprint for swic

swic will solve similar problems but design solutions from scratch, using mcp-stories as context for understanding the problem domain.
