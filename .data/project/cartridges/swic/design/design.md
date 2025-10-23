# SWIC Architecture Design

## System Architecture

```mermaid
---
config:
  theme: neo
  look: classic
---
flowchart TD
  claude["claude"]
  subgraph sdk["sdk"]
    mcp-server["mcp-server"]
  end
  subgraph tools
    create-cartridge["create-cartridge"]
    read-cartridge["read-cartridge"]
    etc1["etc"]
  end
  subgraph commands["commands"]
    create-cartridge-cmd["create-cartridge"]
    read-cartridge-cmd["read-cartridge"]
    etc2["etc"]
  end
 subgraph hls["high level services"]
    cartridge-service["cartridge service"]
    story-service["story service"]
    subtask-service["subtask service"]
    etc3["etc"]
  end
  subgraph server["bun server"]
    sdk
    tools
  end
  subgraph lls["low level services"]
    file["file service"]
    folder["folder service"]
  end
  subgraph core["core"]
    hls
    lls
  end
  subgraph cli["cli"]
    router
    commands
  end
user["user"] --> claude & cli
claude --> mcp-server
mcp-server --> tools
router --> commands
cartridge-service & story-service & subtask-service --> lls
create-cartridge & read-cartridge --> cartridge-service
create-cartridge-cmd & read-cartridge-cmd --> cartridge-service
```

## Component Overview

### User Interfaces
- **User** - Direct interaction with CLI or through Claude
- **Claude** - AI assistant interface using MCP protocol

### Server Layer (Bun Server)
- **SDK** - MCP server implementation
- **Tools** - MCP tool handlers for object operations

### CLI Layer
- **Router** - Command routing logic
- **Commands** - CLI command implementations

### Core Services

#### High Level Services
- **Cartridge Service** - Manages cartridge operations
- **Story Service** - Manages story lifecycle
- **Subtask Service** - Handles subtask operations
- **Additional Services** - Other domain-specific services

#### Low Level Services
- **File Service** - File system operations
- **Folder Service** - Directory management

## Data Flow

1. Users interact either directly through CLI commands or via Claude
2. Claude communicates through the MCP server protocol
3. MCP server exposes tools that call into high-level services
4. CLI commands also call the same high-level services
5. High-level services use low-level services for persistence
6. All operations maintain versioning and audit trails