#!/usr/bin/env bash

# E2E Test: Existing .swic Folders
# Tests SWIC installation when .swic folders already exist with content
#
# ⚠️  WARNING: This script deletes ~/.swic directory!
# ⚠️  ONLY run inside Docker containers - NEVER on host machine!
# ⚠️  Use: bun run test:e2e (which runs in Docker)

set -e  # Exit on error

TEST_NAME="npm-project-existing-swic"
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

# Function to verify file exists
verify_file() {
    if [ -f "$1" ]; then
        log_success "File exists: $1"
    else
        log_failure "File missing: $1"
    fi
}

# Function to verify file contains text
verify_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        log_success "File contains expected content: $1"
    else
        log_failure "File missing expected content: $1"
    fi
}

# Clean up any existing installation but preserve .swic/docs/existing-doc.md
log_step "Cleaning up previous installation (preserving existing docs)"
rm -rf node_modules package-lock.json 2>/dev/null || true
rm -rf ~/.swic 2>/dev/null || true
log_success "Clean slate (existing docs preserved)"

# Verify pre-existing doc exists
log_step "Verifying pre-existing doc"
verify_file ".swic/docs/existing-doc.md"
verify_content ".swic/docs/existing-doc.md" "This document existed before"

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

# Test 2: Verify existing doc is still there
log_step "Verifying existing doc was not deleted"
verify_file ".swic/docs/existing-doc.md"
verify_content ".swic/docs/existing-doc.md" "This document existed before"

# Test 3: Verify CLI works with existing folders
log_step "Verifying CLI works with existing folders"
if npx swic doc list --scope project &>/dev/null || npx swic doc list --scope project 2>&1 | grep -q "No docs found"; then
    log_success "CLI works with existing folders"
else
    log_failure "CLI failed with existing folders"
fi

# Test 4: Create a new doc alongside existing one
log_step "Creating a new doc"
npx swic doc create new-doc --scope project --content "# New Document

Created after installation." > /dev/null

if [ $? -eq 0 ]; then
    log_success "New doc created successfully"
else
    log_failure "Failed to create new doc"
fi

# Test 5: Verify both docs exist
log_step "Verifying both existing and new docs exist"
verify_file ".swic/docs/existing-doc.md"
verify_file ".swic/docs/.index.json"

# Test 6: List docs should show new doc (existing doc not indexed)
log_step "Listing docs"
LIST_OUTPUT=$(npx swic doc list --scope project)

if echo "$LIST_OUTPUT" | grep -q "new-doc"; then
    log_success "New doc appears in list"
else
    log_failure "New doc not in list"
fi

# Test 7: Verify existing doc file is still intact
log_step "Verifying existing doc content unchanged"
verify_content ".swic/docs/existing-doc.md" "This document existed before"

# Test 8: Read the new doc
log_step "Reading the new doc"
CONTENT=$(npx swic doc read new-doc --scope project)

if echo "$CONTENT" | grep -q "New Document"; then
    log_success "New doc content verified"
else
    log_failure "New doc content incorrect"
fi

# Test 9: Delete the new doc
log_step "Deleting new doc (preserving existing)"
npx swic doc delete new-doc --scope project --confirm > /dev/null

if [ $? -eq 0 ]; then
    log_success "New doc deleted"
else
    log_failure "Failed to delete new doc"
fi

# Test 10: Verify existing doc is still there
log_step "Final verification of existing doc"
verify_file ".swic/docs/existing-doc.md"
verify_content ".swic/docs/existing-doc.md" "This document existed before"

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
