---
audience: claude code
abstract: Quick reference index for finding relevant code in mcp-stories project
---

# mcp-stories Code Reference Index

Quick lookup guide: "If you want to understand X, look at Y file"

## Template System

**Template rendering pipeline:**
- `subprojects/stories-lite/src/services/TemplateService.ts` - Handlebars compilation, YAML parsing, parameter validation
- `subprojects/stories-lite/src/services/FrontMatter.ts` - YAML frontmatter extraction using gray-matter
- `subprojects/stories-lite/src/tools/RenderTemplateTool.ts` - MCP tool definition and execution

**Path resolution:**
- `subprojects/stories-lite/src/services/DocumentStore.ts` - Scope-based path resolution (system/shared/project)
- `subprojects/stories-lite/src/Configuration.ts` - Environment variable loading (SDLC_SYSTEM_PATH, etc.)
- `subprojects/stories-lite/src/services/ConfigurationService.ts` - Config parsing and validation

**Security:**
- `subprojects/stories-lite/src/services/PathValidator.ts:23-45` - Directory traversal prevention
- `subprojects/stories-lite/src/services/PathValidator.ts:47-72` - Path sanitization

**Parameter validation:**
- `subprojects/stories-lite/src/services/TemplateService.ts` - Type coercion, required checking
- Look for `validateParameters()` and `extractParameterMetadata()` functions

**Template examples:**
- `sdlc-system/templates/prompt/build/code-subtask.md` - Simple template with continue flag
- `sdlc-system/templates/prompt/build/supervise-subtask.md` - Complex 9-state supervisor
- `sdlc-system/templates/prompt/plan/create-subtask.md` - Iteration/continuation tracking

**Legacy template processor:**
- `sdlc-system/.sdlc/scripts/system/prompt.ts` - Original ${} syntax processor

## MCP Server Architecture

**Entry points:**
- `subprojects/stories-lite/src/server.ts` - Single-player stdio server entry
- `subprojects/server/src/server.ts` - Multiplayer HTTP server entry

**Protocol integration:**
- `subprojects/stories-lite/src/McpServer.ts` - StdioServerTransport setup
- `subprojects/server/src/services/mcp-server/McpServer.ts` - Tool definitions and dispatch
- `subprojects/server/src/services/mcp-server/McpRoutes.ts` - HTTP/SSE routes for MCP over HTTP

**Tool registry:**
- `subprojects/stories-lite/src/tools/ToolRegistry.ts` - Tool discovery and dispatch
- `subprojects/stories-lite/src/DocumentServer.ts` - Tool registration at startup

## Document/Story/Subtask Tools

**Document operations:**
- `subprojects/stories-lite/src/tools/DocumentReadTool.ts` - Single document read
- `subprojects/stories-lite/src/tools/DocumentListTool.ts` - List documents in scope
- `subprojects/stories-lite/src/tools/DocumentEditTool.ts` - Edit document content

**Story operations:**
- `subprojects/stories-lite/src/tools/StoryListTool.ts` - List all stories
- `subprojects/stories-lite/src/tools/StoryTransitionTool.ts` - State transitions

**Subtask operations:**
- `subprojects/stories-lite/src/tools/SubtaskReadTool.ts` - Read subtask
- `subprojects/stories-lite/src/tools/SubtaskCreateTool.ts` - Create subtask

## Database Layer (Multiplayer)

**Database setup:**
- `subprojects/server/src/core/db/Database.ts` - Kysely + SQLite initialization
- `subprojects/server/src/core/db/SchemaDefinition.ts` - Table schemas
- `subprojects/server/src/core/db/tables/stories.ts` - Story table definition
- `subprojects/server/src/core/db/tables/api_keys.ts` - API key table

**Migrations:**
- `subprojects/server/src/core/db/migrations/` - Schema version control

## Core Business Logic (Multiplayer)

**Stateless service pattern:**
- `subprojects/server/src/core/Core.ts` - Core API with callingUserId pattern
- `subprojects/server/src/core/services/StoryService.ts` - Story CRUD operations
- `subprojects/server/src/core/services/UserService.ts` - User management
- `subprojects/server/src/core/services/TransactionService.ts` - Database transactions

**Authorization:**
- `subprojects/server/src/common/middleware/auth.ts` - OAuth + API key auth
- Look for `callingUserId` parameter pattern throughout Core layer

## Authentication

**OAuth implementation:**
- `subprojects/server/src/common/middleware/auth.ts` - OAuth Dynamic Client Registration (RFC 7591)
- Look for OAuth client registration and token validation

**API key management:**
- `subprojects/server/src/core/services/ApiKeyService.ts` - Generate, validate, revoke
- `subprojects/server/src/core/db/tables/api_keys.ts` - Storage schema

## REST API (Multiplayer)

**Routes:**
- `subprojects/server/src/services/rest-api/routes/Stories.ts` - Story endpoints
- `subprojects/server/src/services/rest-api/routes/Users.ts` - User endpoints
- `subprojects/server/src/services/rest-api/routes/ApiKeys.ts` - API key endpoints

## Slash Commands

**Command definitions:**
- `.claude/commands/spec/do.md` - Spec phase workflow
- `.claude/commands/design/do.md` - Design phase workflow
- `.claude/commands/plan/do.md` - Plan phase workflow
- `.claude/commands/subtask/do.md` - Subtask execution workflow

**Note:** Most commands are symlinked from `sdlc-system/.claude/commands/`

**Key patterns:**
- Look for `$ARGUMENTS` placeholder for parameter substitution
- Look for questionnaire patterns (context gathering)
- Look for cartridge references (@.sdlc/cartridges/...)

## Cartridges

**System cartridges** (sdlc-system repository):
- `sdlc-system/cartridges/workflow-system.md` - Workflow state machines
- `sdlc-system/cartridges/prompt-system.md` - Prompt validation patterns
- `sdlc-system/cartridges/spec-phase.md` - Specification process
- `sdlc-system/cartridges/definition-of-done-story.md` - Quality gates

**Shared cartridges** (sdlc-shared repository):
- `sdlc-shared/cartridges/coding/ts-coding-style.md` - TypeScript coding standards (formatting, naming, module patterns)
- `sdlc-shared/cartridges/testing/` - Hierarchical testing knowledge
- `sdlc-shared/cartridges/strategy-pattern.md` - Design pattern reference
- `sdlc-shared/cartridges/mcp-protocol.md` - JSON-RPC 2.0 compliance

**Project cartridges** (mcp-stories-sdlc repository):
- `mcp-stories-sdlc/cartridges/bun-expertise.md` - Bun-specific patterns and workarounds
- `mcp-stories-sdlc/cartridges/testing-expertise.md` - Test execution patterns
- `mcp-stories-sdlc/cartridges/mcp-server-expertise.md` - MCP server domain knowledge

## Stories and Subtasks

**Story structure:**
- `mcp-stories-sdlc/stories/🟢-story-001-rest-api-for-stories/` - Example completed story
- Look for: `spec.md`, `plan.md`, `design.md`, `implementation-notes.md`, `retro.md`, `subtasks/`

**Subtask structure:**
- `mcp-stories-sdlc/stories/{story}/subtasks/subtask-{id}.md` - Subtask definition
- Look for checklist structure with prerequisites and implementation phases

## Testing

**Unit tests:**
- `subprojects/stories-lite/test-unit/` - TemplateService, PathValidator, etc.
- Look for test organization patterns

**Integration tests:**
- `subprojects/stories-lite/test-integration/RenderTemplateIntegration.test.ts` - Template rendering
- Look for test setup (temporary repos, git initialization)

**E2E tests:**
- `subprojects/server/test-e2e/` - Full server testing
- Look for authentication flows, multi-agent scenarios

## Configuration

**stories-lite config:**
- Environment variables: `SDLC_SYSTEM_PATH`, `SDLC_SHARED_PATH`, `SDLC_PROJECT_PATH`
- Look at `.mcp.json` examples for MCP server configuration

**Multiplayer config:**
- `subprojects/server/src/config.json` - Server configuration
- Database path, port, auth settings

## Workslips

**Retrospective workslips:**
- `mcp-stories-sdlc/workslips/system/retro-large-story-slips/` - Retrospective analysis work
- Look for queue-based task management patterns

**Workflow testing:**
- `mcp-stories-sdlc/workslips/system/test-workflow-slips/` - Workflow testing experiments
- Look for task prompts and logs

## Key Implementation Patterns

**Factory pattern:**
Look for `.create()` methods throughout:
- `DocumentServer.create()`
- `TemplateService.create()`
- `ToolRegistry.create()`

**Stateless service pattern:**
Look for `callingUserId` as first parameter:
- `Core.createStory(callingUserId, story)`
- `StoryService.listStories(callingUserId)`

**Transaction pattern:**
Look for `db.transaction(async (tx) => { ... })`:
- `UserService.deleteUser()` - Cascading deletes
- Any multi-table operation

**Strategy pattern:**
Look for transport strategies:
- `subprojects/server/src/server.ts` - TransportStrategy interface
- Stdio vs HTTP implementations

## Common Questions → Code References

**Q: How does template rendering work?**
A: `subprojects/stories-lite/src/services/TemplateService.ts` - Full pipeline

**Q: How are paths validated for security?**
A: `subprojects/stories-lite/src/services/PathValidator.ts` - All validation logic

**Q: How do tools get registered?**
A: `subprojects/stories-lite/src/DocumentServer.ts` - Startup registration

**Q: How does MCP over HTTP work?**
A: `subprojects/server/src/services/mcp-server/McpRoutes.ts` - SSE and session management

**Q: How is authentication handled?**
A: `subprojects/server/src/common/middleware/auth.ts` - OAuth + API keys

**Q: What's the database schema?**
A: `subprojects/server/src/core/db/SchemaDefinition.ts` - All tables

**Q: How do story transitions work?**
A: `subprojects/stories-lite/src/tools/StoryTransitionTool.ts` - Emoji-based states

**Q: How are parameters validated in templates?**
A: `subprojects/stories-lite/src/services/TemplateService.ts` - Look for `validateParameters()`

**Q: How does the supervisor orchestrate agents?**
A: `sdlc-system/templates/prompt/build/supervise-subtask.md` - 9-state machine example

**Q: How are YAML frontmatter parsed?**
A: `subprojects/stories-lite/src/services/FrontMatter.ts` - gray-matter wrapper

**Q: How does hierarchical path support work?**
A: `subprojects/stories-lite/src/services/PathValidator.ts` - Forward slash handling

**Q: How are batch operations implemented?**
A: `subprojects/stories-lite/src/tools/DocumentBatchOperationTool.ts` - Atomic multi-doc updates

## Directory Quick Reference

| Path | Purpose |
|------|---------|
| `subprojects/stories-lite/src/` | Single-player implementation |
| `subprojects/server/src/` | Multiplayer server |
| `subprojects/client/src/` | React SPA frontend |
| `sdlc-system/` | Reusable infrastructure |
| `sdlc-shared/` | Cross-project patterns |
| `mcp-stories-sdlc/` | Project-specific data |
| `docs/templates/` | Document templates |
| `docs/cartridges/` | System/project cartridges |
| `.claude/commands/` | Slash command definitions |

## Finding Specific Functionality

**Template system:** Start with `TemplateService.ts` and `RenderTemplateTool.ts`

**Security:** Start with `PathValidator.ts`

**MCP protocol:** Start with `McpServer.ts` and `ToolRegistry.ts`

**Database:** Start with `Database.ts` and `SchemaDefinition.ts`

**Authentication:** Start with `auth.ts` middleware

**Stories/Subtasks:** Start with `Story*Tool.ts` and `Subtask*Tool.ts` files

**Configuration:** Start with `Configuration.ts` and `ConfigurationService.ts`

**Slash commands:** Start with `.claude/commands/` directory

**Cartridges:** Start with `sdlc-system/cartridges/` for infrastructure, `mcp-stories-sdlc/cartridges/` for project-specific

## File Count Reference

- **50+ MCP tools** in `subprojects/stories-lite/src/tools/`
- **27 prompt templates** in `sdlc-system/templates/prompt/`
- **19 system cartridges** in `sdlc-system/cartridges/`
- **33 shared cartridges** in `sdlc-shared/cartridges/`
- **23 project cartridges** in `mcp-stories-sdlc/cartridges/`
- **52 stories** in `mcp-stories-sdlc/stories/`
- **30+ slash commands** in `sdlc-system/.claude/commands/`
