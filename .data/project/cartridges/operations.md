# Claw MCP Server Operations Guide

## Running Modes

The claw MCP server can run in two primary modes:

### 1. Development Mode (claw-dev)
Running directly from source code in the claw-src/ project folder.

**Configuration:**
- Entry in `.mcp.json` pointing to `src/mcp/main.ts`
- Typically named `claw-dev`

**Use cases:**
- Active development on claw features
- Testing changes immediately
- Debugging MCP server behavior

**Picking up code changes:**
- **Option A**: Ask user to quit Claude and restart with `-c` flag
  - Reloads the MCP server with latest code
  - Continues previous conversation
  
- **Option B (Requires no help)**: Run `claude -p` via Bash
  - The prompt you provide needs to ask claude for the tool usage you want

### 2. Production Mode (claw)
Installed as an npm package in node_modules/.

**Configuration:**
- Entry in `.mcp.json` pointing to `@kelceyp/claw`
- Typically named `claw`

**Use cases:**
- Using claw in non-claw projects
- Testing the published version
- Validating release candidates

**Picking up code changes:**
Requires full release cycle: (all performed by the user - don't do these yourself - stop ask the user to do it)
1. Update version number at top of `package.json`
2. Update version in `dependencies` section of `package.json`
3. Publish to npm registry
4. Run `npm install` in consuming project
5. Quit Claude
6. Restart with `-c` flag (or use `claude -r` and the conversation picker if multiple claudes are being used)

## Log Locations

MCP server logs are stored in Claude CLI's cache directory:

```
/Users/[username]/Library/Caches/claude-cli-nodejs/-Users-[username]-[path]-to-project/
```

For the claw project specifically:
```
/Users/paulkelcey/Library/Caches/claude-cli-nodejs/-Users-paulkelcey-Dev-gh-kelceyp-mcp-servers-claw/
```

**Log structure:**
- `mcp-logs-claw-dev/` - Logs from development mode server
- `mcp-logs-[server-name]/` - Logs from other MCP servers
- Each log file is timestamped: `YYYY-MM-DDTHH-mm-ss-mmmZ.txt`
- Files contain JSON entries with debug info, errors, and profiling data

**Profiling data:**
Logs contain detailed timing information:
- Startup phases (factory, services, tools registration)
- Request/response timings
- Tool execution duration
- Dispatch pipeline metrics

**Accessing logs:**
Use Bash tool to read logs since they're outside project directory:
```bash
ls /Users/paulkelcey/Library/Caches/claude-cli-nodejs/-Users-paulkelcey-Dev-gh-kelceyp-mcp-servers-claw/mcp-logs-claw-dev/
cat [log-file-path]
grep "PROFILING" [log-file-path]
```

## Best Practices

### During Active Development
1. Use **claw-dev** mode for immediate feedback
2. Monitor logs for profiling data to track performance
3. Ask user to restart Claude with `-c` after significant changes
4. Keep profiling enabled to catch performance regressions

### Before Publishing
1. Test in **production mode** (npm install locally)
2. Verify all features work with installed package
3. Check logs for any unexpected errors
4. Validate version numbers are updated correctly

### When Stuck
If changes aren't being picked up:
1. Check which mode is active (claw vs claw-dev)
2. Verify the correct entry in `.mcp.json` is being used
3. Confirm MCP server restart (check log timestamps)
4. Look for errors in most recent log file