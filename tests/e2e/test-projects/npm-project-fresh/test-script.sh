#!/usr/bin/env bash

# E2E Test: Fresh NPM Installation
# Tests SWIC installation from scratch, CLI commands, and lazy folder creation
#
# ⚠️  WARNING: This script deletes ~/.swic and .swic directories!
# ⚠️  ONLY run inside Docker containers - NEVER on host machine!
# ⚠️  Use: bun run test:e2e (which runs in Docker)

set -e  # Exit on error

TEST_NAME="npm-project-fresh"
FAILED=0

echo "========================================="
echo "Test: $TEST_NAME"
echo "========================================="
echo ""

# Function to log test steps
log_step() {
    echo "➤ $1"
}

# Function to log success
log_success() {
    echo "  ✓ $1"
}

# Function to log failure and mark test as failed
log_failure() {
    echo "  ✗ $1"
    FAILED=1
}

# Function to verify directory exists
verify_dir() {
    if [ -d "$1" ]; then
        log_success "Directory exists: $1"
    else
        log_failure "Directory missing: $1"
    fi
}

# Function to verify file exists
verify_file() {
    if [ -f "$1" ]; then
        log_success "File exists: $1"
    else
        log_failure "File missing: $1"
    fi
}

# Clean up any existing installation
log_step "Cleaning up any existing installation"
rm -rf node_modules package-lock.json .swic 2>/dev/null || true
rm -rf ~/.swic 2>/dev/null || true
log_success "Clean slate"

# Configure npm with read-only token
if [ -n "${SWIC_CLIBUILDER_READ_ACCESS:-}" ]; then
    echo "//registry.npmjs.org/:_authToken=${SWIC_CLIBUILDER_READ_ACCESS}" > ~/.npmrc
fi

# Test 1: Install @kelceyp/swic
log_step "Installing @kelceyp/swic from npm"
npm install @kelceyp/swic --save-dev --loglevel=error

if [ $? -eq 0 ]; then
    log_success "Installation successful"
else
    log_failure "Installation failed"
    exit 1
fi

# Verify node_modules
verify_dir "node_modules/@kelceyp/swic"
verify_file "node_modules/@kelceyp/swic/package.json"

# Test 2: Verify CLI is accessible
log_step "Verifying CLI accessibility"
if npx swic doc list --scope project &>/dev/null || npx swic doc list --scope project 2>&1 | grep -q "No docs found"; then
    log_success "CLI is accessible via npx"
else
    log_failure "CLI not accessible"
fi

# Test 3: Verify lazy folder creation - project scope
log_step "Verifying lazy folder creation (project scope)"
verify_dir ".swic/docs"

# Test 4: Verify lazy folder creation - shared scope
log_step "Verifying lazy folder creation (shared scope)"
verify_dir "$HOME/.swic/docs"

# Test 5: Create a doc in project scope
log_step "Creating a project doc"
npx swic doc create test-doc --scope project --content "# Test Document

This is a test." > /dev/null

if [ $? -eq 0 ]; then
    log_success "Doc created successfully"
else
    log_failure "Failed to create doc"
fi

# Test 6: Verify doc was created and has index
log_step "Verifying doc creation"
verify_file ".swic/docs/.index.json"

# Test 7: Read the doc back
log_step "Reading the doc"
CONTENT=$(npx swic doc read test-doc --scope project)

if echo "$CONTENT" | grep -q "Test Document"; then
    log_success "Doc content verified"
else
    log_failure "Doc content incorrect"
fi

# Test 8: List docs
log_step "Listing docs"
LIST_OUTPUT=$(npx swic doc list --scope project)

if echo "$LIST_OUTPUT" | grep -q "test-doc"; then
    log_success "Doc appears in list"
else
    log_failure "Doc not in list"
fi

# Test 9: Create a shared doc
log_step "Creating a shared doc"
npx swic doc create global-test --scope shared --content "# Global Test

Shared doc." > /dev/null

if [ $? -eq 0 ]; then
    log_success "Shared doc created"
else
    log_failure "Failed to create shared doc"
fi

# Verify shared doc location
verify_file "$HOME/.swic/docs/.index.json"

# Test 10: Delete docs
log_step "Deleting docs"
npx swic doc delete test-doc --scope project --confirm > /dev/null
npx swic doc delete global-test --scope shared --confirm > /dev/null

if [ $? -eq 0 ]; then
    log_success "Docs deleted successfully"
else
    log_failure "Failed to delete docs"
fi

# Test 11: Verify deletion
log_step "Verifying deletion"
LIST_OUTPUT=$(npx swic doc list --scope project)

if ! echo "$LIST_OUTPUT" | grep -q "test-doc"; then
    log_success "Project doc deleted"
else
    log_failure "Project doc still exists"
fi

SHARED_LIST_OUTPUT=$(npx swic doc list --scope shared)

if ! echo "$SHARED_LIST_OUTPUT" | grep -q "global-test"; then
    log_success "Shared doc deleted"
else
    log_failure "Shared doc still exists"
fi

# Summary
echo ""
echo "========================================="
if [ $FAILED -eq 0 ]; then
    echo "✅ $TEST_NAME: ALL TESTS PASSED"
    echo "========================================="
    exit 0
else
    echo "❌ $TEST_NAME: SOME TESTS FAILED"
    echo "========================================="
    exit 1
fi
