# Index Implementation Gap Analysis

## 1. Current Index Format vs. Required Format

### Current Format (Actual State)

The current index files (`.swic/docs/.index.json` for project, `~/.swic/docs/.index.json` for shared) use a flat structure:

```json
{
  "doc001": "auth/jwt-setup.md",
  "doc002": "testing/patterns",
  "doc003": "workflows/tdd.txt"
}
```

This is a simple key-value mapping where:
- Keys are doc IDs (e.g., `doc001`, `sdoc001`)
- Values are paths (e.g., `auth/jwt-setup.md`)

TypeScript definition in `DocService.ts` (line 223):
```typescript
interface IndexData {
    [id: string]: string;
}
```

### Required Format (Per Specification)

According to doc011 (swic/spec/docs.md), the index should have a bidirectional structure:

```json
{
  "id": {
    "doc001": {
      "path": "auth/jwt-setup.md"
    },
    "doc002": {
      "path": "testing/patterns"
    }
  },
  "pathToId": {
    "auth/jwt-setup.md": "doc001",
    "testing/patterns": "doc002"
  }
}
```

This structure provides:
- `id` object: ID-keyed metadata with path stored as a property
- `pathToId` object: Direct path-to-ID reverse mapping for O(1) lookups

### Critical Bug Found

**Lines 409 and 421 in `DocService.ts` contain broken code:**

```typescript
// Line 409 - BROKEN
const projectEntry = Object.entries(projectIndex.index).find(([_, p]) => p === addr.path);

// Line 421 - BROKEN
const sharedEntry = Object.entries(sharedIndex.index).find(([_, p]) => p === addr.path);
```

This code tries to access `.index` property on the index data, which doesn't exist in the current flat structure (`IndexData` is `{[id: string]: string}`). This is remnant code from a partial implementation attempt and will cause runtime errors when path-based scope resolution is attempted.

## 2. Address Resolution: Current Implementation

### ID-Based Addressing (Method 2)

**Location:** `DocService.ts`, line 669-676 in `resolveAddress()` function

```typescript
// ID-based addressing: lookup in index
const { id } = addr;

if (!validateId(id)) {
    fail('INVALID_ID_FORMAT', `ID must match pattern doc\\d{3,} or sdoc\\d{3,}, got '${id}'`, { id });
}

const index = await readIndex(scope);

if (!index[id]) {
    fail('doc_NOT_FOUND', `No doc with ID '${id}' in scope '${scope}'`, { id, scope });
}

docPath = index[id];
```

**How it works:**
1. Validate ID format using `validateId()` (delegates to `DocAddressResolver`)
2. Read index for the scope
3. Direct property access: `index[id]` retrieves the path
4. This is O(1) lookup

**Verdict:** Simple and works correctly with current flat structure

### Path-Based Addressing (Method 1) - ID Lookup

**Location:** `DocService.ts`, multiple locations

**For reading docs** (line 792):
```typescript
const index = await readIndex(scope);
const foundId = Object.keys(index).find(id => index[id] === canonicalPath);
```

**For deleting docs** (line 884):
```typescript
const index = await readIndex(scope);
const foundId = Object.keys(index).find(id => index[id] === normalized.path);
```

**How it works:**
1. Read the entire index
2. Get all ID keys with `Object.keys(index)`
3. Linear scan using `.find()` to match path value
4. This is **O(n) lookup** - iterates through all entries

**Verdict:** Works but inefficient - scanning entire index for reverse lookup

### Path-Based Addressing - Scope Resolution

**Location:** `DocService.ts`, line 404-432 in `resolveScopeForAddress()`

```typescript
// Path-based: try project first, then shared
if (addr.kind === 'path') {
    // Check if exists in project scope
    try {
        const projectIndex = await readIndex('project');
        // Look for doc by path in project index
        const projectEntry = Object.entries(projectIndex.index).find(([_, p]) => p === addr.path);
        if (projectEntry) {
            return { scope: 'project' };
        }
    }
    catch {
        // Project index doesn't exist or error reading - fall through to shared
    }

    // Check if exists in shared scope
    try {
        const sharedIndex = await readIndex('shared');
        const sharedEntry = Object.entries(sharedIndex.index).find(([_, p]) => p === addr.path);
        if (sharedEntry) {
            return { scope: 'shared', fallback: true };
        }
    }
    catch {
        // Shared index doesn't exist or error reading
    }

    // Not found in either scope - default to project for create operations
    return { scope: 'project' };
}
```

**Critical Issue:** This code accesses `projectIndex.index` and `sharedIndex.index` which don't exist in the current flat structure. This will cause runtime errors.

**Intended behavior:** When scope is omitted, check project index first, then shared index to determine which scope contains the path.

**Verdict:** BROKEN - will throw runtime errors

## 3. Index Read/Write Locations

### Reading Index

All index reads go through a single function:

**Function:** `readIndex(scope: Scope): Promise<IndexData>`
**Location:** `DocService.ts`, line 453-469

```typescript
const readIndex = async (scope: Scope): Promise<IndexData> => {
    const indexPath = getIndexPath(scope);
    const fileService = getFileService(scope);

    try {
        const content = await fileService.readText(indexPath);
        const index = JSON.parse(content) as IndexData;
        return index;
    }
    catch (error: any) {
        // If index doesn't exist, return empty index
        if (error.code === 'NOT_FOUND') {
            return {};
        }
        throw error;
    }
};
```

**Called from:**
1. Line 407: `resolveScopeForAddress()` - for project scope check (BROKEN)
2. Line 420: `resolveScopeForAddress()` - for shared scope check (BROKEN)
3. Line 669: `resolveAddress()` - for ID-to-path lookup
4. Line 694: `generateNextId()` - to find max ID number
5. Line 756: `createdoc()` - before writing new entry
6. Line 791: `readdoc()` - for path-to-ID lookup
7. Line 802: `readdoc()` - for ID-to-path lookup
8. Line 883: `deleteLatest()` - for path-to-ID lookup
9. Line 912: `deleteLatest()` - to check before removal
10. Line 980: `listdocsInScope()` - to enumerate all docs

### Writing Index

All index writes go through a single function:

**Function:** `writeIndex(scope: Scope, index: IndexData): Promise<void>`
**Location:** `DocService.ts`, line 476-484

```typescript
const writeIndex = async (
    scope: Scope,
    index: IndexData
): Promise<void> => {
    const indexPath = getIndexPath(scope);
    const fileService = getFileService(scope);
    const content = JSON.stringify(index, null, 2);
    await fileService.writeText(indexPath, content);
};
```

**Called from:**
1. Line 758: `createdoc()` - after adding new entry
2. Line 915: `deleteLatest()` - after removing entry

### Index Path Resolution

**Function:** `getIndexPath(scope: Scope): string`
**Location:** `DocService.ts`, line 444-446

```typescript
const getIndexPath = (_scope: Scope): string => {
    return indexFilename;
};
```

Returns `.index.json` (constant from `Core.ts`, line 26)

## 4. Address Resolution Locations

### Where ID-to-Path Resolution Occurs

1. **Line 671-675** (`resolveAddress()`) - Main resolution for all operations
   - Used by: read, edit, delete operations
   - Lookup: `index[id]` (O(1))

2. **Line 803** (`readdoc()`) - Canonical path lookup
   - Used when reading by ID
   - Lookup: `index[canonicalId]` (O(1))

### Where Path-to-ID Resolution Occurs

1. **Line 409** (`resolveScopeForAddress()`) - BROKEN, accesses `.index` property
   - Purpose: Check if path exists in project scope
   - Current: Will throw runtime error

2. **Line 421** (`resolveScopeForAddress()`) - BROKEN, accesses `.index` property
   - Purpose: Check if path exists in shared scope
   - Current: Will throw runtime error

3. **Line 792** (`readdoc()`) - Working but inefficient
   - Purpose: Find ID for a given path when reading
   - Lookup: `Object.keys(index).find(id => index[id] === canonicalPath)` (O(n))

4. **Line 884** (`deleteLatest()`) - Working but inefficient
   - Purpose: Find ID for a given path when deleting
   - Lookup: `Object.keys(index).find(id => index[id] === normalized.path)` (O(n))

### No Direct File Access

All file access goes through the index. There are no code paths that bypass the index to access doc files directly.

## 5. Gap Analysis

### Gap 1: Index Structure (CRITICAL)

**Current:** Flat `{[id: string]: string}`
**Required:** Nested with `id` and `pathToId` objects
**Impact:** CRITICAL - Broken code at lines 409, 421; inefficient O(n) lookups
**Complexity:** Medium

**Changes needed:**
- Update `IndexData` type definition (line 223)
- Update `readIndex()` to handle new structure (line 453)
- Update `writeIndex()` to serialize new structure (line 476)
- Fix lines 409, 421 to use `pathToId` mapping
- Replace all `Object.keys(index).find()` patterns with `pathToId` lookups

### Gap 2: Path-to-ID Reverse Lookup (HIGH PRIORITY)

**Current:** O(n) linear scan with `.find()`
**Required:** O(1) lookup using `pathToId` object
**Impact:** HIGH - Performance and code correctness
**Complexity:** Simple (once index structure is fixed)

**Changes needed:**
- Line 792: Replace with `index.pathToId[canonicalPath]`
- Line 884: Replace with `index.pathToId[normalized.path]`

### Gap 3: Scope Resolution (CRITICAL BUG)

**Current:** Broken - accesses non-existent `.index` property
**Required:** Use `pathToId` mapping to check if path exists
**Impact:** CRITICAL - Runtime errors on scope resolution
**Complexity:** Simple (once index structure is fixed)

**Changes needed:**
- Line 409: Replace with `index.pathToId[addr.path]`
- Line 421: Replace with `index.pathToId[addr.path]`

### Gap 4: Index Maintenance (MEDIUM)

**Current:** Only writes `id -> path` mapping
**Required:** Write both `id` and `pathToId` mappings
**Impact:** MEDIUM - Index becomes stale if not bidirectional
**Complexity:** Simple

**Changes needed:**
- Update `createdoc()` to add both mappings
- Update `deleteLatest()` to remove from both mappings

### Gap 5: Type Safety (LOW)

**Current:** Generic `IndexData` interface
**Required:** Strongly typed with `id` and `pathToId` properties
**Impact:** LOW - Better IDE support and compile-time checks
**Complexity:** Simple

**Changes needed:**
- Define proper TypeScript interface for new structure
- Update type annotations throughout

## 6. Proposed Changes

### Change 1: Update Index Type Definition

**File:** `src/core/services/DocService.ts`, line 223

**From:**
```typescript
interface IndexData {
    [id: string]: string;
}
```

**To:**
```typescript
interface IndexData {
    id: {
        [id: string]: {
            path: string;
        };
    };
    pathToId: {
        [path: string]: string;
    };
}
```

**Why:** Matches spec requirement, enables O(1) bidirectional lookups

### Change 2: Update readIndex() Function

**File:** `src/core/services/DocService.ts`, line 453-469

**Current handling:**
- Returns `{}` if index doesn't exist
- Parses JSON as `IndexData`

**Proposed:**
```typescript
const readIndex = async (scope: Scope): Promise<IndexData> => {
    const indexPath = getIndexPath(scope);
    const fileService = getFileService(scope);

    try {
        const content = await fileService.readText(indexPath);
        const index = JSON.parse(content) as IndexData;
        return index;
    }
    catch (error: any) {
        // If index doesn't exist, return empty index with new structure
        if (error.code === 'NOT_FOUND') {
            return { id: {}, pathToId: {} };
        }
        throw error;
    }
};
```

**Why:** Empty index must have correct structure

### Change 3: Fix Scope Resolution (Lines 409, 421)

**File:** `src/core/services/DocService.ts`, lines 404-432

**From:**
```typescript
const projectEntry = Object.entries(projectIndex.index).find(([_, p]) => p === addr.path);
// ... and ...
const sharedEntry = Object.entries(sharedIndex.index).find(([_, p]) => p === addr.path);
```

**To:**
```typescript
const projectId = projectIndex.pathToId[addr.path];
if (projectId) {
    return { scope: 'project' };
}
// ... and ...
const sharedId = sharedIndex.pathToId[addr.path];
if (sharedId) {
    return { scope: 'shared', fallback: true };
}
```

**Why:** Fixes critical bug, uses O(1) lookup instead of non-existent property

### Change 4: Fix Path-to-ID Lookups (Lines 792, 884)

**File:** `src/core/services/DocService.ts`

**Line 792 - From:**
```typescript
const foundId = Object.keys(index).find(id => index[id] === canonicalPath);
```

**Line 792 - To:**
```typescript
const foundId = index.pathToId[canonicalPath];
```

**Line 884 - From:**
```typescript
const foundId = Object.keys(index).find(id => index[id] === normalized.path);
```

**Line 884 - To:**
```typescript
const foundId = index.pathToId[normalized.path];
```

**Why:** O(1) lookup instead of O(n) scan

### Change 5: Fix ID-to-Path Lookups (Lines 671, 803)

**File:** `src/core/services/DocService.ts`

**Line 671 - From:**
```typescript
if (!index[id]) {
    fail('doc_NOT_FOUND', ...);
}
docPath = index[id];
```

**Line 671 - To:**
```typescript
if (!index.id[id]) {
    fail('doc_NOT_FOUND', ...);
}
docPath = index.id[id].path;
```

**Line 803 - From:**
```typescript
const foundPath = index[canonicalId];
```

**Line 803 - To:**
```typescript
const foundPath = index.id[canonicalId]?.path;
```

**Why:** Access path through new structure

### Change 6: Update Index Write Operations

**File:** `src/core/services/DocService.ts`

**Line 757 (createdoc) - From:**
```typescript
const index = await readIndex(scope);
index[id] = path;
await writeIndex(scope, index);
```

**Line 757 (createdoc) - To:**
```typescript
const index = await readIndex(scope);
index.id[id] = { path };
index.pathToId[path] = id;
await writeIndex(scope, index);
```

**Line 913-915 (deleteLatest) - From:**
```typescript
if (index[docId]) {
    delete index[docId];
    await writeIndex(scope, index);
}
```

**Line 913-915 (deleteLatest) - To:**
```typescript
if (index.id[docId]) {
    const path = index.id[docId].path;
    delete index.id[docId];
    delete index.pathToId[path];
    await writeIndex(scope, index);
}
```

**Why:** Maintain both mappings in sync

### Change 7: Update List Operation (Line 992)

**File:** `src/core/services/DocService.ts`

**Line 992 - From:**
```typescript
for (const [id, path] of Object.entries(index)) {
```

**Line 992 - To:**
```typescript
for (const [id, metadata] of Object.entries(index.id)) {
    const path = metadata.path;
```

**Why:** Iterate through new structure

### Change 8: Update ID Generation (Line 701)

**File:** `src/core/services/DocService.ts`

**Line 701 - From:**
```typescript
for (const id of Object.keys(index)) {
```

**Line 701 - To:**
```typescript
for (const id of Object.keys(index.id)) {
```

**Why:** Get IDs from new structure

## 7. Migration Strategy

### Option A: Automatic Migration on First Read (RECOMMENDED)

**Approach:**
1. Modify `readIndex()` to detect old format
2. If old format detected, convert to new format in-memory
3. Immediately write back new format
4. Return new format to caller

**Implementation:**
```typescript
const readIndex = async (scope: Scope): Promise<IndexData> => {
    const indexPath = getIndexPath(scope);
    const fileService = getFileService(scope);

    try {
        const content = await fileService.readText(indexPath);
        const parsed = JSON.parse(content);

        // Detect old format: has string values instead of nested structure
        const isOldFormat = !parsed.id && !parsed.pathToId;

        if (isOldFormat) {
            // Migrate old format to new format
            const migrated: IndexData = {
                id: {},
                pathToId: {}
            };

            for (const [id, path] of Object.entries(parsed)) {
                migrated.id[id] = { path: path as string };
                migrated.pathToId[path as string] = id;
            }

            // Write back immediately
            await writeIndex(scope, migrated);

            return migrated;
        }

        return parsed as IndexData;
    }
    catch (error: any) {
        if (error.code === 'NOT_FOUND') {
            return { id: {}, pathToId: {} };
        }
        throw error;
    }
};
```

**Pros:**
- Transparent to users
- Happens automatically
- Works for both project and shared scopes
- No manual intervention needed

**Cons:**
- Writes during read operation (side effect)
- Small performance cost on first read per scope

**Migration failure handling:**
- If write fails: Log warning, continue with migrated in-memory version
- On subsequent reads: Retry migration until write succeeds

### Option B: Explicit Migration Script

**Approach:**
1. Create standalone migration script
2. Users run script manually before upgrade
3. Script processes both scopes

**Implementation:**
```typescript
// scripts/migrate-index.ts
import { readFile, writeFile } from 'fs/promises';

async function migrateIndex(indexPath: string) {
    const content = await readFile(indexPath, 'utf-8');
    const old = JSON.parse(content);

    const migrated = {
        id: {},
        pathToId: {}
    };

    for (const [id, path] of Object.entries(old)) {
        migrated.id[id] = { path };
        migrated.pathToId[path] = id;
    }

    await writeFile(indexPath, JSON.stringify(migrated, null, 2));
    console.log(`Migrated ${indexPath}`);
}

await migrateIndex('.swic/docs/.index.json');
await migrateIndex('~/.swic/docs/.index.json');
```

**Pros:**
- Explicit control
- No unexpected writes
- Can verify migration before proceeding

**Cons:**
- Requires user action
- Easy to forget
- Breaks if script not run

**Not recommended** because SWIC has no users yet, so automatic migration is simpler.

### Option C: No Migration - Just Migrate

**Approach:**
1. Update code to use new format
2. Manually edit existing index files
3. Document breaking change

**Pros:**
- Simplest implementation
- No migration code needed

**Cons:**
- Manual work required
- Error-prone
- Doesn't scale

**Not recommended** - too manual.

### Recommended Strategy: Option A

Use automatic migration on first read for these reasons:

1. **SWIC is pre-v1.0** - No external users to worry about
2. **Transparent** - Works automatically, no user intervention
3. **Safe** - Reads old format, writes new format atomically
4. **Simple** - One code path handles both formats temporarily
5. **Self-healing** - Retries until write succeeds

**Implementation order:**
1. Update `IndexData` type definition
2. Add migration logic to `readIndex()`
3. Update all index access patterns to use new structure
4. Test with existing index files
5. Verify migration happens correctly
6. Remove migration code in future version (v1.0+)

**Migration removal:**
Once we're confident all index files have migrated (after a few releases), remove the migration detection and just parse as new format. This simplifies the code long-term.

## Summary

**Exploration Complete:** Yes

**Key Findings:**
1. Current index uses flat `{id: path}` structure
2. Spec requires nested `{id: {...}, pathToId: {...}}` structure
3. **CRITICAL BUG:** Lines 409 and 421 access non-existent `.index` property causing runtime errors
4. Path-to-ID lookups are inefficient O(n) scans instead of O(1) lookups
5. All index access goes through two functions: `readIndex()` and `writeIndex()`
6. No tests exist to catch these issues

**Recommendation:** PROCEED to implementation with automatic migration strategy (Option A).
