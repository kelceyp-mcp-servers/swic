---
synopsis:
  - Knowledge cartridge
  - Express v5 migration notes
  - Breaking changes and solutions
  - Compatibility patterns
---

# Audience

Claude Code or other agentic agents working with Express v5 in the MCP Stories project.

# Abstract

This document captures Express v5 breaking changes, compatibility patterns, and migration solutions discovered during development, focusing on route pattern validation changes and middleware updates.

## Route Pattern Changes

Express v5 has stricter route pattern validation compared to v4. Some patterns that worked in v4 may cause errors in v5.

### Wildcard Routes

**Issue**: The wildcard pattern `'*'` that worked in Express v4 causes a `TypeError` in Express v5:
```
TypeError: Missing parameter name at 1: https://git.new/pathToRegexpError
      at name (/path/to/node_modules/path-to-regexp/dist/index.js:73:19)
      at lexer (/path/to/node_modules/path-to-regexp/dist/index.js:91:27)
      ...
```

This error occurs when Express tries to parse the route pattern during route registration, not at runtime.

**v4 Pattern (No longer works)**:
```typescript
app.get('*', (req, res) => {
    // Handle all routes
});
```

**v5 Solutions**:

1. **Use `/*` pattern**:
```typescript
app.get('/*', (req, res) => {
    // Handle all routes
});
```

2. **Use middleware approach (Recommended for SPA fallback)**:
```typescript
app.use((req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
        return next();
    }
    
    // Only handle GET requests
    if (req.method !== 'GET') {
        return next();
    }
    
    // Serve SPA index.html
    res.sendFile(path.join(__dirname, 'public/index.html'));
});
```

### Why Middleware is Better for SPAs

Using middleware instead of wildcard routes for SPA fallback has several advantages:
1. More explicit control over which requests to handle
2. Can easily skip API routes, static assets, etc.
3. Works consistently across Express versions
4. More performant - doesn't create a route layer for every path

## Practical Example from MCP Stories

In our `StaticServer` module, we encountered this issue when serving the React SPA:

**Before (caused error)**:
```typescript
// StaticServer.ts - This failed with Express v5
app.get('*', (req, res, next) => {
    // Serve index.html for SPA routes
});
```

**After (working solution)**:
```typescript
// StaticServer.ts - Works with Express v5
app.use((req, res, next) => {
    // Skip API routes and health check
    if (req.path.startsWith('/api/') || req.path.startsWith('/health')) {
        return next();
    }
    
    // Only handle GET requests
    if (req.method !== 'GET') {
        return next();
    }
    
    // Serve index.html for SPA routes
    const indexPath = join(publicPath, 'index.html');
    if (existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('index.html not found');
    }
});
```

## Related Changes in Express v5

- Stricter parameter validation
- Updated path-to-regexp dependency (now v8.x)
- Improved TypeScript support
- Better error messages for route issues
- Removed deprecated features from v4

## References

- [Express v5 Migration Guide](https://expressjs.com/en/guide/migrating-5.html)
- [path-to-regexp changes](https://github.com/pillarjs/path-to-regexp/blob/master/Readme.md)