# SWIC - Story Workflow Integration Controller

[![npm version](https://img.shields.io/npm/v/@kelceyp/swic.svg)](https://www.npmjs.com/package/@kelceyp/swic)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

SWIC (Story Workflow Integration Controller) is an MCP (Model Context Protocol) server for managing stories, subtasks, and pipelines through structured workflows. It provides both a CLI and MCP tools for Claude to orchestrate development workflows.

## Features

- **Story Management**: Organize work into structured stories with specs, designs, and subtasks
- **MCP Integration**: Native integration with Claude Code via Model Context Protocol
- **CLI Tools**: Command-line interface for direct manipulation
- **Document Management**: Project and shared document storage with namespacing
- **Workflow Orchestration**: Automated workflows for story creation, design, and implementation

## Installation

### Using npm

```bash
npm install -g @kelceyp/swic
```

### Using bun

```bash
bun add -g @kelceyp/swic
```

### As a project dependency

```bash
# npm
npm install --save-dev @kelceyp/swic

# bun
bun add -D @kelceyp/swic
```

## Quick Start

### CLI Usage

```bash
# Create a doc in project scope
swic doc create project quickstart "# Quick Start\n\nGetting started with SWIC"

# List all docs
swic doc list

# Read a doc
swic doc read project quickstart

# Edit a doc
swic doc edit project quickstart --replace-once "Quick Start" "Getting Started"

# Delete a doc
swic doc delete project quickstart
```

### MCP Integration with Claude

Add to your `.mcp.json` or Claude Desktop config:

```json
{
  "mcpServers": {
    "swic": {
      "command": "swic-mcp"
    }
  }
}
```

Once configured, Claude can access SWIC tools:

```
User: Create a project doc called "architecture" with our system design

Claude: *uses swic doc_create tool*
```

## Directory Structure

SWIC creates two data directories on first use:

- **`.swic/`** - Project-specific data (created in your project root)
  - `docs/` - Project documents
  - `stories/` - Story workflows

- **`~/.swic/`** - Shared data (created in your home directory)
  - `docs/` - Shared documents across all projects
  - `templates/` - Reusable templates
  - `workflows/` - Workflow definitions

These directories are created automatically when you first use SWIC.

## Available MCP Tools

When used as an MCP server, SWIC provides these tools to Claude:

- `doc_create` - Create a new document
- `doc_read` - Read one or more documents
- `doc_edit` - Edit document content
- `doc_delete` - Delete one or more documents
- `doc_list` - List all documents
- `doc_move` - Move or rename documents

## CLI Commands

### Document Management

```bash
# Create
swic doc create <scope> <path> [content]

# Read
swic doc read <identifier>

# Edit
swic doc edit <identifier> --replace-once "old" "new"
swic doc edit <identifier> --replace-all "old" "new"
swic doc edit <identifier> --replace-all-content "new content"

# Delete
swic doc delete <identifier>

# List
swic doc list [scope]

# Move
swic doc move <source> <destination>
```

**Scopes**: `project` or `shared`

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/kelceyp/swic.git
cd swic

# Install dependencies
bun install

# Build distribution
bun run build

# Test locally
./dist/cli/cli.js doc list
```

### Running Tests

```bash
# Run E2E tests locally
bun run test:e2e:local

# Run E2E tests in Docker
bun run test:e2e
```

## Project Philosophy

SWIC follows these core principles:

1. **Don't be helpful** - Do only what's asked, no gold-plating
2. **Be brutal with scope** - No extra features, no "while I'm at it"
3. **Follow the story process** - Specs define WHAT, designs define HOW
4. **RTFM** - Research before implementing
5. **No backwards compatibility** - Breaking changes are fine
6. **No fallbacks or defaults** - Fail fast, don't mask issues
7. **Measure twice, cut once** - Shift left, ask questions, do designs
8. **Don't run ahead of the user** - Work with the user
9. **No time estimates** - They're always wrong, just do the work

See [CLAUDE.md](./CLAUDE.md) for full development guidelines.

## License

MIT

## Author

Paul Kelcey

## Repository

[https://github.com/kelceyp/swic](https://github.com/kelceyp/swic)

## Issues

Report issues at: [https://github.com/kelceyp/swic/issues](https://github.com/kelceyp/swic/issues)
