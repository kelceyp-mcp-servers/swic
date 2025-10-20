---
synopsis:
  - Knowledge cartridge
  - E2E testing strategy with emoji prefix pattern
  - Dialog context scoping for reliable selectors
  - Wait conditions over arbitrary timeouts
  - Cross-browser timing considerations
  - Debugging strategies and known workarounds
---

# E2E Testing Patterns

## Audience
Developers writing E2E tests for the MCP Stories web interface using Playwright. This cartridge captures patterns discovered during story-003 implementation that ensure reliable, maintainable E2E tests.

## Abstract
E2E testing strategy for MCP Stories emphasizes safe test data management through emoji prefixes, reliable element selection through dialog scoping, proper wait conditions over arbitrary timeouts, and cross-browser compatibility. These patterns emerged from real testing challenges and provide battle-tested solutions.

## Overview

E2E testing for web applications presents unique challenges: test data pollution, element selection ambiguity, async state changes, and browser timing differences. This cartridge documents proven patterns that solve these challenges specifically for the MCP Stories application.

The patterns here were discovered through painful trial-and-error during story-003, where initial approaches failed and better solutions emerged through debugging with both Claude and Gemini assistance.

## Test Data Management

### The Emoji Prefix Pattern

All E2E test data uses the distinctive prefix `🔬-e2e-test` to ensure zero collision with real data.

```typescript
// Creating test data with emoji prefix
const testSummary = '🔬-e2e-test-create-story-' + Date.now();
await page.fill('input[type="text"]', testSummary);
```

**Why This Works**:
- **Zero collision risk**: No real user would ever create a story starting with `🔬-e2e-test`
- **Visual distinction**: Test data immediately identifiable in the UI with microscope emoji
- **Simple cleanup**: Can safely delete all stories starting with this prefix
- **Self-documenting**: Each test story name describes its purpose

### Cleanup Script Pattern

Cleanup can be automated by checking for the emoji prefix:

```typescript
// Cleanup script pattern (conceptual)
async function cleanupTestData() {
  const stories = await getAllStories();
  const TEST_PREFIX = '🔬-e2e-test';
  
  for (const story of stories) {
    if (story.summary.startsWith(TEST_PREFIX)) {
      await deleteStory(story.id);
    }
  }
}
```

### Risks of Pattern-Based Cleanup

**WARNING**: Never use generic patterns for cleanup that could match real data:

❌ **Bad patterns** (could delete real data):
- `'Updated Story'`
- `'Story to View'`
- `'Test'`
- Any common English phrases

✅ **Good patterns** (impossible to collide):
- `'🔬-e2e-test'`
- `'__TEST__' + uuid`
- `'E2E-' + timestamp + '-DELETE-ME'`

The emoji prefix is superior because it's:
1. Visually distinctive
2. Impossible to type accidentally
3. Unicode-safe across all browsers

## Selector Strategies

### Dialog Context Scoping

When interacting with modal dialogs or overlays, scope selectors to the dialog context to avoid z-index issues:

```typescript
// ❌ Bad: Can be blocked by overlay or hit wrong element
await page.click('button:has-text("Cancel")');

// ✅ Good: Scoped to dialog ensures correct element
await page.locator('[role="dialog"] button:has-text("Cancel")').click();
```

**Real example from story-003**:
```typescript
// Wait for delete confirmation dialog
await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

// Click Cancel within the dialog context
await page.locator('[role="dialog"] button:has-text("Cancel")').click();

// Verify dialog closed
await expect(page.locator('[role="dialog"]')).not.toBeVisible();
```

### Z-Index and Overlay Issues

Modal overlays can intercept clicks even when buttons appear clickable. This happens because:
- The overlay has a high z-index
- Click events hit the overlay backdrop instead of the button
- Playwright's `isVisible()` doesn't account for z-index blocking

**Solution**: Always scope to the topmost container:
```typescript
// For modals/dialogs
'[role="dialog"] .your-selector'

// For dropdown menus  
'[role="menu"] .menu-item'

// For popovers
'[role="tooltip"] .content'
```

## Wait Conditions

### Prefer Specific Waits Over Arbitrary Timeouts

```typescript
// ❌ Bad: Arbitrary timeout, brittle
await page.waitForTimeout(2000);

// ✅ Good: Wait for specific condition
await page.waitForSelector('[data-testid="success-message"]');
await page.waitForLoadState('networkidle');
await page.waitForURL('**/stories');
```

### Wait Patterns for Common Scenarios

```typescript
// Wait for navigation after action
await page.click('button:has-text("Save")');
await page.waitForURL('**/stories');

// Wait for element to appear
await page.waitForSelector('[data-testid="story-row-1"]');

// Wait for element to disappear (e.g., notifications)
await page.waitForTimeout(3500); // Only for auto-dismiss timing
await expect(page.locator('text=Story created')).not.toBeVisible();

// Wait for network to settle
await page.waitForLoadState('networkidle');
```

### Async State Change Handling

React state updates are asynchronous. After user actions, always wait for the expected UI change:

```typescript
// After typing, wait for Save button to enable
await input.fill('New content');
await expect(page.locator('button:has-text("Save")')).toBeEnabled();

// After save, wait for success notification
await page.click('button:has-text("Save")');
await expect(page.locator('text=Story updated successfully')).toBeVisible();
```

## Cross-Browser Considerations

### Timing Differences

Different browsers have different performance characteristics:

```typescript
// Webkit (Safari) often needs longer timeouts
const DELETE_DIALOG_TIMEOUT = browser.browserName() === 'webkit' ? 10000 : 5000;
await page.waitForSelector('[role="dialog"]', { timeout: DELETE_DIALOG_TIMEOUT });
```

### Browser-Specific Wait Conditions

Some browsers need additional stabilization:

```typescript
// Chrome/Edge are typically faster
if (browser.browserName() === 'chromium') {
  await page.waitForLoadState('domcontentloaded');
}

// Firefox may need network idle
if (browser.browserName() === 'firefox') {
  await page.waitForLoadState('networkidle');
}

// Webkit often needs both
if (browser.browserName() === 'webkit') {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');
}
```

### Examples from Story-003

**Delete confirmation dialog fix**:
```typescript
// Original (failed in webkit)
await page.click('button:has-text("Delete")');
await page.click('button:has-text("Cancel")'); // Failed - clicked backdrop

// Fixed (works in all browsers)
await page.click('button:has-text("Delete")');
await page.waitForSelector('[role="dialog"]');
await page.locator('[role="dialog"] button:has-text("Cancel")').click();
```

**Notification timing fix**:
```typescript
// Original (too short for slower browsers)
await page.waitForTimeout(2000);

// Fixed (accounts for 3s display + fade animation)
await page.waitForTimeout(3500);
```

## Integration with Test Infrastructure

### Authentication Setup

E2E tests require proper authentication setup:

```typescript
async function setupAuthentication(page: Page) {
  // Add API key to all API requests
  await page.route('**/api/**', async route => {
    const headers = {
      ...route.request().headers(),
      'Authorization': `Bearer ${TEST_API_KEY}`
    };
    await route.continue({ headers });
  });
  
  // Set UI token so app thinks we're logged in
  await page.evaluate(() => {
    localStorage.setItem('authToken', 'mock-token');
  });
}
```

### Test Organization

Group related tests and share setup:

```typescript
test.describe('Stories CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthentication(page);
    await navigateToStories(page);
  });
  
  test('creating a story', async ({ page }) => {
    // Test implementation
  });
});
```

## Debugging Strategies

When E2E tests fail:

1. **Run headed mode** to see what's happening:
   ```bash
   npx playwright test --headed
   ```

2. **Use Chrome MCP for debugging**:
   - Open Chrome with MCP control
   - Navigate manually to reproduce issue
   - Inspect element z-index and event listeners

3. **Add debug waits** temporarily:
   ```typescript
   await page.pause(); // Pauses execution for debugging
   ```

4. **Screenshot on failure**:
   ```typescript
   await page.screenshot({ path: 'failure.png' });
   ```

## Known Issues and Workarounds

### Playwright route.abort() Limitation

`route.abort()` doesn't trigger HTTP error handling in the application. Instead, use route.fulfill() with error status:

```typescript
// ❌ Doesn't trigger error handling
await route.abort();

// ✅ Properly triggers error handling  
await route.fulfill({ status: 500 });
```

### Dialog Click Interception

Even when buttons are visible, overlay backdrops can intercept clicks. Always scope to dialog:

```typescript
// Will fail intermittently
await page.click('button:has-text("Confirm")');

// Reliable
await page.locator('[role="dialog"] button:has-text("Confirm")').click();
```

## Maintenance Notes

Update this cartridge when:
- New E2E testing patterns emerge
- Browser compatibility issues are discovered
- Playwright updates change best practices
- New UI patterns require different selectors