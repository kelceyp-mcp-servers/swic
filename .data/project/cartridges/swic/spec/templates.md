# Templates

Reusable document structures with variable substitution using Handlebars markup.

## Operations

1. **create** - Create a new template
2. **read** - Read an existing template
3. **edit** - Modify an existing template (4 variants)
4. **delete** - Remove a template from working copy
5. **list** - List all templates with synopsis
6. **render** - Render a template with provided parameters
7. **get-parameters** - Get parameter definitions for a template

## Compatible With

1. **search** - Full-text search across templates

## Operation Details

### Create
- Requires Method 1 addressing: `scope + type + path + name`
- Addressing similar to HTTP PUT (specifies the location)
- Generates a unique ID not known in advance (similar to HTTP POST)
- Returns the generated ID (e.g., `tpl001`)

### Read
- Supports full addressing (both Method 1 and Method 2)
- Returns the complete template content with Handlebars markup (no pagination)
- Version can be specified to read historical versions

### Edit
- Supports latest version addressing only
- Atomic write via file renaming
- Four variants using `EditOp`:

```typescript
EditOp =
  | { op: 'replaceOnce'; oldText: string; newText: string }
  | { op: 'replaceAll'; oldText: string; newText: string }
  | { op: 'replaceRegex'; pattern: string; flags?: string; replacement: string }
  | { op: 'replaceAllContent'; content: string };
```

### Delete
- Stores the last version for recovery
- Removes from 'working copy' only
- Historical versions remain in version control

### List
- Provides a list of all templates in the scope
- Includes synopsis if available from front matter

### Render
- Takes template ID/path and parameters
- Processes Handlebars markup with provided values
- Returns rendered document with variables substituted
- Validates required parameters before rendering

### Get Parameters
- Returns parameter definitions from template front matter
- Includes parameter names, types, and whether mandatory/optional
- Used to validate inputs before rendering

## Standard Operations

The operations listed above are standard for all document types unless documents are write-protected.

## Handlebars Support

Templates support a focused subset of Handlebars functionality:

- **Variable substitution**: `{{variableName}}`
- **Conditional logic**: `{{#if}}`, `{{#unless}}`, `{{else}}`
- **Iteration**: `{{#each}}`, `{{@index}}`, `{{@key}}`
- **Context navigation**: `{{../parentContext}}`, `{{this}}`
- **Context switching**: `{{#with object}}...{{/with}}`
- **Comments**: `{{!-- comment --}}`

Not supported (for simplicity and security):
- Unescaped output (`{{{triple}}}`)
- Dynamic lookup (`{{lookup}}`)
- Debugging helpers (`{{log}}`)
- Custom block helpers
- Partials
- Escaping literals

## Front Matter

Templates require structured YAML front matter:

```yaml
---
type: prompt | cartridge | story-spec | story-tech-doc | subtask | review | feedback | feedback-review | retro
params:
  paramName1:
    type: string | number | boolean
    required: true | false
    description: "Parameter description"
  paramName2:
    type: string
    required: false
    default: "default value"
synopsis: "Brief description of the template's purpose"
---
```

### Type Values

- **prompt** - AI agent prompt template
- **cartridge** - Cartridge document template
- **story-spec** - Story specification template
- **story-tech-doc** - Story technical documentation template
- **subtask** - Subtask definition template
- **review** - Code/design review template
- **feedback** - General feedback template
- **feedback-review** - Feedback review template
- **retro** - Retrospective template

### Parameter Definition Format

Each parameter in the `params` section defines:
- **type**: Data type (string, number, boolean)
- **required**: Whether the parameter is mandatory
- **description**: Human-readable description (optional)
- **default**: Default value if not provided (optional)

Example:
```yaml
params:
  storyId:
    type: number
    required: true
    description: "Story identifier"
  continue:
    type: boolean
    required: false
    default: false
    description: "Whether to continue from previous session"
```

## Write Protection

Templates are not write-protectable in this specification. Future versions may add write protection capabilities.