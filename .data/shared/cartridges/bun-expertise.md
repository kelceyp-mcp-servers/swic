---
synopsis: 
  - Knowledge cartridge
  - Critical module mock persistence issue
  - Test execution requirements
  - SQLite API differences
  - Express compatibility insights
  - Import patterns and requirements
---

# Audience

Claude Code or other agentic agents working with Bun runtime in the MCP Stories project.

# Abstract

This document captures Bun-specific issues, workarounds, and patterns discovered during development. It focuses on critical differences from Node.js, test infrastructure limitations, and compatibility insights that prevent repeating past mistakes.

## Critical: Module Mock Persistence Issue

### Problem
Module mocks created with `mock.module()` persist between test files when running `bun test` directly. This causes test pollution where mocks from one test file affect others.

### Root Cause
`mock.restore()` only restores function mocks, not module mocks. This is a known Bun limitation.

### GitHub Issues
- [#7823 - Restore mock.module using mock.restore not work as expect](https://github.com/oven-sh/bun/issues/7823)
- [#6040 - mock and spyOn are not reset after each test](https://github.com/oven-sh/bun/issues/6040)
- [#5391 - Mocks aren't automatically reset between tests](https://github.com/oven-sh/bun/issues/5391)

### Solution
Run different test types in separate processes:

```json
// package.json
{
  "scripts": {
    "test": "bun run test:integration && bun run test:unit",
    "test:unit": "bun test test-unit",
    "test:integration": "bun test test-integration"
  }
}
```

### Critical Rules
```bash
# ❌ NEVER use this - tests will fail due to mock pollution
bun test

# ✅ ALWAYS use these instead
bun run test         # Runs both in sequence
bun run test:unit    # Unit tests only
bun run test:integration  # Integration tests only
```

### Example of the Problem
```typescript
// test1.ts
mock.module('fs', () => ({ existsSync: () => false }));

// test2.ts
// fs.existsSync will still return false here!
import { existsSync } from 'fs';
```

## SQLite API Differences

### Bun's Native SQLite (`bun:sqlite`)
Different from better-sqlite3 in several ways:

1. **No `fileMustExist` option**
   ```typescript
   // ❌ Not available in Bun
   new Database('file.db', { fileMustExist: true });
   
   // ✅ Manual check required
   import { existsSync } from 'fs';
   if (!existsSync(dbPath)) {
       throw new Error(`Database file does not exist: ${dbPath}`);
   }
   const db = new Database(dbPath);
   ```

2. **API Methods**
   ```typescript
   // Schema operations (no return value needed)
   db.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)`);
   
   // DML operations (returns { lastInsertRowid, changes })
   db.run('INSERT INTO users (name) VALUES (?)', ['John']);
   
   // Query operations
   const query = db.query('SELECT * FROM users WHERE id = ?');
   query.get(1);     // Get first result
   query.all();      // Get all results
   query.values();   // Get results as arrays
   ```

3. **Synchronous by Default**
   - All operations are synchronous
   - No async variants needed
   - Built into runtime - no compilation issues

## Express and Node.js HTTP Compatibility

### Discovery
Initially assumed Bun didn't support Node.js HTTP APIs, but this was incorrect!

### Reality
- ✅ Express.js is FULLY COMPATIBLE with Bun
- ✅ Runs 3x faster on Bun vs Node.js
- ✅ `node:http` module fully implemented
- ✅ ServerResponse methods (writeHead, write, end) all work

### Proof
```typescript
// This works perfectly in Bun!
import express from 'express';
const app = express();

app.get('/', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('Hello from Bun!');
    res.end();
});

app.listen(3000);
```

## Import Pattern Requirements

### ES Modules Only
Bun supports CommonJS but the project uses ES modules exclusively:

```typescript
// ✅ ALWAYS use ES module imports
import { existsSync } from 'fs';
import * as fs from 'fs';
import Database from './Database.ts';

// ❌ NEVER use CommonJS (even though Bun allows it)
const fs = require('fs');
module.exports = Database;
```

### TypeScript Import Extensions
```typescript
// ✅ CORRECT - Include .ts extension with Bun
import McpServer from './McpServer.ts';
import type { Story } from './types.ts';

// ❌ INCORRECT - Missing extension
import McpServer from './McpServer';

// ❌ INCORRECT - Using .js for TypeScript files
import McpServer from './McpServer.js';
```

## Native TypeScript Support

### No Build Step Required
- Bun runs TypeScript files directly
- No transpilation overhead
- Full type checking at runtime
- Native performance

### Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",  // For Bun
    "types": ["bun-types"]          // For server code
  }
}
```

## Module-Level Imports for Better Mocking

### Best Practice
Always import at module level for easier mocking:

```typescript
// ✅ GOOD - Easy to mock
import { existsSync } from 'fs';

const create = (options) => {
    if (!existsSync(path)) { /* ... */ }
};

// ❌ BAD - Harder to mock
const create = async (options) => {
    const { existsSync } = await import('fs');  // Dynamic import
    if (!existsSync(path)) { /* ... */ }
};
```

## Testing Patterns

### Mock Restoration Workaround
For critical cases, store and restore the original module:

```typescript
import * as fsOriginal from 'fs';

test('with mock', () => {
    mock.module('fs', () => ({ existsSync: () => false }));
    // test code
});

test('restore original', () => {
    mock.module('fs', () => fsOriginal);
    // fs should work normally
});
```

### Preload for Consistent Mocks
Create a preload file for mocks that should apply to all tests:

```typescript
// test-preload.ts
import { mock } from 'bun:test';

mock.module('./config', () => ({
    API_URL: 'http://test.local'
}));
```

Run with:
```bash
bun test --preload ./test-preload.ts
```

## Performance Characteristics

### Advantages Over Node.js
1. **3x faster** Express.js performance
2. **Native SQLite** without compilation
3. **Zero-overhead** TypeScript execution
4. **Fast test runner** (when used correctly)

### Caveats
1. Module mocks persist (major testing issue)
2. Some Node.js APIs have subtle differences
3. Ecosystem compatibility varies

## Key Takeaways

1. **Always run tests separately** to avoid mock pollution
2. **Use ES modules exclusively** for consistency
3. **Include .ts extensions** in imports
4. **Express works great** - no custom transport needed
5. **Check file existence manually** for SQLite databases
6. **Import at module level** for better testability
7. **Monitor GitHub issues** for mock persistence fixes

## Process Management and File I/O

### Bun.spawn File Descriptor Handling
When spawning processes with `Bun.spawn`, file descriptors can be used for stdout/stderr redirection:

```typescript
// ✅ CORRECT - Use file descriptor for append mode
import { openSync } from 'fs';
const logFd = openSync(logFile, 'a');  // 'a' for append mode

const process = Bun.spawn(['command'], {
    stdout: logFd,
    stderr: logFd
});

// ❌ INCORRECT - Node.js streams not directly supported
import { createWriteStream } from 'fs';
const logStream = createWriteStream(logFile, { flags: 'a' });

const process = Bun.spawn(['command'], {
    stdout: logStream,  // TypeError: stdio must be an array...
    stderr: logStream
});
```

### Bun.file() Limitations
`Bun.file()` always opens in write mode, overwriting existing content:

```typescript
// ❌ This OVERWRITES the file each time
const process = Bun.spawn(['command'], {
    stdout: Bun.file(logFile),  // No append mode option
    stderr: Bun.file(logFile)
});

// ✅ Use openSync with 'a' flag for append mode
const logFd = openSync(logFile, 'a');
```

## References
- Bun Testing Guide: `.sdlc/cartridges/project/bun-testing-patterns.md`
- Test setup issues discovered during Work Items #1-10
- Express compatibility proven in Work Item #9 PoC
- Process spawn logging discovered during timezone implementation