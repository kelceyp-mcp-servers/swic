---
synopsis:
  - Knowledge cartridge
  - Testing strategy and test types
  - Unit vs integration test balance
  - Test coverage guidelines
---

# Audience

Claude Code or other agentic agents implementing comprehensive testing strategies in TypeScript projects.

# Abstract

This document outlines the testing pyramid strategy for the MCP Stories project, providing guidance on implementing unit tests (the foundation), integration tests, component tests, and end-to-end tests using Bun's built-in test runner for server-side code, with detailed examples and patterns for each testing level.

## Testing Pyramid Levels

For this project, we primarily focus on unit tests, but may also implement some of the higher-level tests as needed. Unit tests are always required, while other test types will be implemented based on project requirements and complexity.

### React Component Testing Clarification

**Important Terminology Note**: In the React community, tests that render components and interact with them through a DOM are commonly called "unit tests", even though they are technically **component integration tests**. This naming convention can be confusing because:

1. **True unit tests** test isolated functions/methods with all dependencies mocked, without any framework involvement
2. **React "unit tests"** actually test how components integrate with:
   - The React framework itself
   - The DOM (real or simulated)
   - User events and state management
   - Component lifecycle hooks

This terminology drift has become so widespread that most React developers and documentation refer to component tests as "unit tests". While technically incorrect, we acknowledge this community convention while being clear about what these tests actually do.

**Kent C. Dodds' Testing Trophy**: Kent C. Dodds, a prominent figure in the React testing community, advocates for the "Testing Trophy" approach rather than the traditional pyramid. His philosophy emphasizes:
- More integration tests (which he calls "unit tests" when referring to components)
- Testing behavior over implementation details
- Testing components the way users interact with them
- Accepting that these aren't true unit tests but provide more value

**Practical Implications**:
- When you see `test-unit/` directories in React projects, they likely contain component integration tests
- True business logic should still be extracted and unit tested separately
- Component tests using React Testing Library are valuable even if mislabeled
- The mislabeling is industry-standard and fighting it may cause more confusion

### Unit Tests

Unit tests form the foundation of our testing pyramid and test individual functions, methods, or classes in isolation.

#### Characteristics

- **Pure**: Test the code under test with all dependencies stubbed or mocked
- **Isolated**: No interaction with external systems, databases, or APIs
- **Fast**: Execute quickly, enabling rapid feedback during development
- **Focused**: Test one piece of functionality at a time
- **Numerous**: The bulk of our test suite consists of unit tests

#### Tools

**Server Tests (Bun)**:
- **Bun Test Runner**: Built-in test runner with native TypeScript support
- **Built-in mocking**: `mock()` for functions, `mock.module()` for modules
- **Built-in spying**: `spyOn()` for observing function calls
- **No external dependencies**: Databases, file systems, network, etc. are all mocked

**Client Tests (Future)**:
- Will use testing tools compatible with Vite (likely Vitest)

#### TypeScript Testing

**Server Tests with Bun**:
- **Test files**: Written in TypeScript (`.test.ts`)
- **Source files**: Written in TypeScript (`.ts`)
- **Import handling**: Bun natively handles TypeScript imports
- **No build step**: Tests run against TypeScript source directly, not compiled output
- **Type safety**: Full TypeScript type checking in tests

**Client Tests (Future)**:
- Will follow Vite/Vitest conventions for TypeScript testing

#### Example

```typescript
import { test, expect, mock } from 'bun:test';
import KyselyDatabase from '../../../../src/core/db/KyselyDatabase';

// Direct TypeScript module import in test
test('creates a database instance', () => {
  const instance = KyselyDatabase.create({ databasePath: './test.db' });
  
  expect(instance).toBeDefined();
  expect(instance.db).toBeDefined();
  expect(typeof instance.close).toBe('function');
});

// Example with mocking TypeScript modules
test('runs migrations on setup', async () => {
  const mockDb = { db: {}, close: mock(() => Promise.resolve()) };
  const createDbMock = mock(() => mockDb);
  
  const migrateToLatestMock = mock(() => Promise.resolve({
    success: true,
    data: { results: [] }
  }));
  
  const createMigrationRunnerMock = mock(() => ({
    migrateToLatest: migrateToLatestMock
  }));
  
  // Mock TypeScript modules
  mock.module('./KyselyDatabase', () => ({
    default: { create: createDbMock }
  }));
  
  mock.module('./MigrationRunner', () => ({
    default: { create: createMigrationRunnerMock }
  }));
  
  // Import after mocking
  const SetUpTask = await import('../../../../src/core/db/SetUpTask');
  
  const setupTask = SetUpTask.default.create({ 
    dbPath: './test.db',
    migrationFolder: './migrations'
  });
  
  const result = await setupTask.run();
  
  expect(result.success).toBe(true);
  expect(createDbMock).toHaveBeenCalledTimes(1);
  expect(migrateToLatestMock).toHaveBeenCalledTimes(1);
});
```

### Integration Tests

Integration tests verify that multiple units work together correctly, testing the interaction between different modules or layers.

#### Characteristics

- **Limited scope**: Test the integration of a few modules or components
- **External dependencies**: May interact with test databases, file systems, or mocked external services
- **Boundary testing**: Focus on interfaces between components
- **Less numerous**: Fewer than unit tests, more than component tests

#### Tools

**Server Integration Tests**:
- **Bun Test Runner**: Same test runner as unit tests
- **SQLite in-memory database**: For database integration tests
- **Built-in mocking**: For stubbing external services
- **Mock servers**: For testing API integrations

**Client Integration Tests (Future)**:
- Will use tools compatible with Vite ecosystem

#### Example

```typescript
import { test, expect, beforeEach } from 'bun:test';
import { Kysely } from 'kysely';
import { BunSqliteDialect } from 'kysely-bun-sqlite';
import { Database } from 'bun:sqlite';

// Import modules involved in the integration
import { createTables } from '../../subprojects/server/src/core/db/schema';
import { initializeDatabase } from '../../subprojects/server/src/core/db/index';
import Story from '../../subprojects/server/src/core/models/story';

// Test context type
interface TestContext {
    db: Kysely<any>;
}

let context: TestContext;

// Setup for each test
beforeEach(() => {
    // Create in-memory database
    const sqlite = new Database(':memory:');
    const db = new Kysely({
        dialect: new BunSqliteDialect({ database: sqlite })
    });

    // Initialize database and tables
    createTables(db);

    // Save database for use in test
    context = { db };
});

// Test the integration between the model and database layers
test('story creation and retrieval works end-to-end', async () => {
    const { db } = context;

    // Create a new story
    const createdStory = await Story.create(db, {
        summary: 'Test Story'
    });

    // Retrieve the story
    const retrievedStory = await Story.get(db, createdStory.id);

    // Verify the story was correctly stored and retrieved
    expect(retrievedStory.summary).toBe('Test Story');
    expect(retrievedStory.id).toBeDefined();
});
```

### Component Tests

Component tests verify that a complete component or service functions correctly as a black box, focusing on its external behavior.

#### Characteristics

- **Black box**: Test the component from the outside, through its public interface
- **Service-level**: Test a deployed service or application
- **Dependencies**: External dependencies are usually mocked or stubbed
- **Focused on behavior**: Test the component's behavior, not its implementation
- **Fewer**: Less numerous than integration tests

#### Tools

**Server Component Tests**:
- **Bun Test Runner**: Same test runner
- **Supertest or similar**: For testing HTTP APIs
- **Built-in mocking**: For stubbing external services

**Client Component Tests**:
- **Playwright**: For testing web interfaces
- **Testing tools compatible with Vite**

#### Example

```typescript
import { test, expect, mock, beforeEach } from 'bun:test';
import request from 'supertest';

// Import types and interfaces
import type { Core } from '../../subprojects/server/src/core/types';

// Test context
interface TestContext {
    app: any;
    getStoryMock: any;
}

let context: TestContext;

beforeEach(async () => {
    // Create mock for getStory function
    const getStoryMock = mock(() => Promise.resolve({
        id: 1,
        summary: 'Test Story'
    }));

    // Mock the core module
    const coreMock: Partial<Core> = {
        getStory: getStoryMock
    };

    // Mock the app creation module
    mock.module('../../subprojects/server/src/app', () => ({
        createApp: (core: Core) => {
            // Return a simple Express-like app for testing
            const express = require('express');
            const app = express();
            
            app.get('/stories/:id', async (req, res) => {
                const story = await core.getStory(parseInt(req.params.id));
                res.json(story);
            });
            
            return app;
        }
    }));

    // Import and create app with mocked core
    const { createApp } = await import('../../subprojects/server/src/app');
    const app = createApp(coreMock as Core);

    // Save for use in tests
    context = { app, getStoryMock };
});

// Test story API
test('GET /story-documents/:id returns the story', async () => {
    const { app, getStoryMock } = context;

    // Make HTTP request to the app
    const response = await request(app)
        .get('/stories/1')
        .expect(200);

    // Verify the response
    expect(response.body.id).toBe(1);
    expect(response.body.summary).toBe('Test Story');
    
    // Verify mock was called
    expect(getStoryMock).toHaveBeenCalledWith(1);
});
```

### End-to-End Tests

End-to-end (E2E) tests verify that the entire system works correctly as a whole, testing all components together.

#### Characteristics

- **Full system**: Test the entire system from end to end
- **Real dependencies**: Use real external systems and databases
- **User perspective**: Test from the user's perspective
- **Fewest**: The least numerous tests in the pyramid
- **Slowest**: Take longer to run than other types of tests

#### Tools

- **Playwright**: For browser-based tests
- **API client libraries**: For API-based tests
- **Real environments**: Test against dev, staging, or production environments

### E2E Testing Patterns

Comprehensive patterns discovered through practical E2E implementation with Playwright.

#### Test Data Management with Emoji Prefix Pattern

**Problem**: Test data cleanup strategies that rely on text patterns (like "Test Story" or "Updated Story") are risky - they could accidentally delete real user data if a user happens to create stories with similar names.

**Solution**: Use a distinctive emoji prefix that's unlikely to appear in real data:

```typescript
// Safe test data creation with emoji prefix
const TEST_PREFIX = '🔬-e2e-test';

// Create test story-documents with the prefix
await page.fill('input[name="summary"]', `${TEST_PREFIX}: Login Flow Test`);
await page.fill('input[name="summary"]', `${TEST_PREFIX}: Navigation Test`);

// Cleanup - only deletes story-documents with the exact test prefix
async function cleanupTestData(apiKey: string) {
  const stories = await fetch('/api/stories', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  }).then(r => r.json());
  
  const testStories = stories.filter(s => 
    s.summary.startsWith(TEST_PREFIX)
  );
  
  for (const story of testStories) {
    await fetch(`/api/stories/${story.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
  }
}
```

**Benefits**:
- Zero risk of deleting real user data
- Visually distinctive in UI during debugging
- Easy to filter in test reports
- Works across different languages/locales

#### Scoped Selector Patterns for Dialog Interactions

**Problem**: Dialog overlays can interfere with clicking elements even when they appear clickable. Generic selectors like `button:has-text("Delete")` might match multiple elements.

**Solution**: Use scoped selectors that target specific dialog contexts:

```typescript
// ❌ Bad: Too generic, might match multiple buttons
await page.click('button:has-text("Delete")');

// ✅ Good: Scoped to specific dialog
await page.click('[role="dialog"] button:has-text("Delete")');

// ✅ Better: More specific scoping with data attributes
await page.click('[data-testid="delete-dialog"] button[data-action="confirm"]');

// ✅ Best: Wait for dialog visibility first
await page.waitForSelector('[role="dialog"]', { state: 'visible' });
await page.click('[role="dialog"] button:has-text("Delete")');
```

#### Wait Conditions for Async Operations

**Problem**: Modern SPAs have many async operations - API calls, state updates, animations. Tests can be flaky if they don't wait properly.

**Solution**: Use appropriate wait strategies for different scenarios:

```typescript
// Wait for network idle after triggering an action
await page.click('button[type="submit"]');
await page.waitForLoadState('networkidle');

// Wait for specific element state changes
await page.waitForSelector('.success-message', { state: 'visible' });
await page.waitForSelector('.loading-spinner', { state: 'hidden' });

// Wait for specific text to appear
await page.waitForFunction(
  text => document.body.textContent?.includes(text),
  'Story created successfully'
);

// Wait with custom timeout for slow operations
await page.waitForSelector('.processed-result', { 
  timeout: 30000  // 30 seconds for heavy processing
});

// Combine multiple wait conditions
await Promise.all([
  page.waitForResponse(resp => resp.url().includes('/api/story-documents')),
  page.click('button[type="submit"]'),
  page.waitForSelector('.story-list-item')
]);
```

#### Test Cleanup Strategies

**Problem**: Tests can fail due to leftover data from previous test runs, causing selector ambiguity or state conflicts.

**Solution**: Implement comprehensive cleanup strategies:

```typescript
// 1. Before-each cleanup: Start fresh
test.beforeEach(async ({ page }) => {
  await cleanupTestData(apiKey);
});

// 2. After-each cleanup: Don't leave mess for next test
test.afterEach(async ({ page }) => {
  await cleanupTestData(apiKey);
});

// 3. Test-specific cleanup in finally blocks
test('should handle story lifecycle', async ({ page }) => {
  let storyId: number | null = null;
  
  try {
    // Create story
    const response = await createStory(page);
    storyId = response.id;
    
    // Test operations...
    
  } finally {
    // Always cleanup, even if test fails
    if (storyId) {
      await deleteStory(storyId);
    }
  }
});

// 4. Global cleanup before all tests
test.beforeAll(async () => {
  // Reset to known good state
  await resetTestEnvironment();
});
```

#### Example from Story-003 Implementation

Real example showing all patterns together:

```typescript
test('🔬-e2e-test-001: Complete story CRUD flow', async ({ page }) => {
  const TEST_PREFIX = '🔬-e2e-test';
  const testSummary = `${TEST_PREFIX}: CRUD Test ${Date.now()}`;
  let storyId: number | null = null;
  
  try {
    // Create with safe test data
    await page.fill('input[name="summary"]', testSummary);
    await page.click('button[type="submit"]');
    
    // Wait for creation to complete
    await page.waitForSelector('.success-toast', { state: 'visible' });
    
    // Extract story ID from URL or response
    const url = page.url();
    storyId = parseInt(url.split('/').pop() || '0');
    
    // Test update with scoped selectors
    await page.click('[data-testid="edit-button"]');
    await page.fill('[role="dialog"] input[name="summary"]', `${testSummary} - Updated`);
    await page.click('[role="dialog"] button:has-text("Save")');
    
    // Wait for update confirmation
    await page.waitForResponse(resp => 
      resp.url().includes(`/api/stories/${storyId}`) && 
      resp.status() === 200
    );
    
    // Test delete with proper waits
    await page.click('[data-testid="delete-button"]');
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });
    await page.click('[role="dialog"] button:has-text("Confirm")');
    
    // Verify deletion
    await page.waitForSelector(`[data-story-id="${storyId}"]`, { state: 'detached' });
    
  } finally {
    // Cleanup if test failed before deletion
    if (storyId) {
      try {
        await fetch(`/api/stories/${storyId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
      } catch {
        // Ignore cleanup errors
      }
    }
  }
});
```

This comprehensive E2E testing approach ensures reliable, maintainable tests that don't interfere with real data and handle the complexities of modern web applications.

## Test Organization

Our tests are organized in separate directories:

- `test-unit/`: Unit tests with all dependencies mocked
- `test-integration/`: Integration tests with real dependencies
- `test-component/`: Component tests (when needed)
- `test-e2e/`: End-to-end tests (when needed)

Test directories mirror the source structure. For example:
- Source: `src/core/db/Database.ts`
- Unit test: `test-unit/core/db/Database.test.ts`
- Integration test: `test-integration/core/db/Database.test.ts`

## Bun Test Configuration

Bun requires minimal configuration for TypeScript testing:

**Server Tests**:
- No configuration file needed - Bun handles TypeScript natively
- Tests are discovered automatically with patterns: `*.test.ts`, `*.spec.ts`
- Run tests with: `bun test`
- TypeScript compilation happens automatically

**Optional `bunfig.toml` for customization**:
```toml
[test]
# Test runner configuration
preload = ["./test/setup.ts"]  # Optional setup file
timeout = 5000  # Test timeout in ms
```

Key benefits:
- **Zero config**: Works out of the box with TypeScript
- **Fast execution**: No transpilation overhead
- **Type safety**: Full TypeScript support in tests
- **Native ESM**: No module loader configuration needed

## Test Scripts

**Server (Bun) package.json scripts**:

```json
"scripts": {
  "test": "bun run test:integration && bun run test:unit",
  "test:unit": "bun test test-unit",
  "test:integration": "bun test test-integration",
  "test:watch": "bun test --watch",
  "test:coverage": "bun test --coverage"
}
```

**Client (npm) package.json scripts** (future):

```json
"scripts": {
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:e2e": "playwright test",
  "test:coverage": "vitest --coverage"
}
```

## Testing Strategy

1. **Unit tests**: Write these first, using TDD, for all new functionality.
2. **Integration tests**: Write these for critical paths between components.
3. **Component tests**: Write these for key user-facing services (if needed).
4. **E2E tests**: Write these for critical user journeys (if needed).

For the current phase of the project, we are primarily focused on unit tests and essential integration tests. Component and E2E tests may be added later as the project evolves.

## Bun Testing Limitations and Workarounds

While Bun's test runner is fast and powerful, there are important limitations to be aware of:

### Module Mock Persistence

**Problem**: Module mocks created with `mock.module()` persist between test files. The `mock.restore()` function only clears function mocks, not module mocks.

**Impact**: Tests can pollute each other when run together with `bun test`.

**Workaround**: Run different test types in separate processes:

```json
{
  "scripts": {
    "test": "bun run test:integration && bun run test:unit",
    "test:unit": "bun test test-unit",
    "test:integration": "bun test test-integration"
  }
}
```

### Best Practices for Bun Testing

1. **Import at module level** for easier mocking:
   ```typescript
   // ✅ Good - easier to mock
   import { existsSync } from 'fs';
   
   // ❌ Avoid - harder to mock
   const fs = require('fs');
   ```

2. **Separate test types** to avoid mock pollution
3. **Document mock behavior** in tests
4. **Monitor GitHub issues** for fixes:
   - [#7823](https://github.com/oven-sh/bun/issues/7823) - mock.restore() issue
   - [#6040](https://github.com/oven-sh/bun/issues/6040) - mock reset issue

For comprehensive Bun testing guidance, see [Bun Testing Guide](./bun-testing-guide.md).
