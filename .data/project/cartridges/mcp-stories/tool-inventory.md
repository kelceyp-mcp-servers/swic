---
audience: claude code
abstract: Complete inventory of MCP tools provided by mcp-stories-lite
---

# mcp-stories Tool Inventory

## Overview

mcp-stories-lite exposes **50+ MCP tools** organized into five categories:
1. Document Tools (10)
2. Template Tool (1)
3. Story Tools (11)
4. Subtask Tools (15)
5. Utility Tools (3+)

**Location:** `subprojects/stories-lite/src/tools/`

## Document Tools (10)

Generic document operations for reading/writing markdown files.

### document_read
**Purpose:** Read a single document
**File:** `DocumentReadTool.ts`
**Parameters:**
- `scope` (string): system | shared | project
- `name` (string): Document filename with hierarchical path support

### document_list
**Purpose:** List all documents in a scope
**File:** `DocumentListTool.ts`
**Parameters:**
- `scope` (string): system | shared | project
- `recursive` (boolean, optional): Include subdirectories

### document_multiread
**Purpose:** Read multiple documents in one call
**File:** `DocumentMultiReadTool.ts`
**Parameters:**
- `documents` (array): Array of {scope, name} objects

### document_edit
**Purpose:** Edit existing document
**File:** `DocumentEditTool.ts`
**Parameters:**
- `scope` (string): system | shared | project
- `name` (string): Document filename
- `content` (string): New content

### document_multiedit
**Purpose:** Edit multiple documents atomically
**File:** `DocumentMultiEditTool.ts`
**Parameters:**
- `edits` (array): Array of {scope, name, content} objects

### document_create
**Purpose:** Create new document
**File:** `DocumentCreateTool.ts`
**Parameters:**
- `scope` (string): system | shared | project
- `name` (string): Document filename
- `content` (string): Initial content

### document_delete
**Purpose:** Delete document
**File:** `DocumentDeleteTool.ts`
**Parameters:**
- `scope` (string): system | shared | project
- `name` (string): Document filename

### document_search
**Purpose:** Search document content
**File:** `DocumentSearchTool.ts`
**Parameters:**
- `scope` (string): system | shared | project
- `query` (string): Search query
- `caseSensitive` (boolean, optional)

### document_move
**Purpose:** Move/rename document
**File:** `DocumentMoveTool.ts`
**Parameters:**
- `scope` (string): system | shared | project
- `oldName` (string): Current filename
- `newName` (string): New filename

### document_metadata_edit
**Purpose:** Edit document YAML frontmatter metadata
**File:** `DocumentMetadataEditTool.ts`
**Parameters:**
- `scope` (string): system | shared | project
- `name` (string): Document filename
- `metadata` (object): New metadata to merge

## Template Tool (1)

Renders parameterized templates with Handlebars.

### render_template
**Purpose:** Render prompt templates with parameter validation
**File:** `RenderTemplateTool.ts`
**Parameters:**
- `scope` (string): system | shared | project
- `subtype` (string): prompt | spec | subtask
- `name` (string): Template filename with hierarchical path
- `params` (object, optional): Parameters for rendering

**Example:**
```typescript
render_template({
  scope: "system",
  subtype: "prompt",
  name: "build/code-subtask.md",
  params: {
    storyId: "37",
    subtaskId: "094",
    continue: true
  }
})
```

**Key features:**
- YAML frontmatter parameter validation
- Type coercion (string → number, boolean)
- Required parameter checking
- Handlebars compilation and rendering
- Fail-fast error messages

## Story Tools (11)

Manage stories (high-level work items).

### story_list
**Purpose:** List all stories
**File:** `StoryListTool.ts`
**Parameters:** None
**Returns:** Array of stories with metadata

### story_read
**Purpose:** Read a single story
**File:** `StoryReadTool.ts`
**Parameters:**
- `id` (string): Story identifier

### story_multiread
**Purpose:** Read multiple stories
**File:** `StoryMultiReadTool.ts`
**Parameters:**
- `ids` (array): Array of story IDs

### story_create
**Purpose:** Create new story
**File:** `StoryCreateTool.ts`
**Parameters:**
- `id` (string): Story identifier
- `summary` (string): Brief description
- `status` (string, optional): Initial status

### story_edit
**Purpose:** Edit story
**File:** `StoryEditTool.ts`
**Parameters:**
- `id` (string): Story identifier
- `content` (string): New story content

### story_delete
**Purpose:** Delete story
**File:** `StoryDeleteTool.ts`
**Parameters:**
- `id` (string): Story identifier

### story_transition
**Purpose:** Move story to different state
**File:** `StoryTransitionTool.ts`
**Parameters:**
- `id` (string): Story identifier
- `newState` (string): Target state (emoji-based or name)

**States:** ⏹️ (paused) → 🔬 (research) → 📐 (design) → 📝 (spec) → 🔄 (plan) → 🟡 (build) → 🟢 (done)

### story_metadata_edit
**Purpose:** Edit story YAML frontmatter
**File:** `StoryMetadataEditTool.ts`
**Parameters:**
- `id` (string): Story identifier
- `metadata` (object): New metadata to merge

### story_document_create
**Purpose:** Create document within story directory
**File:** `StoryDocumentCreateTool.ts`
**Parameters:**
- `id` (string): Story identifier
- `docName` (string): Document filename
- `content` (string): Document content

### story_document_edit
**Purpose:** Edit document within story
**File:** `StoryDocumentEditTool.ts`
**Parameters:**
- `id` (string): Story identifier
- `docName` (string): Document filename
- `content` (string): New content

### story_document_list
**Purpose:** List all documents in story directory
**File:** `StoryDocumentListTool.ts`
**Parameters:**
- `id` (string): Story identifier

## Subtask Tools (15)

Manage subtasks (breakdown of story work).

### subtask_list
**Purpose:** List all subtasks for a story
**File:** `SubtaskListTool.ts`
**Parameters:**
- `parent` (string): Parent story ID

### subtask_read
**Purpose:** Read a single subtask
**File:** `SubtaskReadTool.ts`
**Parameters:**
- `parent` (string): Parent story ID
- `subtaskId` (string): Subtask identifier

### subtask_multiread
**Purpose:** Read multiple subtasks
**File:** `SubtaskMultiReadTool.ts`
**Parameters:**
- `subtasks` (array): Array of {parent, subtaskId} objects

### subtask_create
**Purpose:** Create new subtask
**File:** `SubtaskCreateTool.ts`
**Parameters:**
- `parent` (string): Parent story ID
- `subtaskId` (string): Subtask identifier
- `description` (string): Brief description
- `content` (string): Subtask content

### subtask_edit
**Purpose:** Edit subtask content
**File:** `SubtaskEditTool.ts`
**Parameters:**
- `parent` (string): Parent story ID
- `subtaskId` (string): Subtask identifier
- `content` (string): New content

### subtask_delete
**Purpose:** Delete subtask
**File:** `SubtaskDeleteTool.ts`
**Parameters:**
- `parent` (string): Parent story ID
- `subtaskId` (string): Subtask identifier

### subtask_transition
**Purpose:** Move subtask to different state
**File:** `SubtaskTransitionTool.ts`
**Parameters:**
- `parent` (string): Parent story ID
- `subtaskId` (string): Subtask identifier
- `newState` (string): Target state

**Common states:** pending → in_progress → review → blocked → completed

### subtask_metadata_edit
**Purpose:** Edit subtask YAML frontmatter
**File:** `SubtaskMetadataEditTool.ts`
**Parameters:**
- `parent` (string): Parent story ID
- `subtaskId` (string): Subtask identifier
- `metadata` (object): New metadata to merge

### subtask_document_create
**Purpose:** Create document within subtask directory
**File:** `SubtaskDocumentCreateTool.ts`
**Parameters:**
- `parent` (string): Parent story ID
- `subtaskId` (string): Subtask identifier
- `docName` (string): Document filename
- `content` (string): Document content

### subtask_document_edit
**Purpose:** Edit document within subtask
**File:** `SubtaskDocumentEditTool.ts`
**Parameters:**
- `parent` (string): Parent story ID
- `subtaskId` (string): Subtask identifier
- `docName` (string): Document filename
- `content` (string): New content

### subtask_document_list
**Purpose:** List all documents in subtask directory
**File:** `SubtaskDocumentListTool.ts`
**Parameters:**
- `parent` (string): Parent story ID
- `subtaskId` (string): Subtask identifier

### subtask_document_delete
**Purpose:** Delete document from subtask
**File:** `SubtaskDocumentDeleteTool.ts`
**Parameters:**
- `parent` (string): Parent story ID
- `subtaskId` (string): Subtask identifier
- `docName` (string): Document filename

### subtask_document_read
**Purpose:** Read document from subtask
**File:** `SubtaskDocumentReadTool.ts`
**Parameters:**
- `parent` (string): Parent story ID
- `subtaskId` (string): Subtask identifier
- `docName` (string): Document filename

### subtask_document_multiread
**Purpose:** Read multiple documents from subtask
**File:** `SubtaskDocumentMultiReadTool.ts`
**Parameters:**
- `parent` (string): Parent story ID
- `subtaskId` (string): Subtask identifier
- `docNames` (array): Array of document filenames

### subtask_document_multiedit
**Purpose:** Edit multiple documents in subtask
**File:** `SubtaskDocumentMultiEditTool.ts`
**Parameters:**
- `parent` (string): Parent story ID
- `subtaskId` (string): Subtask identifier
- `edits` (array): Array of {docName, content} objects

## Utility Tools (3+)

General-purpose utilities.

### hello_world
**Purpose:** Connectivity test and server verification
**File:** `HelloWorldTool.ts`
**Parameters:** None
**Returns:** Simple greeting message

**Use case:** Verify MCP server is running and responding

### get_document_metadata
**Purpose:** Extract YAML frontmatter from document
**File:** `GetDocumentMetadataTool.ts`
**Parameters:**
- `scope` (string): system | shared | project
- `name` (string): Document filename

**Returns:** Parsed metadata object

### document_batch_operation
**Purpose:** Perform batch operations on multiple documents
**File:** `DocumentBatchOperationTool.ts`
**Parameters:**
- `operations` (array): Array of operation objects
- `atomic` (boolean, optional): Rollback on any failure

**Use case:** Atomic multi-document updates

## Tool Registry Pattern

**File:** `tools/ToolRegistry.ts`

All tools registered at startup in DocumentServer:

```typescript
const create = (options: DocumentServerOptions) => {
    const { toolRegistry } = options;

    // Document tools
    toolRegistry.register(DocumentListTool);
    toolRegistry.register(DocumentReadTool);
    // ... 8 more

    // Template tool
    toolRegistry.register(RenderTemplateTool);

    // Story tools
    toolRegistry.register(StoryListTool);
    // ... 10 more

    // Subtask tools
    toolRegistry.register(SubtaskListTool);
    // ... 14 more

    // Utility tools
    toolRegistry.register(HelloWorldTool);
    // ... 2 more
};
```

## Tool Discovery

All tools implement `ToolDefinition` interface:

```typescript
interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: {
        type: 'object';
        properties: { [key: string]: any };
        required?: string[];
        additionalProperties?: boolean;
    };
}

interface Tool {
    definition: ToolDefinition;
    run: (ctx: ToolContext, args: any) => Promise<ToolCallResult>;
}
```

Tools are discovered via `listTools()` MCP protocol method.

## Common Patterns

### Hierarchical Paths
Many tools support hierarchical paths with forward slashes:
- `database/kysely-patterns.md`
- `workflow/subtask-template.md`
- `build/code-subtask.md`

### Scope-based Organization
Three scopes across document/story/subtask tools:
- `system` - sdlc-system repository
- `shared` - sdlc-shared repository
- `project` - mcp-stories-sdlc repository

### Multi-operations
Several tools support batch operations:
- `document_multiread`
- `document_multiedit`
- `story_multiread`
- `subtask_multiread`
- `subtask_document_multiread`
- `subtask_document_multiedit`

### Metadata Support
Tools can read/edit YAML frontmatter:
- `document_metadata_edit`
- `story_metadata_edit`
- `subtask_metadata_edit`
- `get_document_metadata`

## Tool Categories by Purpose

| Purpose | Count | Tools |
|---------|-------|-------|
| CRUD operations | 30+ | document/story/subtask create/read/edit/delete |
| State transitions | 2 | story_transition, subtask_transition |
| Batch operations | 6 | multiread, multiedit, batch_operation |
| Metadata management | 4 | metadata_edit tools, get_document_metadata |
| Template rendering | 1 | render_template |
| Search/discovery | 2 | document_search, document/story/subtask list |
| Utility | 3 | hello_world, batch_operation, get_document_metadata |

## What This Toolset Enabled

1. **Complete document lifecycle** - Create, read, update, delete, search, move
2. **Hierarchical organization** - Stories contain subtasks, both contain documents
3. **State management** - Transition stories and subtasks through workflow states
4. **Batch efficiency** - Multi-read/edit reduces round trips
5. **Metadata flexibility** - YAML frontmatter for structured data
6. **Template orchestration** - render_template enables supervisor patterns
7. **Atomic operations** - Batch tools with rollback support

## Evolution to Multiplayer

The server/client subprojects added tools for:
- User management (create_user, list_users, read_user, update_user, delete_user)
- API key management (generate_api_key, list_api_keys, revoke_api_key, validate_api_key)
- Authentication setup (get_setup_instructions)
- Database-backed storage (replacing filesystem)
- Session management (MCP over HTTP with session IDs)

**Total tools in server:** 50+ (stories-lite) + 9 (auth/user management) = 59+ tools
