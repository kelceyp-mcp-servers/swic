---
synopsis:
  - Knowledge cartridge
  - Bun-specific testing knowledge
  - Module mock workarounds
  - Test runner configuration
---

# Audience

Claude Code or other agentic agents writing tests in the MCP Stories project using Bun's test runner.

# Abstract

This document provides comprehensive guidance for Bun's built-in test runner, focusing on critical limitations like module mock persistence, SQLite API differences, and essential workarounds that ensure reliable test execution.

## Table of Contents
1. [Bun Test Runner Basics](#bun-test-runner-basics)
2. [SQLite API in Bun](#sqlite-api-in-bun)
3. [Module Mocking](#module-mocking)
4. [Known Limitations](#known-limitations)
5. [Workarounds](#workarounds)
6. [Best Practices](#best-practices)
7. [References](#references)

## Bun Test Runner Basics

Bun includes a fast, built-in test runner with Jest-like API. It runs TypeScript tests natively without transpilation.

### Basic Test Structure

```typescript
import { test, expect, describe } from 'bun:test';

test('basic test', () => {
    expect(1 + 1).toBe(2);
});

describe('test suite', () => {
    test('nested test', () => {
        expect(true).toBe(true);
    });
});
```

### Running Tests

```bash
# Run all tests
bun test

# Run tests in specific directory
bun test test-unit/core/db

# Run with watch mode
bun test --watch

# Run with coverage
bun test --coverage
```

## SQLite API in Bun

Bun includes native SQLite support via `bun:sqlite`. Key methods:

### Database Operations

```typescript
import { Database } from 'bun:sqlite';

const db = new Database('mydb.sqlite');

// Execute SQL (for schema changes, no return value needed)
db.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)`);

// Prepare a query (cached)
const query = db.query('SELECT * FROM users WHERE id = ?');

// Execute query methods:
query.get(1);        // Get first result
query.all();         // Get all results
query.run(1);        // Execute, return { lastInsertRowid, changes }
query.values();      // Get results as arrays

// Close when done
db.close();
```

### Important Notes
- `db.exec()` is for DDL/schema operations
- `db.run()` is for DML operations (INSERT, UPDATE, DELETE)
- `db.query()` prepares and caches statements
- Use parameterized queries to prevent SQL injection

## Module Mocking

Bun provides `mock.module()` for mocking both ES modules and CommonJS modules.

### Basic Module Mocking

```typescript
import { mock, test, expect } from 'bun:test';

// Mock a module
mock.module('fs', () => ({
    existsSync: mock(() => true),
    readFileSync: mock(() => 'mocked content')
}));

// Import after mocking
import * as fs from 'fs';

test('uses mocked fs', () => {
    expect(fs.existsSync('/any/path')).toBe(true);
});
```

### Mocking Bun Built-ins

```typescript
mock.module('bun:sqlite', () => ({
    Database: mock(() => ({
        query: mock(() => ({
            get: mock(() => ({ id: 1, name: 'Test' })),
            all: mock(() => []),
            run: mock(() => ({ lastInsertRowid: 1, changes: 1 }))
        })),
        exec: mock(),
        close: mock()
    }))
}));
```

### Function Mocking

```typescript
const myMock = mock((x: number) => x * 2);

test('mock function', () => {
    myMock(5);
    myMock(10);
    
    expect(myMock).toHaveBeenCalledTimes(2);
    expect(myMock).toHaveBeenCalledWith(5);
    expect(myMock.mock.calls).toEqual([[5], [10]]);
    expect(myMock.mock.results[0].value).toBe(10);
});
```

## Known Limitations

### 1. Module Mocks Persist Between Test Files

**Issue**: `mock.restore()` only restores function mocks, not module mocks. Module mocks persist across test files when running `bun test`.

**GitHub Issues**: 
- [#7823 - Restore mock.module using mock.restore not work as expect](https://github.com/oven-sh/bun/issues/7823)
- [#6040 - mock and spyOn are not reset after each test](https://github.com/oven-sh/bun/issues/6040)
- [#5391 - Mocks aren't automatically reset between tests](https://github.com/oven-sh/bun/issues/5391)

**Example of the Problem**:
```typescript
// test1.ts
mock.module('fs', () => ({ existsSync: () => false }));

// test2.ts
// fs.existsSync will still return false here!
import { existsSync } from 'fs';
```

**Real-World Impact from Story-001**:
During REST API implementation, we experienced cascading test failures when running `bun test` directly. Integration tests that mocked the Core module caused unit tests to fail because the mock persisted. This led to confusing errors where tests would pass individually but fail when run together.

**How This Differs from Jest**:
- **Jest**: Mocks are automatically cleared between test files
- **Bun**: Module mocks persist for the entire test run
- **Result**: Tests that pass in Jest may fail in Bun due to mock pollution

### 2. Incomplete Mock Objects Cause "Function Not Defined" Errors

**Issue**: When mocking objects that are used by multiple test cases, if the mock doesn't include ALL required functions, tests fail with "function is not defined" errors.

**Example of the Problem**:
```typescript
// ❌ INCOMPLETE MOCK - Missing functions that later tests need
mock.module('./StoryService', () => ({
    createStory: mock(() => ({ id: 1 })),
    // Missing listStoriesByUserId - causes test failures!
}));

// Later test that needs the missing function
const stories = StoryService.listStoriesByUserId(authContext, db, { userId: 1 });
// Error: StoryService.listStoriesByUserId is not a function
```

**Real-World Impact from Story-037**:
During deleteUser orchestrator implementation, we experienced intermittent test failures when the StoryService mock was added to SOME test cases but not ALL. Tests would fail with "StoryService.listStoriesByUserId is not a function" because the mock in the first test case didn't include the complete function set needed by subsequent tests.

**The Solution - Complete Mock Objects**:
```typescript
// ✅ COMPLETE MOCK - Include ALL functions that any test might need
mock.module('./StoryService', () => ({
    createStory: mock(() => ({ id: 1 })),
    updateStory: mock(() => ({ id: 1 })),
    deleteStory: mock(() => undefined),
    listStories: mock(() => []),
    listStoriesByUserId: mock(() => []), // ← Include ALL functions!
    // ... any other functions that tests might call
}));
```

**Best Practice**: When creating mocks, always include ALL public functions from the module, even if they just return empty/default values. This prevents mock pollution between tests.

### 3. CommonJS Compatibility in ESM

**Behavior**: Bun allows `require()` in ESM modules, unlike Node.js, but we don't use this feature.

```typescript
// This works in Bun but we DON'T use it
// const fs = require('fs');

// Always use standard ESM imports
import { existsSync } from 'fs';
import * as fs from 'fs';
```

**Standard**: Always use ES module imports for consistency and portability. See [TypeScript Standards](./typescript-standards.md).

### Concrete Example from Story-001

The problem manifested when our integration tests mocked the Core module:

```typescript
// test-integration/services/rest-api/story-documents.integration.test.ts
mock.module('../../../src/core/Core', () => ({
    Core: {
        create: mock(() => mockCoreInstance)
    }
}));

// Later, in test-unit/services/rest-api/routes/story-documents.test.ts
// This test would fail because Core was still mocked!
import Core from '../../../../src/core/Core';
// Core.create would return the mock instead of the real implementation
```

**The Fix**: We implemented separate test execution commands:
```json
{
  "scripts": {
    "test": "bun run test:integration && bun run test:unit",
    "test:unit": "bun test test-unit",
    "test:integration": "bun test test-integration"
  }
}
```

## Workarounds

### 1. Separate Test Execution

Run unit and integration tests in separate processes to avoid mock pollution:

```json
{
  "scripts": {
    "test": "bun run test:integration && bun run test:unit",
    "test:unit": "bun test test-unit",
    "test:integration": "bun test test-integration"
  }
}
```

### 2. Module-Level Imports for Better Mocking

Always use module-level imports:
```typescript
// ❌ Harder to mock - dynamic import
const create = async (options) => {
    const { existsSync } = await import('fs');
    if (!existsSync(path)) { /* ... */ }
};

// ✅ Easier to mock - module-level import
import { existsSync } from 'fs';

const create = (options) => {
    if (!existsSync(path)) { /* ... */ }
};
```

### 3. Restore Workaround (Partial)

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

### 4. Use Preload for Consistent Mocks

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

### 5. File Organization to Minimize Conflicts

Organize test files to reduce mock conflicts:

```
test-unit/
├── mocked/           # Tests that heavily use mocks
│   └── services/
└── unmocked/         # Tests that use real implementations
    └── utils/

test-integration/
├── api/              # API tests (mock external services)
└── database/         # DB tests (use real database)
```

### 6. Future Bun Updates

Monitor these GitHub issues for Bun updates that might resolve the mock persistence issue:
- [#7823](https://github.com/oven-sh/bun/issues/7823) - Primary issue tracking mock.restore for modules
- [#6040](https://github.com/oven-sh/bun/issues/6040) - Related mock reset discussion
- [#5391](https://github.com/oven-sh/bun/issues/5391) - Auto-reset mocks feature request

When Bun implements proper module mock restoration, update this document and potentially simplify the test execution strategy.

## Best Practices

### 1. Test Organization

```
src/
├── core/
│   └── db/
│       └── Database.ts
test-unit/
└── core/
    └── db/
        └── Database.test.ts
test-integration/
└── core/
    └── db/
        └── Database.test.ts
```

### 2. Mocking Strategy

- **Unit Tests**: Mock all external dependencies
- **Integration Tests**: Mock only external services, use real database/file system
- **Keep mocks close to tests**: Avoid global mocks when possible

### Module Mocking Best Practices

Given the persistence issue, follow these guidelines:

1. **Never use `bun test` directly**
   ```bash
   # ❌ WRONG - causes mock pollution
   bun test
   
   # ✅ CORRECT - runs tests in separate processes
   bun run test
   ```

2. **Place mocks at the top of test files**
   ```typescript
   // ✅ GOOD - mock before any imports that use it
   mock.module('fs', () => ({ /* mocked fs */ }));
   import { myFunction } from './my-module'; // uses fs internally
   
   // ❌ BAD - import happens before mock
   import { myFunction } from './my-module';
   mock.module('fs', () => ({ /* too late! */ }));
   ```

3. **Never rely on mock state between files**
   ```typescript
   // ❌ BAD - assuming mock from another file
   test('uses mocked fs', () => {
       // Don't assume fs is mocked from another test
   });
   
   // ✅ GOOD - always set up your own mocks
   mock.module('fs', () => ({ /* explicit mock */ }));
   test('uses mocked fs', () => {
       // Now we know fs is mocked
   });
   ```

4. **Consider mock.restore() patterns (limited effectiveness)**
   ```typescript
   afterEach(() => {
       mock.restore(); // Only restores function mocks, not modules
   });
   ```

### 3. Test Execution Order

Given the module mock persistence issue:
1. Run integration tests first (less likely to have mocks)
2. Run unit tests second (heavily mocked)
3. Use separate commands for different test types

### 4. TypeScript Best Practices

```typescript
// Import types for better type safety in tests
import type { Database } from 'bun:sqlite';

// Use satisfies for mock type checking
const mockDb = {
    query: mock(),
    exec: mock(),
    close: mock()
} satisfies Partial<Database>;
```

## References

### Official Documentation
- [Bun Test Runner](https://bun.sh/docs/cli/test)
- [Bun Mocks](https://bun.sh/docs/test/mocks)
- [Bun SQLite](https://bun.sh/docs/api/sqlite)

### GitHub Issues
- [Module mock persistence (#7823)](https://github.com/oven-sh/bun/issues/7823)
- [Mock reset between tests (#6040)](https://github.com/oven-sh/bun/issues/6040)
- [Auto-reset mocks (#5391)](https://github.com/oven-sh/bun/issues/5391)
- [Module mocking implementation (#5394)](https://github.com/oven-sh/bun/issues/5394)

### Community Resources
- [Bun Discord](https://bun.sh/discord) - Active community for questions
- [Stack Overflow - bun tag](https://stackoverflow.com/questions/tagged/bun)

## Troubleshooting Module Mock Issues

### Symptoms of Mock Persistence

1. **Tests pass individually but fail when run together**
   ```bash
   # This passes
   bun test test-unit/mytest.test.ts
   
   # But this fails
   bun test
   ```

2. **Unexpected mock behavior in unrelated tests**
   - Functions returning mocked values when they shouldn't
   - Database calls returning mock data instead of hitting the real DB
   - Import errors due to mocked modules

3. **Type errors that don't make sense**
   ```typescript
   // Error: Property 'create' does not exist on type...
   // Even though create definitely exists on the real module
   ```

### How to Diagnose Mock Pollution

1. **Run tests in isolation**
   ```bash
   # Run each test file separately to see which pass alone
   find test-unit -name "*.test.ts" -exec bun test {} \;
   ```

2. **Check for module mocks**
   ```bash
   # Find all files using mock.module
   grep -r "mock.module" test-unit test-integration
   ```

3. **Add debug logging**
   ```typescript
   // At the top of the failing test
   console.log('Module state:', require.cache);
   console.log('Is mocked?', myModule.isMocked);
   ```

### Debug Strategies

1. **Binary search for the culprit**
   - Comment out half the test files
   - Run tests to see if issue persists
   - Narrow down which file introduces the bad mock

2. **Check import order**
   ```typescript
   // Add at test file start
   console.log('Loading test:', __filename);
   console.log('Modules loaded:', Object.keys(require.cache));
   ```

3. **Temporary fix while debugging**
   ```typescript
   // Force a fresh module state (not always reliable)
   delete require.cache[require.resolve('./my-module')];
   ```

### Common Culprits

1. **Integration tests mocking core modules**
   - These often mock fundamental modules that unit tests need unmocked
   - Solution: Run integration tests in a separate process

2. **Test utilities with global mocks**
   - Helper files that set up mocks at import time
   - Solution: Convert to functions that set up mocks on demand

3. **Before/after hooks with module mocks**
   - Global setup files that mock modules
   - Solution: Move mocks into individual test files

## Summary

Bun's test runner is fast and powerful but has some limitations, particularly with module mocking. By understanding these limitations and applying the workarounds documented here, you can write effective tests. Monitor the GitHub issues for updates as the Bun team actively improves the testing framework.