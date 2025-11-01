# Migration Guide: Scope-Optional Addressing

This guide covers the scope-optional addressing refactor introduced in SWIC. The refactor makes scope optional across all operations while maintaining backward compatibility.

## Overview

### What Changed

1. **Scope is now optional** in all CLI commands and API calls
2. **New ID format**: Project docs use `doc###`, shared docs use `sdoc###`
3. **Override detection**: List command shows when project docs shadow shared ones
4. **Smart resolution**: When scope is omitted, SWIC checks project first, then shared
5. **Delete confirmation**: Prompts user before deletion (with visible scope info)

### Benefits

- **Less typing**: Most operations don't require specifying scope
- **Better discovery**: List shows both scopes with override information
- **Safer deletions**: Confirmation prompt prevents accidents
- **Clearer IDs**: ID prefix indicates scope unambiguously

## Breaking Changes

### ID Format Change

**Before:**
- Both scopes used `doc###` format
- IDs could collide between scopes

**After:**
- Project scope: `doc###` (e.g., `doc001`, `doc002`)
- Shared scope: `sdoc###` (e.g., `sdoc001`, `sdoc002`)
- IDs are globally unique

### Migration Required

If you have existing shared docs, you **must** run the migration script:

```bash
# Dry run first (recommended)
bun scripts/migrate-shared-ids.ts --dry-run

# Apply migration
bun scripts/migrate-shared-ids.ts

# Verify
swic doc list
```

The script:
- Converts `doc###` → `sdoc###` in `~/.swic/docs/.index.json`
- Creates automatic backup before changes
- Can be run multiple times safely (idempotent)

## CLI Command Changes

### Create Command

**Before:**
```bash
swic doc create project auth/jwt-setup --interactive
swic doc create shared workflows/tdd --content "..."
```

**After:**
```bash
# Defaults to project scope
swic doc create auth/jwt-setup --interactive

# Explicit scope still works
swic doc create workflows/tdd --scope shared --content "..."
```

### Read Command

**Before:**
```bash
swic doc read project auth/jwt-setup
swic doc read shared workflows/tdd
swic doc read project doc001
```

**After:**
```bash
# Auto-resolves scope (project first, then shared)
swic doc read auth/jwt-setup

# ID prefix disambiguates scope
swic doc read doc001   # Project doc
swic doc read sdoc005  # Shared doc

# Explicit scope still works
swic doc read auth/jwt-setup --scope shared
```

### Edit Command

**Before:**
```bash
swic doc edit project auth/jwt --interactive
swic doc edit shared workflows/tdd --old "foo" --new "bar"
```

**After:**
```bash
# Auto-resolves scope
swic doc edit auth/jwt --interactive

# ID-based (scope from prefix)
swic doc edit doc001 --old "foo" --new "bar"

# Explicit scope still works
swic doc edit workflows/tdd --scope shared --interactive
```

### Delete Command

**Before:**
```bash
swic doc delete project auth/jwt
swic doc delete shared workflows/tdd
```

**After:**
```bash
# Auto-resolves scope + confirmation prompt
swic doc delete auth/jwt
# Prompt: "Delete project doc 'auth/jwt' (doc001)? [y/N]"

# Skip confirmation with --confirm
swic doc delete auth/jwt --confirm

# Explicit scope still works
swic doc delete workflows/tdd --scope shared --confirm
```

### List Command

**Before:**
```bash
swic doc list project
swic doc list shared
```

**After:**
```bash
# Lists both scopes with override detection (NEW!)
swic doc list
# Output:
# ID       NAME              SCOPE     OVERRIDE
# doc001   auth/jwt          project   overrides
# sdoc001  auth/jwt          shared    overridden
# doc002   local/feature     project   -
# sdoc002  utils/helper      shared    -

# Single scope (legacy behavior)
swic doc list --scope project
swic doc list --scope shared

# With synopsis
swic doc list --full
```

## API Changes

### TypeScript Types

```typescript
// Before: scope was required
interface AddressPath {
    scope: 'project' | 'shared';
    path: string;
}

// After: scope is optional
interface AddressPath {
    scope?: 'project' | 'shared';
    path: string;
}

// New: ID types reflect scope
type ProjectdocId = `doc${string}`;  // doc001, doc002...
type ShareddocId = `sdoc${string}`;  // sdoc001, sdoc002...
type docId = ProjectdocId | ShareddocId;
```

### Service API

```typescript
// Before: scope required
await docService.create({
    address: { kind: 'path', scope: 'project', path: 'auth/jwt' },
    content: '...'
});

// After: scope optional (defaults to 'project')
await docService.create({
    address: { kind: 'path', path: 'auth/jwt' },
    content: '...'
});

// Before: scope required in list
await docService.list({ scope: 'project' });

// After: scope optional (lists both with override detection)
await docService.list({});
```

### Resolution Behavior

When scope is omitted:

- **ID-based addressing**: Scope inferred from prefix (`doc` → project, `sdoc` → shared)
- **Path-based addressing**: Checks project first, then shared (project overrides shared)
- **Create operations**: Defaults to `project` scope
- **Read/Edit/Delete**: Tries project first, falls back to shared

## Override Behavior

When a project doc and shared doc have the same path:

- **Read/Edit/Delete without scope**: Operates on project doc
- **List without scope**: Shows both with override markers:
  - Project doc marked as `overrides`
  - Shared doc marked as `overridden`
- **To access overridden shared doc**: Use explicit `--scope shared` or shared ID (`sdoc###`)

### Example

```bash
# Both scopes have "workflows/tdd"
swic doc list
# doc005   workflows/tdd   project   overrides
# sdoc010  workflows/tdd   shared    overridden

# Reads project version
swic doc read workflows/tdd

# Reads shared version (explicit)
swic doc read workflows/tdd --scope shared
# OR
swic doc read sdoc010
```

## Color Coding

The list command uses color coding to distinguish scopes:

- **Cyan**: Project docs
- **Green**: Shared docs

Colors appear in the ID and SCOPE columns.

## Migration Checklist

- [ ] **Backup**: Create backup of `~/.swic/docs/` directory
- [ ] **Dry run**: Run `bun scripts/migrate-shared-ids.ts --dry-run`
- [ ] **Review**: Check migration output
- [ ] **Migrate**: Run `bun scripts/migrate-shared-ids.ts`
- [ ] **Verify**: Run `swic doc list` to confirm new IDs
- [ ] **Test**: Try reading a few docs by path and ID
- [ ] **Update scripts**: Update any automation using old CLI syntax

## Rollback

If needed, restore from backup:

```bash
# Restore shared docs from backup
cp -r ~/.swic.backup/* ~/.swic/

# Or restore just the index
cp ~/.swic/docs/.backups/.index-backup-TIMESTAMP.json ~/.swic/docs/.index.json
```

## Troubleshooting

### "Invalid doc ID format" error

**Cause**: Using old `doc###` format for shared doc
**Fix**: Run migration script or use path-based addressing

### "No doc found" when scope omitted

**Cause**: doc only exists in shared scope
**Fix**: Use explicit `--scope shared` or shared ID (`sdoc###`)

### List shows duplicate docs

**Cause**: Same path exists in both scopes (this is expected behavior)
**Action**: Review override markers to understand which takes precedence

### Migration script reports no changes needed

**Cause**: Index already uses `sdoc###` format
**Action**: No action needed, migration already complete

## Support

For issues or questions:
- Check this guide first
- Review the output of `swic doc list` to understand scope resolution
- Use `--scope` explicitly if auto-resolution behaves unexpectedly
