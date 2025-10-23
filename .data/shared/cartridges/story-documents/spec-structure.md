# Specs
## Spec structure

```
Stories/
  In-Progress/
    {storyId}-{story-name}/
      spec/                                 <-- the spec is a folder
        spec.md                            <-- the main file - always called spec.md (see format below)
        comments/                          <-- comments made during spec creation by product-owner agents
          spec-notes-1.md                 <-- notes by the writer (product-owner) on first iteration
          review-feedback-1.md            <-- notes by the reviewer (product-owner) on first iteration
          feedback-review-1.md            <-- response to review by writer (product-owner) on first iteration
          spec-notes-2.md                 <-- notes by the writer on second iteration (if needed)
          review-feedback-2.md            <-- notes by the reviewer on second iteration (if needed)
      design/                              <-- design documents (HOW to build it)
      subtasks/                            <-- implementation subtasks
```

## Exemplar Spec

For a complete reference example of spec content, see:
`.private/projects/_Users_paulkelcey_Dev_gh_kelceyp-mcp-servers_claw-f7e4d327/Stories/In-Progress/002-minimal-create-cartridge/spec.md`

**Note:** The exemplar is currently in the old flat structure (spec.md at story root). Going forward, specs use the folder structure shown above.

## Comments folder

The comments folder supports the spec creation workflow:

**First iteration:**
- `spec-notes-1.md` - Writer's decisions, rationale, thought processes
- `review-feedback-1.md` - Reviewer's numbered feedback items

**If feedback needs addressing:**
- `feedback-review-1.md` - Writer's response (concur/refute each item)
- `spec-notes-2.md` - Writer refines the spec (if they concurred with any items)
- `review-feedback-2.md` - Reviewer evaluates refined spec

This continues until the reviewer approves (no feedback items).

## Overview

A spec.md document is the requirements definition of a story. It:
- Defines the objective and value to be delivered
- Establishes what's in-scope and what's out-of-scope
- Defines interfaces and desired outcomes
- Describes **WHAT** not **HOW** (see design/ for HOW)
- Provides acceptance criteria to determine when work is complete

## spec.md Content Structure

Specs follow this standard content structure:

### 1. Goal
A single concise sentence describing what this story achieves.

**Example:**
```markdown
# Goal

Build an end-to-end thin slice for creating and reading cartridges via CLI and MCP, validating the full stack from interface down to filesystem with comprehensive testing and path security.
```

### 2. Description
An overview of the story that includes:
- What functionality is being delivered
- Context about the domain (e.g., what cartridges are)
- Key concepts and definitions
- How this story fits into the broader system
- References to related cartridges or patterns

**Example sections:**
- What the feature does
- Domain concepts and terminology
- Scope definitions (system/shared/project)
- Implementation patterns being followed

### 3. Scope

#### In Scope
Explicitly list what IS included in this story:
- Public facades (CLI commands, MCP tools)
- Testing types required
- Security features
- Specific behaviors

#### Out of Scope
Explicitly list what is NOT included (deferred to future stories):
- Features explicitly excluded
- Operations deferred to future work
- Platform limitations for this version
- Optimizations deferred
- Edge cases to be addressed later

**Purpose:** Prevents scope creep and makes clear what is being delivered vs. what is being deferred.

### 4. Public Interfaces

Define all public-facing interfaces with complete specifications:

#### CLI Interface
For each command:
- **Synopsis:** Command syntax
- **Parameters:** Each parameter with type, requirement level, description, and constraints
- **Exit Codes:** Table mapping codes to error types and examples
- **Output:** What goes to stdout vs stderr, format expectations
- **Examples:** Multiple real-world usage examples

#### MCP Interface
For each tool:
- **Schema:** Complete JSON schema with all properties
- **Response (Success):** Example successful response
- **Response (Error):** Example error responses

### 5. Behavior Specification

Detailed behavioral requirements organized by feature area:
- **Given/Then** format for clarity
- Concrete examples with actual values
- Edge cases and special handling
- Error cases with exact error messages
- Implementation patterns and algorithms

**Sections might include:**
- Feature behavior for each scope/variant
- Path encoding/collision prevention
- File content handling
- Error cases with specific error messages

### 6. [Domain-Specific Requirements]

Additional sections as needed for the domain:
- **Path Security Requirements** (for filesystem operations)
- **Validation Rules** (for input processing)
- **State Management** (for stateful features)
- **Performance Requirements** (when relevant)

These sections provide deep dives into specific aspects critical to the story.

### 7. Testing Requirements

Complete testing strategy following TDD principles:

#### Testing Philosophy
- Reference to TDD process (strict red-green-refactor)
- References to relevant testing cartridges
- Overall testing approach

#### Unit Tests
- Philosophy (pure mocks, no external dependencies)
- Structure and naming conventions
- Requirements checklist
- Coverage expectations
- Bun-specific considerations (mock pollution)

#### Integration Tests
- Philosophy (real dependencies, isolated workspaces)
- Setup/teardown patterns
- Structure and naming
- Requirements checklist

#### Acceptance Tests
- Philosophy (automated end-to-end via public interfaces)
- CLI acceptance testing approach
- MCP acceptance testing approach
- Requirements checklist

#### Blitz Testing
- Philosophy (human-driven exploratory testing)
- Approach and attack vectors
- Note about manual vs automated nature

#### End-to-End (E2E) Testing
- Philosophy (Docker-based user journey testing)
- Why Docker (isolation, clean environment, reproducibility)
- Architecture (Docker images, variants)
- Test types in Docker
- Hat 1 vs Hat 3 perspective
- Directory structure
- Known issues
- Future work

### 8. Quality Requirements

Standards that must be met:

#### Code Quality
- Reference to ts-coding-style cartridge
- Specific patterns required (module pattern, type safety, etc.)
- File naming and import conventions
- Error handling standards
- Validation approaches

#### Testing Quality
- Reference to testing-pyramid cartridge
- TDD requirements
- Coverage expectations
- Test structure standards
- Isolation requirements
- Performance expectations

#### Build Quality
- Reference to green-build cartridge
- Build passing requirements
- Linting standards
- Type checking requirements
- Warning tolerance (zero)

### 9. Success Criteria

Concrete checklist of what "done" means:

#### Functional Success
- ✅ Checkbox list of functional requirements
- Each major feature variation
- Security features
- Edge cases

#### Testing Success
- ✅ All test types passing
- Coverage thresholds met
- No known issues (or documented exceptions)

#### Quality Success
- ✅ Linting passes
- ✅ Tests pass
- ✅ Type checking passes
- ✅ Code quality standards met

#### Deployment Success
- ✅ Git commits
- ✅ Version bumped
- ✅ Build completes
- ✅ Ready for publish

#### Documentation Success
- ✅ README updated
- ✅ API documentation complete
- ✅ Spec validated

## Key Principles

1. **Completeness**: Spec provides ALL context needed for implementation
2. **Clarity**: Use concrete examples, not abstract descriptions
3. **Precision**: Exact error messages, exit codes, path formats
4. **Testability**: Every requirement maps to testable criteria
5. **Scope Control**: Explicit about what's in/out of scope
6. **Quality First**: Testing and quality are first-class sections
7. **Reference Standards**: Link to relevant cartridges for patterns

## Anti-Patterns

❌ Vague descriptions ("should work well")
❌ Missing error cases
❌ Ambiguous scope boundaries
❌ Incomplete interface definitions
❌ Missing testing strategy
❌ No success criteria
❌ Prescriptive implementation details (HOW instead of WHAT)

## Usage

When planning subtasks:
1. Read the entire spec to understand the full story
2. Identify what has been completed in prior subtasks
3. Pick the next logical piece of work
4. Ensure your subtask maintains a green build
5. Reference specific sections of the spec in your subtask
6. Don't duplicate spec content in subtasks—reference it

When implementing:
1. The spec is the source of truth
2. Error messages must match the spec exactly
3. All success criteria must be met
4. Testing requirements are non-negotiable
5. Quality standards must be maintained
