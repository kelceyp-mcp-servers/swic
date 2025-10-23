# swic MCP Server Operations Guide

## Building the Distribution

The swic MCP server is built using the build-dist script:

```bash
bun run build-dist
```

This runs `scripts/server/build-dist.ts` which:
- Cleans the `dist/` directory
- Builds `src/server/Server.ts` to `dist/server/Server.js`
- Minifies the output with no source maps
- Creates a single ~208KB bundle

## MCP Configuration

The server is configured in `.mcp.json`:

```json
{
  "mcpServers": {
    "swic": {
      "command": "bun",
      "args": [
        "run",
        "dist/server/Server.js"
      ]
    }
  }
}
```

**Picking up code changes:**
After making changes to the source code:
1. Run `bun run build-dist` to rebuild the distribution
2. **Option A**: Ask user to quit Claude and restart with `-c` flag
   - Reloads the MCP server with latest code
   - Continues previous conversation

3. **Option B (For testing)**: Run `claude -p` via Bash
   - Can be used to quickly test changes
   - Example: `claude -p "Check if swic mcp connector is connected and execute the hello tool"`

## Log Locations

MCP server logs are stored in Claude CLI's cache directory:

```
/Users/[username]/Library/Caches/claude-cli-nodejs/-Users-[username]-[path]-to-project/
```

For the swic project specifically:
```
/Users/paulkelcey/Library/Caches/claude-cli-nodejs/-Users-paulkelcey-Dev-gh-kelceyp-mcp-servers-swic/
```

**Log structure:**
- `mcp-logs-swic-dev/` - Logs from development mode server
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
ls /Users/paulkelcey/Library/Caches/claude-cli-nodejs/-Users-paulkelcey-Dev-gh-kelceyp-mcp-servers-swic/mcp-logs-swic-dev/
cat [log-file-path]
grep "PROFILING" [log-file-path]
```

## Best Practices

### During Active Development
1. Use **swic-dev** mode for immediate feedback
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
1. Check which mode is active (swic vs swic-dev)
2. Verify the correct entry in `.mcp.json` is being used
3. Confirm MCP server restart (check log timestamps)
4. Look for errors in most recent log file