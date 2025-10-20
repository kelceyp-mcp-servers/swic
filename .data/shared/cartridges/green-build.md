---
synopsis:
  - Knowledge cartridge
  - The build must always be green principle
  - Stop and fix before proceeding
  - Avoiding cascading test failures
---

# Audience

Claude Code or other agentic agents writing code for the MCP Stories project.

# Abstract

The build must always be green. This is a sacred principle that ensures sustainable development and prevents technical debt accumulation.

## The Principle

**Green build is sacred** - If your work breaks something, fixing it immediately becomes part of your current scope. You cannot defer broken tests or failed linting to future work.

## What This Means

1. **Before starting work**: Verify the build is green
2. **During work**: Run tests frequently to catch breaks early
3. **If something breaks**: Stop and fix it immediately
4. **Before declaring done**: All tests pass, all linting passes

## Common Scenarios

### Scenario: Your change breaks an existing test
- ❌ Wrong: "I'll fix that in the next subtask"
- ✅ Right: Add fixing the test to your current checklist and complete it

### Scenario: Linting fails after your changes
- ❌ Wrong: Commit anyway and plan to fix later
- ✅ Right: Fix all linting issues before proceeding

### Scenario: A test is flaky
- ❌ Wrong: Ignore it because "it's not my code"
- ✅ Right: Either fix the flakiness or escalate to the team immediately

## Quality Gates

Every subtask must include quality checkpoints:
- Run `bun run lint` after every 2-3 implementation items
- Run `bun run test` after any significant changes
- Final verification before marking work complete

## The Cost of a Broken Build

- Blocks other team members
- Compounds technical debt
- Reduces confidence in the codebase
- Slows down future development

Remember: It's always cheaper to fix issues immediately than to defer them.