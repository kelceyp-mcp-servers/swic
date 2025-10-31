# Migration Guide: Scope-Optional Addressing

This guide covers the scope-optional addressing refactor introduced in SWIC. The refactor makes scope optional across all operations while maintaining backward compatibility.

## Overview

### What Changed

1. **Scope is now optional** in all CLI commands and API calls
2. **New ID format**: Project cartridges use `crt###`, shared cartridges use `scrt###`
3. **Override detection**: List command shows when project cartridges shadow shared ones
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
- Both scopes used `crt###` format
- IDs could collide between scopes

**After:**
- Project scope: `crt###` (e.g., `crt001`, `crt002`)
- Shared scope: `scrt###` (e.g., `scrt001`, `scrt002`)
- IDs are globally unique

### Migration Required

If you have existing shared cartridges, you **must** run the migration script:

```bash
# Dry run first (recommended)
bun scripts/migrate-shared-ids.ts --dry-run

# Apply migration
bun scripts/migrate-shared-ids.ts

# Verify
swic cartridge list
```

The script:
- Converts `crt###` → `scrt###` in `~/.swic/cartridges/.index.json`
- Creates automatic backup before changes
- Can be run multiple times safely (idempotent)

## CLI Command Changes

### Create Command

**Before:**
```bash
swic cartridge create project auth/jwt-setup --interactive
swic cartridge create shared workflows/tdd --content "..."
```

**After:**
```bash
# Defaults to project scope
swic cartridge create auth/jwt-setup --interactive

# Explicit scope still works
swic cartridge create workflows/tdd --scope shared --content "..."
```

### Read Command

**Before:**
```bash
swic cartridge read project auth/jwt-setup
swic cartridge read shared workflows/tdd
swic cartridge read project crt001
```

**After:**
```bash
# Auto-resolves scope (project first, then shared)
swic cartridge read auth/jwt-setup

# ID prefix disambiguates scope
swic cartridge read crt001   # Project cartridge
swic cartridge read scrt005  # Shared cartridge

# Explicit scope still works
swic cartridge read auth/jwt-setup --scope shared
```

### Edit Command

**Before:**
```bash
swic cartridge edit project auth/jwt --interactive
swic cartridge edit shared workflows/tdd --old "foo" --new "bar"
```

**After:**
```bash
# Auto-resolves scope
swic cartridge edit auth/jwt --interactive

# ID-based (scope from prefix)
swic cartridge edit crt001 --old "foo" --new "bar"

# Explicit scope still works
swic cartridge edit workflows/tdd --scope shared --interactive
```

### Delete Command

**Before:**
```bash
swic cartridge delete project auth/jwt
swic cartridge delete shared workflows/tdd
```

**After:**
```bash
# Auto-resolves scope + confirmation prompt
swic cartridge delete auth/jwt
# Prompt: "Delete project cartridge 'auth/jwt' (crt001)? [y/N]"

# Skip confirmation with --confirm
swic cartridge delete auth/jwt --confirm

# Explicit scope still works
swic cartridge delete workflows/tdd --scope shared --confirm
```

### List Command

**Before:**
```bash
swic cartridge list project
swic cartridge list shared
```

**After:**
```bash
# Lists both scopes with override detection (NEW!)
swic cartridge list
# Output:
# ID       NAME              SCOPE     OVERRIDE
# crt001   auth/jwt          project   overrides
# scrt001  auth/jwt          shared    overridden
# crt002   local/feature     project   -
# scrt002  utils/helper      shared    -

# Single scope (legacy behavior)
swic cartridge list --scope project
swic cartridge list --scope shared

# With synopsis
swic cartridge list --full
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
type ProjectCartridgeId = `crt${string}`;  // crt001, crt002...
type SharedCartridgeId = `scrt${string}`;  // scrt001, scrt002...
type CartridgeId = ProjectCartridgeId | SharedCartridgeId;
```

### Service API

```typescript
// Before: scope required
await cartridgeService.create({
    address: { kind: 'path', scope: 'project', path: 'auth/jwt' },
    content: '...'
});

// After: scope optional (defaults to 'project')
await cartridgeService.create({
    address: { kind: 'path', path: 'auth/jwt' },
    content: '...'
});

// Before: scope required in list
await cartridgeService.list({ scope: 'project' });

// After: scope optional (lists both with override detection)
await cartridgeService.list({});
```

### Resolution Behavior

When scope is omitted:

- **ID-based addressing**: Scope inferred from prefix (`crt` → project, `scrt` → shared)
- **Path-based addressing**: Checks project first, then shared (project overrides shared)
- **Create operations**: Defaults to `project` scope
- **Read/Edit/Delete**: Tries project first, falls back to shared

## Override Behavior

When a project cartridge and shared cartridge have the same path:

- **Read/Edit/Delete without scope**: Operates on project cartridge
- **List without scope**: Shows both with override markers:
  - Project cartridge marked as `overrides`
  - Shared cartridge marked as `overridden`
- **To access overridden shared cartridge**: Use explicit `--scope shared` or shared ID (`scrt###`)

### Example

```bash
# Both scopes have "workflows/tdd"
swic cartridge list
# crt005   workflows/tdd   project   overrides
# scrt010  workflows/tdd   shared    overridden

# Reads project version
swic cartridge read workflows/tdd

# Reads shared version (explicit)
swic cartridge read workflows/tdd --scope shared
# OR
swic cartridge read scrt010
```

## Color Coding

The list command uses color coding to distinguish scopes:

- **Cyan**: Project cartridges
- **Green**: Shared cartridges

Colors appear in the ID and SCOPE columns.

## Migration Checklist

- [ ] **Backup**: Create backup of `~/.swic/cartridges/` directory
- [ ] **Dry run**: Run `bun scripts/migrate-shared-ids.ts --dry-run`
- [ ] **Review**: Check migration output
- [ ] **Migrate**: Run `bun scripts/migrate-shared-ids.ts`
- [ ] **Verify**: Run `swic cartridge list` to confirm new IDs
- [ ] **Test**: Try reading a few cartridges by path and ID
- [ ] **Update scripts**: Update any automation using old CLI syntax

## Rollback

If needed, restore from backup:

```bash
# Restore shared cartridges from backup
cp -r ~/.swic.backup/* ~/.swic/

# Or restore just the index
cp ~/.swic/cartridges/.backups/.index-backup-TIMESTAMP.json ~/.swic/cartridges/.index.json
```

## Troubleshooting

### "Invalid cartridge ID format" error

**Cause**: Using old `crt###` format for shared cartridge
**Fix**: Run migration script or use path-based addressing

### "No cartridge found" when scope omitted

**Cause**: Cartridge only exists in shared scope
**Fix**: Use explicit `--scope shared` or shared ID (`scrt###`)

### List shows duplicate cartridges

**Cause**: Same path exists in both scopes (this is expected behavior)
**Action**: Review override markers to understand which takes precedence

### Migration script reports no changes needed

**Cause**: Index already uses `scrt###` format
**Action**: No action needed, migration already complete

## Support

For issues or questions:
- Check this guide first
- Review the output of `swic cartridge list` to understand scope resolution
- Use `--scope` explicitly if auto-resolution behaves unexpectedly
