---
synopsis:
  - Knowledge cartridge
  - ESLint configuration for the project
  - Rules and overrides for different file types
  - NPM scripts setup across workspaces
  - Common issues and solutions
---

# Audience

Claude Code or other agentic agents configuring or working with ESLint in the MCP Stories project.

# Abstract

This document captures the ESLint configuration including dependencies, TypeScript integration, rule overrides for different file types, NPM scripts setup across workspaces, and common linting issues with their solutions.

## Dependencies

Install at the root level (not in subprojects):

```json
"devDependencies": {
    "@typescript-eslint/eslint-plugin": "^8.32.1",
    "@typescript-eslint/parser": "^8.32.1",
    "eslint": "^8.56.0"
}
```

## Configuration

Create `.eslintrc.json` at the project root:

```json
{
    "env": {
        "es2022": true,
        "node": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended"
    ],
    "parser": "@typescript-eslint/parser",
    "plugins": ["@typescript-eslint"],
    "parserOptions": {
        "ecmaVersion": 2022,
        "sourceType": "module"
    },
    "rules": {
        "indent": ["error", 4],
        "quotes": ["error", "single", { "avoidEscape": true }],
        "brace-style": ["error", "stroustrup", { "allowSingleLine": false }],
        
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": ["error", { 
            "argsIgnorePattern": "^_",
            "varsIgnorePattern": "^_"
        }],
        "no-console": ["warn", { "allow": ["error", "warn"] }],
        "prefer-const": "error",
        "@typescript-eslint/no-explicit-any": "warn",
        
        "camelcase": ["error", { 
            "properties": "always",
            "allow": ["created_at", "updated_at", "key_hash", "user_email", "expires_at", "last_used_at", "revoked_at", "authorization_endpoint", "token_endpoint", "response_types_supported", "grant_types_supported", "response_type", "grant_type", "access_token", "token_type", "expires_in"]
        }],
        "comma-dangle": ["error", "never"],
        "semi": ["error", "always"],
        "@typescript-eslint/ban-ts-comment": ["error", {
            "ts-ignore": "allow-with-description",
            "minimumDescriptionLength": 10
        }]
    },
    "overrides": [
        {
            "files": ["scripts/**/*.ts"],
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

## Key Configuration Choices

### Code Style Rules
- **4-space indentation** - Matches project convention
- **Single quotes** - Unless escaping is needed
- **Stroustrup brace style** - `else` and `catch` on new lines
- **Semicolons required** - Explicit statement termination
- **No trailing commas** - Cleaner diffs

### Practical Adjustments
- **Database columns allowed** - Common snake_case names like `created_at`
- **Console methods** - Allow `console.error` and `console.warn` for logging
- **Scripts exception** - No console warnings in scripts directory
- **Test flexibility** - Allow `any` types in test files
- **@ts-ignore** - Allowed with descriptive comments (10+ chars)

### Unused Variables
- Prefix with `_` to indicate intentionally unused
- Helps distinguish between oversight and deliberate choice

## NPM Scripts

Root `package.json`:
```json
"scripts": {
    "lint": "bun run lint:server && bun run lint:client",
    "lint:server": "cd subprojects/server && bun run lint",
    "lint:client": "cd subprojects/client && bun run lint"
}
```

Server `package.json`:
```json
"scripts": {
    "lint": "eslint src scripts test-unit test-integration --ext .ts"
}
```

Client `package.json`:
```json
"scripts": {
    "lint": "eslint src build.ts --ext .ts,.tsx"
}
```

## Running ESLint

```bash
# Lint entire project
bun run lint

# Lint with auto-fix
cd subprojects/server
../../node_modules/.bin/eslint src scripts test-unit test-integration --ext .ts --fix
```

## Common Issues and Solutions

### Version Conflicts
If you see TypeScript/ESLint plugin errors, ensure dependencies are only at root level, not duplicated in subprojects.

### Module Not Found
Use relative paths to node_modules:
```bash
../../node_modules/.bin/eslint
```

### Too Many Errors
Start by fixing auto-fixable issues:
```bash
eslint --fix
```

Then tackle remaining issues by category (unused vars, any types, etc.)

## Migration from Main Branch

The configuration is based on the main branch's `.eslintrc.cjs` with these changes:
1. Converted to JSON format (both work)
2. Added database column exceptions
3. Added overrides for scripts and tests
4. Adjusted @ts-ignore rules to be more practical

This ensures consistency with the established code style while being pragmatic about real-world usage.