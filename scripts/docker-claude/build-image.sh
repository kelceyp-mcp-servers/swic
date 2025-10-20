#!/usr/bin/env bash

# Build docker-claude base image
#
# Usage: docker-claude/build-image.sh
#
# This script builds the generic docker-claude:latest base image
# from the repository root.

# Handle description request
if [[ "${1:-}" == "--description" ]]; then
    echo "Build the docker-claude base image"
    exit 0
fi

# Handle help request
if [[ "${1:-}" == "--help" ]]; then
    echo "Build docker-claude base image"
    echo ""
    echo "Usage: $(basename "$0")"
    echo ""
    echo "This script builds the generic docker-claude:latest base image"
    echo "from the repository root."
    echo ""
    echo "The image includes:"
    echo "  - Node.js 20 (LTS)"
    echo "  - Claude Code CLI tool"
    echo "  - Common dev tools (git, zsh, vim, nano, jq)"
    exit 0
fi

# Handle usage request
if [[ "${1:-}" == "--usage" ]]; then
    echo "Usage: $(basename "$0")"
    exit 0
fi

set -euo pipefail

# Get repository root (parent of docker-claude/)
REPO_ROOT="$(cd "$(dirname "$0")/../../" && pwd)"

echo "Building docker-claude:latest from ${REPO_ROOT}"
echo ""

cd "$REPO_ROOT"

docker build \
    -f src/docker-claude/Dockerfile \
    -t docker-claude:latest \
    .

echo ""
echo "✓ Successfully built docker-claude:latest"
echo ""

echo "Verify with:"
echo "  docker run --rm docker-claude:latest node --version"
echo ""
echo "Test Claude with:"
echo "  scripts/docker-claude/docker-claude.sh \"What is 2+2?\""
echo ""
echo "Or from stdin:"
echo "  echo \"Explain recursion\" | scripts/docker-claude/docker-claude.sh -"
