# SWIC CLI Usage Guide

Quick reference for using the SWIC command-line interface to manage docs.

## Installation

```bash
# Add swic to your PATH
export PATH="/path/to/swic:$PATH"

# Or use directly
./swic-mode doc list
```

## Quick Start

```bash
# List all docs (both scopes)
swic doc list

# Create a new doc
swic doc create my-doc --interactive

# Read a doc
swic doc read my-doc

# Edit a doc
swic doc edit my-doc --interactive

# Delete a doc
swic doc delete my-doc
```

## Command Reference

### `swic doc create`

Create a new doc (defaults to project scope).

**Syntax:**
```bash
swic doc create <path> [options]
```

**Options:**
- `-s, --scope <scope>` - Scope (project|shared), defaults to project
- `-i, --interactive` - Open in $EDITOR
- `-c, --content <text>` - Content from command line
- Accepts content from stdin

**Examples:**
```bash
# Interactive mode (opens in editor)
swic doc create auth/jwt --interactive

# From stdin
echo "# My Content" | swic doc create workflows/tdd

# From flag
swic doc create utils/helper --content "# Helper utilities"

# In shared scope
swic doc create workflows/tdd --scope shared --interactive
```

**Output:**
```
doc001
Created project doc: doc001 at auth/jwt
```

---

### `swic doc read`

Read a doc's content (auto-resolves scope).

**Syntax:**
```bash
swic doc read <identifier> [options]
```

**Options:**
- `-s, --scope <scope>` - Explicit scope (project|shared)
- `-m, --meta` - Show metadata (ID, path, hash) before content

**Examples:**
```bash
# By path (checks project first, then shared)
swic doc read auth/jwt

# By ID (scope inferred from prefix)
swic doc read doc001      # Project
swic doc read sdoc005     # Shared

# Explicit scope
swic doc read auth/jwt --scope shared

# With metadata
swic doc read doc001 --meta
```

**Output (default):**
```
# JWT Authentication Setup

Content of the doc...
```

**Output (with --meta):**
```
ID: doc001
Path: auth/jwt
Hash: a1b2c3d4...
---
# JWT Authentication Setup

Content of the doc...
```

---

### `swic doc edit`

Edit an existing doc (auto-resolves scope).

**Syntax:**
```bash
swic doc edit <identifier> [options]
```

**Options:**
- `-s, --scope <scope>` - Explicit scope (project|shared)
- `-i, --interactive` - Open in $EDITOR
- `--old <text>` - Text to find
- `--new <text>` - Replacement text
- `-m, --mode <mode>` - Replace mode: once, all, regex (default: once)
- `-h, --hash <hash>` - Expected hash for concurrency control

**Examples:**
```bash
# Interactive mode
swic doc edit auth/jwt --interactive

# Replace first occurrence
swic doc edit doc001 --old "JWT" --new "JSON Web Token"

# Replace all occurrences
swic doc edit auth/jwt --old "foo" --new "bar" --mode all

# Regex replacement
swic doc edit doc001 --old "v\d+\.\d+" --new "v2.0" --mode regex

# With explicit hash (for concurrency)
swic doc edit doc001 --interactive --hash a1b2c3d4...
```

**Output:**
```
Applied 2 edits
New hash: e5f6g7h8...
```

---

### `swic doc delete`

Delete a doc (requires confirmation).

**Syntax:**
```bash
swic doc delete <identifier> [options]
```

**Options:**
- `-s, --scope <scope>` - Explicit scope (project|shared)
- `-y, --confirm` - Skip confirmation prompt
- `-h, --hash <hash>` - Expected hash for concurrency control

**Examples:**
```bash
# With confirmation prompt
swic doc delete auth/jwt
# Prompt: "Delete project doc 'auth/jwt' (doc001)? [y/N]"

# Skip confirmation
swic doc delete auth/jwt --confirm

# By ID
swic doc delete doc001 --confirm

# Explicit scope
swic doc delete workflows/tdd --scope shared --confirm
```

**Output:**
```
doc001
Deleted project doc: doc001 at auth/jwt
```

---

### `swic doc list`

List docs (both scopes by default).

**Syntax:**
```bash
swic doc list [options]
```

**Options:**
- `-s, --scope <scope>` - Filter by scope (project|shared)
- `-p, --prefix <prefix>` - Filter by path prefix
- `-f, --full` - Include synopsis from front matter

**Examples:**
```bash
# List all (both scopes with override detection)
swic doc list

# Project scope only
swic doc list --scope project

# With synopsis
swic doc list --full

# Filter by prefix
swic doc list --prefix auth/

# Combine filters
swic doc list --scope shared --prefix workflows/
```

**Output (default):**
```
ID       NAME              SCOPE     OVERRIDE
doc001   auth/jwt          project   overrides
sdoc001  auth/jwt          shared    overridden
doc002   local/feature     project   -
sdoc002  utils/helper      shared    -
```

**Output (with --full):**
```
ID       NAME              SCOPE     OVERRIDE    SYNOPSIS
doc001   auth/jwt          project   overrides   JWT authentication setup
sdoc001  auth/jwt          shared    overridden  Shared JWT config
doc002   local/feature     project   -           Local feature impl
sdoc002  utils/helper      shared    -           Helper utilities
```

**Color Coding:**
- **Cyan**: Project docs (ID and SCOPE columns)
- **Green**: Shared docs (ID and SCOPE columns)

---

## Scope Resolution

When scope is omitted, SWIC resolves it intelligently:

### For Create Operations
```bash
swic doc create my-new-doc
# Always creates in project scope
```

### For Read/Edit/Delete Operations
```bash
swic doc read my-doc
# 1. Checks project scope first
# 2. Falls back to shared scope if not found in project
# 3. Fails if not found in either scope
```

### For ID-Based Operations
```bash
swic doc read doc001    # Project (from 'doc' prefix)
swic doc read sdoc005   # Shared (from 'sdoc' prefix)
# Scope is unambiguous from ID prefix
```

### For List Operations
```bash
swic doc list
# Lists both scopes with override detection
```

## Override Behavior

When a project doc and shared doc have the same path:

```bash
# Both scopes have "auth/jwt"
swic doc list
# doc005   auth/jwt   project   overrides
# sdoc010  auth/jwt   shared    overridden

# Without scope, operates on project version
swic doc read auth/jwt          # Reads project version (doc005)
swic doc edit auth/jwt --interactive  # Edits project version
swic doc delete auth/jwt --confirm    # Deletes project version

# To access shared version, use explicit scope or ID
swic doc read auth/jwt --scope shared  # Reads shared version
swic doc read sdoc010                  # Reads shared version
```

## Front Matter

docs can include YAML front matter:

```yaml
---
audience: developers
synopsis: Brief description of doc purpose
---

# doc Content

Content goes here...
```

Front matter is:
- **Optional**: Not required
- **Unenforced**: No validation
- **Synopsis**: Used in `list --full` output
- **Audience**: Metadata for categorization

## Tips & Best Practices

### Use IDs for Automation
```bash
# IDs are stable and unambiguous
doc_id=$(swic doc create my-feature --content "...")
swic doc read "$doc_id"
swic doc delete "$doc_id" --confirm
```

### Use Paths for Interactive Work
```bash
# Paths are human-readable
swic doc create auth/jwt --interactive
swic doc read auth/jwt
swic doc edit auth/jwt --interactive
```

### Check List Before Operations
```bash
# See what exists and where
swic doc list
swic doc list --prefix auth/
```

### Use Confirmation Prompts
```bash
# Let SWIC show you what will be deleted
swic doc delete auth/jwt
# Shows: "Delete project doc 'auth/jwt' (doc001)? [y/N]"
```

### Organize with Prefixes
```bash
# Group related docs
swic doc create auth/jwt
swic doc create auth/oauth
swic doc create workflows/tdd
swic doc create workflows/review

# Filter by group
swic doc list --prefix auth/
swic doc list --prefix workflows/
```

## Troubleshooting

### "Invalid doc ID format"
- Ensure IDs match `doc###` or `sdoc###` format
- For shared docs, use `sdoc###` not `doc###`

### "No doc found"
- Check both scopes: `swic doc list`
- Try explicit scope: `--scope shared`
- Verify path is correct (paths are case-sensitive)

### "Hash mismatch" during edit
- doc was modified since you read it
- Re-read to get latest hash: `swic doc read doc001 --meta`
- Use latest hash in edit command

### Changes not visible
- Ensure you're checking the correct scope
- Use `swic doc list` to see which scope has the doc
- Remember: project docs override shared ones

## See Also

- **Migration Guide**: `MIGRATION-SCOPE-OPTIONAL.md` - Upgrade guide for scope-optional refactor
- **Spec**: `.swic/docs/swic/spec/docs.md` - Detailed operation specifications
- **Operations**: `.swic/docs/operations.md` - Build and deployment guide
