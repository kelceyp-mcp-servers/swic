# E2E Test Image - Extends docker-claude with test environment
#
# This image provides a safe, isolated environment for running destructive E2E tests.
# It extends docker-claude:latest with bun and copies test scripts with safety extensions stripped.
#
# Safety features:
# - Test scripts have .dont.run.on.host extension on host (prevents accidental execution)
# - This Dockerfile strips extensions during build (makes executable in container)
# - Each script has runtime check (validates running in container)
# - No volume mounts (complete isolation from host filesystem)
#
# Build: bash tests/e2e/build-test-image.sh
# Run: bash tests/e2e/run-e2e-tests.sh

FROM docker-claude:latest

# Install bun (pre-installed for performance)
# Using explicit version for reproducibility
ARG BUN_VERSION=1.1.38
USER root
RUN curl -fsSL https://bun.sh/install | bash -s -- bun-v${BUN_VERSION}
# Move bun to system location so it's available globally
RUN mv /root/.bun/bin/bun /usr/local/bin/bun && \
    chmod +x /usr/local/bin/bun

# Switch back to node user for security
USER node
WORKDIR /home/node

# Verify bun installation
RUN bun --version

# Copy test-projects and lib directories
# This makes scripts executable in container while keeping them safe on host
COPY --chown=node:node tests/e2e/test-projects /home/node/test-projects
COPY --chown=node:node tests/e2e/lib /home/node/lib

# Strip the safety extensions from all .sh.dont.run.on.host files
USER root
RUN find /home/node/test-projects -type f -name "*.sh.dont.run.on.host" -exec bash -c 'mv "$1" "${1%.dont.run.on.host}"' _ {} \;
RUN chown -R node:node /home/node/test-projects
RUN chmod -R u+x /home/node/test-projects/*.sh /home/node/test-projects/*/*.sh 2>/dev/null || true

USER node
WORKDIR /home/node/test-projects

# Default command runs the test suite
CMD ["bash", "run-e2e-tests.sh"]
