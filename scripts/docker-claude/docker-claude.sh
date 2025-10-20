#!/usr/bin/env bash

# Run Claude within docker container
#
# Usage:
#   scripts/docker-claude/docker-claude.sh "Your prompt here"        # Direct prompt
#   echo "prompt" | scripts/docker-claude/docker-claude.sh -         # From stdin
#   scripts/docker-claude/docker-claude.sh - < prompt.txt            # From file
#
# Requires:
#   - docker-claude:latest image built (run scripts/docker-claude/build-image.sh first)
#   - CLAUDE_CODE_OAUTH_TOKEN in .env file

# Handle description request
if [[ "${1:-}" == "--description" ]]; then
    echo "Run Claude within docker container"
    exit 0
fi

# Handle help request
if [[ "${1:-}" == "--help" ]]; then
    echo "Run Claude within docker container"
    echo ""
    echo "Usage:"
    echo "  $(basename "$0") \"Your prompt here\"        # Direct prompt"
    echo "  echo \"prompt\" | $(basename "$0") -         # From stdin"
    echo "  $(basename "$0") - < prompt.txt            # From file"
    echo ""
    echo "Requires:"
    echo "  - docker-claude:latest image built (run build-image.sh first)"
    echo "  - CLAUDE_CODE_OAUTH_TOKEN in .env file"
    echo ""
    echo "The script will:"
    echo "  1. Load the OAuth token from .env"
    echo "  2. Run claude inside the docker container"
    echo "  3. Pass your prompt to claude's -p flag"
    echo "  4. Return the response"
    exit 0
fi

# Handle usage request
if [[ "${1:-}" == "--usage" ]]; then
    echo "Usage: $(basename "$0") \"prompt\" | $(basename "$0") -"
    exit 0
fi

set -euo pipefail

# Get repository root (go up two directories from scripts/docker-claude/)
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# Source .env file if it exists
if [ -f "${REPO_ROOT}/.env" ]; then
    source "${REPO_ROOT}/.env"
else
    echo "Error: .env file not found at ${REPO_ROOT}/.env" >&2
    echo "Please create .env with CLAUDE_CODE_OAUTH_TOKEN=your-token" >&2
    exit 1
fi

# Check if token is set
if [ -z "${CLAUDE_CODE_OAUTH_TOKEN:-}" ]; then
    echo "Error: CLAUDE_CODE_OAUTH_TOKEN not set in .env" >&2
    echo "Generate token with: claude setup-token" >&2
    exit 1
fi

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: docker is not installed" >&2
    exit 1
fi

# Check if docker-claude:latest image exists
if ! docker image inspect docker-claude:latest &> /dev/null; then
    echo "Error: docker-claude:latest image not found" >&2
    echo "Build it first with: scripts/docker-claude/build.sh" >&2
    exit 1
fi

# Handle input
if [ $# -eq 0 ]; then
    echo "Usage: $0 \"prompt\" or echo \"prompt\" | $0 -" >&2
    exit 1
fi

PROMPT=""
if [ "$1" = "-" ]; then
    # Read from stdin
    PROMPT=$(cat)
    if [ -z "$PROMPT" ]; then
        echo "Error: No input provided on stdin" >&2
        exit 1
    fi
else
    # Use first argument as prompt
    PROMPT="$1"
fi

# Run claude in docker container
docker run --rm \
    -e CLAUDE_CODE_OAUTH_TOKEN="${CLAUDE_CODE_OAUTH_TOKEN}" \
    docker-claude:latest \
    bash -c "claude -p \"${PROMPT}\""