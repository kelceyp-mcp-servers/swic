# SWIC CLI Usage Guide

Quick reference for using the SWIC command-line interface to manage cartridges.

## Installation

```bash
# Add swic to your PATH
export PATH="/path/to/swic:$PATH"

# Or use directly
./swic-mode cartridge list
```

## Quick Start

```bash
# List all cartridges (both scopes)
swic cartridge list

# Create a new cartridge
swic cartridge create my-cartridge --interactive

# Read a cartridge
swic cartridge read my-cartridge

# Edit a cartridge
swic cartridge edit my-cartridge --interactive

# Delete a cartridge
swic cartridge delete my-cartridge
```

## Command Reference

### `swic cartridge create`

Create a new cartridge (defaults to project scope).

**Syntax:**
```bash
swic cartridge create <path> [options]
```

**Options:**
- `-s, --scope <scope>` - Scope (project|shared), defaults to project
- `-i, --interactive` - Open in $EDITOR
- `-c, --content <text>` - Content from command line
- Accepts content from stdin

**Examples:**
```bash
# Interactive mode (opens in editor)
swic cartridge create auth/jwt --interactive

# From stdin
echo "# My Content" | swic cartridge create workflows/tdd

# From flag
swic cartridge create utils/helper --content "# Helper utilities"

# In shared scope
swic cartridge create workflows/tdd --scope shared --interactive
```

**Output:**
```
crt001
Created project cartridge: crt001 at auth/jwt
```

---

### `swic cartridge read`

Read a cartridge's content (auto-resolves scope).

**Syntax:**
```bash
swic cartridge read <identifier> [options]
```

**Options:**
- `-s, --scope <scope>` - Explicit scope (project|shared)
- `-m, --meta` - Show metadata (ID, path, hash) before content

**Examples:**
```bash
# By path (checks project first, then shared)
swic cartridge read auth/jwt

# By ID (scope inferred from prefix)
swic cartridge read crt001      # Project
swic cartridge read scrt005     # Shared

# Explicit scope
swic cartridge read auth/jwt --scope shared

# With metadata
swic cartridge read crt001 --meta
```

**Output (default):**
```
# JWT Authentication Setup

Content of the cartridge...
```

**Output (with --meta):**
```
ID: crt001
Path: auth/jwt
Hash: a1b2c3d4...
---
# JWT Authentication Setup

Content of the cartridge...
```

---

### `swic cartridge edit`

Edit an existing cartridge (auto-resolves scope).

**Syntax:**
```bash
swic cartridge edit <identifier> [options]
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
swic cartridge edit auth/jwt --interactive

# Replace first occurrence
swic cartridge edit crt001 --old "JWT" --new "JSON Web Token"

# Replace all occurrences
swic cartridge edit auth/jwt --old "foo" --new "bar" --mode all

# Regex replacement
swic cartridge edit crt001 --old "v\d+\.\d+" --new "v2.0" --mode regex

# With explicit hash (for concurrency)
swic cartridge edit crt001 --interactive --hash a1b2c3d4...
```

**Output:**
```
Applied 2 edits
New hash: e5f6g7h8...
```

---

### `swic cartridge delete`

Delete a cartridge (requires confirmation).

**Syntax:**
```bash
swic cartridge delete <identifier> [options]
```

**Options:**
- `-s, --scope <scope>` - Explicit scope (project|shared)
- `-y, --confirm` - Skip confirmation prompt
- `-h, --hash <hash>` - Expected hash for concurrency control

**Examples:**
```bash
# With confirmation prompt
swic cartridge delete auth/jwt
# Prompt: "Delete project cartridge 'auth/jwt' (crt001)? [y/N]"

# Skip confirmation
swic cartridge delete auth/jwt --confirm

# By ID
swic cartridge delete crt001 --confirm

# Explicit scope
swic cartridge delete workflows/tdd --scope shared --confirm
```

**Output:**
```
crt001
Deleted project cartridge: crt001 at auth/jwt
```

---

### `swic cartridge list`

List cartridges (both scopes by default).

**Syntax:**
```bash
swic cartridge list [options]
```

**Options:**
- `-s, --scope <scope>` - Filter by scope (project|shared)
- `-p, --prefix <prefix>` - Filter by path prefix
- `-f, --full` - Include synopsis from front matter

**Examples:**
```bash
# List all (both scopes with override detection)
swic cartridge list

# Project scope only
swic cartridge list --scope project

# With synopsis
swic cartridge list --full

# Filter by prefix
swic cartridge list --prefix auth/

# Combine filters
swic cartridge list --scope shared --prefix workflows/
```

**Output (default):**
```
ID       NAME              SCOPE     OVERRIDE
crt001   auth/jwt          project   overrides
scrt001  auth/jwt          shared    overridden
crt002   local/feature     project   -
scrt002  utils/helper      shared    -
```

**Output (with --full):**
```
ID       NAME              SCOPE     OVERRIDE    SYNOPSIS
crt001   auth/jwt          project   overrides   JWT authentication setup
scrt001  auth/jwt          shared    overridden  Shared JWT config
crt002   local/feature     project   -           Local feature impl
scrt002  utils/helper      shared    -           Helper utilities
```

**Color Coding:**
- **Cyan**: Project cartridges (ID and SCOPE columns)
- **Green**: Shared cartridges (ID and SCOPE columns)

---

## Scope Resolution

When scope is omitted, SWIC resolves it intelligently:

### For Create Operations
```bash
swic cartridge create my-new-cartridge
# Always creates in project scope
```

### For Read/Edit/Delete Operations
```bash
swic cartridge read my-cartridge
# 1. Checks project scope first
# 2. Falls back to shared scope if not found in project
# 3. Fails if not found in either scope
```

### For ID-Based Operations
```bash
swic cartridge read crt001    # Project (from 'crt' prefix)
swic cartridge read scrt005   # Shared (from 'scrt' prefix)
# Scope is unambiguous from ID prefix
```

### For List Operations
```bash
swic cartridge list
# Lists both scopes with override detection
```

## Override Behavior

When a project cartridge and shared cartridge have the same path:

```bash
# Both scopes have "auth/jwt"
swic cartridge list
# crt005   auth/jwt   project   overrides
# scrt010  auth/jwt   shared    overridden

# Without scope, operates on project version
swic cartridge read auth/jwt          # Reads project version (crt005)
swic cartridge edit auth/jwt --interactive  # Edits project version
swic cartridge delete auth/jwt --confirm    # Deletes project version

# To access shared version, use explicit scope or ID
swic cartridge read auth/jwt --scope shared  # Reads shared version
swic cartridge read scrt010                  # Reads shared version
```

## Front Matter

Cartridges can include YAML front matter:

```yaml
---
audience: developers
synopsis: Brief description of cartridge purpose
---

# Cartridge Content

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
crt_id=$(swic cartridge create my-feature --content "...")
swic cartridge read "$crt_id"
swic cartridge delete "$crt_id" --confirm
```

### Use Paths for Interactive Work
```bash
# Paths are human-readable
swic cartridge create auth/jwt --interactive
swic cartridge read auth/jwt
swic cartridge edit auth/jwt --interactive
```

### Check List Before Operations
```bash
# See what exists and where
swic cartridge list
swic cartridge list --prefix auth/
```

### Use Confirmation Prompts
```bash
# Let SWIC show you what will be deleted
swic cartridge delete auth/jwt
# Shows: "Delete project cartridge 'auth/jwt' (crt001)? [y/N]"
```

### Organize with Prefixes
```bash
# Group related cartridges
swic cartridge create auth/jwt
swic cartridge create auth/oauth
swic cartridge create workflows/tdd
swic cartridge create workflows/review

# Filter by group
swic cartridge list --prefix auth/
swic cartridge list --prefix workflows/
```

## Troubleshooting

### "Invalid cartridge ID format"
- Ensure IDs match `crt###` or `scrt###` format
- For shared cartridges, use `scrt###` not `crt###`

### "No cartridge found"
- Check both scopes: `swic cartridge list`
- Try explicit scope: `--scope shared`
- Verify path is correct (paths are case-sensitive)

### "Hash mismatch" during edit
- Cartridge was modified since you read it
- Re-read to get latest hash: `swic cartridge read crt001 --meta`
- Use latest hash in edit command

### Changes not visible
- Ensure you're checking the correct scope
- Use `swic cartridge list` to see which scope has the cartridge
- Remember: project cartridges override shared ones

## See Also

- **Migration Guide**: `MIGRATION-SCOPE-OPTIONAL.md` - Upgrade guide for scope-optional refactor
- **Spec**: `.swic/cartridges/swic/spec/cartridges.md` - Detailed operation specifications
- **Operations**: `.swic/cartridges/operations.md` - Build and deployment guide
