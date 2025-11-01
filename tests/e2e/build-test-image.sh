#!/usr/bin/env bash

# Build SWIC E2E test image
#
# This script builds the swic-e2e-tests:latest image which extends docker-claude:latest
# with bun pre-installed and test scripts with safety extensions stripped.
#
# Usage: bash tests/e2e/build-test-image.sh
#
# The image is built from project root with tests/e2e/Dockerfile

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

echo -e "${GREEN}Building SWIC E2E test image${NC}\n"

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker to build test images"
    exit 1
fi

echo -e "${GREEN}✓${NC} Docker is installed"

# Check if docker-claude base image exists
if ! docker image inspect docker-claude:latest &> /dev/null; then
    echo -e "${YELLOW}⚠${NC}  docker-claude:latest not found"
    echo "Building docker-claude:latest first..."

    # Build the base image
    if [ -f "$PROJECT_ROOT/scripts/docker-claude/build-image.sh" ]; then
        bash "$PROJECT_ROOT/scripts/docker-claude/build-image.sh"
    else
        echo -e "${RED}❌ Cannot find build-image.sh for docker-claude${NC}"
        exit 1
    fi

    # Verify it was built
    if ! docker image inspect docker-claude:latest &> /dev/null; then
        echo -e "${RED}❌ Failed to build docker-claude:latest${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓${NC} docker-claude:latest base image found"

# Build the test image
echo -e "\n${GREEN}Building swic-e2e-tests:latest...${NC}\n"

cd "$PROJECT_ROOT"

docker build \
    -f tests/e2e/Dockerfile \
    -t swic-e2e-tests:latest \
    .

if [ $? -ne 0 ]; then
    echo -e "\n${RED}❌ Failed to build swic-e2e-tests:latest${NC}"
    exit 1
fi

echo -e "\n${GREEN}✓ Successfully built swic-e2e-tests:latest${NC}\n"

# Verify bun is installed in the image
echo "Verifying bun installation..."
if docker run --rm swic-e2e-tests:latest bun --version &> /dev/null; then
    BUN_VERSION=$(docker run --rm swic-e2e-tests:latest bun --version)
    echo -e "${GREEN}✓${NC} Bun ${BUN_VERSION} is installed"
else
    echo -e "${RED}❌ Bun verification failed${NC}"
    exit 1
fi

# Verify test scripts exist and extensions are stripped
echo "Verifying test scripts..."
SCRIPTS_CHECK=$(docker run --rm swic-e2e-tests:latest bash -c "ls -1 /home/node/test-projects/*.sh 2>/dev/null | wc -l")
if [ "$SCRIPTS_CHECK" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Test scripts found (extensions stripped)"
else
    echo -e "${RED}❌ Test scripts not found or extensions not stripped${NC}"
    exit 1
fi

echo -e "\n${GREEN}✅ Image build complete${NC}\n"
echo "Run tests with:"
echo "  bash tests/e2e/run-e2e-tests.sh"
echo ""
echo "Or run image directly:"
echo "  docker run --rm -e SWIC_CLIBUILDER_READ_ACCESS=\$SWIC_CLIBUILDER_READ_ACCESS swic-e2e-tests:latest"
