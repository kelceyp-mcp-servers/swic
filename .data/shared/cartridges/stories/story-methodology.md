# Story Methodology

## Story States
Stories flow through: **To-Do → In-Progress → Review → Done**
Additional states: **Ready** (queued), **Retro** (retrospectives)

## Story Structure
```
.stories/
├── To-Do/             # Not started
├── Ready/             # Queued for work
├── In-Progress/       # Active development
├── Review/            # Under review
├── Done/              # Completed
└── Retro/             # Post-mortem analysis

{state}/{id}-{name}/
├── spec/              # WHAT to build
│   ├── spec.md
│   └── comments/
├── design/            # HOW to build
│   ├── high-level-design.md
│   ├── {domain}-specific-design.md
│   └── comments/
└── subtasks/          # Implementation chunks
    ├── To-Do/
    ├── In-Progress/
    ├── Review/
    └── Done/
        └── {id}-{name}/
            ├── subtask.md
            └── comments/
                ├── prep-phase/
                └── build-phase/
```

## Story Lifecycle

### 1. Init Story
- Interview user (one question at a time)
- Create problem statement in project cartridges
- Create story folder in To-Do/
- Infer story name from problem description

### 2. Create Spec (WHAT)
- Product-owner agent writes spec
- Defines interfaces, behaviors, scope
- Given/Then examples, exact error messages
- Review → Refine cycles until approved
- Comments track iterations

### 3. Create Design (HOW)
- Architect agent designs solution
- Architecture diagrams (Mermaid)
- Service responsibilities, patterns
- Testing approach
- Review → Refine cycles until approved

### 4. Create Subtasks
- Break work into deliverable chunks
- Each subtask is self-contained
- Ordered dependencies
- Clear acceptance criteria

### 5. Do Subtasks (TDD)
- Prep phase: Plan implementation
- Build phase: Red-Green-Refactor
- One checklist item at a time
- Update implementation notes continuously
- Review → Refine cycles per subtask
- Git commit after each iteration

## Review Cycles
All documents follow: **Write → Review → Feedback → Refine**

Comments structure per iteration:
- `{doc}-notes-{n}.md` - Writer's decisions
- `review-feedback-{n}.md` - Reviewer's numbered items
- `feedback-review-{n}.md` - Writer's response (concur/refute)

Continue until reviewer approves (no feedback items).

## Core Principles

### Scope Discipline
- No gold plating
- No "while I'm at it"
- Breaking changes over compatibility
- No fallbacks or defaults

### Process Discipline
- Specs define WHAT, designs define HOW
- One question at a time in interviews
- Complete each checklist item before next
- Exit early if low on context
- Green build before any work

### Quality Discipline
- Strict TDD: Red → Green → Refactor
- 90%+ test coverage
- No `any` types
- Clear error messages
- Document decisions in comments/

### Agent Roles
- **product-owner**: Writes/reviews specs
- **architect**: Writes/reviews designs
- **tdd-engineer**: Implements subtasks
- **review-agent**: Reviews implementation

## Context Management
When running low:
1. Update implementation notes with state
2. Mark current item incomplete
3. Report what's done and what's left
4. Stop - don't rush

## Git Integration
- Commit after each subtask iteration
- Descriptive messages: "Complete subtask {id} iteration {n}"
- Pass commit hash to reviewers
- Enables rollback if needed

## Success Criteria
Story complete when:
- All subtasks in Done/
- Tests passing
- Build green
- Review approved
- Story moved to Done/

## Cartridge References
Workflows:
- `workflows/init-story.md`
- `workflows/create-spec.md`
- `workflows/create-design.md`
- `workflows/create-subtask.md`
- `workflows/do-subtask.md`

Document structures:
- `story-documents/spec-structure.md`
- `story-documents/design-structure.md`
- `story-documents/subtask-structure.md`

## Notes
- Problem statements live in project cartridges, not .stories/
- Required reading propagates through nested instructions
- Stories can be moved between states as work progresses
- Prior art in .stories/ may be from other projects