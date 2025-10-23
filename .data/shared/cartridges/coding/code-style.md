---
synopsis:
  - Knowledge cartridge
  - Code formatting standards
  - Comment guidelines
  - Naming conventions
  - File organization
---

# Audience

Claude Code or other agentic agents writing code for the MCP Stories project.

# Abstract

This document defines coding standards including formatting rules, comment guidelines, naming conventions, and file organization patterns that ensure consistent, maintainable code across the project.

## Follow Formatting Rules

1. **Formatting**:
    - Use 4-space indentation
    - Use single quotes for strings unless double quotes are needed
    - Both else and catch statements on a new line
    
    ```javascript
    // Correct
    if (condition) {
        // code
    }
    else {
        // code
    }
    
    try {
        // code
    }
    catch (err) {
        // handle error
    }
    
    // Incorrect
    if (condition) {
        // code
    } else {  // else should be on new line
        // code
    }
    
    try {
        // code
    } catch (err) {  // catch should be on new line
        // handle error
    }
    ```

2. **Documentation**:
    - Use JSDoc for functions and modules
    - Include parameter types and return values
    - Document expected errors and edge cases
    - Keep inline comments minimal and focused on "why", not "what"

3. **Naming Conventions**:
    - Use camelCase for variables and functions
    - Use PascalCase for classes and constructors
    - Use UPPERCASE_SNAKE_CASE for constants
    - Prefer descriptive names over abbreviations

## Fail Fast

Do not use defaults or fallback values unless they are explicitly required as part of the story description. Default values or fallback values just mask problems. Some would say fallbacks and defaults make the code resilient. That is false however. Proper unit tests and ensuring we get what we expect at every point and throw exceptions when we do not is the way. Fail fast, find out where things did not go as planned as soon as the code is added so that we do not build fragility with false visions of resilience.

## Use Prescribed Module Pattern

1. **Module Pattern**:
    - Use closure-based module pattern with factory functions
    - Export an object containing static variables, static functions, and a factory function called 'create'
    - The 'create' function should take an 'options' object to create instances
    - Return a frozen API object with access to the closure

Use this version of the pattern when placing it in its own file:

```typescript
import { someFunction } from './dependency.ts';
import type { SomeType } from './types.ts';

interface ExampleOptions {
    value: string;
}

interface ExampleApi {
    instanceFn(): void;
}

const EXAMPLE_CONSTANT = 4;

const examplePublicStaticFunction = (): void => {};

const examplePrivateStaticFunction = (): void => {};

const paramCheck = (value: unknown): void => {
    if (!value || typeof value !== 'string') {
        throw new Error('value is required and must be a string');
    }
}; // fail fast by throwing

const create = (options: ExampleOptions): ExampleApi => {
    const { value } = options;
    paramCheck(value);

    let instanceVar: number;
    const instanceConst = 7;

    const instanceFn = (): void => {};

    return Object.freeze({instanceFn});
};

const ModuleName = Object.freeze({
    EXAMPLE_CONSTANT,
    examplePublicStaticFunction,
    create
});

// Exports grouped at bottom for visibility
export default ModuleName;
export type { ExampleApi, ExampleOptions };
```

Use this version of the pattern when using it inline as part of another module:

```typescript
import { someFunction } from './dependency.ts';  // outside of the module to enable mocking

const Server = (function() {
    const EXAMPLE_CONSTANT = 4;

    const examplePublicStaticFunction = (): void => {};

    const examplePrivateStaticFunction = (): void => {};

    const paramCheck = (value: unknown): void => {
        if (!value || typeof value !== 'string') {
            throw new Error('value is required and must be a string');
        }
    };  // fail fast by throwing

    const create = (options: { value: string }) => {
        const { value } = options;
        paramCheck(value);
        
        let instanceVar: number;
        const instanceConst = 7;
        
        const instanceFn = (): void => {};
        
        return Object.freeze({instanceFn});
    };
    
    return Object.freeze({
        EXAMPLE_CONSTANT,
        examplePublicStaticFunction,
        create
    });
})();

export default Server;
```

Note: The pattern uses `{ModuleName}Api` for the public interface and `{ModuleName}Options` for create options.

2. **Code Organization**:
    - Separate public and private functions clearly
    - Group related functions together
    - Place constants and configuration at the top of the module
    - Export only what is necessary for the public API
    - **Group all exports at the bottom of the file for visibility** - This makes it easy to see what a module exports at a glance

3. **Error Handling**:
    - Use structured error objects
    - Validate function parameters early
    - Return meaningful error messages
    - Use try/catch blocks appropriately

## Folder Structure and File Naming Conventions

1. **Folders and Organization**:
    - Organize code into folders that group logically related components
    - With Bun and TypeScript, modules can be imported directly without facade files
    - Example: `/core/` folder would have `Core.ts`, `types.ts`, etc.
    - Import directly: `import Core from './core/Core.ts'`
    - No need for separate facade files since Bun handles TypeScript natively

2. **Direct TypeScript Imports**:
    - Import TypeScript files directly with `.ts` extension
    - Bun handles TypeScript compilation automatically
    - No need for `.js` extension workarounds
    - Example: `import { Story } from './types.ts'`

3. **When to Use `index.js`**:
    - Use `index.js` only for utility folders where most/all modules are meant to be exposed
    - In these cases, the index.js file serves as a true "index" by re-exporting from multiple modules
    - This allows importing from the folder directly rather than from individual files

4. **Internal Implementation Files**:
    - Files used only within a component folder should not be exported directly
    - The facade module should import these internal components and expose only what's necessary
    - This enables fine-grained implementation files that are easier to test and maintain

Example usage pattern:
```typescript
// Import directly from TypeScript files
import McpServer from "./mcp-server/McpServer.ts";
import type { ServerOptions } from "./mcp-server/types.ts";

// Static properties are available directly
console.log(McpServer.SOME_CONSTANT);

// Instances are created via the factory pattern
const myInstance = McpServer.create({ name: 'test' });
```

## TypeScript Conventions

### Import Extensions

Always use `.ts` extensions in TypeScript imports when using Bun:

```typescript
// ✅ Correct with Bun
import McpClient from './mcp-client.ts';
import { Result } from '../types/result.ts';

// ❌ Incorrect
import McpClient from './mcp-client';
import McpClient from './mcp-client.js';
```

Bun handles TypeScript files natively, so we import `.ts` files directly.

### Type Definitions

1. **Interfaces vs Types**:
   - Use `interface` for objects that will be implemented or extended
   - Use `type` for unions, intersections, and utility types
   - Prefer `interface` for public API contracts

```typescript
// Use interface for object shapes
interface UserData {
    id: string;
    name: string;
    email: string;
}

// Use type for unions and complex types
type Status = 'pending' | 'active' | 'inactive';
type AsyncResult<T> = Promise<Result<T>>;
```

2. **Naming Conventions**:
   - Use PascalCase for all type and interface names
   - Prefix interface names with 'I' only when avoiding naming conflicts
   - Use descriptive names that indicate the type's purpose

```typescript
interface ClientConfig { }        // ✅ Good
interface IClientConfig { }       // ❌ Avoid unless necessary
type DatabaseResponse = { };      // ✅ Good
type DBResp = { };               // ❌ Too abbreviated
```

3. **Type Inference**:
   - Let TypeScript infer types when obvious
   - Explicitly type function parameters and return values
   - Type variables when the type isn't immediately clear

```typescript
// Let TypeScript infer simple types
const port = 3000;                        // number inferred
const messages = ['hello', 'world'];      // string[] inferred

// Explicitly type function signatures
const processUser = (user: UserData): Result<string> => {
    // implementation
};

// Type when not obvious
const config: Partial<ClientConfig> = {};
```


### Module Pattern with TypeScript

The module pattern works the same in TypeScript with proper typing:

```typescript
interface ModuleConfig {
    timeout?: number;
    retries?: number;
}

interface ModuleInstance {
    process(data: string): Result<ProcessedData>;
    readonly status: Status;
}

interface ModuleExports {
    readonly DEFAULT_TIMEOUT: number;
    create(config: ModuleConfig): ModuleInstance;
}

const DEFAULT_TIMEOUT = 5000;

const create = (config: ModuleConfig): ModuleInstance => {
    const { timeout = DEFAULT_TIMEOUT, retries = 3 } = config;
    
    let status: Status = 'pending';
    
    const process = (data: string): Result<ProcessedData> => {
        // implementation
    };
    
    return Object.freeze({
        process,
        get status() { return status; }
    });
};

export default Object.freeze({
    DEFAULT_TIMEOUT,
    create
} as ModuleExports);
```

## Parameter Nullability - If It's Required, Make It Required

Do not accept `| null | undefined` in method parameters only to immediately validate against these values. This defensive programming pattern violates the "fail fast" principle and creates unnecessary complexity.

### Core Principle

If a parameter is required for a method to function, it should not accept null or undefined. Let TypeScript enforce this at compile time rather than adding runtime validation.

### Incorrect Patterns (Avoid These)

```typescript
// ❌ BAD: Accepting null/undefined only to reject it
const createUser = async (userData: CreateUserData | null): Promise<Result<User>> => {
    if (!userData || typeof userData !== 'object') {
        return Result.error('userData must be an object');
    }
    // ... actual logic
};

// ❌ BAD: Defensive parameter checking
const getUser = async (userId: string | null | undefined): Promise<Result<User | null>> => {
    if (userId === undefined || userId === null) {
        return Result.error('userId is required');
    }
    // ... actual logic
};

// ❌ BAD: Using null as a business signal
const assignSubtask = async (subtaskId: string, assignee: string | null): Promise<Result<Subtask>> => {
    if (assignee === null) {
        // Unassign logic
    } else {
        // Assign logic
    }
};
```

### Correct Patterns

```typescript
// ✅ GOOD: Required parameters are non-nullable
const createUser = async (userData: CreateUserData): Promise<Result<User>> => {
    // Straight to business logic - TypeScript ensures userData is valid
    if (!userData.userId) {
        return Result.error('userId is required');
    }
    // ... actual logic
};

// ✅ GOOD: Clear, required parameters
const getUser = async (userId: string): Promise<Result<User | null>> => {
    if (userId === '') {
        return Result.error('userId cannot be empty');
    }
    // ... actual logic
};

// ✅ GOOD: Separate methods for different operations
const assignSubtask = async (subtaskId: string, userId: string): Promise<Result<Subtask>> => {
    // Assignment logic
};

const unassignSubtask = async (subtaskId: string): Promise<Result<Subtask>> => {
    // Unassignment logic
};
```

### When Nullable Parameters Are Appropriate

Nullable parameters are appropriate when they represent genuinely optional values:

```typescript
// ✅ GOOD: Optional filter parameters
interface UserFilter {
    status?: string;
    role?: string | null;  // null might mean "users with no role"
}

const getUsers = async (filter?: UserFilter): Promise<Result<User[]>> => {
    // filter is genuinely optional
};

// ✅ GOOD: Return types that might not exist
const findUser = async (userId: string): Promise<Result<User | null>> => {
    // User might not exist, so null is a valid return
};

// ✅ GOOD: Optional configuration
interface Config {
    timeout?: number;      // Has a default value
    retryCount?: number;   // Has a default value
}
```

### Different Operations = Different Methods

When null/undefined represents a different operation, create separate methods:

```typescript
// ❌ BAD: One method doing two things
updateField(id: string, value: string | null)  // null means "clear the field"

// ✅ GOOD: Clear intent with separate methods
updateField(id: string, value: string)
clearField(id: string)
```

### ESLint Configuration

To prevent regression, consider adding these ESLint rules:

```json
{
  "rules": {
    "@typescript-eslint/no-unnecessary-condition": "error",
    "@typescript-eslint/strict-boolean-expressions": ["error", {
      "allowNullableObject": false,
      "allowNullableBoolean": false
    }]
  }
}
```

These rules will catch unnecessary null/undefined checks and enforce stricter type usage.

## Module System

This project uses ES modules exclusively. See [TypeScript Coding Style](./ts-coding-style.md#4-runtime--module-system) for detailed guidelines on imports, exports, and module conventions.

## Avoid Hardcoded URLs

Hardcoded URLs are a critical anti-pattern that breaks deployments across different environments. Like magic numbers, they introduce hidden assumptions that make code inflexible and environment-specific. A hardcoded `localhost:3000` reference will break when the application runs in staging, production, Docker containers, or through tunneling services like ngrok.

### Why Hardcoded URLs Break Deployments

Hardcoded URLs create multiple failure modes:

1. **Environment Portability**: Applications must work across development, staging, and production environments
2. **Dynamic Hosting**: Modern deployments use varying hostnames, ports, and protocols
3. **Proxy Configurations**: Load balancers and reverse proxies change the apparent host and protocol
4. **Development Tools**: Tunneling services (ngrok, localtunnel) expose local services on different domains
5. **Container Orchestration**: Docker and Kubernetes assign dynamic ports and hostnames

When URLs are hardcoded, every deployment scenario except the exact one coded for will fail. This violates the principle that applications should be deployment-agnostic.

### Dynamic URL Construction

Build URLs dynamically using request context rather than hardcoding them:

```typescript
// ❌ BAD: Hardcoded URL
const redirectUrl = 'http://localhost:3000/auth/callback';

// ✅ GOOD: Dynamic construction from request
const getServerUrl = (req: Request): string => {
    // Handle proxy headers first (common in production)
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('x-forwarded-host') || req.get('host');
    
    return `${protocol}://${host}`;
};

// Usage in route handler
app.get('/auth/login', (req, res) => {
    const baseUrl = getServerUrl(req);
    const redirectUrl = `${baseUrl}/auth/callback`;
    // ... rest of logic
});
```

#### Handling Proxied Environments

Production deployments often sit behind proxies that modify request headers:

```typescript
// Express configuration for proxy trust
app.set('trust proxy', true);  // Trust X-Forwarded-* headers

// Comprehensive URL builder
const getServerUrl = (req: Request): string => {
    // Priority order for protocol detection
    const protocol = 
        req.get('x-forwarded-proto') ||  // Proxy header
        req.protocol ||                   // Express detected
        'http';                           // Fallback
    
    // Priority order for host detection  
    const host = 
        req.get('x-forwarded-host') ||   // Proxy header
        req.get('host') ||                // Standard header
        'localhost:3000';                 // Development fallback only
        
    return `${protocol}://${host}`;
};
```

### Environment-Based Configuration

Use environment variables for configuration with appropriate defaults:

```typescript
// ❌ BAD: Hardcoded in application code
const apiUrl = 'http://localhost:3000/api';
const oauthRedirect = 'http://localhost:3000/auth/callback';

// ✅ GOOD: Environment-based with sensible defaults
const config = {
    // API URLs can use env vars when the URL is known at deploy time
    apiUrl: process.env.API_URL || 'http://localhost:3000/api',
    
    // But OAuth redirects should be dynamic when possible
    getOAuthRedirectUrl: (req: Request): string => {
        // Allow override for services that require pre-registration
        if (process.env.OAUTH_REDIRECT_URI) {
            return process.env.OAUTH_REDIRECT_URI;
        }
        // Otherwise build dynamically
        const baseUrl = getServerUrl(req);
        return `${baseUrl}/auth/callback`;
    }
};
```

#### When Hardcoded Localhost Is Acceptable

Hardcoded localhost references are ONLY acceptable as development fallbacks:

```typescript
// ✅ ACCEPTABLE: Development-only fallback
const host = req.get('host') || 'localhost:3000';  // Fallback for development

// ✅ ACCEPTABLE: Local file system paths (not URLs)
const uploadsDir = process.env.UPLOADS_DIR || './uploads';

// ❌ UNACCEPTABLE: Production code paths
if (environment === 'production') {
    redirectUrl = 'http://localhost:3000/dashboard';  // NEVER do this
}
```

### Real-World Example: OAuth Redirect URI Issue

A critical deployment blocker discovered in story-003 illustrates this problem:

```typescript
// ❌ BROKEN: Hardcoded OAuth redirect
// File: McpOAuthProvider.ts
googleAuthUrl.searchParams.set('redirect_uri', 
    'http://localhost:3000/auth/google/callback'
);

// Problem: Mobile testing via ngrok redirected users back to localhost
// Result: Complete authentication failure on any non-localhost deployment

// ✅ FIXED: Dynamic redirect URL
const redirectUri = this.getOAuthRedirectUrl(req);
googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
```

This single hardcoded URL made the application unusable on:
- Mobile devices (via ngrok tunnel)
- Staging servers
- Production deployments
- Docker containers
- Any domain other than localhost:3000

### Best Practices Summary

1. **Never hardcode URLs** in application logic
2. **Build URLs dynamically** from request context
3. **Trust proxy headers** in production environments
4. **Use environment variables** only when URLs must be known at deploy time
5. **Provide localhost fallbacks** only for development scenarios
6. **Test deployments** in multiple environments to catch hardcoded URLs
7. **Document URL construction** patterns in your codebase
