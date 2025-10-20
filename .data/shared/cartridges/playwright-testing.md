---
synopsis:
  - Knowledge cartridge
  - E2E testing patterns with Playwright
  - Test naming conventions with emoji prefixes
  - Test data cleanup strategies
  - Authentication patterns for real API testing
  - Chrome control MCP debugging techniques
---

# Playwright Testing

## Audience
Developers and AI agents working on E2E tests for the MCP Stories web interface. This cartridge provides patterns, conventions, and debugging strategies specific to our Playwright test implementation.

## Abstract
Captures our E2E testing approach using Playwright, including test naming conventions, authentication patterns, test data cleanup strategies, and debugging techniques using Chrome control MCP tools. Focuses on practical patterns discovered during story-003 implementation.

## Overview

Our Playwright E2E tests verify the complete user experience across multiple browsers (Chromium, Firefox, WebKit). The tests use real API authentication, manage test data cleanup, and follow specific naming conventions to prevent pollution of production data.

Key principles:
- **Real authentication**: Use actual API keys, not mocked auth
- **Test data isolation**: Emoji prefixes prevent collision with real data
- **Cross-browser validation**: Test on all major browser engines
- **Automated cleanup**: Remove test data after runs

## Test Setup and Configuration

### Installation and Scripts

```json
// package.json scripts
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
"test:e2e:debug": "playwright test --debug",
"clean:e2e": "rm -rf test-e2e/test-results playwright-report",
"clean:test-data": "bun scripts/test/cleanup-test-data.ts"
```

### Configuration Structure

```javascript
// playwright.config.js
export default defineConfig({
  testDir: './test-e2e',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ],
  webServer: {
    command: 'cd ../server && bun run server',
    port: 3000,
    reuseExistingServer: true
  }
});
```

## Authentication Pattern

### API Key Authentication

E2E tests use real API keys for authentication, not mocked tokens:

```javascript
const TEST_API_KEY = 'mcp_key_...'; // Real API key from database

async function setupAuthentication(page: Page) {
  // Intercept all API requests and add Authorization header
  await page.route('**/api/**', async route => {
    const headers = {
      ...route.request().headers(),
      'Authorization': `Bearer ${TEST_API_KEY}`
    };
    await route.continue({ headers });
  });
  
  // Set minimal JWT in localStorage to prevent UI redirects
  await page.evaluate(() => {
    const mockToken = 'eyJ...'; // Minimal JWT structure
    localStorage.setItem('authToken', mockToken);
  });
}
```

**Key Learning**: You cannot fake server authentication from the client. Need real credentials that the server accepts.

## Test Data Naming Convention

### Emoji Prefix Pattern

All test stories use a distinctive emoji prefix to prevent accidental deletion of real data:

```javascript
// Test story naming pattern
const testSummary = '🔬-e2e-test-create-story-' + Date.now();
const editTest = '🔬-e2e-test-edited-story-' + Date.now();
const viewTest = '🔬-e2e-test-view-story-' + Date.now();
```

Benefits:
- **Zero collision risk**: No real story starts with `🔬-e2e-test`
- **Visual distinction**: Test data immediately identifiable in UI
- **Simple cleanup**: Just check if story starts with prefix
- **Self-documenting**: Name describes what's being tested

## Test Data Cleanup

### Automatic Cleanup with Global Teardown

**Critical Issue**: `process.exitCode` is NOT reliably available in Playwright's globalTeardown to detect test failures. This is a known Playwright limitation where the teardown runs in a separate process from the tests.

**Solution**: Use a custom reporter to write test status to a file that globalTeardown can read.

```javascript
// test-e2e/test-status-reporter.ts
import type { FullResult, Reporter } from '@playwright/test/reporter';
import fs from 'fs';
import path from 'path';

class TestStatusReporter implements Reporter {
  onEnd(result: FullResult) {
    const statusFile = path.join(__dirname, '.test-status.json');
    const status = {
      passed: result.status === 'passed',
      status: result.status,
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync(statusFile, JSON.stringify(status));
  }
}

export default TestStatusReporter;
```

```javascript
// playwright-global-teardown.ts
async function globalTeardown(config: FullConfig) {
  const statusFile = path.join(__dirname, '.test-status.json');
  
  try {
    const status = JSON.parse(fs.readFileSync(statusFile, 'utf-8'));
    
    if (status.passed) {
      console.log('✅ Tests passed - cleaning up test data');
      await cleanupTestData(apiBaseURL);
    } else {
      console.log(`❌ Tests failed (${status.status}) - preserving test data`);
    }
    
    // Clean up status file to avoid stale data
    fs.unlinkSync(statusFile);
  } catch (error) {
    console.log('⚠️ Could not determine test status - preserving test data');
  }
}
```

```javascript
// playwright.config.js
export default defineConfig({
  reporter: [
    ['./test-e2e/test-status-reporter.ts'],  // Custom status reporter
    ['html'],  // Keep existing HTML reporter
  ],
  globalTeardown: './test-e2e/playwright-global-teardown.ts',
  // ... rest of config
});
```

### Manual Cleanup Script Pattern

```javascript
// scripts/test/cleanup-test-data.ts
const TEST_STORY_PREFIX = '🔬-e2e-test';

async function cleanupTestStories() {
  const stories = await fetchWithAuth('/stories');
  
  // Filter for test stories only
  const testStories = stories.filter(story => 
    story.summary.startsWith(TEST_STORY_PREFIX)
  );
  
  // Delete each test story
  for (const story of testStories) {
    await fetchWithAuth(`/stories/${story.id}`, {
      method: 'DELETE'
    });
  }
}
```

### Running Cleanup

```bash
# Clean test data before running tests
bun run clean:test-data

# Clean E2E artifacts (reports, results)
bun run clean:e2e

# Run tests with fresh state
bun run test:e2e
```

## Common Test Patterns

### Waiting for Elements

```javascript
// Wait for either empty state or content
await expect(async () => {
  const emptyVisible = await emptyState.isVisible();
  const storiesCount = await storyRows.count();
  expect(emptyVisible || storiesCount > 0).toBeTruthy();
}).toPass();
```

### Dialog Interactions

```javascript
// Click buttons within dialog context to avoid overlay issues
await page.locator('[role="dialog"] button:has-text("Delete")').click();
```

### Unique Test Data

```javascript
// Use timestamps to ensure uniqueness across parallel tests
const uniqueName = 'Test Story - ' + Date.now();
```

## Debugging with Chrome Control MCP

When tests fail mysteriously, use the Chrome control MCP tool for visual debugging:

### Available Commands

```bash
# List all open tabs
mcp__chrome-control__list_tabs

# Get current page content
mcp__chrome-control__get_page_content

# Execute JavaScript in the page
mcp__chrome-control__execute_javascript
```

### Debugging Workflow

1. **Run tests in headed mode**:
   ```bash
   bun run test:e2e:debug  # Opens browser visually
   ```

2. **Use Chrome control to inspect state**:
   ```javascript
   // Check what's actually in localStorage
   mcp__chrome-control__execute_javascript({
     code: "JSON.stringify(localStorage)"
   })
   
   // Check if elements exist
   mcp__chrome-control__execute_javascript({
     code: "document.querySelectorAll('[role=\"dialog\"]').length"
   })
   ```

3. **Get page text content**:
   ```javascript
   mcp__chrome-control__get_page_content()
   // Shows all text on page - helpful for assertion failures
   ```

## Common Issues and Solutions

### Strict Mode Violations

**Problem**: "strict mode violation" when selector matches multiple elements

**Solution**: Use more specific selectors:
```javascript
// ❌ Bad: Matches multiple elements
await page.click('text=Story #1');

// ✅ Good: More specific
await page.click('nav span:has-text("Story #1")');
```

### Dialog Overlay Blocking Clicks

**Problem**: Clicks fail on buttons within dialogs

**Solution**: Scope clicks to dialog context:
```javascript
// ❌ Bad: May click button behind dialog
await page.click('button:has-text("Cancel")');

// ✅ Good: Clicks button within dialog
await page.click('[role="dialog"] button:has-text("Cancel")');
```

### Test Data Pollution

**Problem**: Tests fail due to leftover data from previous runs

**Solution**: Run cleanup before tests:
```bash
bun run clean:test-data && bun run test:e2e
```

### Network Error Simulation

**Problem**: `route.abort()` doesn't trigger expected error handling

**Solution**: Use HTTP error responses instead:
```javascript
// ❌ Bad: Low-level network failure
await route.abort('failed');

// ✅ Good: HTTP error the app handles
await route.fulfill({ status: 500 });
```

## Test Organization

### File Structure
```
test-e2e/
├── stories.spec.ts       # Main CRUD tests
├── auth.spec.ts         # Authentication tests (future)
└── test-results/        # Playwright artifacts (gitignored)
```

### Test Naming
- Describe user actions: "creating a new story"
- Group related tests: `test.describe('Stories CRUD Operations')`
- Use clear assertions: `await expect(page.locator('h1')).toHaveText('Stories')`

## Best Practices

1. **Clean state**: Always start with known state via cleanup
2. **Real authentication**: Use actual API keys, not mocks
3. **Unique data**: Append timestamps to prevent conflicts
4. **Visual debugging**: Use headed mode and Chrome control for mysteries
5. **Specific selectors**: Avoid ambiguous text matches
6. **Error patterns**: Test both success and failure paths

## Integration with CI/CD

Future considerations:
- Store API keys in environment variables
- Run cleanup as pre-test step
- Generate test reports for failures
- Screenshot on failure for debugging

## Related Cartridges

- `testing-expertise.md` - General testing patterns
- `happy-dom-testing.md` - Unit test DOM setup
- `testing-pyramid.md` - Test strategy overview

## Maintenance Notes

Update this cartridge when:
- New test patterns emerge
- Chrome control debugging techniques discovered
- Cleanup strategies evolve
- Authentication patterns change