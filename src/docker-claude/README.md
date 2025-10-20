# docker-claude

A generic Docker base image that provides **Claude Code + Node.js** foundation for testing any project that uses Claude-based development tools.

## What This Provides

This image is **intentionally generic** and NOT project-specific. It includes:

- **Node.js 20 (LTS)** - Latest long-term support release
- **Claude Code** - Anthropic's AI-powered development assistant
- **Common dev tools** - git, zsh, vim, nano, jq, curl, wget, unzip, sudo
- **node user** - Non-root user for security (uid/gid from base node:20 image)

## Usage

### Extending This Image

Create your own Dockerfile that extends `docker-claude:latest`:

```dockerfile
FROM docker-claude:latest

# Copy your project
COPY my-project /home/node/my-project
WORKDIR /home/node/my-project

# Install dependencies
RUN npm install

# Configure your project
COPY .mcp.json /home/node/my-project/.mcp.json

CMD ["bash"]
```

### Building the Image

From the repository root:

```bash
docker build -f src/docker-claude/Dockerfile -t docker-claude:latest .
```

Or use the convenience script:

```bash
scripts/docker-claude/build-image.sh
```

### Verifying the Image

Test that Node.js is installed:

```bash
docker run --rm docker-claude:latest node --version
```

To verify Claude Code works (requires authentication):

```bash
# Generate OAuth token first: claude setup-token
docker run --rm -e CLAUDE_CODE_OAUTH_TOKEN="your-token" docker-claude:latest bash -c 'claude -p "What is 1+1?"'
```
or use
```bash
scripts/docker-claude/docker-claude.sh
```
## Extending Pattern

This image is designed to be extended. Common pattern:

```
docker-claude:latest (generic foundation)
  ↓
  ├── your-app-base:latest (adds your app's dependencies)
  └── your-app:variant (adds configuration variants)
```

## Design Decisions

### Non-root User (node:node)

The image uses the `node` user (from base `node:20` image) rather than root for security. This matches standard Node.js container best practices.

**Note:** Claude Code is installed globally as root but runs as the node user.

### Claude Code Version

Uses `@anthropic-ai/claude-code@latest` for simplicity. If you need version pinning, override the `CLAUDE_CODE_VERSION` build arg:

```bash
docker build --build-arg CLAUDE_CODE_VERSION=1.2.3 -f docker-claude/Dockerfile -t docker-claude:latest .
```

### Minimal Tooling

Includes only essential dev tools. Add project-specific tools in your extending Dockerfile.

## Testing

This image has been verified to work with:

- macOS (Docker Desktop)
- Linux (Docker Engine)
- CI/CD environments (GitHub Actions, etc.)

Windows support is untested but should work via WSL2.

## Contributing

This image is maintained as part of the parent project. If you find issues or have suggestions:

1. Check if the issue is generic (affects Claude Code + Node.js usage) or project-specific
2. Generic issues belong here; project-specific issues belong in extending images
3. Document rationale for changes (especially if adding new tools)

## License

Same license as parent project (see repository root).
