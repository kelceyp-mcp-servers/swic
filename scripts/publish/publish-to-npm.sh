#!/usr/bin/env bash

# Publish SWIC to npm
#
# Prerequisites:
# - Logged in to npm (npm login)
# - Clean git working directory recommended
# - All tests passing

# Handle description request
if [[ "${1:-}" == "--description" ]]; then
    echo "Publish @kelceyp/swic package to npm"
    exit 0
fi

# Handle help request
if [[ "${1:-}" == "--help" ]]; then
    echo "Publish @kelceyp/swic to npm"
    echo ""
    echo "Usage: $(basename "$0")"
    echo ""
    echo "Interactive script that builds, packages, and publishes to npm."
    echo ""
    echo "Prerequisites:"
    echo "  - Logged in to npm (npm login)"
    echo "  - Clean git working directory recommended"
    echo "  - All tests passing"
    echo ""
    echo "Options:"
    echo "  --help         Show this help message"
    echo "  --description  Show brief description"
    echo "  --usage        Show usage line"
    exit 0
fi

# Handle usage request
if [[ "${1:-}" == "--usage" ]]; then
    echo "Usage: $(basename "$0")"
    exit 0
fi

# Enable strict error handling AFTER flag handling
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}📦 Publishing @kelceyp/swic to npm${NC}\n"

# Check npm login status
if ! npm whoami &>/dev/null; then
    echo -e "${RED}❌ Not logged in to npm${NC}"
    echo "Please run: npm login"
    exit 1
fi

NPM_USER=$(npm whoami)
echo -e "${GREEN}✓${NC} Logged in as: $NPM_USER"

# Check git status
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠${NC}  Warning: You have uncommitted changes"
    echo -n "Continue anyway? (y/N) "
    read -r response
    if [ "$response" != "y" ] && [ "$response" != "Y" ]; then
        echo "Aborted"
        exit 1
    fi
fi

echo -e "${GREEN}✓${NC} Git status clean (or continuing anyway)"

# Run build
echo -e "\n${GREEN}Building distribution...${NC}"
bun run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Build successful"

# Create test pack to verify contents
echo -e "\n${GREEN}Creating test package...${NC}"
npm pack --dry-run

echo -e "\n${YELLOW}Review the package contents above.${NC}"
echo -n "Proceed with publish? (y/N) "
read -r response

if [ "$response" != "y" ] && [ "$response" != "Y" ]; then
    echo "Aborted"
    exit 1
fi

# Publish to npm
echo -e "\n${GREEN}Publishing to npm...${NC}"
npm publish

if [ $? -eq 0 ]; then
    VERSION=$(node -p "require('./package.json').version")
    echo -e "\n${GREEN}✅ Successfully published @kelceyp/swic@${VERSION}${NC}"
    echo -e "\nInstall with: ${GREEN}npm install @kelceyp/swic${NC}"
    echo -e "Or: ${GREEN}bun add @kelceyp/swic${NC}"

    # Tag git release
    echo -e "\n${YELLOW}Creating git tag v${VERSION}${NC}"
    git tag "v${VERSION}" || echo "Tag may already exist"
    echo "Push tag with: ${GREEN}git push origin v${VERSION}${NC}"
else
    echo -e "\n${RED}❌ Publish failed${NC}"
    exit 1
fi
