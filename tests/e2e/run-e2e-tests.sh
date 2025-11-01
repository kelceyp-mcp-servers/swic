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

# Check if swic-e2e-tests image exists
if ! docker image inspect swic-e2e-tests:latest &> /dev/null; then
    echo -e "${YELLOW}⚠${NC}  swic-e2e-tests image not found"
    echo "Building swic-e2e-tests image..."

    # Build the test image using the build script
    bash "$SCRIPT_DIR/build-test-image.sh"

    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to build swic-e2e-tests image${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓${NC} swic-e2e-tests image found"

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

# Run the test image directly (scripts and bun already baked in)
# No volume mounts - complete isolation from host filesystem
docker run --rm $ENV_ARGS swic-e2e-tests:latest

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}✅ Docker E2E tests passed${NC}"
else
    echo -e "\n${RED}❌ Docker E2E tests failed${NC}"
fi

exit $EXIT_CODE
