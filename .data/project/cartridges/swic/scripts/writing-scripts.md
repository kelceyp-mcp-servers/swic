---
audience: developers
synopsis: Script writing conventions and protocol for SWIC project
---

# Writing Scripts Protocol

All scripts in the SWIC project should follow a consistent protocol for handling command-line arguments and providing help information.

## Required Flags

Every script MUST handle these three flags at the beginning, before any other logic:

1. **`--description`** - Returns a one-line description of what the script does
2. **`--help`** - Returns detailed help information including usage, description, and examples
3. **`--usage`** - Returns a brief usage line

## Script Structure

### For Bash Scripts

```bash
#!/usr/bin/env bash

# Script title and brief description comment
#
# Usage: script-name.sh [options]
#
# Description of what the script does

# Handle description request
if [[ "${1:-}" == "--description" ]]; then
    echo "Brief one-line description of the script"
    exit 0
fi

# Handle help request
if [[ "${1:-}" == "--help" ]]; then
    echo "Script title"
    echo ""
    echo "Usage: $(basename "$0") [options]"
    echo ""
    echo "Detailed description of what the script does."
    echo ""
    echo "Options:"
    echo "  --help         Show this help message"
    echo "  --description  Show brief description"
    echo "  --usage        Show usage line"
    echo ""
    echo "Examples:"
    echo "  $(basename "$0")           # Basic usage"
    echo "  $(basename "$0") --help    # Show help"
    exit 0
fi

# Handle usage request
if [[ "${1:-}" == "--usage" ]]; then
    echo "Usage: $(basename "$0") [options]"
    exit 0
fi

# Enable strict error handling AFTER flag handling
set -euo pipefail

# Rest of the script logic...
```

### For TypeScript/Bun Scripts

```typescript
#!/usr/bin/env bun

// Script title and brief description

// Handle description request
if (process.argv[2] === '--description') {
    console.log('Brief one-line description of the script');
    process.exit(0);
}

// Handle help request
if (process.argv[2] === '--help') {
    console.log('Script title');
    console.log('');
    console.log(`Usage: ${process.argv[1].split('/').pop()} [options]`);
    console.log('');
    console.log('Detailed description of what the script does.');
    console.log('');
    console.log('Options:');
    console.log('  --help         Show this help message');
    console.log('  --description  Show brief description');
    console.log('  --usage        Show usage line');
    console.log('');
    console.log('Examples:');
    console.log(`  ${process.argv[1].split('/').pop()}           # Basic usage`);
    console.log(`  ${process.argv[1].split('/').pop()} --help    # Show help`);
    process.exit(0);
}

// Handle usage request
if (process.argv[2] === '--usage') {
    console.log(`Usage: ${process.argv[1].split('/').pop()} [options]`);
    process.exit(0);
}

// Rest of the script logic...
```

## Key Principles

1. **Flag Handling First**: Always handle `--description`, `--help`, and `--usage` before any other logic
2. **Exit Early**: Exit immediately after handling these flags with `exit 0`
3. **Strict Mode**: For bash scripts, only enable `set -euo pipefail` AFTER handling the flags
4. **Consistent Format**: Use consistent formatting for help output across all scripts
5. **Script Name**: Use `$(basename "$0")` in bash or `process.argv[1].split('/').pop()` in TypeScript to get the script name

## Integration with swic-mode

The `swic-mode` launcher relies on the `--description` flag to build its help menu. When a script properly implements `--description`, it will automatically appear in the help listing with its description.

## Exit Codes

- `0` - Success or successful display of help/usage/description
- `1` - General error
- `2` - Missing required arguments
- `127` - Command not found

## Examples in Project

Good examples of this protocol:
- `scripts/docker-claude/build-image.sh`
- `scripts/docker-claude/docker-claude.sh`

## Benefits

1. **Discoverability**: Scripts are self-documenting
2. **Consistency**: Users know how to get help for any script
3. **Integration**: Works seamlessly with swic-mode and other tools
4. **Automation**: Scripts can query other scripts for their descriptions