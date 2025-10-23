# Cartridges

Knowledge modules and documentation that can be loaded into AI agent sessions to provide context, exemplars, and instructions.

## Operations

1. **create** - Create a new cartridge
2. **read** - Read an existing cartridge
3. **edit** - Modify an existing cartridge (4 variants)
4. **delete** - Remove a cartridge from working copy
5. **list** - List all cartridges with synopsis

## Compatible With

1. **search** - Full-text search across cartridges
2. **multiread** - Read multiple cartridges in a single operation

## Operation Details

### Create
- Requires Method 1 addressing: `scope + type + path + name`
- Addressing similar to HTTP PUT (specifies the location)
- Generates a unique ID not known in advance (similar to HTTP POST)
- Returns the generated ID (e.g., `crt001`)

### Read
- Supports full addressing (both Method 1 and Method 2)
- Returns the complete document content (no pagination)
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
- Provides a list of all cartridges in the scope
- Includes synopsis if available from front matter

## Standard Operations

The operations listed above are standard for all document types unless documents are write-protected.

## Front Matter

Cartridges typically include simple, unenforced YAML front matter:

```yaml
---
audience: <target audience for this cartridge>
synopsis: <brief description of the cartridge's purpose>
---
```

## Write Protection

Cartridges are not write-protectable in this specification. Future versions may add write protection capabilities.