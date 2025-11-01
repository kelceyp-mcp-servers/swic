#!/usr/bin/env bash

# Run E2E tests inside docker-claude container
# This provides a clean, isolated environment for testing

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🐳 Running E2E tests in Docker${NC}\n"

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker to run E2E tests in containers"
    exit 1
fi

echo -e "${GREEN}✓${NC} Docker is installed"

# Check if docker-claude image exists
if ! docker image inspect docker-claude:latest &> /dev/null; then
    echo -e "${YELLOW}⚠${NC}  docker-claude image not found"
    echo "Building docker-claude image..."

    # Build the image using the build script
    cd "$PROJECT_ROOT"
    bash scripts/docker-claude/build-image.sh

    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to build docker-claude image${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓${NC} docker-claude image found"

# Load environment variables from .env
if [ -f "$PROJECT_ROOT/.env" ]; then
    source "$PROJECT_ROOT/.env"

    # Check for npm read token (required)
    if [ -z "$SWIC_CLIBUILDER_READ_ACCESS" ]; then
        echo -e "${RED}❌ SWIC_CLIBUILDER_READ_ACCESS not found in .env${NC}"
        echo "This token is required to install @kelceyp/swic and @kelceyp/clibuilder from npm"
        echo "Please add SWIC_CLIBUILDER_READ_ACCESS=npm_token to .env"
        exit 1
    fi
    echo -e "${GREEN}✓${NC} SWIC_CLIBUILDER_READ_ACCESS loaded"
    ENV_ARGS="-e SWIC_CLIBUILDER_READ_ACCESS=$SWIC_CLIBUILDER_READ_ACCESS"

    # Add Claude token if available (optional)
    if [ -n "$CLAUDE_CODE_OAUTH_TOKEN" ]; then
        echo -e "${GREEN}✓${NC} CLAUDE_CODE_OAUTH_TOKEN loaded"
        ENV_ARGS="$ENV_ARGS -e CLAUDE_CODE_OAUTH_TOKEN=$CLAUDE_CODE_OAUTH_TOKEN"
    fi
else
    echo -e "${RED}❌ .env file not found${NC}"
    echo "Please create .env with SWIC_CLIBUILDER_READ_ACCESS=npm_token"
    exit 1
fi

# Run tests in container
echo -e "\n${GREEN}Running tests in container...${NC}\n"

# Create a container (don't run yet)
CONTAINER_ID=$(docker create $ENV_ARGS docker-claude:latest bash -c "cd /home/node/test-projects && bash run-e2e-tests.sh")

# Copy test-projects into the container
docker cp "$SCRIPT_DIR/test-projects" "$CONTAINER_ID:/home/node/"

# Fix ownership (files are copied as root, but container runs as node user)
docker start "$CONTAINER_ID" > /dev/null
docker exec -u root "$CONTAINER_ID" chown -R node:node /home/node/test-projects
docker stop "$CONTAINER_ID" > /dev/null

# Now start the container and wait for it to finish
docker start -a "$CONTAINER_ID"
EXIT_CODE=$?

# Clean up the container
docker rm "$CONTAINER_ID" > /dev/null

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}✅ Docker E2E tests passed${NC}"
else
    echo -e "\n${RED}❌ Docker E2E tests failed${NC}"
fi

exit $EXIT_CODE
