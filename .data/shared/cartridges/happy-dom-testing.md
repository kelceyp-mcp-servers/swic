---
synopsis:
  - Knowledge cartridge
  - Happy-DOM integration with Bun's test runner
  - Conditional registration pattern for test isolation
  - React Testing Library setup and patterns
  - Troubleshooting common DOM testing issues
  - Performance characteristics and best practices
---

# Happy-DOM Testing Setup

## Audience

Developers and AI agents working on React component testing in the MCP Stories client application.

## Abstract

This cartridge captures hard-won knowledge about integrating Happy-DOM with Bun's test runner for React component testing. It documents the setup, patterns, and solutions to common issues discovered during story-012.

## Overview

Happy-DOM provides browser globals (document, window, etc.) in Bun's test environment, enabling proper DOM-based testing with React Testing Library instead of brittle string-based assertions.

## Complete Setup Process

Follow these steps in order to set up Happy-DOM for React component testing:

### Step 1: Install Package
```bash
cd subprojects/client  # Or your client directory
bun add -d @happy-dom/global-registrator
```

Current version: `@happy-dom/global-registrator@^18.0.1`

### Step 2: Create Test Setup File
Create `test-setup/setup-dom.ts` with conditional registration:

```typescript
import { GlobalRegistrator } from '@happy-dom/global-registrator';

// Only register Happy-DOM for unit tests
// Integration tests need to mock browser APIs differently
if (process.argv.some(arg => arg.includes('test-unit'))) {
    GlobalRegistrator.register();
    console.log('typeof document:', typeof document);
    console.log('typeof window:', typeof window);
}
```

### Step 3: Configure Bun Preload
Create or update `bunfig.toml` in your client directory:

```toml
[test]
preload = ["./test-setup/setup-dom.ts"]
```

### Step 4: Install React Testing Library
```bash
bun add -d @testing-library/react @testing-library/user-event
```

### Step 5: Update Package Scripts
Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test": "bun run test:unit && bun run test:integration",
    "test:unit": "bun test test-unit",
    "test:integration": "bun test test-integration"
  }
}
```

### Step 6: Verify Setup
Create a simple test to verify Happy-DOM is working:

```typescript
// test-unit/setup.test.tsx
import { test, expect } from 'bun:test';

test('Happy-DOM provides browser globals', () => {
    expect(typeof document).toBe('object');
    expect(typeof window).toBe('object');
    expect(document.createElement).toBeDefined();
});
```

Run with: `bun run test:unit`

## Critical Discoveries

### 1. Conditional Registration Pattern

**Problem**: Happy-DOM provides real `localStorage` and `window` objects as readonly properties on the global object. This breaks integration tests that need to mock these globals.

**Solution**: Make Happy-DOM registration conditional based on test type:
- Check `process.argv` to detect if running unit tests
- Only register for `test-unit` directory
- Integration tests continue to mock globals as needed

This ensures:
- Unit tests get full DOM environment via Happy-DOM
- Integration tests can still mock browser APIs for testing
- Both test suites run successfully with a single preload configuration

### 2. Test Isolation Requirements

**Problem**: Components from previous tests weren't being cleaned up, causing "multiple elements found" errors.

**Solution**: Always use `cleanup()` from React Testing Library:
```typescript
import { cleanup } from '@testing-library/react';
import { afterEach } from 'bun:test';

afterEach(() => {
    cleanup(); // Clean up DOM after each test
});
```

### 3. Module Mock Persistence

Happy-DOM works well with Bun's known module mock persistence issue because:
- It registers globally via preload, not as a module mock
- Doesn't interfere with existing test infrastructure
- Clean separation between test types prevents conflicts

## React Testing Library Integration

### Basic Setup

With Happy-DOM configured, React Testing Library works seamlessly in Bun tests:

```typescript
// test-unit/components/MyComponent.test.tsx
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, test, expect } from 'bun:test';
import { MyComponent } from '../../src/components/MyComponent';

// Clean up after each test to prevent contamination
afterEach(() => {
    cleanup();
});
```

### Proper render() Usage

```typescript
test('renders component with props', () => {
    const { container } = render(
        <MyComponent title="Test Title" />
    );
    
    // Query by text
    expect(screen.getByText('Test Title')).toBeDefined();
    
    // Query by role
    expect(screen.getByRole('button')).toBeDefined();
    
    // Access container for advanced queries
    expect(container.querySelector('.my-class')).toBeDefined();
});
```

### Screen Queries and Assertions

React Testing Library provides semantic queries that mirror how users interact with your app:

```typescript
// Queries in order of preference:

// 1. By Role (best for accessibility)
screen.getByRole('button', { name: 'Submit' });
screen.getByRole('heading', { level: 1 });
screen.getByRole('textbox', { name: 'Email' });

// 2. By Label Text (for form elements)
screen.getByLabelText('Username');
screen.getByLabelText(/password/i); // Case-insensitive regex

// 3. By Placeholder Text
screen.getByPlaceholderText('Enter your email');

// 4. By Text Content
screen.getByText('Welcome');
screen.getByText(/loading/i);

// 5. By Display Value (for inputs)
screen.getByDisplayValue('current value');

// 6. By Alt Text (for images)
screen.getByAltText('Profile picture');

// 7. By Title
screen.getByTitle('Close dialog');

// 8. By Test ID (last resort)
screen.getByTestId('custom-element');
```

### Query Variants

Each query has multiple variants:

```typescript
// getBy* - Throws if not found or multiple found
const element = screen.getByRole('button');

// queryBy* - Returns null if not found
const maybeElement = screen.queryByRole('button');
if (maybeElement) {
    // Element exists
}

// findBy* - Returns a promise, waits up to 1000ms
const asyncElement = await screen.findByRole('button');

// getAllBy* - Returns array, throws if none found
const buttons = screen.getAllByRole('button');

// queryAllBy* - Returns array, empty if none found
const maybeButtons = screen.queryAllByRole('button');

// findAllBy* - Async version of getAllBy
const asyncButtons = await screen.findAllByRole('button');
```

### fireEvent Patterns for Interactions

```typescript
import { fireEvent } from '@testing-library/react';

test('handles user interactions', () => {
    render(<MyForm />);
    
    const input = screen.getByLabelText('Email');
    const button = screen.getByRole('button', { name: 'Submit' });
    
    // Type into input
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    
    // Click button
    fireEvent.click(button);
    
    // Verify result
    expect(screen.getByText('Form submitted')).toBeDefined();
});

// Common fireEvent methods:
fireEvent.click(element);
fireEvent.change(element, { target: { value: 'new value' } });
fireEvent.focus(element);
fireEvent.blur(element);
fireEvent.submit(formElement);
fireEvent.keyDown(element, { key: 'Enter', code: 'Enter' });
fireEvent.mouseOver(element);
```

### User Event (Better Alternative)

For more realistic interactions, use @testing-library/user-event:

```typescript
import userEvent from '@testing-library/user-event';

test('realistic user interactions', async () => {
    const user = userEvent.setup();
    render(<MyForm />);
    
    const input = screen.getByLabelText('Email');
    const button = screen.getByRole('button', { name: 'Submit' });
    
    // Type realistically (with delays between keystrokes)
    await user.type(input, 'test@example.com');
    
    // Click like a real user
    await user.click(button);
    
    // More realistic interactions:
    await user.dblClick(element);
    await user.hover(element);
    await user.tab(); // Focus next element
    await user.keyboard('[Escape]'); // Press escape key
});
```

## Testing Patterns

### Before (String-Based)
```typescript
// ❌ Brittle and implementation-coupled
test('loading state is properly initialized', () => {
    const componentCode = Stories.toString();
    expect(componentCode).toContain('useState');
    expect(componentCode).toContain('loading');
});
```

### After (DOM-Based)
```typescript
// ✅ Tests user-visible behavior
import { render, screen } from '@testing-library/react';

test('shows loading state initially', () => {
    render(<Stories />);
    expect(screen.getByText('Loading stories...')).toBeDefined();
});
```

## Common Patterns

### Testing Component State Changes

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { test, expect } from 'bun:test';
import { Counter } from '../../src/components/Counter';

test('component state updates on interaction', () => {
    render(<Counter initialCount={0} />);
    
    // Initial state
    expect(screen.getByText('Count: 0')).toBeDefined();
    
    // Click increment button
    const incrementButton = screen.getByRole('button', { name: 'Increment' });
    fireEvent.click(incrementButton);
    
    // State updated
    expect(screen.getByText('Count: 1')).toBeDefined();
    
    // Multiple interactions
    fireEvent.click(incrementButton);
    fireEvent.click(incrementButton);
    expect(screen.getByText('Count: 3')).toBeDefined();
});

test('form state management', () => {
    render(<ContactForm />);
    
    const nameInput = screen.getByLabelText('Name');
    const emailInput = screen.getByLabelText('Email');
    const submitButton = screen.getByRole('button', { name: 'Submit' });
    
    // Initially submit is disabled
    expect(submitButton).toBeDisabled();
    
    // Fill form
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    
    // Submit enabled after valid input
    expect(submitButton).not.toBeDisabled();
});
```

### Testing Async Operations with waitFor

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { test, expect } from 'bun:test';
import { DataLoader } from '../../src/components/DataLoader';

test('async data loading', async () => {
    // Mock fetch
    global.fetch = () => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: 'test data' })
    } as Response);
    
    render(<DataLoader />);
    
    // Initially shows loading
    expect(screen.getByText('Loading...')).toBeDefined();
    
    // Wait for data to load
    await waitFor(() => {
        expect(screen.getByText('test data')).toBeDefined();
    });
    
    // Loading gone
    expect(screen.queryByText('Loading...')).toBeNull();
});

test('async with timeout options', async () => {
    render(<SlowComponent />);
    
    // Custom timeout for slow operations
    await waitFor(
        () => {
            expect(screen.getByText('Data loaded')).toBeDefined();
        },
        {
            timeout: 3000, // 3 seconds instead of default 1 second
            interval: 100  // Check every 100ms
        }
    );
});

test('error handling in async operations', async () => {
    // Mock failed fetch
    global.fetch = () => Promise.reject(new Error('Network error'));
    
    render(<DataLoader />);
    
    // Wait for error state
    await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeDefined();
    });
    
    // Retry button appears
    const retryButton = screen.getByRole('button', { name: 'Retry' });
    expect(retryButton).toBeDefined();
});
```

### Mocking React Router and Other Dependencies

```typescript
import { render, screen } from '@testing-library/react';
import { test, expect, mock } from 'bun:test';
import { MemoryRouter } from 'react-router-dom';
import { Navigation } from '../../src/components/Navigation';

// Mock useNavigate hook
mock.module('react-router-dom', () => ({
    ...require('react-router-dom'),
    useNavigate: () => mock(() => {}),
    useParams: () => ({ id: '123' }),
    useLocation: () => ({ pathname: '/test' })
}));

test('navigation with React Router', () => {
    render(
        <MemoryRouter initialEntries={['/dashboard']}>
            <Navigation />
        </MemoryRouter>
    );
    
    // Current route highlighted
    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    expect(dashboardLink).toHaveClass('active');
});

test('component with router context', () => {
    const { rerender } = render(
        <MemoryRouter initialEntries={['/']}>
            <App />
        </MemoryRouter>
    );
    
    // Navigate to different route
    rerender(
        <MemoryRouter initialEntries={['/about']}>
            <App />
        </MemoryRouter>
    );
    
    expect(screen.getByText('About Page')).toBeDefined();
});

// Mock other common dependencies
test('mocking context providers', () => {
    const mockUser = { id: 1, name: 'Test User' };
    
    render(
        <UserContext.Provider value={{ user: mockUser, login: mock(), logout: mock() }}>
            <UserProfile />
        </UserContext.Provider>
    );
    
    expect(screen.getByText('Test User')).toBeDefined();
});

// Mock external libraries
mock.module('axios', () => ({
    default: {
        get: mock(() => Promise.resolve({ data: { items: [] } })),
        post: mock(() => Promise.resolve({ data: { success: true } }))
    }
}));
```

### Testing Forms and Validation

```typescript
test('form validation', async () => {
    render(<RegistrationForm />);
    
    const emailInput = screen.getByLabelText('Email');
    const submitButton = screen.getByRole('button', { name: 'Register' });
    
    // Submit with invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);
    
    // Error message appears
    await waitFor(() => {
        expect(screen.getByText('Please enter a valid email')).toBeDefined();
    });
    
    // Fix email
    fireEvent.change(emailInput, { target: { value: 'valid@example.com' } });
    
    // Error clears
    await waitFor(() => {
        expect(screen.queryByText('Please enter a valid email')).toBeNull();
    });
});
```

### Testing Accessibility

```typescript
test('keyboard navigation', () => {
    render(<Menu />);
    
    const firstItem = screen.getByRole('menuitem', { name: 'Home' });
    const secondItem = screen.getByRole('menuitem', { name: 'About' });
    
    // Tab to first item
    firstItem.focus();
    expect(document.activeElement).toBe(firstItem);
    
    // Arrow down to next item
    fireEvent.keyDown(firstItem, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(secondItem);
});

test('ARIA attributes', () => {
    render(<Modal isOpen={true} />);
    
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
});
```

## Examples from Story-003 Implementation

### Real-World Discoveries

During story-003 (Implement Stories UI), we discovered several important patterns:

#### 1. Initial Attempt Without DOM (Failed)
```typescript
// ❌ What we tried first - string-based testing
test('Stories component exists', () => {
    const componentCode = Stories.toString();
    expect(componentCode).toContain('useState');
    expect(componentCode).toContain('loading');
});
```

This approach was brittle and didn't test actual behavior, leading us to implement Happy-DOM.

#### 2. Successful Happy-DOM Integration
After adding Happy-DOM, we could write meaningful tests:

```typescript
// ✅ What worked with Happy-DOM
import { render, screen } from '@testing-library/react';
import { test, expect } from 'bun:test';
import { Stories } from '../../src/components/Stories';

test('displays loading state initially', () => {
    render(<Stories />);
    expect(screen.getByText('Loading stories...')).toBeDefined();
});

test('renders story list after loading', async () => {
    // Mock API response
    global.fetch = mock(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
            { id: 1, summary: 'First story' },
            { id: 2, summary: 'Second story' }
        ])
    }));
    
    render(<Stories />);
    
    // Wait for stories to load
    await waitFor(() => {
        expect(screen.getByText('First story')).toBeDefined();
        expect(screen.getByText('Second story')).toBeDefined();
    });
});
```

#### 3. Form Testing Pattern from StoryForm Component
```typescript
test('StoryForm handles create vs edit modes', () => {
    // Create mode
    const { rerender } = render(<StoryForm mode="create" />);
    expect(screen.getByRole('button', { name: 'Create Story' })).toBeDefined();
    
    // Edit mode with existing story
    rerender(<StoryForm mode="edit" story={{ id: 1, summary: 'Existing' }} />);
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDefined();
    expect(screen.getByDisplayValue('Existing')).toBeDefined();
});
```

#### 4. Unsaved Changes Dialog Pattern
The implementation moved from `window.confirm` to a custom Dialog component:

```typescript
test('warns about unsaved changes', async () => {
    const { container } = render(<StoryForm mode="edit" />);
    
    // Make changes
    const input = screen.getByLabelText('Summary');
    fireEvent.change(input, { target: { value: 'Modified text' } });
    
    // Try to navigate away
    const homeLink = screen.getByRole('link', { name: 'Home' });
    fireEvent.click(homeLink);
    
    // Dialog appears
    await waitFor(() => {
        expect(screen.getByText('Unsaved Changes')).toBeDefined();
    });
    
    // Can choose to stay
    const keepEditingButton = screen.getByRole('button', { name: 'Keep Editing' });
    fireEvent.click(keepEditingButton);
    
    // Still on form
    expect(screen.getByDisplayValue('Modified text')).toBeDefined();
});
```

### Lessons Learned

1. **String-based tests are fragile** - Testing component.toString() doesn't validate behavior
2. **Happy-DOM enables real testing** - With proper DOM, we can test user interactions
3. **Conditional registration is crucial** - Integration tests need different mocking strategies
4. **cleanup() prevents test pollution** - Always clean up between tests
5. **Mock at the right level** - Mock API calls, not React internals

## Performance Impact

Minimal overhead observed:
- Unit tests: ~350ms for 6 tests
- Integration tests: ~220ms for 12 tests
- Total suite: Under 600ms
- Happy-DOM adds only 1-2ms per test

## Troubleshooting

### "ReferenceError: document is not defined"

**Causes**:
1. Running `bun test` directly instead of npm scripts
2. Missing bunfig.toml configuration
3. Preload script not found

**Solutions**:
- Always use `bun run test:unit` or `bun run test`
- Verify bunfig.toml exists with preload configuration
- Check test-setup/setup-dom.ts exists and imports correctly

### "Multiple elements found"

**Cause**: Previous test's components still in DOM

**Solution**: Add `afterEach(() => cleanup())` to test files

### Module Mock Conflicts

**Cause**: Trying to mock globals that Happy-DOM provides

**Solution**: Use conditional registration pattern (only for unit tests)

## File Structure

```
subprojects/client/
├── bunfig.toml              # Preload configuration
├── test-setup/
│   └── setup-dom.ts         # Happy-DOM registration
├── test-unit/               # Tests WITH Happy-DOM
│   └── *.test.tsx
└── test-integration/        # Tests WITHOUT Happy-DOM
    └── *.test.ts
```

## Best Practices

1. **Never use `bun test` directly** - Always use npm scripts to maintain test separation
2. **Keep test types separate** - Unit tests in test-unit/, integration in test-integration/
3. **Clean up after each test** - Use afterEach with cleanup()
4. **Use semantic queries** - Prefer getByRole, getByText over test IDs
5. **Test behavior, not implementation** - Focus on what users see

## Why Happy-DOM Over jsdom

Bun officially recommends Happy-DOM because:
- Better performance with Bun's runtime
- Lighter weight implementation
- Fewer compatibility issues
- Simpler API

## Future Considerations

1. **Happy-DOM Settings**: Can be configured in setup-dom.ts if needed:
   ```typescript
   window.happyDOM.settings.enableFileSystemHttpRequests = false;
   ```

2. **Custom Test Utilities**: Could add a custom render with providers:
   ```typescript
   const customRender = (ui: ReactElement) => {
     return render(ui, { wrapper: AllTheProviders });
   };
   ```

3. **Performance Tuning**: If tests slow down, Happy-DOM has performance settings to disable unnecessary features

## Related Cartridges

- `bun-expertise.md` - For Bun-specific patterns
- `testing-expertise.md` - For general testing patterns
- `ui-development.md` - For React development patterns

## Maintenance Notes

This cartridge documents the state as of Happy-DOM v18.0.1 with Bun v1.2.15. Update if:
- Happy-DOM API changes
- Bun's preload mechanism changes
- New patterns emerge for test isolation
- Performance characteristics change significantly