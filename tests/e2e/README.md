# E2E Tests

End-to-end tests for SWIC that verify the full installation and usage workflow.

## Structure

```
tests/e2e/
├── test-projects/           # Individual test projects
│   ├── npm-project-fresh/   # Test fresh installation
│   ├── npm-project-existing-swic/  # Test with existing .swic folders
│   └── run-e2e-tests.sh     # Run all test projects
└── run-e2e-tests.sh         # Run tests in Docker (main entry point)
```

## Test Projects

### npm-project-fresh

Tests SWIC installation from scratch:
- Fresh npm install
- Lazy folder creation (`.swic/` and `~/.swic/`)
- CLI commands work
- Doc CRUD operations
- Both project and shared scopes

### npm-project-existing-swic

Tests SWIC with pre-existing folders:
- Install when `.swic/docs/` already exists
- Existing docs are preserved
- New docs can be created alongside existing ones
- No corruption or data loss

## Setup

### NPM Read Token

E2E tests require a read-only npm token to install `@kelceyp/swic` and its dependencies from the private registry.

1. Generate a read-only token at [npmjs.com](https://www.npmjs.com/settings/tokens) with access to the @kelceyp scope
2. Add to `.env` in project root:
   ```bash
   SWIC_CLIBUILDER_READ_ACCESS=npm_your_token_here
   ```

The `.env` file is already gitignored, so your token is safe.

## Running Tests

### Docker Execution (REQUIRED - DO NOT RUN TESTS ON HOST)

**IMPORTANT**: E2E tests MUST be run in Docker. Never run test scripts directly on your host machine.

Run tests in an isolated Docker container:

```bash
# From project root
bun run test:e2e

# Or directly
cd tests/e2e
bash run-e2e-tests.sh
```

**Prerequisites**:
- Docker installed and running
- `docker-claude:latest` image (built automatically if missing)
- `SWIC_CLIBUILDER_READ_ACCESS` token in `.env` file (read-only npm token for @kelceyp scope)

**How it works**:
1. Creates a fresh Docker container from `docker-claude:latest`
2. **Copies** `test-projects/` into the container (not mounted)
3. Runs tests inside the isolated container
4. Destroys the container when done

**Benefits**:
- Complete isolation - test scripts cannot damage host filesystem
- Tests run as `node` user (non-root)
- No pollution of host `~/.swic/`
- Consistent environment across machines
- Test scripts can safely delete/create files in container

## Adding New Test Projects

1. Create a new directory in `test-projects/`:
   ```bash
   mkdir -p tests/e2e/test-projects/my-new-test
   cd tests/e2e/test-projects/my-new-test
   ```

2. Add the test to `test-projects/run-e2e-tests.sh`:
   ```bash
   # Edit run-e2e-tests.sh and add to TEST_PROJECTS array:
   TEST_PROJECTS=(
       "npm-project-fresh"
       "npm-project-existing-swic"
       "my-new-test"  # Add here in desired order
   )
   ```

3. Add required files:
   - `package.json` - npm project definition
   - `.mcp.json` - MCP configuration (optional)
   - `claude.md` - Instructions for Claude (optional)
   - `test-script.sh` - Main test script (required)

3. Make test script executable:
   ```bash
   chmod +x test-script.sh
   ```

4. Test script should:
   - Exit with code 0 on success
   - Exit with code 1 on failure
   - Print clear test output
   - Clean up after itself if possible

5. Run your test:
   ```bash
   cd tests/e2e/test-projects/my-new-test
   bash test-script.sh
   ```

### Temporarily Disabling Tests

To skip a test without deleting it, comment it out in the `TEST_PROJECTS` array:

```bash
TEST_PROJECTS=(
    "npm-project-fresh"
    # "npm-project-existing-swic"  # Temporarily disabled
    "my-new-test"
)
```

## Test Script Template

```bash
#!/usr/bin/env bash

set -e  # Exit on error

TEST_NAME="my-test-name"
FAILED=0

echo "========================================="
echo "Test: $TEST_NAME"
echo "========================================="

# Test steps here...

# If test passes:
if [ $FAILED -eq 0 ]; then
    echo "✅ $TEST_NAME: ALL TESTS PASSED"
    exit 0
else
    echo "❌ $TEST_NAME: SOME TESTS FAILED"
    exit 1
fi
```

## Debugging Failed Tests

### Check individual test output:
```bash
cd tests/e2e/test-projects/npm-project-fresh
bash test-script.sh
```

### Check what's installed:
```bash
cd tests/e2e/test-projects/npm-project-fresh
npm ls @kelceyp/swic
```

### Check created folders:
```bash
ls -la .swic/docs/
ls -la ~/.swic/docs/
```

### Check index files:
```bash
cat .swic/docs/.index.json
cat ~/.swic/docs/.index.json
```

### Run CLI directly:
```bash
npx swic doc list project
npx swic doc list shared
```

## CI/CD Integration

To integrate with CI/CD:

```yaml
# Example GitHub Actions
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    - uses: oven-sh/setup-bun@v1
    - run: bun install
    - run: bun run build
    - run: bun run test:e2e
```

## Troubleshooting

### Tests fail with "command not found"

Make sure the package has been built:
```bash
bun run build
```

### Docker tests fail with "image not found"

Build the docker-claude image:
```bash
bash scripts/docker-claude/build-image.sh
```

### Tests pass locally but fail in Docker

Check file permissions and user context. Docker runs as `node` user (non-root).

### npm install fails in tests

Check that:
1. Package has been published to npm
2. Version in package.json is correct
3. Network access is available

For local testing before publishing, you can use `npm pack` and install from tarball:
```bash
npm pack
# In test project:
npm install /path/to/kelceyp-swic-0.1.0.tgz
```
