---
synopsis:
  - Knowledge cartridge
  - Test-driven development approach
  - Red-green-refactor cycle
  - Test organization patterns
---

# Audience

Claude Code or other agentic agents practicing test-driven development on TypeScript/JavaScript projects.

# Abstract

This document outlines the test-driven development (TDD) process for the MCP Stories project, focusing on the Red-Green-Refactor cycle, Bun's built-in testing capabilities, and practical workflows for writing unit tests first, implementing minimal code, and refactoring while maintaining comprehensive test coverage.

## Focus on Unit Testing

TDD in our project focuses primarily on **pure unit tests** where we:

- Test individual functions, methods, or classes in isolation
- Mock or stub all dependencies
- Avoid integration with external systems (databases, file systems, etc.)
- Test one behavior at a time

For more information on our complete testing strategy including integration tests, component tests, and end-to-end tests, see [Testing Pyramid](./testing-pyramid.md).

## TDD Cycle

We follow the classic "Red-Green-Refactor" TDD cycle:

1. **Red**: Write a failing unit test for the functionality you want to implement
2. **Green**: Write the minimal implementation code to make the test pass
3. **Refactor**: Clean up the code while keeping the tests passing

## Testing Tools

### Server Testing with Bun

For server-side tests, we use [Bun's built-in test runner](https://bun.sh/docs/test/writing) which provides:

- **Native TypeScript support**: Write and run `.test.ts` files directly
- **Built-in mocking**: Use `mock()` for module mocking and `spyOn()` for function spying
- **Fast execution**: Native performance without transpilation overhead
- **Jest-compatible API**: Familiar `test()`, `describe()`, `expect()` syntax
- **Built-in matchers**: Comprehensive assertions without additional libraries

Key features:
- `test()` and `describe()` for test organization
- `beforeEach()`, `afterEach()` for setup/teardown
- `mock()` for mocking modules
- `spyOn()` for spying on functions
- `expect()` with extensive matchers

### Client Testing (Future)

Client tests will use testing tools compatible with Vite, likely Vitest, to maintain compatibility with the Loveable development environment.

## Practical TDD Workflow

For each feature or function in the MCP Stories project:

### 1. Write the Test First

- Start by writing a test that defines the expected behavior
- The test should initially fail (RED) since the implementation doesn't exist yet
- Be specific about what you're testing - focus on one behavior at a time
- Document the test with clear descriptions of what's being tested

#### Server Testing with Bun

When working with TypeScript modules in the server:
- Write tests in TypeScript (`.test.ts`) files
- Bun runs TypeScript tests natively without compilation
- Use Bun's built-in mocking capabilities

```typescript
// Example of a first test for a TypeScript module
import { test, expect, mock } from 'bun:test';
import KyselyDatabase from '../../src/core/db/KyselyDatabase';

test('validates database path parameter', () => {
    // Test parameter validation
    expect(() => {
        KyselyDatabase.create({databasePath: null});
    }).toThrow('databasePath is required and must be a string');
});

// Example with mocking TypeScript dependencies
test('creates database with migrations', async () => {
    // Mock the imported modules
    const mockDb = {db: {}, close: mock(() => Promise.resolve())};
    const mockMigrationRunner = {
        migrateToLatest: mock(() => Promise.resolve({
            success: true,
            data: {results: []}
        }))
    };
    
    // Use Bun's mock function to replace imports
    mock.module('./KyselyDatabase', () => ({
        default: { create: mock(() => mockDb) }
    }));
    
    mock.module('./MigrationRunner', () => ({
        default: { create: mock(() => mockMigrationRunner) }
    }));

    // Import the module under test after mocking
    const SetUpTask = await import('../src/core/db/SetUpTask');
    
    const task = SetUpTask.default.create({
        dbPath: './test.db',
        migrationFolder: './migrations'
    });

    const result = await task.run();

    expect(result.success).toBe(true);
    expect(mockMigrationRunner.migrateToLatest).toHaveBeenCalledTimes(1);
});
```

### 2. Run the Test to See it Fail

- Run the test to verify that it fails for the expected reason
- This confirms that your test is actually checking what you think it is
- Document the specific failure to ensure it aligns with expectations

```bash
bun test test-unit/core/db/Database.test.ts
```

Example output:
```
Error: Cannot find module '../src/core/db/KyselyDatabase'
```

### 3. Write the Minimal Implementation

- Write just enough code to make the test pass
- Don't add functionality beyond what the test requires
- The focus is on correctness, not completeness or optimization
- For TypeScript modules, implement in `.ts` files

```typescript
// subprojects/server/src/core/db/KyselyDatabase.ts
import { Kysely } from 'kysely';
import { BunSqliteDialect } from 'kysely-bun-sqlite';
import { Database } from 'bun:sqlite';

interface KyselyDatabaseOptions {
    databasePath: string;
}

interface KyselyDatabaseInstance {
    db: Kysely<any>;
    close: () => Promise<void>;
}

const paramCheck = (databasePath: unknown): void => {
    if (!databasePath || typeof databasePath !== 'string') {
        throw new Error('databasePath is required and must be a string');
    }
};

const create = (options: KyselyDatabaseOptions): KyselyDatabaseInstance => {
    const { databasePath } = options;
    paramCheck(databasePath);
    
    // Minimal implementation to pass the test
    const sqlite = new Database(databasePath);
    const db = new Kysely({
        dialect: new BunSqliteDialect({ database: sqlite })
    });
    
    return Object.freeze({
        db,
        close: async () => { await db.destroy(); }
    });
};

export default Object.freeze({ create });
```

### 4. Run the Test to See it Pass

- Verify that your implementation passes the test (GREEN)
- This confirms that your implementation meets the specified requirements

```bash
bun test test/unit/db.test.ts
```

Example output:
```
✓ validates database path parameter [0.45ms]
✓ creates database with migrations [1.23ms]

2 pass
0 fail
2 total
```

### 5. Refactor if Necessary

- Clean up the code without changing behavior
- Run tests after each refactoring step to ensure nothing breaks
- Focus on code quality, readability, and maintainability

```typescript
// Refactored version following our module pattern
interface DatabaseOptions {
    dbPath: string;
}

interface DatabaseInstance {
    init: () => Promise<boolean>;
}

const DB_DIR = './.mcp-story-documents';

const ensureDirectory = async (path: string): Promise<void> => {
    const fs = await import('fs/promises');
    await fs.mkdir(path, { recursive: true });
};

const create = (options: DatabaseOptions): DatabaseInstance => {
    const { dbPath } = options;
    
    const init = async (): Promise<boolean> => {
        try {
            await ensureDirectory(dbPath);
            // Additional initialization will be added later
            return true;
        }
        catch (err) {
            console.error('Error initializing database:', err);
            return false;
        }
    };
    
    return Object.freeze({ init });
};

export default Object.freeze({ DB_DIR, create });
```

### 6. Repeat

- Continue the cycle for each new piece of functionality
- Build up complex behaviors from small, well-tested components
- Maintain a comprehensive test suite that prevents regressions

## Mocking and Stubbing Strategy

### Using Bun's Built-in Mocking

Bun provides comprehensive mocking capabilities without external libraries:

1. **Module mocking** - Use `mock.module()` to replace entire modules
2. **Function mocking** - Use `mock()` to create mock functions
3. **Spying** - Use `spyOn()` to spy on existing functions

#### Working Example from Our Codebase

```typescript
import { test, expect, mock, afterEach } from 'bun:test';

// IMPORTANT: Clean up mocks after each test
afterEach(() => {
    mock.restore();
});

test('throws if database file does not exist', async () => {
    // Mock fs module
    mock.module('fs', () => ({
        existsSync: mock(() => false)
    }));
    
    // Import Database after mocking
    const Database = await import('../../Database');
    
    expect(() => {
        Database.default.create({ databasePath: '/non/existent/path.db' });
    }).toThrow('Database file does not exist: /non/existent/path.db');
});

test('creates database instance with Kysely when schema is valid', async () => {
    // Mock fs to say file exists
    mock.module('fs', () => ({
        existsSync: mock(() => true)
    }));
    
    // Mock SQLite with valid schema
    const mockQuery = mock((sql: string) => {
        if (sql.includes('sqlite_master')) {
            return { get: mock(() => ({ name: 'story-documents' })) };
        }
        if (sql.includes('PRAGMA table_info')) {
            return { 
                all: mock(() => [
                    { name: 'id', type: 'INTEGER', pk: 1, notnull: 1 },
                    { name: 'summary', type: 'TEXT', notnull: 1 }
                ])
            };
        }
    });
    
    mock.module('bun:sqlite', () => ({
        Database: mock(() => ({
            query: mockQuery,
            close: mock()
        }))
    }));
    
    // Mock Kysely
    mock.module('kysely', () => ({
        Kysely: mock(() => ({ destroy: mock(() => Promise.resolve()) }))
    }));
    
    // Import and test
    const Database = await import('../../Database');
    const instance = Database.default.create({ databasePath: '/path/to/db.db' });
    
    expect(instance).toBeDefined();
    expect(typeof instance.close).toBe('function');
});
```

#### Important Limitation: Module Mocks Persist

**Warning**: Module mocks created with `mock.module()` persist between test files. This is a known Bun limitation tracked in [issue #7823](https://github.com/oven-sh/bun/issues/7823).

**Workaround**: Run different test types in separate processes:

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

For comprehensive Bun testing guidance, see [Bun Testing Guide](./bun-testing-guide.md).

### When to Use Each Approach

- **mock.module()**: Replace entire modules or specific exports
- **mock()**: Create mock functions with controllable behavior
- **spyOn()**: Observe calls to existing functions without replacing them
- **expect() matchers**: Use built-in matchers like `toHaveBeenCalledWith()` for assertions
