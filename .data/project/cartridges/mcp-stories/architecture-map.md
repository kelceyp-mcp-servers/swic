---
audience: claude code
abstract: Architectural map of mcp-stories project structure and component relationships
---

# mcp-stories Architecture Map

## Repository Structure

### Main Project
**Location:** `/Users/paulkelcey/Dev/gh/kelceyp-mcp-servers/mcp-stories`

```
mcp-stories/
├── subprojects/
│   ├── stories-lite/     # Single-player MCP server
│   ├── server/           # Multiplayer server (HTTP + database)
│   └── client/           # React SPA frontend
├── docs/
│   ├── templates/        # Document templates (spec, research)
│   └── cartridges/       # System and project cartridges
└── .claude/
    ├── commands/         # Slash commands (symlinked to sdlc-system)
    └── agents/           # Agent definitions
```

### Data Repositories

**sdlc-system** (`/Users/paulkelcey/Dev/gh/kelceyp-mcp-servers/sdlc-system`)
- Reusable SDLC infrastructure
- 19 system cartridges (workflow, phases, definitions of done/ready)
- 30+ slash commands organized by phase
- 35+ prompt templates (legacy ${} and new {{}} syntax)
- 10 agent definitions

**sdlc-shared** (`/Users/paulkelcey/Dev/gh/kelceyp-mcp-servers/sdlc-shared`)
- Cross-project reusable patterns
- 33 cartridges (testing, code style, TypeScript conventions, MCP protocol)
- Hierarchical testing knowledge (philosophy, unit, integration, e2e, bun-specifics)

**mcp-stories-sdlc** (`/Users/paulkelcey/Dev/gh/kelceyp-mcp-servers/mcp-stories-sdlc`)
- Project-specific data for mcp-stories development
- 52 stories with full lifecycle docs (spec, plan, design, implementation-notes, retro, subtasks)
- 23 project cartridges (bun-expertise, testing-expertise, mcp-server-expertise, etc.)
- Workslips for retrospective analysis and workflow testing

## stories-lite Subproject (Single-Player)

**Location:** `subprojects/stories-lite/`

### Directory Structure
```
stories-lite/
├── src/
│   ├── server.ts                # Entry point
│   ├── McpServer.ts            # MCP protocol integration (StdioServerTransport)
│   ├── DocumentServer.ts       # Tool registration and dispatch
│   ├── HelloWorldServer.ts     # Basic connectivity test
│   ├── Configuration.ts        # Path resolution config
│   ├── tools/                  # 50+ MCP tools
│   │   ├── RenderTemplateTool.ts
│   │   ├── ToolRegistry.ts
│   │   ├── Document*.ts        # 10 document tools
│   │   ├── Story*.ts           # 11 story tools
│   │   ├── Subtask*.ts         # 15 subtask tools
│   │   └── types.ts
│   └── services/
│       ├── TemplateService.ts  # Handlebars rendering + validation
│       ├── FrontMatter.ts      # YAML parsing (gray-matter)
│       ├── DocumentStore.ts    # Path resolution and file I/O
│       ├── PathValidator.ts    # Security-first path validation
│       └── ConfigurationService.ts
├── test-unit/
└── test-integration/
```

### Architecture Pattern
```
Claude AI Agent
    ↓
MCP Server (StdioServerTransport)
    ↓
ToolRegistry (in-memory dispatch)
    ↓
Services (DocumentStore, TemplateService, etc)
    ↓
Filesystem (direct read/write via Node fs)
```

### Key Services

**TemplateService** (`services/TemplateService.ts`)
- Extracts YAML frontmatter with parameter metadata
- Validates parameters (type coercion, required checking)
- Compiles and renders Handlebars templates
- Fail-fast validation before rendering

**DocumentStore** (`services/DocumentStore.ts`)
- Resolves paths based on scope (system/shared/project)
- Loads from environment-configured paths (SDLC_SYSTEM_PATH, etc.)
- Security validation via PathValidator
- Template path format: `{configPath}/templates/{subtype}/{name}`

**PathValidator** (`services/PathValidator.ts`)
- Prevents directory traversal attacks (../)
- Blocks absolute paths (/)
- Validates hierarchical paths (forward slash support)
- Sanitizes path components

**ToolRegistry** (`tools/ToolRegistry.ts`)
- Discovers and registers 50+ tools at startup
- Dispatches tool calls to appropriate handlers
- Factory pattern: `.create()` for dependency injection

## server/client Subprojects (Multiplayer)

**Note:** Not fully explored, but architectural differences identified:

### Server Subproject
```
server/
├── src/
│   ├── server.ts               # Unified Bun server
│   ├── core/
│   │   ├── Core.ts            # Stateless service layer
│   │   ├── services/          # StoryService, UserService, etc.
│   │   ├── db/                # Database layer (Kysely + SQLite)
│   │   └── cli/               # CLI interface
│   ├── services/
│   │   ├── mcp-server/        # MCP over HTTP
│   │   │   ├── McpServer.ts
│   │   │   └── McpRoutes.ts   # JSON-RPC 2.0 endpoints
│   │   └── rest-api/          # REST endpoints for web UI
│   │       └── routes/
│   └── common/
│       └── middleware/        # Auth (OAuth + API keys)
```

### Architecture Pattern
```
Multiple Claude Agents / React SPA
    ↓
HTTP (MCP JSON-RPC / REST API)
    ↓
Server Layer (unified Bun process)
    ↓
Core Services (stateless, transaction-based)
    ↓
Database (SQLite via Kysely) + Filesystem
```

### Key Differences from stories-lite

| Aspect | stories-lite | server/client |
|--------|-------------|---------------|
| **Transport** | Stdio (in-process) | HTTP (network) |
| **Storage** | Direct filesystem | SQLite + filesystem |
| **Auth** | None | OAuth + API keys |
| **Concurrency** | Single agent | Multi-agent coordination |
| **State** | Stateless functions | Session-based (MCP), stateless Core |
| **Transactions** | N/A | Database transactions |
| **Channels** | MCP only | MCP + REST API + CLI |

## Data Flow: Template Rendering

### stories-lite Flow
```
1. Agent calls render_template MCP tool
   ↓
2. RenderTemplateTool.run(ctx, args)
   ↓
3. ctx.docStore.readTemplate(scope, subtype, name)
   - Resolves: {SDLC_SYSTEM_PATH}/templates/prompt/build/code-subtask.md
   ↓
4. ctx.templateService.render(template, params)
   - Parse YAML frontmatter
   - Validate parameters against metadata
   - Compile Handlebars template
   - Render with params
   ↓
5. Return rendered text to agent
```

### Path Resolution Example
```typescript
render_template({
  scope: "system",
  subtype: "prompt",
  name: "build/code-subtask.md",
  params: { storyId: "37", subtaskId: "094" }
})

Resolves to:
/Users/paulkelcey/Dev/gh/kelceyp-mcp-servers/sdlc-system/templates/prompt/build/code-subtask.md
```

## Configuration

### Environment Variables (stories-lite)
- `SDLC_SYSTEM_PATH` - Path to sdlc-system repository
- `SDLC_SHARED_PATH` - Path to sdlc-shared repository
- `SDLC_PROJECT_PATH` - Path to mcp-stories-sdlc repository

### stories-lite MCP Configuration
```json
{
  "mcpServers": {
    "mcp-stories-lite": {
      "command": "node",
      "args": ["./dist/server.js"],
      "env": {
        "SDLC_SYSTEM_PATH": "/path/to/sdlc-system",
        "SDLC_SHARED_PATH": "/path/to/sdlc-shared",
        "SDLC_PROJECT_PATH": "/path/to/mcp-stories-sdlc"
      }
    }
  }
}
```

## Multi-Channel Architecture (server)

```
React SPA  --> REST API ----\
CLI  --> local access ------+--> Core - stories, keys, users, auth
MCP Server --> HTTP/stdio --/
```

All channels access the same **Core API**:
- Authorization context passed explicitly (callingUserId)
- Database transactions handled by caller
- Functions: `createStory(callingUserId, story)`, `listStories(callingUserId)`, etc.

## Data Organization Comparison

### mcp-stories (distributed)
```
~/ (various locations)
├── mcp-stories/              # Code + some docs/cartridges
├── sdlc-system/              # System infrastructure
├── sdlc-shared/              # Shared patterns
└── mcp-stories-sdlc/         # Project data
```

### swic (centralized)
```
~/.swic/
├── system/                   # Equivalent to sdlc-system
├── shared/                   # Equivalent to sdlc-shared
└── projects/{project}/       # Equivalent to mcp-stories-sdlc
```

## Key Entry Points

**stories-lite Server:**
```bash
cd subprojects/stories-lite
bun src/server.ts
```

**Multiplayer Server:**
```bash
cd subprojects/server
bun run server:http  # HTTP mode (web UI + REST + MCP)
bun run server:stdio # Stdio mode (Claude integration)
```

**CLI:**
```bash
cd subprojects/server
bun run cli
```

## Tool Count by Category (stories-lite)

| Category | Count | Examples |
|----------|-------|----------|
| Document | 10 | document_read, document_list, document_edit |
| Template | 1 | render_template |
| Story | 11 | story_list, story_create, story_transition |
| Subtask | 15 | subtask_read, subtask_create, subtask_transition |
| Utility | 3 | hello_world, get_document_metadata, document_batch_operation |
| **Total** | **50+** | |

## Dependencies

**Core libraries:**
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `handlebars` - Template rendering
- `gray-matter` - YAML frontmatter parsing
- `kysely` - Type-safe SQL query builder (server only)
- `better-sqlite3` - SQLite driver (server only)
- `zod` - Schema validation (server only)

## Summary

mcp-stories implements a **layered architecture** with clear separation:
- **Transport layer**: MCP protocol (stdio or HTTP)
- **Tool layer**: 50+ tools for document/story/subtask/template management
- **Service layer**: Business logic (TemplateService, DocumentStore, PathValidator)
- **Storage layer**: Filesystem (stories-lite) or Database (server)

The system evolved from **single-player** (stories-lite: one agent, direct filesystem) to **multiplayer** (server/client: many agents, shared database, web UI).
