---
synopsis:
  - Knowledge cartridge
  - Common @ts-ignore patterns and descriptions
  - Unused variable handling strategies
  - Database-specific linting exceptions
  - Code style patterns and auto-fix techniques
---

# Audience

Claude Code or other agentic agents dealing with linting issues in the MCP Stories project.

# Abstract

This document captures common @ts-ignore patterns, unused variable handling strategies, database-specific linting exceptions, and proven solutions for TypeScript and ESLint issues encountered during comprehensive linting cleanup.

## Common @ts-ignore Patterns

### Bun-Specific Imports
```typescript
// @ts-ignore - Bun-specific import for SQLite not recognized by TypeScript
import { Database } from 'bun:sqlite';
```

### Module Mocking in Tests
```typescript
// @ts-ignore - Module mocking requires importing after mock setup
const { someModule } = await import('../../src/SomeModule.ts');
```

### Dynamic Imports for Testing
```typescript
// @ts-ignore - Dynamic import after module mock setup
const Database = await import('../../Database');
```

### Variable Reassignment in CLI Parsing
```typescript
// @ts-ignore - databasePath is declared as const but we need to reassign it based on CLI args
databasePath = args[i + 1];
```

## Unused Variable Patterns

### Test Setup Variables
```typescript
// Variables created for test setup but not directly used
const _server = McpServer.create({ core, transport, name: 'test', version: '1.0.0' });
const _response = await fetch('/api/endpoint');
```

### Error Handlers
```typescript
try {
    // risky operation
}
catch (_error) {
    // Error is caught but not used
    cleanupStaleFiles();
}
```

### Mock Function Parameters
```typescript
const mockFunction = mock((_param1: string, _param2: number) => {
    return 'mocked result';
});
```

## Database-Specific Patterns

### SQLite Column Names
```typescript
// eslint-disable-next-line camelcase
expect(result.dflt_value).toBe(null);
```

### OAuth Parameters
```typescript
// eslint-disable-next-line camelcase
const oauthUrl = `${GOOGLE_OAUTH_URL}?access_type=offline&...`;
```

## Code Style Patterns

### Stroustrup Brace Style
```typescript
// ✅ Correct
if (condition) {
    // code
}
else {
    // code
}

try {
    // code
}
catch (error) {
    // handle error
}
```

### No Trailing Commas
```typescript
// ✅ Correct
const config = {
    timeout: 5000,
    retries: 3 // No trailing comma
};

const buildOptions = {
    entrypoints: ['main.tsx'],
    outdir: 'dist',
    target: 'browser' // No trailing comma
};
```

## TypeScript Function Types

### Specific Function Signatures
```typescript
// ❌ Avoid generic Function type
const callback: Function = () => {};

// ✅ Use specific signatures
const callback: () => void = () => {};
const handler: (error: Error) => void = () => {};
const completer: (line: string) => string[] = () => [];
```

## ESLint Configuration Patterns

### File-Specific Overrides
```json
{
  "overrides": [
    {
      "files": ["scripts/**/*.ts", "**/build.ts"],
      "rules": {
        "no-console": "off"
      }
    },
    {
      "files": ["test-unit/**/*.ts", "test-integration/**/*.ts"],
      "rules": {
        "@typescript-eslint/no-explicit-any": "off"
      }
    }
  ]
}
```

### Database Column Exceptions
```json
{
  "rules": {
    "camelcase": ["error", { 
      "properties": "always",
      "allow": ["created_at", "updated_at", "key_hash", "user_email", "expires_at", "last_used_at", "revoked_at", "dflt_value"]
    }]
  }
}
```

## Test-Specific Patterns

### Intentionally Empty Interfaces
```typescript
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface EmptyTestInterface {}
```

### Unused Test Imports
```typescript
// Remove unused imports that were artifacts of test refactoring
// import { beforeEach } from 'bun:test'; // ❌ Remove if not used
// import { randomUUID } from 'crypto';    // ❌ Remove if not used
```

## Build Script Patterns

### Console Output in Build Scripts
```typescript
// Build scripts legitimately need console output
console.log('Building client...');
console.log(`✓ Built successfully to ${outDir}`);
console.error('Build failed:', result.logs);
```

## Automation Tips

### Auto-Fix Strategy
1. Run `eslint --fix` first to handle mechanical issues
2. Then tackle @ts-ignore comments by category
3. Fix unused variables by prefixing with underscore
4. Review remaining issues manually

### Batch Processing
```bash
# Fix all files in a directory
find test-unit -name "*.test.ts" -exec eslint {} --fix \;

# Check specific error types
eslint . | grep "@typescript-eslint/ban-ts-comment"
eslint . | grep "@typescript-eslint/no-unused-vars"
```

## Quality Gates

### Pre-Commit Checks
- 0 linting errors (warnings acceptable for `any` types in tests)
- All tests still passing after linting fixes
- Consistent code style across entire codebase

### Documentation Requirements
- All @ts-ignore comments must have descriptive comments
- Unused variables should be prefixed with underscore, not deleted blindly
- Code style should follow project conventions (Stroustrup, single quotes, etc.)

## Common Mistakes to Avoid

1. **Don't delete test variables blindly** - They might be needed for setup/lifecycle
2. **Don't fix camelcase by renaming database columns** - Use eslint exceptions instead
3. **Don't remove @ts-ignore without understanding why** - Add descriptive comments instead
4. **Don't apply strict rules to test files** - They need flexibility for mocking
5. **Don't forget to verify tests still pass** - Linting changes can break functionality

This document provides a reference for efficiently resolving similar linting issues in the future.