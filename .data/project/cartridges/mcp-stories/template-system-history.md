---
audience: claude code
abstract: Historical documentation of mcp-stories template rendering system
---

# mcp-stories Template System History

## Problem Being Solved

### Context Engineering Challenge
**Core insight:** Prompt engineering evolved into context engineering, where prompts are a subset of the overarching context.

AI agents need:
1. **Consistent prompts** across sessions and agents
2. **Parameterized workflows** (same logic, different story/subtask IDs)
3. **Resumption capability** (continue from where they left off)
4. **Orchestration** (supervisor agent tasking specialized agents with specific prompts)

### Why Slash Commands Weren't Enough

**Slash commands** (`.claude/commands/`) were limited:
- User-invoked only (not callable by supervisor agents)
- No programmatic access
- Consumed context to process (loaded into every invocation)
- Fragile (relied on Claude's parsing)
- No validation or type safety

**Template MCP tool** enabled:
- Agent-to-agent orchestration (supervisor renders prompt → tasks coder agent)
- Programmatic prompt generation
- Parameter validation with clear error messages
- Reusable across multiple agent invocations
- State management (iteration/continuation tracking)

## Template Evolution

### Phase 1: Simple Document Templates

**Location:** `docs/templates/`

Simple markdown with placeholder replacement:
```markdown
# Story Specification

Description: [DESCRIPTION]

In Scope:
[IN_SCOPE]

Out of Scope:
[OUT_OF_SCOPE]

Acceptance Criteria:
[ACCEPTANCE_CRITERIA]
```

**Usage:** Manual fill-in or simple string replacement

**Files:**
- `spec-template.md` - Story specification
- `research-document.md` - Research documentation

### Phase 2: Legacy Prompt Templates (${} syntax)

**Location:** `sdlc-system/templates/prompt/` (root level, 13 files)

**Syntax:** Bash-style `${variable}` substitution

**Processor:** `sdlc-system/.sdlc/scripts/system/prompt.ts`

**Example:**
```markdown
---
synopsis:
  - Template for starting subtask implementation
---

This session we are going to implement subtask ${subtaskId} from story ${storyId}...
```

**CLI usage:**
```bash
bun prompt.ts get \
  --template="start-coding-subtask.md" \
  --storyId=37 \
  --subtaskId=94
```

**Parameter sources (precedence):**
1. `--params` JSON
2. `--params-file`
3. `PARAMS_JSON` env var
4. CLI flags (--storyId, --subtaskId)
5. stdin

**Files:**
- `start-coding-subtask.md`
- `continue-coding-subtask.md`
- `start-review-subtask.md`
- `continue-reviewing-subtask.md`
- `implement-feedback.md`
- `supervise-subtask.md` (6946 bytes - orchestration)
- `check-code-completion.md`
- Retro-related templates (5 files)

### Phase 3: Handlebars Templates ({{}} syntax)

**Location:** `sdlc-system/templates/prompt/build/` and `plan/`

**Syntax:** Handlebars `{{variable}}` and `{{#if}}...{{/if}}`

**Processor:** `mcp-stories-lite render_template` MCP tool

**Example:**
```yaml
---
synopsis:
  - Template for coding subtask implementation
parameters:
  storyId:
    required: true
    type: string
    description: "Story identifier"
  subtaskId:
    required: true
    type: string
    description: "Subtask identifier"
  continue:
    required: false
    type: boolean
    default: false
    description: "Whether continuing from previous session"
---

This session we are going to {{#if continue}}continue{{else}}start{{/if}} implementing subtask {{subtaskId}} from story {{storyId}}...

{{#if continue}}
**Work out where we got to last time**
- Review the last **Implementation Notes** section
{{/if}}
```

**MCP usage:**
```typescript
mcp-stories-lite render_template {
  scope: "system",
  subtype: "prompt",
  name: "build/code-subtask.md",
  params: {
    storyId: "37",
    subtaskId: "094",
    continue: true
  }
}
```

**Files:**
- `build/supervise-subtask.md` (327 lines - 9-state machine)
- `build/code-subtask.md`
- `build/review-work.md`
- `build/review-feedback.md`
- `build/plan-updates.md`
- `build/check-*.md` (4 completion checking templates)
- `plan/create-subtask.md`
- `plan/review-subtask.md`
- `plan/implement-create-subtask-feedback.md`
- `plan/supervise-create-subtask.md`

## Template Structure (Handlebars System)

### YAML Frontmatter
```yaml
---
synopsis:
  - First line: Brief one-line purpose
  - Additional lines: Extended context
parameters:
  paramName:
    required: true/false
    type: string|boolean|number|array
    default: [optional value]
    description: "Clear description"
---
```

### Parameter Types

**Always required:**
- `storyId` (string): Story identifier, e.g., "37"
- `subtaskId` (string): Subtask identifier, e.g., "094"

**Session control:**
- `continue` (boolean, default: false): Whether continuing from previous incomplete session
- `continuation` (number): Which continuation attempt within current iteration
- `iteration` (number, default: 1): Which iteration/cycle of work
- `currentIteration` (number): Alternative to iteration

**Context:**
- `sessionSpecificInstructions` (string): Notes from supervisor or previous agent
- `subtaskPhase` (string, default: "build"): Phase of work (build, retro, action)
- `subtaskDescription` (string): Brief kebab-case description
- `gitHash` (string): Git commit hash for review purposes

### Handlebars Features Used

**Variables:**
```handlebars
{{storyId}}
{{subtaskId}}
```

**Conditionals:**
```handlebars
{{#if continue}}
  [Resumption instructions]
{{else}}
  [Fresh start instructions]
{{/if}}
```

**Nested conditionals:**
```handlebars
{{#if sessionSpecificInstructions}}
{{sessionSpecificInstructions}}

{{/if}}
```

## Iteration vs Continuation Pattern

### Terminology

**Iteration:** Complete do/review cycle
- Iteration 1: Initial work
- Iteration 2: Implementing first round of review feedback
- Iteration 3: Implementing second round of feedback
- Each iteration goes through full workflow until review passes

**Continuation:** Resuming incomplete work within same iteration
- Continuation 1: First resume (second session on this iteration)
- Continuation 2: Second resume (third session on this iteration)
- Happens when context limit hit or manual restart needed

**Example:** "Iteration 2, Continuation 3" = Fourth session, still working on iteration 2's feedback

### Template Usage
```handlebars
{{#if continue}}
**Work out where we got to last time**
- Review the last **Implementation Notes - Iteration {{iteration}}** section
- This is continuation {{continuation}} of iteration {{iteration}}
- Continue from where the previous session left off
{{else}}
**Fresh start for Iteration {{iteration}}**
- Begin work systematically
{{/if}}
```

## render_template Tool Implementation

### Tool Definition

**File:** `subprojects/stories-lite/src/tools/RenderTemplateTool.ts`

```typescript
const definition: ToolDefinition = {
    name: 'render_template',
    description: 'Render prompt templates with parameter validation and Handlebars templating',
    inputSchema: {
        type: 'object',
        properties: {
            scope: {
              type: 'string',
              enum: ['system', 'shared', 'project']
            },
            subtype: {
              type: 'string',
              enum: ['prompt', 'spec', 'subtask']
            },
            name: {
              type: 'string',
              description: 'Template filename with hierarchical path support'
            },
            params: {
              type: 'object',
              description: 'Parameters for rendering'
            }
        },
        required: ['scope', 'subtype', 'name']
    }
};
```

### Rendering Pipeline

**File:** `subprojects/stories-lite/src/services/TemplateService.ts`

```typescript
const render = (template: string, params?: Record<string, any>): string => {
    // 1. Extract YAML metadata
    const metadata = extractParameterMetadata(template);

    // 2. Validate parameters BEFORE rendering (fail fast)
    const validatedParams = validateParameters(metadata, params);

    // 3. Extract content (without frontmatter)
    const parsed = matter(template);
    const templateContent = parsed.content;

    // 4. Compile and render with Handlebars
    const compiledTemplate = Handlebars.compile(templateContent);
    return compiledTemplate(validatedParams);
};
```

### Parameter Validation

**Features:**
- Type coercion with validation errors (string → number, boolean)
- Required parameter checking with descriptive errors
- Optional parameters with NO defaults applied (fail fast principle)
- Pass-through of extra parameters (not in metadata)
- Arrays and objects supported

**Error examples:**
```
"Required parameter 'storyId' is missing. Story identifier"
"Parameter 'subtaskId' must be of type number, but got 'abc' which cannot be converted"
```

### Path Resolution

**File:** `subprojects/stories-lite/src/services/DocumentStore.ts`

```typescript
// Example: scope="system", subtype="prompt", name="build/code-subtask.md"
const resolveTemplatePath = (scope, subtype, name) => {
    const config = getConfig();
    const basePath = (scope === 'system') ? config.systemPath :
                     (scope === 'shared') ? config.sharedPath :
                     config.projectPath;

    return join(basePath, 'templates', subtype, name);
};

// Resolves to:
// /path/to/sdlc-system/templates/prompt/build/code-subtask.md
```

## Supervisor Orchestration Pattern

### How Supervisors Use Templates

**File:** `sdlc-system/templates/prompt/build/supervise-subtask.md` (327 lines)

9-state machine that renders different prompts for different specialized agents:

```handlebars
**State 1: Code Subtask**
mcp-stories-lite render_template {
  scope: "system",
  subtype: "prompt",
  name: "build/code-subtask.md",
  params: {
    storyId: "{{storyId}}",
    subtaskId: "{{subtaskId}}",
    continue: [based on continuation count]
  }
}

[Task specialized coder agent with rendered prompt]

**State 2: Check Code Complete**
mcp-stories-lite render_template {
  scope: "system",
  subtype: "prompt",
  name: "build/check-code-complete.md",
  params: { ... }
}

**State 3: Review Work**
mcp-stories-lite render_template {
  scope: "system",
  subtype: "prompt",
  name: "build/review-work.md",
  params: { ... }
}

[Task specialized reviewer agent with rendered prompt]
```

### Key Insight

**Without render_template:** Supervisor would have to inline all prompt logic, bloating context and reducing flexibility.

**With render_template:** Supervisor loads small state machine template, calls render_template to generate specific prompts, tasks specialized agents with minimal context overhead.

## Template Organization

### Directory Structure
```
sdlc-system/templates/
├── prompt/
│   ├── [legacy ${} syntax - 13 files]
│   │   ├── start-coding-subtask.md
│   │   ├── continue-coding-subtask.md
│   │   └── ...
│   ├── build/                [new {{}} syntax - 9 files]
│   │   ├── supervise-subtask.md
│   │   ├── code-subtask.md
│   │   ├── review-work.md
│   │   └── ...
│   ├── plan/                 [new {{}} syntax - 4 files]
│   │   ├── create-subtask.md
│   │   └── ...
│   └── workflow/             [test templates - 1 file]
├── spec/
│   └── spec-template.md
└── subtask/
    └── subtask-template.md
```

**Total:** 27 template files, 2880 lines

### Subtypes

| Subtype | Purpose | Count |
|---------|---------|-------|
| `prompt` | Parameterized prompts for agents | 27 |
| `spec` | Story specification templates | 1 |
| `subtask` | Subtask definition templates | 1 |

## Migration State

**Breaking change in progress:** Templates need migration from `${}` to `{{}}` syntax

**Current state:**
- Legacy root-level templates still use `${}`
- New build/ and plan/ templates use `{{}}`
- render_template tool only supports `{{}}` Handlebars
- Legacy templates would NOT work with render_template

**README note:** "Templates must be converted to {{var}} syntax for render_template tool"

## Security

**File:** `subprojects/stories-lite/src/services/PathValidator.ts`

Template names validated to prevent attacks:
- No absolute paths (`/etc/passwd`)
- No directory traversal (`../../sensitive/data.md`)
- No null bytes (`\x00`)
- No control characters (`\n`, `\r`, `\t`)
- Empty components rejected (`//`, `.`)

**Hierarchical paths allowed:**
- `build/code-subtask.md` ✓
- `plan/create-subtask.md` ✓
- `workflow/test-hierarchical.md` ✓

## What This Enabled

1. **Agent orchestration** - Supervisors can task specialized agents with specific prompts
2. **Consistency** - Same prompt structure across all sessions and agents
3. **Resumption** - Templates adapt based on `continue` flag
4. **Type safety** - Parameter validation with clear errors
5. **Separation of concerns** - Template mechanics separate from domain knowledge (cartridges)
6. **Scalability** - Add new templates without modifying tool code

## Key Learnings

**What worked:**
- Handlebars provided sufficient power without excessive complexity
- YAML frontmatter for parameter metadata was clear and parseable
- Fail-fast validation prevented subtle bugs
- Hierarchical paths enabled logical organization
- Iteration/continuation distinction clarified resumption semantics

**What got messy:**
- Two template syntaxes created confusion
- Migration path unclear (breaking change)
- No versioning strategy for templates
- Unclear which templates were current vs historical
