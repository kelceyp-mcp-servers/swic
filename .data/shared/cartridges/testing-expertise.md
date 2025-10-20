---
synopsis:
  - Knowledge cartridge
  - Test execution strategy (never use `bun test` directly!)
  - Module mocking patterns and limitations
  - Test organization and isolation
  - Known infrastructure issues
---

# Audience

Claude Code or other agentic agents writing and maintaining tests in the MCP Stories project.

# Abstract

This document captures critical testing expertise including the mandatory test execution strategy to avoid module mock pollution, testing patterns for unit and integration tests, Bun-specific workarounds, and best practices discovered through hard-won experience in the project.

## Critical: Test Execution Strategy

### The Golden Rule
```bash
# ❌ NEVER EVER use this command
bun test

# ✅ ALWAYS use these instead
bun run test              # Runs both test suites separately
bun run test:unit         # Unit tests only
bun run test:integration  # Integration tests only
```

### Why This Matters
Module mocks persist between test files when running `bun test` directly. This causes catastrophic test failures due to mock pollution. Tests that pass individually will fail when run together.

### package.json Setup
```json
{
  "scripts": {
    "test": "bun run test:integration && bun run test:unit",
    "test:unit": "bun test test-unit",
    "test:integration": "bun test test-integration"
  }
}
```

## Test Directory Organization

### Structure
```
project-root/
├── subprojects/server/
│   ├── src/               # Source code
│   ├── test-unit/         # Unit tests (mocked dependencies)
│   └── test-integration/  # Integration tests (real dependencies)
```

### Key Points
1. **Separate directories** prevent mock cross-contamination
2. **Mirror source structure** in test directories
3. **No nested test folders** inside src/

### Example
```
src/core/db/Database.ts
test-unit/core/db/Database.test.ts       # Mocked tests
test-integration/core/db/Database.test.ts # Real SQLite tests
```

## Module Mocking Patterns

### Basic Module Mock
```typescript
import { mock, test, expect } from 'bun:test';

// Mock BEFORE importing the module under test
mock.module('fs', () => ({
    existsSync: mock(() => false),
    readFileSync: mock(() => 'mocked content')
}));

// Import AFTER mocking
import MyModule from '../src/MyModule';

test('uses mocked fs', () => {
    // Test with mocked fs
});
```

### Restoration Workaround
```typescript
// Store original for manual restoration
import * as fsOriginal from 'fs';

test('with mock', () => {
    mock.module('fs', () => ({ existsSync: () => false }));
    // Test code
});

test('restore original', () => {
    // Manually restore original module
    mock.module('fs', () => fsOriginal);
    // fs works normally again
});
```

### Mock Function Patterns
```typescript
const myMock = mock((x: number) => x * 2);

test('mock function tracking', () => {
    myMock(5);
    myMock(10);
    
    expect(myMock).toHaveBeenCalledTimes(2);
    expect(myMock).toHaveBeenCalledWith(5);
    expect(myMock.mock.calls).toEqual([[5], [10]]);
    expect(myMock.mock.results[0].value).toBe(10);
});
```

## Database Testing Patterns

### Unit Tests (Mocked)
```typescript
test('validates database path', () => {
    // Mock file system
    mock.module('fs', () => ({
        existsSync: mock(() => false)
    }));
    
    // Import after mocking
    const Database = await import('../src/Database');
    
    expect(() => {
        Database.default.create({ databasePath: '/fake/path.db' });
    }).toThrow('Database file does not exist');
});
```

### Integration Tests (Real Database)
```typescript
import { Database } from 'bun:sqlite';

test('creates in-memory database', async () => {
    // Use real in-memory SQLite
    const db = await Database.create({ databasePath: ':memory:' });
    
    // Test real database operations
    const result = await db.db
        .selectFrom('stories')
        .selectAll()
        .execute();
    
    expect(result).toEqual([]);
    await db.close();
});
```

## Test Lifecycle Management

### Setup and Teardown
```typescript
import { beforeEach, afterEach, test } from 'bun:test';

let testDb: DatabaseInstance;

beforeEach(async () => {
    // Create fresh in-memory database for each test
    testDb = await Database.create({ databasePath: ':memory:' });
});

afterEach(async () => {
    // Clean up
    if (testDb) {
        await testDb.close();
    }
    // Restore mocks (only restores function mocks, not module mocks!)
    mock.restore();
});
```

### Important: mock.restore() Limitations
```typescript
afterEach(() => {
    mock.restore();  // ✅ Restores function mocks
                     // ❌ Does NOT restore module mocks!
});
```

## Async Testing Patterns

### Always Use Async/Await
```typescript
// ✅ CORRECT - Async test with proper error handling
test('async operation', async () => {
    const result = await someAsyncOperation();
    expect(result).toBe(expected);
});

// ❌ WRONG - Returns promise without await
test('async operation', () => {
    return someAsyncOperation().then(result => {
        expect(result).toBe(expected);
    });
});
```

### Testing Rejected Promises
```typescript
test('handles errors', async () => {
    // Use expect().rejects for cleaner async error testing
    await expect(
        someFailingOperation()
    ).rejects.toThrow('Expected error message');
});
```

## Known Test Infrastructure Issues

### 1. Module Mock Persistence
- **Issue**: Module mocks leak between test files
- **Impact**: Tests fail when run together
- **Workaround**: Run test types separately
- **GitHub Issues**: #7823, #6040, #5391
- **Details**: See comprehensive guide in [bun-testing-patterns.md](./bun-testing-patterns.md#module-mocks-persist-between-test-files)

### 2. Skipped Tests Due to Mock Issues
```typescript
// Example from deleteStory integration test
test.skip('returns error when story does not exist', async () => {
    // Skipped due to Bun module mock persistence
    // Works in isolation but fails when run with other tests
});
```

### 3. Dynamic Import Limitations
```typescript
// ❌ Dynamic imports after mocking can be problematic
test('problematic pattern', async () => {
    mock.module('fs', () => ({ /* mock */ }));
    const Module = await import('../src/Module');  // May not see mock
});

// ✅ Better pattern - mock then import at top level
mock.module('fs', () => ({ /* mock */ }));
import Module from '../src/Module';
```

## Testing Best Practices

### 1. Test Naming
```typescript
// ✅ Descriptive test names
test('validates required parameters and throws specific errors', () => {});
test('creates story with auto-generated ID and timestamp', () => {});

// ❌ Vague test names
test('works', () => {});
test('test story creation', () => {});
```

### 2. Arrange-Act-Assert Pattern
```typescript
test('updates story summary', async () => {
    // Arrange
    const story = await createTestStory();
    
    // Act
    const updated = await updateStory(story.id, 'New summary');
    
    // Assert
    expect(updated.summary).toBe('New summary');
    expect(updated.id).toBe(story.id);
});
```

### 3. Test Isolation
```typescript
// Each test should be independent
test('test 1', async () => {
    // Don't rely on state from other tests
    const ownData = await setupTestData();
    // ... test logic
    await cleanupTestData(ownData);
});
```

### 4. Explicit Assertions
```typescript
// ✅ Explicit about what's being tested
expect(result.id).toBeDefined();
expect(typeof result.id).toBe('number');
expect(result.id).toBeGreaterThan(0);

// ❌ Too general
expect(result).toBeTruthy();
```

## Performance Testing Patterns

### Timeout Configuration
```typescript
// For slow operations (database migrations, etc.)
test('runs migrations', async () => {
    // Test logic
}, { timeout: 10000 });  // 10 second timeout
```

### Test Execution Speed
- Bun test runner is fast but module mocking adds overhead
- In-memory SQLite is perfect for integration tests
- Avoid file I/O in unit tests

## Key Takeaways

1. **NEVER use `bun test` directly** - Always use npm scripts
2. **Separate test directories** by type (unit/integration)
3. **Mock before importing** modules under test
4. **Module mocks persist** - Plan accordingly
5. **Use in-memory databases** for integration tests
6. **Test in isolation** - Each test is independent
7. **Be explicit** in assertions
8. **Document skipped tests** with reasons
9. **Run tests early and often** - Catch issues fast

## References
- Bun Testing Guide: `.sdlc/cartridges/project/bun-testing-patterns.md`
- Test setup discovered through Work Items #1-10
- Mock persistence issues documented in multiple test files
- Testing patterns evolved throughout project development