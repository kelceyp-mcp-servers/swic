#!/usr/bin/env bash

# ========================================
# SAFETY CHECK: Verify running in container
# ========================================
# This function ensures scripts only run inside Docker containers.
# It checks for container-specific marker files.
#
# Usage: Source this file and call verify_container_environment
#   source "$(dirname "$0")/../../lib/safety-check.sh"
#   verify_container_environment

verify_container_environment() {
    if [ ! -f /.dockerenv ] && [ ! -f /run/.containerenv ]; then
        echo ""
        echo "========================================="
        echo "⛔ SAFETY CHECK FAILED ⛔"
        echo "========================================="
        echo ""
        echo "This script performs DESTRUCTIVE operations:"
        echo "  - Deletes ~/.swic directory"
        echo "  - Deletes .swic directory"
        echo "  - Removes node_modules"
        echo ""
        echo "It MUST only run inside Docker containers."
        echo ""
        echo "Current environment is NOT a container."
        echo ""
        echo "To run E2E tests safely:"
        echo "  bash tests/e2e/run-e2e-tests.sh"
        echo ""
        echo "This will run tests in an isolated Docker container."
        echo "========================================="
        echo ""
        exit 1
    fi

    echo "✓ Container environment detected - safe to proceed"
    echo ""
}
