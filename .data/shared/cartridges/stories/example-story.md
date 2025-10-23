---
audience: claude (all roles)
abstract: complete example of a finished story showing all artifacts
---

# Example Story

## Overview

This cartridge shows what a complete, production-quality story looks like with all artifacts from spec through implementation.

## Complete Story Structure

```
003-cartridge-create-performance/
├── spec/
│   ├── spec.md                          # The specification (WHAT)
│   └── comments/
│       ├── spec-notes-1.md              # Writer's first iteration notes
│       ├── review-feedback-1.md         # Reviewer's first feedback
│       ├── feedback-review-1.md         # Writer's response to feedback
│       ├── spec-notes-2.md              # Writer's second iteration (refinement)
│       └── review-feedback-2.md         # Reviewer's approval (or next round)
├── design/
│   ├── high-level-design.md             # Architecture and approach (HOW)
│   ├── performance-testing.md           # Domain-specific design doc
│   └── comments/
│       ├── design-notes-1.md            # Designer's first iteration
│       ├── review-feedback-1.md         # Reviewer feedback
│       ├── feedback-review-1.md         # Designer's response
│       ├── design-notes-2.md            # Refinement
│       ├── review-feedback-2.md         # Second review
│       ├── profiling-results.md         # Investigation artifacts
│       └── mcp-layer-analysis-iteration-3.md  # Deep dive analysis
└── subtasks/
    ├── Done/
    │   └── 002-profile-create-operation/
    │       ├── subtask.md               # Implementation checklist
    │       └── comments/
    │           ├── prep-phase/
    │           │   ├── planning-notes-1.md      # Initial planning
    │           │   ├── review-feedback-1.md     # Plan review
    │           │   ├── feedback-review-1.md     # Response
    │           │   └── planning-notes-2.md      # Refined plan
    │           ├── build-phase/
    │           │   ├── implementation-notes-1.md  # What was done
    │           │   └── implementation-notes-3.md  # Third iteration
    │           └── user-feedback-1.md           # User corrected approach
    └── In-Progress/
        ├── 003-fix-mcp-tool-instantiation-overhead/
        └── 004-investigate-mcp-performance-bottlenecks/
```

## Story: Cartridge Create Performance

**Goal**: Optimize cartridge_create to <1s for 100KB files

**What happened**:
1. Spec went through 2 iterations (initial → feedback → refinement → approval)
2. Design went through 2+ iterations with investigation artifacts added
3. Subtask 002 went through **3 iterations** including user correction
4. Final result: 11KB file completes in 92ms (target was 100ms)

## Key Artifacts Explained

### spec/spec.md
Complete requirements document defining WHAT to build:
- Goal (one sentence)
- Description (problem context)
- Scope (in/out boundaries)
- Public interfaces (if applicable)
- Behavior specification
- Testing requirements
- Quality requirements
- Success criteria

### design/high-level-design.md
Architecture showing HOW to build it:
- System context diagrams (Mermaid)
- Layered architecture
- Sequence diagrams for key flows
- Design principles
- Testing approach

### design/performance-testing.md
Domain-specific design (this story needed performance testing strategy):
- Benchmark approach
- Measurement methodology
- Baseline capture
- Optimization workflow

### subtasks/002-profile-create-operation/subtask.md
Implementation checklist with:
- Housekeeping items
- Grouped work items with checkboxes
- Multiple iterations as work evolved
- Final status showing completion

### Investigation Artifacts
Real files created during work:
- `design/comments/profiling-results.md` - Data analysis and findings
- `design/comments/mcp-layer-analysis-iteration-3.md` - Deep dive after user feedback
- `subtasks/.../comments/user-feedback-1.md` - User corrected the conclusion

## Process Flow Demonstrated

### Spec Phase (2 iterations)
1. Writer creates spec.md + spec-notes-1.md
2. Reviewer creates review-feedback-1.md
3. Writer creates feedback-review-1.md (concur/refute each item)
4. Writer refines spec.md + spec-notes-2.md
5. Reviewer approves via review-feedback-2.md

### Design Phase (2+ iterations + investigation)
Similar write→review→refine cycle, but also shows:
- Investigation artifacts added as work progresses
- Multiple analysis documents as understanding deepens
- Real profiling data captured in comments/

### Subtask Phase (3 iterations)
1. **Prep phase**: Plan the work
   - planning-notes-1.md created
   - Reviewed, refined to planning-notes-2.md
2. **Build phase**: Do the work
   - implementation-notes-1.md documents what was done
   - User provides feedback (user-feedback-1.md)
   - Agent does iteration 3 (implementation-notes-3.md)
3. **Completion**: Final status in subtask.md

## Key Lessons from This Example

1. **Multiple iterations are normal** - This story had 2 spec iterations, 2 design iterations, 3 subtask iterations
2. **User feedback happens** - Agent's conclusion was wrong in iteration 2, user corrected, iteration 3 succeeded
3. **Investigation artifacts accumulate** - Real data files, analysis documents, profiling results
4. **Comments folders track decisions** - Complete audit trail of all thinking
5. **Checklists guide work** - Each subtask has granular checkboxes tracking progress
6. **Context management works** - Agent stopped and continued across iterations
7. **Real deliverable** - Story achieved measurable result (38s → 92ms)

## Usage

When creating stories:
- Reference this structure for what "done" looks like
- Don't skip the comments/ documentation
- Iterations are expected, not failures
- Investigation artifacts are first-class outputs
- User feedback drives refinement
- Build quality is non-negotiable (green build, lint passing, tests passing)

The `.stories/Done/003-cartridge-create-performance/` folder contains the actual files showing this entire process.
