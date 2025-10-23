# Subtasks

Implementation units within stories that represent discrete, testable work items executed through TDD workflows.

## Operations

1. **create** - Create a new subtask within a story
2. **read** - Read an existing subtask
3. **edit** - Modify an existing subtask (4 variants)
4. **delete** - Remove a subtask from working copy
5. **list** - List subtasks for a story
6. **transition** - Change subtask state
7. **assign** - Assign subtask to developer

## Compatible With

1. **search** - Full-text search across subtasks
2. **multiread** - Read multiple subtasks in a single operation
3. **filter** - Filter subtasks by state, priority, assignee, type

## Operation Details

### Create
- Requires story context for addressing: `story-id + scope + type + name`
- Generates a unique ID within story scope (e.g., `sub001`, `sub002`)
- Creates directory structure in appropriate state folder (default: todo)
- Initializes subtask document with front matter
- Creates placeholder for implementation notes
- Returns the generated ID

### Read
- Supports full addressing (both Method 1 and Method 2)
- Requires parent story context for addressing
- Returns the complete subtask document including front matter
- Version can be specified to read historical versions
- Can optionally include associated run history
- Shows current state and progress

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
- Associated runs remain for audit trail
- Marks subtask as 'deleted' in index
- May require story state validation

### List
- Provides a list of all subtasks within a story
- Includes synopsis if available from front matter
- Shows state, type, priority, and assignee
- Supports filtering and sorting
- Groups by state folder by default

### Transition
- Validates state transitions according to state machine
- Physically moves subtask directory between state folders
- Updates subtask state and timestamp
- May trigger pipeline actions
- Logs transition history
- Propagates state changes to parent story

### Assign
- Assigns subtask to a developer
- Updates assignee field in front matter
- May trigger notifications
- Records assignment history

## Standard Operations

The operations listed above are standard for all document types unless documents are write-protected.

## Subtask Structure

### File Organization
```
.data/project/stories/sto001/subtasks/
├── todo/
│   ├── sub003/
│   │   ├── subtask.md              # Subtask definition
│   │   └── notes.md                # Planning notes (optional)
├── in-progress/
│   ├── sub001/
│   │   ├── subtask.md              # Subtask definition
│   │   ├── implementation.md       # Implementation notes
│   │   ├── tests/                  # Test artifacts (optional)
│   │   │   ├── test-plan.md
│   │   │   └── coverage.json
│   │   └── artifacts/              # Other outputs (optional)
├── review/
│   └── sub002/
│       ├── subtask.md
│       ├── implementation.md
│       └── review-feedback.md      # Review comments
└── done/
    └── sub004/
        ├── subtask.md
        └── implementation.md
```

### Subtask Document (subtask.md)
The main subtask document contains:
- Front matter with metadata
- Subtask description and context
- Technical approach outline
- Acceptance criteria
- Dependencies on other subtasks
- Test requirements

### Implementation Notes (implementation.md)
Created when subtask enters in-progress state:
- Technical decisions and rationale
- Breaking changes introduced
- Performance considerations
- Security implications
- Test coverage summary
- Challenges encountered
- Updated throughout implementation

## State Machine

Subtasks flow through these states:

```
todo → in-progress → review → done
         ↓            ↓
         └────────────┘
        (can loop back)
```

### State Definitions

- **todo** - Subtask defined but work not started
- **in-progress** - Active development, TDD cycle in progress
- **review** - Implementation complete, awaiting approval
- **done** - Subtask accepted and complete

### State Transitions

#### todo → in-progress
- **Trigger**: Developer starts work or pipeline execute
- **Validation**: Dependencies must be complete
- **Effect**:
  - Subtask directory moves to in-progress folder
  - Creates implementation.md if not exists
  - May create worktree branch
  - Updates parent story state if first subtask

#### in-progress → review
- **Trigger**: Implementation complete, ready for review
- **Validation**: None (self-assessment)
- **Effect**:
  - Subtask directory moves to review folder
  - Creates review-feedback.md
  - May trigger review pipeline

#### review → done
- **Trigger**: Review approved
- **Validation**: All feedback addressed
- **Effect**:
  - Subtask directory moves to done folder
  - Updates parent story progress
  - May trigger story state transition
  - Merges worktree branch if applicable

#### review → in-progress
- **Trigger**: Changes requested in review
- **Validation**: None
- **Effect**:
  - Subtask directory moves back to in-progress
  - Appends feedback to implementation.md
  - Increments review cycle counter

#### in-progress → todo
- **Trigger**: Work paused or blocked
- **Validation**: None
- **Effect**:
  - Subtask directory moves to todo folder
  - Preserves implementation.md for context
  - Updates parent story if no other in-progress subtasks

## Do/Review Cycle

Subtasks follow a strict TDD workflow:

### Preparation Phase
1. Review subtask requirements
2. Understand dependencies
3. Identify test requirements
4. Plan technical approach
5. Create or checkout worktree branch

### Test-First Development
1. Write failing tests first
2. Implement minimal code to pass tests
3. Refactor while maintaining passing tests
4. Document technical decisions
5. Update implementation notes

### Self-Review
1. Verify all acceptance criteria met
2. Check test coverage targets
3. Review code quality
4. Validate error handling
5. Confirm documentation complete

### Peer/AI Review
1. Submit for review (transition to review state)
2. Reviewer examines code, tests, documentation
3. Feedback provided via review-feedback.md
4. Developer addresses feedback
5. Re-review if needed

### Completion
1. Final approval granted
2. Transition to done state
3. Merge worktree branch
4. Update story progress
5. Archive run logs

## Pipeline Integration

### Standard Pipelines

#### do-subtask Pipeline
- Initializes subtask environment
- Guides through TDD cycle
- Manages worktree branch
- Captures implementation notes
- Handles context management for long sessions

#### review-subtask Pipeline
- Loads subtask and implementation
- Performs code review
- Generates feedback document
- Determines approval/rejection
- Updates subtask state

#### address-feedback Pipeline
- Loads review feedback
- Guides feedback resolution
- Re-runs tests
- Prepares for re-review

### Pipeline Triggers

```json
"pipelines": {
    "onStart": "project/do-subtask",
    "onReview": "project/review-subtask",
    "onFeedback": "project/address-feedback",
    "onComplete": "project/complete-subtask"
}
```

### Run Association
- Each subtask execution creates a run
- Run ID tracked in subtask metadata
- Multiple runs per subtask (for iterations)
- Run history accessible from subtask view
- Worktree branches managed per run

### Worktree Branch Management

#### Branch Naming
Pattern: `story-{storyId}-subtask-{subtaskId}`
Example: `story-042-subtask-003`

#### Branch Lifecycle
1. **Creation**: When subtask enters in-progress
2. **Base**: Parent story branch or main
3. **Isolation**: All changes isolated to branch
4. **Review**: Branch reviewed in review state
5. **Merge**: Merged when subtask moves to done
6. **Cleanup**: Branch deleted after merge

#### Docker-Claude Integration
```json
"dockerConfig": {
    "image": "docker-claude:latest",
    "worktree": true,
    "branch": "story-{storyId}-subtask-{subtaskId}",
    "mounts": [
        "/Users/project:/workspace:ro",
        "/Users/project/.worktrees/{branch}:/worktree"
    ],
    "env": {
        "STORY_ID": "{storyId}",
        "SUBTASK_ID": "{subtaskId}"
    }
}
```

## Relationship to Stories

### Parent-Child Relationship
- Subtasks always belong to exactly one story
- Subtask IDs scoped within story (sub001, sub002, etc.)
- Subtask state affects story state
- Story cannot be complete until all subtasks complete

### State Propagation
```
Story State = f(Subtask States)

if any subtask in-progress → story in-progress
if all subtasks done → story review (pending approval)
if all subtasks todo → story todo
```

### Progress Aggregation
```json
"storyProgress": {
    "total": 8,
    "todo": 1,
    "inProgress": 3,
    "review": 2,
    "done": 2,
    "percentage": 25,
    "currentSubtask": "sub003"
}
```

### Dependency Tracking
- Subtasks can depend on other subtasks in same story
- Dependencies block state transitions
- Circular dependencies detected and rejected
- Cross-story dependencies not supported (handle at story level)

## Front Matter

Subtasks use structured YAML front matter:

```yaml
---
type: implementation | test | documentation | refactor | bugfix | spike
priority: critical | high | medium | low
points: number
assignee: userId
dependencies: [sub001, sub002]
estimated_hours: number
actual_hours: number
state: todo | in-progress | review | done
created: ISO-8601 timestamp
updated: ISO-8601 timestamp
reviewCycles: number
runs: [run001, run002]
synopsis: "Brief one-line description"
---
```

### Type Values

- **implementation** - Feature implementation work
- **test** - Test creation or enhancement
- **documentation** - Documentation writing
- **refactor** - Code quality improvement
- **bugfix** - Defect correction
- **spike** - Investigation or proof of concept

### Priority Values

- **critical** - Blocking or urgent
- **high** - Important for story completion
- **medium** - Standard priority
- **low** - Nice to have, not urgent

### Metadata Fields

- **points** - Subtask size estimation (optional)
- **assignee** - Assigned developer user ID
- **dependencies** - List of subtask IDs that must complete first
- **estimated_hours** - Time estimate (optional)
- **actual_hours** - Actual time spent (tracked)
- **state** - Current state in state machine
- **created** - Subtask creation timestamp
- **updated** - Last modification timestamp
- **reviewCycles** - Number of review iterations
- **runs** - List of associated run IDs
- **synopsis** - Brief description for list views

## Test Requirements

### Test Coverage Targets
- Unit tests: Required for all implementation subtasks
- Integration tests: Required where applicable
- E2E tests: Optional, depends on story requirements
- Coverage target: Defined in front matter or story design

### Test-First Development
```markdown
## Test Plan

### Unit Tests
- [ ] Test authentication token generation
- [ ] Test token expiration handling
- [ ] Test invalid token rejection

### Integration Tests
- [ ] Test end-to-end login flow
- [ ] Test password reset flow

### Coverage
- Target: 90% line coverage
- Current: Updated during implementation
```

### Test Artifacts
- Test files created/modified tracked in implementation.md
- Test results captured in run logs
- Coverage reports stored in artifacts folder
- Failed tests block review transition

## Acceptance Criteria

Subtasks include structured acceptance criteria:

```markdown
## Acceptance Criteria

- [ ] User can authenticate with email and password
- [ ] Invalid credentials return clear error message
- [ ] Successful authentication returns JWT token
- [ ] Token includes user ID and expiration
- [ ] All tests passing with >90% coverage
```

### Checklist Format
- Each criterion is a checkbox item
- Can be marked complete independently
- All must be complete for subtask to move to done
- Tracked in subtask metadata

### Validation
- Criteria defined during subtask creation
- Validated during self-review
- Verified during peer/AI review
- Must be met for approval

## Implementation Notes

### Technical Approach
```markdown
## Technical Approach

Using JWT for stateless authentication. Token will include:
- User ID
- Role/permissions
- Expiration timestamp (24h default)

Library: `jsonwebtoken` v9.0.0

Security considerations:
- Tokens signed with RS256 (asymmetric)
- Private key stored in secure environment variable
- Public key distributed for verification
```

### Breaking Changes
```markdown
## Breaking Changes

- Changed authentication endpoint from `/auth` to `/api/v2/auth`
- Token format changed, old tokens will be invalid
- Migration: Users will need to re-authenticate
```

### Performance Considerations
```markdown
## Performance

- Token generation: < 10ms
- Token verification: < 5ms
- No database lookup required for verification
- Cache public key in memory
```

### Security Implications
```markdown
## Security

- Private key must be kept secure
- Token expiration prevents indefinite access
- Implement token refresh flow separately
- Consider rate limiting on auth endpoints
```

## Context Management

### Low Context Handling
When running low on context during implementation:

1. Update implementation.md with current state
2. Note in-progress work and next steps
3. Mark current acceptance criterion as incomplete
4. Report status to user
5. Stop and enable resumption

Example note:
```markdown
## Context Management Note

**Status**: Low on context, pausing work
**Completed**: Items 1-4 of acceptance criteria
**In Progress**: Item 5 - Test coverage validation
**Next Steps**: Complete coverage validation, then run full test suite
**Recommend**: Use continue=true to resume
```

### Resumption
- Pipeline resume operation
- Loads previous implementation.md
- Continues from last checkpoint
- Maintains worktree branch state

## Write Protection

Subtasks in 'done' state may be write-protected in future versions to prevent accidental modification. Currently, all subtasks are editable regardless of state.

## Addressing Examples

### Method 1: Path-based (with story context)
```
project/story/sto001/subtask/todo/sub003
project/story/sto001/subtask/in-progress/sub001
project/story/sto042/subtask/review/sub002
```

### Method 2: ID-based (with story context)
```
project/sto001/sub003
project/sto001/sub001
project/sto042/sub002
```

### Versioning
```
project/sto001/sub003@v1.2.0    # Specific version
project/sto001/sub003           # Latest version
```

## Example Subtask

```yaml
---
type: implementation
priority: high
points: 3
assignee: user001
dependencies: [sub001]
estimated_hours: 4
actual_hours: 5.5
state: review
created: 2025-01-18T09:00:00.000Z
updated: 2025-01-21T15:30:00.000Z
reviewCycles: 1
runs: [run025, run026]
synopsis: "Implement JWT token generation for authentication"
---

# Implement JWT Authentication Token Generation

## Context

Users need secure, stateless authentication. This subtask implements JWT token generation as defined in the story design document.

## Dependencies

- **sub001**: User model and database setup (COMPLETE)

## Acceptance Criteria

- [x] JWT token generated on successful authentication
- [x] Token includes user ID, role, and expiration
- [x] Token signed with RS256 algorithm
- [x] Unit tests for token generation
- [x] Integration tests for auth flow
- [ ] Code review approval

## Technical Approach

See [implementation.md](implementation.md) for detailed technical notes.

## Test Requirements

### Unit Tests
- Token structure validation
- Expiration handling
- Invalid signature detection

### Integration Tests
- End-to-end authentication flow
- Token verification in protected routes

### Coverage Target
90% line coverage

## Notes

- Using `jsonwebtoken` library v9.0.0
- Private key loaded from environment variable
- Token expiration set to 24 hours
- Refresh token flow to be implemented in separate subtask (sub005)
```

## Relationship to Pipelines and Runs

### Pipeline Association
- Subtasks typically executed via pipelines
- Standard pipeline: `do-subtask`
- Custom pipelines can be defined per story
- Pipeline reference stored in subtask metadata

### Run Tracking
```json
"runs": [
    {
        "id": "run025",
        "started": "2025-01-18T09:00:00.000Z",
        "completed": "2025-01-18T11:30:00.000Z",
        "outcome": "changes-requested",
        "pipeline": "project/ppl001"
    },
    {
        "id": "run026",
        "started": "2025-01-21T14:00:00.000Z",
        "completed": "2025-01-21T15:30:00.000Z",
        "outcome": "approved",
        "pipeline": "project/ppl001"
    }
]
```

### Execution Flow
1. User invokes: `swic subtask start sto001 sub003`
2. System creates run: `run025`
3. System executes pipeline: `project/do-subtask`
4. Pipeline creates worktree branch
5. Pipeline guides TDD implementation
6. Implementation captured in run logs
7. On completion, subtask transitions to review
8. Run marked complete with outcome
