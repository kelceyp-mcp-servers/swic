# Stories

High-level work items or features that represent significant deliverables, decomposed into subtasks for implementation.

## Operations

1. **create** - Create a new story
2. **read** - Read an existing story
3. **edit** - Modify an existing story (4 variants)
4. **delete** - Remove a story from working copy
5. **list** - List all stories with synopsis
6. **transition** - Change story state
7. **assign** - Assign ownership to story

## Compatible With

1. **search** - Full-text search across stories
2. **multiread** - Read multiple stories in a single operation
3. **filter** - Filter stories by state, priority, owner, labels

## Operation Details

### Create
- Requires Method 1 addressing: `scope + type + path + name`
- Addressing similar to HTTP PUT (specifies the location)
- Generates a unique ID not known in advance (similar to HTTP POST)
- Creates directory structure for story, subtasks, and artifacts
- Initializes story with 'todo' state
- Returns the generated ID (e.g., `sto001`)

### Read
- Supports full addressing (both Method 1 and Method 2)
- Returns the complete story document including front matter
- Version can be specified to read historical versions
- Can optionally include subtask summaries
- Shows current state and progress metrics

### Edit
- Supports latest version addressing only
- Atomic write via file renaming
- Four variants using `EditOp`:

```typescript
EditOp =
  | { op: 'replaceOnce'; oldText: string; newText: string }
  | { op: 'replaceAll'; oldText: string; newText: string }
  | { op: 'replaceRegex'; pattern: string; flags?: string; replacement: string }
  | { op: 'replaceAllContent'; content: string };
```

### Delete
- Stores the last version for recovery
- Removes from 'working copy' only
- Historical versions remain in version control
- Associated subtasks and runs remain for audit trail
- Marks story as 'deleted' in index

### List
- Provides a list of all stories in the scope
- Includes synopsis if available from front matter
- Shows state, priority, owner, and progress
- Supports filtering and sorting

### Transition
- Validates state transitions according to state machine
- Updates story state and timestamp
- May trigger pipeline actions
- Logs transition history
- Validates subtask states for some transitions

### Assign
- Assigns story ownership to a user
- Updates assignee field in front matter
- May trigger notifications
- Records assignment history

## Standard Operations

The operations listed above are standard for all document types unless documents are write-protected.

## Story Structure

### File Organization
```
.data/project/stories/
├── sto001/
│   ├── story.md                    # Story specification document
│   ├── spec/                       # Original specification (WHAT)
│   │   └── spec.md
│   ├── design/                     # Technical design (HOW)
│   │   └── design.md
│   ├── subtasks/                   # Implementation units
│   │   ├── todo/
│   │   │   └── sub001/
│   │   │       └── subtask.md
│   │   ├── in-progress/
│   │   │   └── sub002/
│   │   │       └── subtask.md
│   │   ├── review/
│   │   └── done/
│   └── artifacts/                  # Supporting materials
│       ├── diagrams/
│       ├── screenshots/
│       └── notes/
```

### Story Document (story.md)
The main story document contains:
- Front matter with metadata
- Story description and context
- Acceptance criteria
- Links to spec and design
- Subtask summary
- Progress tracking

## State Machine

Stories flow through these states:

```
todo → in-progress → review → done
  ↑         ↓           ↓
  └─────────┴───────────┘
      (can move back)
```

### State Definitions

- **todo** - Story defined but work not started
- **in-progress** - Active development, at least one subtask in progress
- **review** - All subtasks complete, awaiting approval
- **done** - Story accepted and complete

### State Transitions

#### todo → in-progress
- **Trigger**: First subtask moves to in-progress
- **Validation**: Story must have spec and design
- **Effect**: Story becomes active

#### in-progress → review
- **Trigger**: All subtasks move to done
- **Validation**: All subtasks must be complete
- **Effect**: Story ready for review

#### review → done
- **Trigger**: Story review approved
- **Validation**: All acceptance criteria met
- **Effect**: Story marked complete

#### review → in-progress
- **Trigger**: Changes requested in review
- **Validation**: None
- **Effect**: At least one subtask moves back to in-progress

#### in-progress → todo
- **Trigger**: Work paused or deprioritized
- **Validation**: No subtasks in review or done
- **Effect**: All subtasks move to todo

## Subtask Management

### Subtask Organization
- Subtasks live in state-based directories (todo, in-progress, review, done)
- Moving a subtask changes its directory location
- Each subtask has unique ID within the story's scope
- Subtask IDs are story-scoped (sub001, sub002, etc.)

### Subtask States
Subtask states mirror story states:
- **todo** - Not started
- **in-progress** - Active work
- **review** - Awaiting approval
- **done** - Complete

### State Propagation
- Story state derived from subtask states
- Story cannot be 'done' until all subtasks are 'done'
- Story cannot be 'review' unless all subtasks are 'done' or 'review'
- First subtask entering 'in-progress' moves story to 'in-progress'

### Progress Tracking
```json
"progress": {
    "total": 8,
    "todo": 2,
    "inProgress": 3,
    "review": 1,
    "done": 2,
    "percentage": 25
}
```

### Dependency Management
- Subtasks can declare dependencies on other subtasks
- Dependencies block state transitions
- Circular dependencies are detected and rejected
- Dependencies visualized in story view

## Pipeline Integration

### Story Lifecycle Pipelines
- **init-story** - Initialize story structure
- **create-spec** - Write product specification
- **create-design** - Write technical design
- **create-subtasks** - Break work into subtasks

### Subtask Pipelines
- **do-subtask** - TDD implementation cycle
- **review-subtask** - Code review process
- Each subtask execution creates a run

### Pipeline Triggers
```json
"pipelines": {
    "onInit": "project/ppl001",
    "onSubtaskComplete": "project/ppl002",
    "onReview": "project/ppl003",
    "onComplete": "project/ppl004"
}
```

### Run Association
- Runs tracked by story and subtask ID
- Run history accessible from story view
- Pipeline outputs stored in artifacts
- Worktree branches managed automatically

## Front Matter

Stories use structured YAML front matter:

```yaml
---
type: feature | bug | improvement | research | refactor | spike
priority: critical | high | medium | low
points: number
owner: userId
labels: [tag1, tag2, tag3]
state: todo | in-progress | review | done
created: ISO-8601 timestamp
updated: ISO-8601 timestamp
parent: storyId (if this is a sub-story)
depends: [storyId1, storyId2] (blocking dependencies)
synopsis: "Brief one-line description"
---
```

### Type Values

- **feature** - New functionality or capability
- **bug** - Defect or error correction
- **improvement** - Enhancement to existing feature
- **research** - Investigation or spike work
- **refactor** - Code quality or architecture improvement
- **spike** - Time-boxed exploration

### Priority Values

- **critical** - Blocking or urgent issue
- **high** - Important for current milestone
- **medium** - Standard priority
- **low** - Nice to have, not urgent

### Metadata Fields

- **points** - Story size estimation (optional)
- **owner** - Assigned user ID
- **labels** - Tags for categorization and filtering
- **state** - Current state in state machine
- **created** - Story creation timestamp
- **updated** - Last modification timestamp
- **parent** - Parent story ID for hierarchical stories
- **depends** - Blocking dependencies on other stories
- **synopsis** - Brief description for list views

## Acceptance Criteria

Stories include structured acceptance criteria:

```markdown
## Acceptance Criteria

- [ ] User can authenticate with email and password
- [ ] User can reset forgotten password via email
- [ ] User session persists across browser restarts
- [ ] Error messages are user-friendly and actionable
- [ ] All authentication flows have unit and integration tests
```

### Checklist Format
- Each criterion is a checkbox item
- Can be marked complete independently
- All must be complete for story to move to 'done'
- Tracked in story metadata

### Validation
- Criteria defined during spec creation
- Validated during review process
- Linked to test coverage
- Documented in story completion

## Spec and Design Documents

### Spec Document (spec/spec.md)
- **Purpose**: Defines WHAT to build
- **Audience**: Product owner, stakeholders
- **Content**: Requirements, user stories, acceptance criteria
- **Created**: During init-story or create-spec workflow
- **Approval**: Required before design phase

### Design Document (design/design.md)
- **Purpose**: Defines HOW to build
- **Audience**: Engineers, architects
- **Content**: Architecture, API contracts, data models, technical decisions
- **Created**: During create-design workflow
- **Approval**: Required before subtask creation

### Workflow Integration
1. Story initialized with problem statement
2. Spec written and reviewed (iterative)
3. Design written and reviewed (iterative)
4. Subtasks created from design
5. Subtasks implemented and reviewed
6. Story reviewed and completed

## Write Protection

Stories are not write-protectable in this specification. Future versions may add write protection for completed stories.

## Example Story

```yaml
---
type: feature
priority: high
points: 8
owner: user001
labels: [authentication, security, mvp]
state: in-progress
created: 2025-01-15T10:00:00.000Z
updated: 2025-01-21T14:30:00.000Z
synopsis: "User authentication with email and password"
---

# User Authentication

## Context

Users need a secure way to authenticate and access their personalized content. This story implements email/password authentication with session management.

## Acceptance Criteria

- [ ] User can register with email and password
- [ ] User can log in with credentials
- [ ] User can log out
- [ ] User can reset password via email
- [ ] Sessions persist across browser restarts
- [ ] All flows have comprehensive tests

## Spec

See [spec/spec.md](spec/spec.md) for detailed requirements.

## Design

See [design/design.md](design/design.md) for technical design.

## Subtasks

### To-Do
- None

### In-Progress
- **sub002**: Implement password reset flow
- **sub003**: Add session persistence

### Review
- **sub001**: User registration API

### Done
- None

## Progress

- Total subtasks: 3
- Completed: 0
- In progress: 2
- In review: 1
- Progress: 0%

## Notes

- Consider OAuth integration as future enhancement
- Need to validate email delivery in staging environment
```
