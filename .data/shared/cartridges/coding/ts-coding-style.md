---
synopsis: Unified TypeScript code style for Bun runtime with ESLint enforcement and module design rules
---

# TypeScript Coding Style

## 1. Scope & Audience

This specification defines **mandatory** and **recommended** TypeScript coding standards for the MCP Stories codebase running on Bun. It applies to all agents and contributors.

Normative terms use the meanings from RFC 2119 ("**MUST**", "**SHOULD**", "**MAY**").

Enforcement is via ESLint (see [References](#2-references)).

## 2. References

- **eslint-setup.md** — canonical ESLint configuration and scripts (ESLint-only)
- **linting-patterns.md** — approved `@ts-ignore` patterns, test/script overrides, and practical lint tips
- **tsconfig** — project compiler settings (referenced, not defined here). Any changes to tsconfig **MUST** be documented in a separate `tsconfig-guidance.md`

## 3. Core Principles

### 3.1 Fail Fast (MUST)

Code **MUST** validate inputs early and throw on invalid states.

Defaults/fallbacks **MUST NOT** be used to silently mask errors unless explicitly approved.

Unit tests and explicit parameter validation are the primary resilience mechanisms.

**Example (good):**

```typescript
const create = (opts: { name: string }): Api => {
    if (!opts?.name) {
        throw new ValidationError('name is required');
    }
    // ...
    return Object.freeze({ /* instance API */ });
};
```

## 4. Runtime & Module System

### 4.1 Bun & ES Modules (MUST)

The project **MUST** target Bun with ES Modules exclusively.

CommonJS (`require`, `module.exports`) **MUST NOT** be used.

### 4.2 Import Discipline

- **MUST** use relative imports for intra-repo modules (e.g., `../core/Core.ts`)
- Path aliases (e.g., `@/…`) **SHOULD NOT** be used. Any alias usage requires explicit approval and a separate `tsconfig-guidance.md` update
- **MUST** include `.ts` extensions in TypeScript imports under Bun
- **SHOULD** use `import type` for type-only imports to keep runtime bundles clean

**Example (good):**

```typescript
import Core from '../core/Core.ts';
import type { Story } from '../core/types.ts';
```

## 5. Module Pattern

### 5.1 Closure-based Factory (MUST unless explicitly exempted)

All modules **MUST** use the closure-based factory pattern with a frozen public API:

- Default export is a frozen object exposing constants, static functions, and a `create(options)` factory
- `create(options)` returns a frozen instance API
- Public interfaces follow `{ModuleName}Api` and `{ModuleName}Options` naming
- Exports grouped at the bottom of the file

**Skeleton:**

```typescript
import type { Something } from './types.ts';

interface WidgetOptions { name: string; }
interface WidgetApi { run(): void; }

const DEFAULT_TIMEOUT = 5000;

const paramCheck = (name: unknown): void => {
    if (typeof name !== 'string' || name.length === 0) {
        throw new ValidationError('name is required');
    }
};

const create = (options: WidgetOptions): WidgetApi => {
    const { name } = options;
    paramCheck(name);

    const run = (): void => { /* ... */ };

    return Object.freeze({ run });
};

const Widget = Object.freeze({
    DEFAULT_TIMEOUT,
    create
});

export default Widget;
export type { WidgetApi, WidgetOptions };
```

## 6. Formatting

Enforced via ESLint. See `eslint-setup.md`.

- **MUST**: 4-space indentation
- **MUST**: Stroustrup brace style (i.e., `else`/`catch` on a new line)
- **SHOULD**: single quotes (escape when needed)
- **SHOULD**: semicolons required
- **SHOULD**: trailing commas in multiline contexts (cleaner git diffs), none in single-line

**Example:**

```typescript
if (ok) {
    doThing();
}
else {
    recover();
}

try {
    work();
}
catch (err) {
    handle(err);
}

// Trailing commas (multiline)
const config = {
    name: 'widget',
    timeout: 5000,
    retries: 3,  // ← trailing comma for cleaner diffs
};

// No trailing comma (single-line)
const point = { x: 10, y: 20 };
```

## 7. Naming & Files

- **Functions/variables**: `camelCase` (**MUST**) — `loadUser`, `maxRetries`
- **Interfaces, types, classes, exported modules**: `PascalCase` (**MUST**) — `UserData`, `ValidationError`
- **Constants**: `UPPER_SNAKE_CASE` (**MUST**) — `DEFAULT_TIMEOUT`
- **Files**: `kebab-case` (**MUST**) — `user-service.ts`, `folder-service.ts`

## 8. Types & Nullability

### 8.1 Required Parameters (MUST)

Required parameters **MUST NOT** accept `null | undefined`. Enforce at the type level; validate at runtime.

**Bad:**

```typescript
const createUser = (data: CreateUser | null | undefined) => { /* then reject */ };
```

**Good:**

```typescript
const createUser = (data: CreateUser) => { /* validate fields, not presence */ };
```

### 8.2 Optional & Nullable (MUST be meaningful)

Optional/nullable parameters **MUST** be semantically meaningful (e.g., filters, cleared values).

Distinct operations **SHOULD** use distinct methods (e.g., `updateField()` vs `clearField()`).

### 8.3 The `any` Type (SHOULD avoid, MAY use sparingly)

The `any` type **SHOULD** be avoided. Acceptable usage includes:

- Error catch blocks: `catch (error: any)` (since errors can be any type)
- Interfacing with untyped external APIs (before creating proper types)
- Gradual migration from legacy JavaScript

**MUST NOT** use `any` to bypass type checking for internal APIs.

**Example (acceptable):**

```typescript
try {
    await operation();
}
catch (error: any) {
    if (error.code === 'ENOENT') { /* handle */ }
}
```

### 8.4 Discriminated Unions (SHOULD use for result types)

Discriminated unions **SHOULD** be used for result types and state modeling.

**Example:**

```typescript
type Result<T, E = Error> =
    | { success: true; data: T }
    | { success: false; error: E };

type FileState =
    | { status: 'pending' }
    | { status: 'loaded'; content: string; hash: string }
    | { status: 'error'; error: Error };
```

This pattern enables exhaustive checking and clear error handling.

### 8.5 Immutability Patterns (SHOULD use appropriately)

Use different immutability mechanisms based on the requirement:

- **`Object.freeze()`** — Runtime immutability for public API instances (**MUST** for module factory returns)
- **`readonly`** — Compile-time enforcement for properties that shouldn't change
- **`Readonly<T>`** — Utility type for making all properties readonly

**Example:**

```typescript
interface WidgetOptions {
    readonly name: string;        // Compile-time: can't reassign after construction
    timeout?: number;
}

const create = (options: WidgetOptions): WidgetApi => {
    const state: Readonly<{ count: number }> = { count: 0 };
    // state.count = 1;  // ← Compile error

    const increment = () => {
        // To update, create new object
        return { count: state.count + 1 };
    };

    return Object.freeze({ increment });  // Runtime immutability
};
```

**Guidelines:**
- Use `readonly` for interface/type properties that logically shouldn't change
- Use `Object.freeze()` for public APIs to prevent runtime modification
- Use `Readonly<T>` when you need a readonly version of an existing type

## 9. Error Handling

- All thrown errors **MUST** be instances of `Error` or subclasses with a meaningful `name` and `message`
- **SHOULD** preserve provenance using `cause` (`new Error(msg, { cause })`) or custom subclass fields
- A minimal domain hierarchy **SHOULD** be used (`ValidationError`, `NotFoundError`, `BoundaryViolationError`, etc.)
- **MAY** use `AggregateError` where multiple failures are related

**Bad:**

```typescript
throw 'User not found';
```

**Good:**

```typescript
class NotFoundError extends Error {
    constructor(resource: string, id: string) {
        super(`${resource} with id ${id} not found`);
        this.name = 'NotFoundError';
    }
}
throw new NotFoundError('User', userId);
```

## 10. Documentation

- **MUST** use JSDoc for all public APIs (exported module factories, instance methods, types)
- Comments **SHOULD** explain _why_ rather than _what_ when the code is otherwise obvious

**Example:**

```typescript
/**
 * Creates a Widget instance.
 * @param options - Construction parameters (validated).
 * @returns Frozen instance API.
 * @throws ValidationError when required fields are missing.
 */
const create = (options: WidgetOptions): WidgetApi => { /* ... */ };
```

## 11. File Organization

- **MUST** group constants and configuration at the top of a module
- **MUST** group all exports at the bottom for visibility
- **SHOULD** keep public and private functions clearly separated and grouped logically
- In a Bun-native environment, **MAY** import `.ts` modules directly without façade layers unless isolation is needed for testing

## 12. Async & Imports

- **SHOULD** prefer `async`/`await` over promise chains for readability
- **MAY** use dynamic imports for lazy/conditional loading; static imports are preferred when feasible
- **SHOULD** let errors bubble to the appropriate layer; do not catch-and-rethrow without adding context

## 13. Linting & Exceptions

- ESLint is the single enforcement tool (no Prettier). See `eslint-setup.md` for the canonical config and scripts
- For tests and scripts, follow `linting-patterns.md` for allowed `@ts-ignore`, unused variable patterns (underscore prefix), and file-specific overrides
- Any deviation from **MUST** rules requires explicit approval and documentation in the relevant module's README or in a project-wide exceptions log

## 14. Prohibited Patterns

- Throwing non-Error values (e.g., strings, plain objects) — **MUST NOT**
- Accepting `null | undefined` for required parameters — **MUST NOT**
- CommonJS module patterns — **MUST NOT**
- Path aliases without approved guidance — **SHOULD NOT**

## 15. Migration Notes (Informative)

- If path aliases exist in tsconfig, they **SHOULD** be removed in favor of relative imports. Changes belong in a separate `tsconfig-guidance.md`
- Where legacy code violates nullability or error rules, prioritize incremental fixes aligned with this spec

## References (non-normative)

- `eslint-setup.md` (configuration, rules, and scripts)
- `linting-patterns.md` (approved ignore patterns, test/script overrides)
- RFC 2119 (terminology for MUST/SHOULD/MAY)
