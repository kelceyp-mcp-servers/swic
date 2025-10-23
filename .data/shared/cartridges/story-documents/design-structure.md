# Design
## Design structure

```
Stories/
  In-Progress/
    {storyId}-{story-name}/
      spec/                                 <-- WHAT to build
      design/                               <-- HOW to build it (this folder)
        high-level-design.md               <-- Start here: architecture overview
        {domain}-specific-design.md        <-- Additional design docs as needed
        examples/                          <-- Example code, configs, etc.
        comments/                          <-- comments made during design creation
          design-notes-1.md               <-- notes by the writer (design agent) on first iteration
          review-feedback-1.md            <-- notes by the reviewer (design agent) on first iteration
          feedback-review-1.md            <-- response to review by writer (design agent) on first iteration
      subtasks/                            <-- implementation subtasks
```

## Exemplar Design

[//]: # (## Comments folder)

[//]: # ()
[//]: # (The comments folder supports the design creation workflow:)

[//]: # ()
[//]: # (**First iteration:**)

[//]: # (- `design-notes-1.md` - Writer's decisions, rationale, thought processes)

[//]: # (- `review-feedback-1.md` - Reviewer's numbered feedback items)

[//]: # ()
[//]: # (**If feedback needs addressing:**)

[//]: # (- `feedback-review-1.md` - Writer's response &#40;concur/refute each item&#41;)

[//]: # (- `design-notes-2.md` - Writer refines the design &#40;if they concurred with any items&#41;)

[//]: # (- `review-feedback-2.md` - Reviewer evaluates refined design)

[//]: # ()
[//]: # (This continues until the reviewer approves &#40;no feedback items&#41;.)

## Overview

Design documents explain **HOW** to build the system, in contrast to specs which define **WHAT** to build. A design:
- Describes the architecture and component structure
- Explains design decisions and tradeoffs
- Provides diagrams (Mermaid) to illustrate architecture
- Details service responsibilities and interactions
- Specifies how testing will be implemented
- References relevant patterns and cartridges

## Design Document Types

A design folder typically contains:

### high-level-design.md (Required)
The entry point for understanding the architecture. Contains:
- **Overview**: What this design covers
- **System Context**: How components relate (diagram)
- **Layered Architecture**: Layer responsibilities and dependencies (diagram)
- **Sequence Diagrams**: Key interaction flows
- **Design Principles**: Patterns being followed
- **Testing Approach**: How architecture enables testing

### Domain-Specific Design Documents (As Needed)

Break down complex areas into focused documents:
- `cli.md` - CLI interface design
- `mcp.md` - MCP interface design
- `core-services-public.md` - Public service layer
- `core-services-internal.md` - Internal service layer
- `security.md` - Security validation and path handling
- `error-handling.md` - Error types and propagation
- `testing-strategy.md` - Detailed testing approach
- `deployment.md` - Build and distribution

### examples/ folder (Optional)

Example code, configurations, or usage patterns that illustrate the design.

## high-level-design.md Template

```markdown
# High-Level Design

## Overview

Brief description of what this design covers and why it matters.

## System Context

[Mermaid diagram showing major components and their interactions]

**Key Interactions:**
- Bullet points explaining the main flows

## Layered Architecture

[Mermaid diagram showing layers and dependencies]

**Layer Responsibilities:**

| Layer | Purpose | Example |
|-------|---------|---------|
| **6. Interfaces** | ... | ... |
| **5. Public Services** | ... | ... |

**Why N layers?** Explain the rationale.

## Sequence Diagrams

### [Key Flow Name]

[Mermaid sequence diagram]

Brief explanation of the flow and any important details.

## Design Principles

- **Principle 1**: Explanation
- **Principle 2**: Explanation

## Testing Approach

How the architecture enables testing:
- Unit tests at which layers
- Integration tests for which interactions
- Acceptance tests for which flows

## References

- Relevant cartridges (ts-coding-style.md, module-pattern.md, etc.)
- Related design documents
```

## Domain-Specific Design Document Template

```markdown
# [Domain Area Name]

## Overview

What this design document covers.

## Component Diagram

[Mermaid diagram showing components in this domain]

## [Component Name]

**Purpose:** What this component does

**Responsibilities:**
- Bullet list of responsibilities

**API Concept:**
\`\`\`
method(params) → return type
\`\`\`

### Why [Component] Exists

Explain the design decision and what problem it solves.

### Design Decisions

**Decision:** [What you decided]
**Rationale:** [Why]
**Tradeoff:** [What you're giving up]

## Interaction Patterns

[Sequence diagrams or examples showing how components interact]

## Error Handling

How errors are handled in this domain.

## Testing Strategy

How these components will be tested.

## References

- Relevant cartridges
- Related sections in other design docs
```

## Key Principles

1. **HOW not WHAT**: Design explains implementation approach, not requirements
2. **Diagrams First**: Use Mermaid to illustrate architecture before detailed text
3. **Justify Decisions**: Explain why choices were made and acknowledge tradeoffs
4. **Testability**: Show how design enables testing at all levels
5. **Layering**: Respect dependency boundaries and explain layers
6. **Modularity**: Clear component boundaries with explicit responsibilities
7. **References**: Link to relevant cartridges and patterns
8. **Appropriate Detail**: Enough to guide implementation, not so much it becomes prescriptive

## Anti-Patterns

❌ Redefining WHAT (that's the spec's job)
❌ Diagrams without explanation
❌ Unexplained design decisions
❌ Violations of layer boundaries
❌ Untestable architecture (tight coupling, no injection)
❌ Missing tradeoff acknowledgments
❌ Over-engineering for hypothetical future needs
❌ Under-engineering for known requirements

## Usage

When planning subtasks:
1. Read the spec to understand WHAT needs to be built
2. Read the design to understand HOW it will be built
3. Reference specific design sections in your subtask
4. Follow the architecture and patterns specified

When implementing:
1. The design guides your implementation approach
2. Follow the layering and module patterns
3. Use the sequence diagrams to understand flows
4. Refer to specific design docs for detailed guidance
