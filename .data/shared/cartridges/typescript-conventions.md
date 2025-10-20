---
synopsis:
  - Knowledge cartridge
  - TypeScript-specific patterns
  - Type safety practices
  - Interface design guidelines
---

# Audience

Claude Code or other agentic agents writing TypeScript code in the MCP Stories project.

# Abstract

This document defines TypeScript standards and conventions for the MCP Stories project, covering module system usage (ES modules only), import rules, async programming patterns, error handling strategies, file naming conventions, runtime compatibility considerations, and Bun-specific TypeScript features.

## Table of Contents
1. [Module System](#module-system)
2. [Async Programming](#async-programming)
3. [Error Handling](#error-handling)
4. [File Naming](#file-naming)
5. [Runtime Compatibility](#runtime-compatibility)
6. [Build and Bundling](#build-and-bundling)

## Module System

### ES Modules Only

This project uses ES modules exclusively. CommonJS (`require`/`module.exports`) is not used.

```typescript
// ✅ Correct - ES module syntax with .ts extensions
import { readFile } from 'fs/promises';
import Database from './Database.ts';
import type { Config } from './types.ts';

export const myFunction = () => {};
export default MyClass;

// ❌ Incorrect - CommonJS syntax
const fs = require('fs');
module.exports = myFunction;
exports.helper = helperFunction;
```

### Import Rules

1. **Always include file extensions (.ts for TypeScript files)**:
   ```typescript
   // ✅ Correct - Bun handles .ts files natively
   import { helper } from './utils/helper.ts';
   
   // ❌ Incorrect - missing extension
   import { helper } from './utils/helper';
   
   // ❌ Incorrect - using .js for TypeScript files
   import { helper } from './utils/helper.js';
   ```

2. **Use type imports for TypeScript types**:
   ```typescript
   // ✅ Correct - separates types from runtime code
   import type { User, Story } from './types.ts';
   import { createUser } from './services/UserService.ts';
   
   // ❌ Avoid - mixes types and runtime imports
   import { User, createUser } from './services/UserService.ts';
   ```

3. **Order imports consistently**:
   ```typescript
   // 1. Node.js built-ins
   import { readFile } from 'fs/promises';
   import { join } from 'path';
   
   // 2. External dependencies
   import { Kysely } from 'kysely';
   import { Database } from 'bun:sqlite';
   
   // 3. Internal modules (absolute or relative)
   import Core from '../core/Core.ts';
   import { helper } from './utils.ts';
   
   // 4. Type imports
   import type { User } from './types.ts';
   ```

### Dynamic Imports

Use dynamic imports only when necessary (lazy loading, conditional loading):

```typescript
// ✅ Good - lazy loading for performance
if (needsAdvancedFeature) {
    const { AdvancedProcessor } = await import('./AdvancedProcessor.ts');
    const processor = AdvancedProcessor.create();
}

// ❌ Avoid - use static imports when possible
const loadDatabase = async () => {
    const Database = (await import('./Database.ts')).default;
    return Database.create();
};
```

### Bun-Specific Notes

1. **Native TypeScript Support**: Bun runs TypeScript files directly without compilation
2. **No Build Step**: Import `.ts` files directly - no transpilation needed
3. **Module Resolution**: Bun follows Node.js module resolution with TypeScript support

## TypeScript Guidelines

### Type Safety

1. **Avoid `any`**: Use `unknown` for truly unknown types
   ```typescript
   // ✅ Correct
   const paramCheck = (value: unknown): void => {
       if (!value || typeof value !== 'string') {
           throw new Error('value must be a string');
       }
   };
   
   // ❌ Incorrect
   const process = (data: any) => { /* ... */ };
   ```

2. **Explicit Return Types**: Always specify return types for public functions
   ```typescript
   // ✅ Correct
   const create = (options: CoreOptions): CoreInstance => {
       // ...
   };
   
   // ❌ Avoid
   const create = (options: CoreOptions) => {
       // ...
   };
   ```

3. **Interface over Type**: Prefer interfaces for object shapes
   ```typescript
   // ✅ Correct
   interface Story {
       id?: number;
       summary: string;
   }
   
   // Use type for unions, intersections, or mapped types
   type Status = 'pending' | 'completed' | 'failed';
   ```

## Async Programming

### Prefer Async/Await

Use async/await over callbacks or raw promises for better readability:

```typescript
// ✅ Correct - async/await
const loadUser = async (id: string): Promise<User> => {
    const user = await db.selectFrom('users')
        .where('id', '=', id)
        .executeTakeFirst();
    
    if (!user) {
        throw new Error(`User ${id} not found`);
    }
    
    return user;
};

// ❌ Avoid - promise chains
const loadUser = (id: string): Promise<User> => {
    return db.selectFrom('users')
        .where('id', '=', id)
        .executeTakeFirst()
        .then(user => {
            if (!user) {
                throw new Error(`User ${id} not found`);
            }
            return user;
        });
};

// ❌ Never - callbacks
const loadUser = (id: string, callback: (err: Error | null, user?: User) => void) => {
    // Don't do this
};
```

### Error Handling in Async Functions

Always handle errors appropriately:

```typescript
// ✅ Correct - explicit error handling
const processStory = async (storyId: string) => {
    try {
        const story = await loadStory(storyId);
        const result = await processStoryData(story);
        return { success: true, data: result };
    }
    catch (error) {
        logger.error('Failed to process story:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        };
    }
};

// ❌ Avoid - unhandled rejection
const processStory = async (storyId: string) => {
    const story = await loadStory(storyId); // Could throw
    return processStoryData(story);
};
```

## Error Handling

### Error Types

1. **Use Error classes**:
   ```typescript
   // ✅ Correct
   throw new Error('User not found');
   throw new ValidationError('Invalid email format');
   
   // ❌ Avoid
   throw 'User not found';
   throw { message: 'User not found' };
   ```

2. **Create custom error classes for specific cases**:
   ```typescript
   class ValidationError extends Error {
       constructor(message: string, public field?: string) {
           super(message);
           this.name = 'ValidationError';
       }
   }
   
   class NotFoundError extends Error {
       constructor(resource: string, id: string) {
           super(`${resource} with id ${id} not found`);
           this.name = 'NotFoundError';
       }
   }
   ```

### Error Propagation

Let errors bubble up unless you can handle them meaningfully:

```typescript
// ✅ Correct - handle at appropriate level
class StoryService {
    async createStory(data: CreateStoryData) {
        // Let validation errors bubble up
        this.validateStoryData(data);
        
        // Let database errors bubble up
        return await this.db.insertInto('stories')
            .values(data)
            .execute();
    }
}

// ❌ Avoid - catching and re-throwing without adding value
async createStory(data: CreateStoryData) {
    try {
        return await this.db.insertInto('stories')
            .values(data)
            .execute();
    }
    catch (error) {
        throw error; // Pointless
    }
}
```

## File Naming

1. **TypeScript files**: Use `.ts` extension
2. **Test files**: Use `.test.ts` or `.spec.ts`
3. **Type definition files**: Use `.d.ts` only for ambient declarations
4. **Case conventions**:
   - Components/Classes: `PascalCase.ts` (e.g., `UserService.ts`)
   - Utilities/Helpers: `camelCase.ts` (e.g., `formatDate.ts`)
   - Configuration: `kebab-case.ts` (e.g., `db-config.ts`)


## Runtime Compatibility

### Target Environments

Code should be compatible with:
1. **Server**: Bun runtime (primary)
2. **Client**: Modern browsers via Vite
3. **Future**: Potentially Node.js for certain tools

### Avoid Runtime-Specific APIs

```typescript
// ✅ Correct - use standard APIs
import { readFile } from 'fs/promises';

// ❌ Avoid - Bun-specific when not necessary
Bun.file('/path/to/file'); // Use only when needed for performance
```

### Feature Detection

When using runtime-specific features:

```typescript
// Check for Bun-specific features
if (typeof Bun !== 'undefined') {
    // Use Bun-specific optimizations
    return Bun.file(path).text();
} else {
    // Fallback to standard API
    return readFile(path, 'utf-8');
}
```

## Build and Bundling

### TypeScript Configuration

Key `tsconfig.json` settings:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler", // For Bun
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["bun-types"] // For server
  }
}
```

### Import Resolution

1. **No path aliases**: Avoid `@/` style imports
2. **Relative imports**: Use `./` and `../`
3. **Always include extensions**: `.ts` for TypeScript files when using Bun

### Bundle Considerations

1. **Server**: Bun handles TypeScript natively, no bundling needed
2. **Client**: Vite handles bundling and TypeScript compilation
3. **Shared code**: Must be runtime-agnostic

## Summary

These standards ensure:
- **Consistency**: One way to do things across the codebase
- **Portability**: Code works across different JavaScript runtimes
- **Maintainability**: Clear patterns make code easier to understand
- **Future-proof**: Following modern JavaScript standards

When in doubt, prefer:
1. Explicit over implicit
2. Standards over runtime-specific features
3. Consistency over local optimization
4. Readability over cleverness