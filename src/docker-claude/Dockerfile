# docker-claude - Generic Claude Code + Node.js Foundation
#
# A reusable base image for ANY project that uses Claude Code.
# This image is intentionally generic and NOT project-specific.
#
# What it provides:
# - Node.js 20 (LTS)
# - Claude Code (latest)
# - Common dev tools (git, zsh, vim, nano, jq)
# - node user (non-root) for security
#
# Build: docker build -f docker-claude/Dockerfile -t docker-claude:latest .
# Usage: FROM docker-claude:latest
#
# Example: Create your own test image
#   FROM docker-claude:latest
#   COPY my-project /home/node/my-project
#   WORKDIR /home/node/my-project
#   RUN npm install

FROM node:20

# Set versions for reproducibility
ARG CLAUDE_CODE_VERSION=latest

# Install system tools and utilities
RUN apt-get update && apt-get install -y \
    git \
    zsh \
    vim \
    nano \
    jq \
    curl \
    wget \
    unzip \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Install Claude Code globally
RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}

# Use existing node user from base image
USER node
WORKDIR /home/node

# Verify installations work
# NOTE: Real authentication test requires CLAUDE_CODE_OAUTH_TOKEN env var
# Generate token with: claude setup-token
RUN node --version

CMD ["bash"]
