---
synopsis:
  - Knowledge cartridge
  - Tailwind CSS v4 with Bun setup
  - Bun + React without bundlers
  - Authentication patterns (JWT + API key)
  - Static file architecture
  - shadcn/ui component issues and fixes
---

# Audience

Claude Code or other agentic agents developing user interfaces with modern web technologies.

# Abstract

This document captures hard-learned knowledge about UI development with Bun, React, and Tailwind CSS v4, including Tailwind's new @import syntax, Bun's ability to serve TypeScript/JSX directly, authentication patterns, static file architecture, development workflows, and common pitfalls with solutions.

## Table of Contents
1. [Tailwind CSS v4 with Bun](#tailwind-css-v4-with-bun)
2. [Bun + React Without Bundlers](#bun--react-without-bundlers)
3. [Authentication Patterns](#authentication-patterns)
4. [Static File Architecture](#static-file-architecture)
5. [Development Workflow](#development-workflow)
6. [Common Pitfalls](#common-pitfalls)

## Tailwind CSS v4 with Bun

### The New @import Syntax

Tailwind CSS v4 introduces a CSS-first configuration approach that's significantly different from v3:

```css
/* globals.css */
@import "tailwindcss";

/* Custom theme using CSS variables */
@theme {
  --color-primary: #8e44ad;
  --color-secondary: #3498db;
  
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
}

/* Custom utilities */
@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

### Key Changes from v3
1. **No `tailwind.config.js`**: All configuration is done in CSS using `@theme`
2. **Built-in Lightning CSS**: Faster builds, better browser compatibility
3. **CSS Variables**: Theme values are CSS custom properties
4. **Native Cascade Layers**: Uses CSS `@layer` instead of custom directives

### Integration with Bun

Since Bun doesn't have a Tailwind plugin yet, use the CLI approach:

**Development**:
```bash
# Watch mode for development
bunx @tailwindcss/cli@latest -i ./src/styles/globals.css -o ./public_html/styles.css --watch
```

**Production**:
```bash
# Minified build for production
bunx @tailwindcss/cli@latest -i ./src/styles/globals.css -o ./public_html/styles.css --minify
```

**Package.json scripts**:
```json
{
  "scripts": {
    "dev:css": "bunx @tailwindcss/cli@latest -i ./src/styles/globals.css -o ../server/public_html/styles.css --watch",
    "build:css": "bunx @tailwindcss/cli@latest -i ./src/styles/globals.css -o ../server/public_html/styles.css --minify",
    "dev": "concurrently \"bun run dev:css\" \"bun run dev:server\"",
    "build": "bun run build:css && bun run build:app"
  }
}
```

**Important**: Use `@tailwindcss/cli` package, not just `tailwindcss`. The standalone CLI is the executable version.

## Bun + React Without Bundlers

### Direct TypeScript/JSX Serving

Bun can transform and serve TypeScript/JSX files directly without a traditional bundler:

```typescript
// server.ts
import { serve } from "bun";

serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    
    // Serve React app
    if (url.pathname === "/" || url.pathname.endsWith(".html")) {
      return new Response(await Bun.file("./public/index.html").text(), {
        headers: { "Content-Type": "text/html" }
      });
    }
    
    // Transform and serve TSX/TS files
    if (url.pathname.endsWith(".tsx") || url.pathname.endsWith(".ts")) {
      const file = await Bun.file(`./src${url.pathname}`).text();
      const result = await Bun.build({
        entrypoints: [`./src${url.pathname}`],
        target: "browser"
      });
      
      return new Response(result.outputs[0].text(), {
        headers: { "Content-Type": "application/javascript" }
      });
    }
  }
});
```

### Build Process for Production

For production, pre-build all assets:

```typescript
// build.ts
await Bun.build({
  entrypoints: ["./src/app/main.tsx"],
  outdir: "./dist",
  target: "browser",
  splitting: true,
  minify: true,
  naming: {
    entry: "[name].[hash].js",
    chunk: "[name].[hash].js",
    asset: "[name].[hash].[ext]"
  }
});
```

### Hot Reloading Setup

Use Bun's `--hot` flag for development:
```bash
bun --hot run server.ts
```

Add WebSocket for browser refresh:
```typescript
// In server.ts
const wsClients = new Set<WebSocket>();

// WebSocket endpoint for hot reload
if (url.pathname === "/ws") {
  const upgraded = server.upgrade(req);
  if (!upgraded) return new Response("Upgrade failed", { status: 426 });
  return undefined;
}

// Notify clients on file change
import { watch } from "fs";
watch("./src", { recursive: true }, () => {
  wsClients.forEach(client => client.send("reload"));
});
```

## Authentication Patterns

### JWT + API Key Hybrid

Support both JWT (for web sessions) and API keys (for programmatic access):

```typescript
interface AuthMiddleware {
  verifyToken(req: Request): Promise<AuthResult>;
}

const create = ({ userService }: Options): AuthMiddleware => {
  const verifyToken = async (req: Request): Promise<AuthResult> => {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const [type, token] = authHeader.split(" ");
    
    // API Key authentication
    if (token.startsWith("mcp_key_")) {
      const result = await core.validateApiKey(SYSTEM_USER_ID, { key: token });
      if (result.valid) {
        return { userEmail: result.userEmail, authType: "apikey" };
      }
    }
    
    // JWT authentication
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      return { userEmail: payload.email, authType: "jwt" };
    } catch {
      throw new Error("Invalid token");
    }
  };
  
  return { verifyToken };
};
```

### Protected Routes Pattern

```typescript
// Protected route wrapper
const requireAuth = (handler: RouteHandler) => {
  return async (req: Request) => {
    try {
      const auth = await authMiddleware.verifyToken(req);
      req.auth = auth;
      return handler(req);
    } catch {
      return new Response("Unauthorized", { status: 401 });
    }
  };
};

// Usage
app.get("/api/stories", requireAuth(async (req) => {
  const stories = await core.listStories(req.userId); // Pass authenticated user ID
  return Response.json(stories);
}));
```

## Static File Architecture

### Build Output Structure

Client builds to server's public_html folder for unified serving:

```
subprojects/
├── client/
│   ├── src/           # Source files
│   └── package.json
└── server/
    ├── public_html/   # Built client files served from here
    │   ├── index.html
    │   ├── main.js
    │   └── styles.css
    └── src/           # Server source
```

### Server Configuration

```typescript
// Serve static files from public_html
app.use(express.static(join(serverDir, 'public_html')));

// SPA fallback for client-side routing
app.use((req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/auth/')) {
        return next();
    }
    res.sendFile(join(serverDir, 'public_html', 'index.html'));
});
```

**Note**: The MCP Stories project uses `public_html` instead of `dist` for clarity.

## Development Workflow

### Recommended Setup

1. **Two terminal approach**:
   - Terminal 1: `bun run dev:css` (Tailwind watch)
   - Terminal 2: `bun --hot server.ts` (Server with hot reload)

2. **Single command with concurrently**:
   ```json
   {
     "scripts": {
       "dev": "concurrently -n css,server \"bun run dev:css\" \"bun --hot server.ts\""
     }
   }
   ```

### Build Process

1. Clean dist directory
2. Build CSS with Tailwind
3. Build React app with Bun
4. Copy static assets
5. Generate asset manifest

```typescript
// build.ts
import { rm, mkdir, cp } from "fs/promises";

// Clean
await rm("./dist", { recursive: true, force: true });
await mkdir("./dist", { recursive: true });

// Build CSS
await $`bunx tailwindcss -i ./src/styles/globals.css -o ./dist/styles.css --minify`;

// Build JS
await Bun.build({
  entrypoints: ["./src/app/main.tsx"],
  outdir: "./dist",
  target: "browser",
  minify: true
});

// Copy static assets
await cp("./public", "./dist", { recursive: true });
```

## Common Pitfalls

### 1. Module Resolution
- **Problem**: Bun uses Node.js resolution but with `.ts` extensions
- **Solution**: Always include `.ts`/`.tsx` extensions in imports

### 2. Environment Variables
- **Problem**: `process.env` not available in browser
- **Solution**: Use Bun's macro system:
  ```typescript
  // At build time, this gets replaced
  const API_URL = import.meta.env.VITE_API_URL;
  ```

### 3. CSS Module Support
- **Problem**: Bun doesn't support CSS modules out of the box
- **Solution**: Use Tailwind utilities or CSS-in-JS solutions

### 4. React Fast Refresh
- **Problem**: No built-in React Fast Refresh like Vite
- **Solution**: Use WebSocket-based page reload for now

### 5. Asset Handling
- **Problem**: No automatic asset optimization
- **Solution**: Use Bun.build's naming option for cache busting:
  ```typescript
  naming: {
    asset: "[name].[hash].[ext]"
  }
  ```

### 6. Production vs Development
- **Problem**: Same code serves both environments
- **Solution**: Use environment variables:
  ```typescript
  const isDev = process.env.NODE_ENV !== "production";
  
  if (isDev) {
    // Serve source files with transformation
  } else {
    // Serve pre-built files from dist
  }
  ```

## Best Practices

1. **Keep it Simple**: Leverage Bun's native capabilities instead of adding complex tooling
2. **Type Safety**: Use TypeScript throughout, including for build scripts
3. **Progressive Enhancement**: Build features that work without JavaScript first
4. **Performance**: Use Bun's speed advantage - avoid unnecessary abstractions
5. **Monitoring**: Add performance metrics from the start

## Future Considerations

As the ecosystem evolves:
1. Native Bun plugins for Tailwind may emerge
2. Better React Fast Refresh support
3. Integrated asset optimization
4. Native CSS module support

Keep an eye on Bun's roadmap and update practices accordingly.

## MCP Stories Implementation

### Actual Implementation Details

The MCP Stories project implementation has some specific choices:

1. **Claude Theme**: Using the Claude theme from tweakcn.com for thematic consistency
2. **Output Directory**: `public_html` instead of `dist` for clarity
3. **Tailwind CLI**: Must use `@tailwindcss/cli` package with bunx, not `tailwindcss`
4. **Build Integration**: CSS build is integrated into build.ts using Bun's `$` shell

### shadcn/ui with Claude Theme

The Claude theme provides a distinctive orange/amber primary color that matches Claude's branding:

```css
@layer base {
  :root {
    --primary: oklch(0.577 0.245 27.325);  /* Claude's orange */
    --primary-foreground: oklch(1 0 0);
    /* ... other colors ... */
  }
}
```

### Working Build Commands

```bash
# Build everything (CSS + JS)
bun run build

# Build CSS only
bunx @tailwindcss/cli@latest -i ./src/styles/globals.css -o ../server/public_html/styles.css --minify

# Start server with proper scripts
JWT_SECRET=your-secret bun run start  # Starts in background
bun run status                        # Check health
bun run stop                         # Stop server
```

## shadcn/ui Dialog Component Issues

### Dialog Layout Problems

When using shadcn/ui dialog components with Tailwind CSS v4, be aware of layout issues:

1. **DialogFooter with flex-col-reverse**: The default DialogFooter uses `flex-col-reverse` which can cause buttons to appear outside the modal boundaries. 

2. **Solution**: Change to `flex-col gap-2`:
   ```tsx
   const DialogFooter = ({
       className,
       ...props
   }: React.HTMLAttributes<HTMLDivElement>) => (
       <div
           className={cn(
               'flex flex-col gap-2 sm:flex-row sm:justify-end sm:space-x-2',
               className
           )}
           {...props}
       />
   );
   ```

3. **Dialog Width for Long Content**: When displaying long content like API keys, increase dialog width:
   ```tsx
   <DialogContent className="sm:max-w-3xl">
   ```

4. **Responsive Button Styling**: Add responsive classes to buttons in dialogs:
   ```tsx
   <Button className="w-full sm:w-auto">
   ```

These adjustments ensure dialogs render correctly across different screen sizes and content lengths.

## Stateless Service Pattern Integration

### Story 037 Refactoring Context

The MCP Stories backend is undergoing a comprehensive refactoring in Story 037 to implement a stateless service layer with authorization context. This affects how the UI interacts with API endpoints:

**Key Changes:**
- All service methods now use an authorization context (AuthContext) pattern
- Read operations like `listStories` bypass TransactionService and go directly to core
- Write operations flow through TransactionService for ACID guarantees
- User authentication now provides `userId` (number) rather than just `userEmail` (string)

**API Call Pattern:**
```typescript
// In React components, API calls remain the same
const response = await fetch('/api/stories', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
});

// But internally, the server now uses:
// core.listStories(req.userId) // userId is number
// instead of the old instance pattern
```

**Impact on UI Development:**
1. **Type Safety**: Ensure any client-side code expecting user IDs uses number type
2. **Error Handling**: AuthContext validation errors may change response formats
3. **Performance**: Read operations may be faster due to direct service access
4. **Consistency**: All operations now follow the same authorization pattern

This refactoring is part of the broader migration to stateless services that will improve scalability and testability while maintaining backward compatibility for the UI layer.