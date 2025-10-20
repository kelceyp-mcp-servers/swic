# Slash Commands

## Quick Reference

Slash commands are Markdown files that define reusable prompts. They support arguments, tool restrictions, and can be scoped to projects or users.

## File Locations

- **Project**: `.claude/commands/*.md` (team-wide, commit to git)
- **Personal**: `~/.claude/commands/*.md` (user-specific)

## Basic Structure

### Simple Command

File: `.claude/commands/optimize.md`
```markdown
Analyze this code for performance issues and suggest optimizations.
```
Usage: `/optimize`

### Command with Frontmatter

File: `.claude/commands/commit.md`
```markdown
---
description: Create a git commit
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*)
argument-hint: [message]
model: claude-3-5-haiku-20241022
---

Create a git commit with message: $ARGUMENTS
```
Usage: `/commit fix the bug`

## Frontmatter Fields

- `description`: Shown in `/help` output
- `allowed-tools`: Restrict which tools can be used (e.g., `Bash(git add:*)`, `Read`, `Edit`)
- `argument-hint`: Show expected args (e.g., `[file-path]`, `[story-id]`)
- `model`: Force specific model (e.g., `claude-3-5-haiku-20241022`, `claude-3-5-sonnet-20241022`)

## Arguments

- `$ARGUMENTS`: All arguments passed to command
- `$1`, `$2`, `$3`: Positional arguments

Example:
```markdown
---
argument-hint: [pr-number] [priority]
---

Review PR #$1 with priority: $2
Remaining context: $ARGUMENTS
```
Usage: `/review-pr 123 high with security focus` → $1=123, $2=high, $ARGUMENTS="123 high with security focus"

## Namespacing

Organize commands in subdirectories:
- File: `.claude/commands/git/commit.md` → Command: `/project:git:commit`
- File: `.claude/commands/workflow/init.md` → Command: `/project:workflow:init`

## Common Patterns

### Load and Execute Workflow
```markdown
---
description: Initialize a new story
---

Load the init-story workflow and execute it.

Use `mcp__claw-dev__cartridge_read {scope: "project", name: "workflows/init-story.md"}` and follow the instructions.
```

### Constrained Tool Use
```markdown
---
description: Run tests only
allowed-tools: Bash(npm test:*), Bash(bun test:*)
---

Run the test suite and report results. Do not make any code changes.
```

### Read-Only Analysis
```markdown
---
description: Security audit
allowed-tools: Read, Grep, Glob
---

Perform a security audit of the codebase. Identify potential vulnerabilities but do not make any changes.
```

## Best Practices

1. **Commit project commands** to version control for team sharing
2. **Use descriptive names** that match the command action
3. **Constrain with allowed-tools** to prevent unintended actions
4. **Keep prompts focused** on single responsibilities
5. **Use arguments** for dynamic content instead of multiple similar commands
6. **Document expected behavior** in the prompt itself

## Integration with Workflows

Commands can load and execute project workflows:

```markdown
---
description: Run the create-spec workflow for a story
argument-hint: [story-id]
---

Execute the create-spec workflow for story $1.

Read the workflow cartridge:
`mcp__claw-dev__cartridge_read {scope: "project", name: "workflows/create-spec.md"}`

Then execute it with storyId=$1.
```

## Debugging

- Run `/help` to see all available commands
- Check file exists: `ls .claude/commands/your-command.md`
- Verify markdown syntax (frontmatter must be valid YAML)
- Test with simple prompts first, add complexity incrementally
