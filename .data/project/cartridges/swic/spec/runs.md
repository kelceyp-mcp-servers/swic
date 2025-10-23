# Runs

Execution instances of pipelines that track progress, capture history, and enable resumption.

## Overview

Runs are the runtime representation of pipeline executions. Each run captures the complete execution history of a pipeline instance, including all task outputs, decisions made, and state transitions. They enable debugging, auditing, and resumption from any point in the pipeline. Runs are closely integrated with worktree branches and docker execution logs.

## Operations

1. **create** - Create a new run (typically via pipeline execute)
2. **read** - Read run data and history
3. **list** - List runs with filtering
4. **resume** - Continue execution from a run
5. **archive** - Move completed runs to archive
6. **analyze** - Extract patterns from run history

## Operation Details

### Create
- Automatically created by pipeline execute operation
- Generates unique ID: `run001`, `run002`, etc.
- Initializes with pipeline reference and parameters
- Creates working directory for logs and outputs
- Returns run ID

### Read
- Returns complete run data including history
- Can read specific task outputs
- Supports filtering by date range
- Includes associated worktree information

### List
- Filter by pipeline ID
- Filter by story/subtask ID
- Filter by state (active, completed, failed)
- Sort by creation date or last activity
- Shows summary statistics

### Resume
- Continues from last completed task
- Or from specified task name
- Reloads context from history
- Handles user task completions
- Updates history with resume marker

### Archive
- Moves completed runs to archive storage
- Maintains reference in database
- Compresses log files
- Preserves for analysis/audit

### Analyze
- Extract common failure patterns
- Calculate task duration statistics
- Identify bottlenecks in pipelines
- Generate improvement recommendations

## Run Data Structure

```json
{
    "id": "run001",
    "pipeline": "project/ppl003",
    "pipelineVersion": "v1.2.3",
    "start": "2025-01-21T10:30:00.000Z",
    "end": "2025-01-21T11:15:00.000Z",
    "state": "completed",
    "path": ".data/project/runs/run001/",
    "worktree": {
        "branch": "story-042-subtask-003",
        "path": "/Users/project/.worktrees/story-042-subtask-003",
        "base": "main",
        "created": "2025-01-21T10:30:00.000Z"
    },
    "runFields": {
        "storyId": "sto042",
        "subtaskId": "sub003",
        "userId": "user001"
    },
    "history": [
        {
            "task": "Initialize Subtask",
            "type": "claude",
            "start": "2025-01-21T10:30:00.000Z",
            "end": "2025-01-21T10:32:00.000Z",
            "action": "Ready",
            "prompt": "task-001-initialize-prompt.md",
            "log": "task-001-initialize.log",
            "docker": {
                "containerId": "abc123def456",
                "image": "docker-claude:latest",
                "exitCode": 0
            },
            "outputs": {
                "filesCreated": ["src/auth.ts", "test/auth.test.ts"],
                "filesModified": ["package.json"]
            }
        },
        {
            "task": "Developer Review",
            "type": "user",
            "start": "2025-01-21T10:45:00.000Z",
            "end": "2025-01-21T11:00:00.000Z",
            "action": "Approve",
            "assignee": "user001",
            "notes": "Looks good, minor suggestions added as comments"
        }
    ],
    "metadata": {
        "totalTasks": 8,
        "completedTasks": 8,
        "failedAttempts": 2,
        "userInterventions": 1,
        "dockerExecutions": 6,
        "totalDuration": "45m"
    }
}
```

## History Entry Structure

### Common Fields
- `task` - Task name from pipeline definition
- `type` - Task type (claude, user, review, test, end)
- `start` - ISO timestamp when task began
- `end` - ISO timestamp when task completed
- `action` - Selected action/transition
- `error` - Error message if task failed

### Claude Task Fields
- `prompt` - Filename of generated prompt
- `log` - Filename of execution log
- `docker` - Container execution details
- `outputs` - Files created/modified

### User Task Fields
- `assignee` - User who completed the task
- `notes` - Feedback or comments
- `attachments` - Associated files

### Test Task Fields
- `command` - Test command executed
- `results` - Test output summary
- `coverage` - Code coverage if available

## Worktree Branch Association

### Branch Creation
- Automatic creation for story/subtask pipelines
- Named pattern: `story-{id}-subtask-{id}`
- Based on story branch or main
- Isolated work environment

### Branch Management
```json
"worktree": {
    "branch": "story-042-subtask-003",
    "path": "/Users/project/.worktrees/story-042-subtask-003",
    "base": "story-042",
    "created": "2025-01-21T10:30:00.000Z",
    "commits": [
        {
            "hash": "abc123",
            "message": "Add authentication module",
            "timestamp": "2025-01-21T10:35:00.000Z"
        }
    ],
    "status": "active"
}
```

### Merge Back
- On successful completion
- Conflict detection
- Automatic or manual merge
- Update story branch

## User Task Resumption

### Marking Complete
```json
{
    "taskName": "Developer Review",
    "action": "Approve",
    "notes": "Fixed the edge case in error handling",
    "filesChanged": ["src/auth.ts"],
    "timeSpent": "15m"
}
```

### Resumption Context
- Reload previous task outputs
- Restore worktree state
- Continue parameter propagation
- Maintain execution chain

## Docker Execution Logs

### Container Tracking
```json
"docker": {
    "containerId": "abc123def456",
    "image": "docker-claude:latest",
    "started": "2025-01-21T10:30:00.000Z",
    "finished": "2025-01-21T10:32:00.000Z",
    "exitCode": 0,
    "mounts": [
        "/Users/project/.worktrees/story-042:/workspace"
    ],
    "environment": {
        "STORY_ID": "042",
        "SUBTASK_ID": "003"
    },
    "resources": {
        "cpuUsage": "45%",
        "memoryUsage": "512MB",
        "duration": "2m"
    }
}
```

### Log Capture
- Stdout to task log file
- Stderr to error log
- Container events logged
- Resource usage tracked

## Story/Subtask State Tracking

### State Propagation
```json
"stateUpdates": [
    {
        "timestamp": "2025-01-21T10:32:00.000Z",
        "entity": "subtask",
        "id": "sub003",
        "oldState": "in-progress",
        "newState": "review",
        "trigger": "task-complete"
    },
    {
        "timestamp": "2025-01-21T11:15:00.000Z",
        "entity": "story",
        "id": "sto042",
        "oldState": "in-progress",
        "newState": "review",
        "trigger": "all-subtasks-complete"
    }
]
```

### Progress Tracking
- Subtask completion percentage
- Story completion criteria
- Dependency tracking
- Milestone achievements

## File Organization

### Directory Structure
```
.data/project/runs/
├── run001/
│   ├── data.json                          # Run metadata
│   ├── task-001-initialize-prompt.md      # Generated prompts
│   ├── task-001-initialize.log            # Execution logs
│   ├── task-002-write-tests-prompt.md
│   ├── task-002-write-tests.log
│   └── artifacts/                         # Additional outputs
│       ├── test-results.json
│       └── coverage-report.html
├── run002/
└── archive/
    └── 2025-01/
        └── run001.tar.gz
```

### Log Naming Convention
- Pattern: `task-{number}-{name}-{type}.{ext}`
- Number: Zero-padded sequence (001, 002)
- Name: Kebab-case task name
- Type: prompt, log, error, output
- Extension: md, log, json, txt

## Resumption Model

### Checkpoint Strategy
- Save after each task completion
- Capture state before user tasks
- Store rollback points
- Enable partial reruns

### Context Restoration
```json
"resumption": {
    "fromTask": "Review Implementation",
    "resumedAt": "2025-01-21T14:00:00.000Z",
    "reason": "User intervention required",
    "context": {
        "continue": true,
        "previousAttempts": 2,
        "feedback": "Address the performance issue"
    }
}
```

### Failure Recovery
- Automatic retry with backoff
- Skip to next task option
- Rollback to checkpoint
- Manual intervention request

## Example: Do/Review Cycle Run

```json
{
    "id": "run042",
    "pipeline": "project/ppl001",
    "state": "active",
    "runFields": {
        "storyId": "sto015",
        "subtaskId": "sub003"
    },
    "history": [
        {
            "task": "Code Implementation",
            "type": "claude",
            "start": "2025-01-21T10:00:00.000Z",
            "end": "2025-01-21T10:15:00.000Z",
            "action": "Complete",
            "outputs": {
                "filesCreated": ["src/feature.ts"],
                "testsWritten": 5
            }
        },
        {
            "task": "Check Complete",
            "type": "claude",
            "start": "2025-01-21T10:15:00.000Z",
            "end": "2025-01-21T10:16:00.000Z",
            "action": "Review",
            "analysis": "All requirements met, ready for review"
        },
        {
            "task": "Review Implementation",
            "type": "review",
            "start": "2025-01-21T10:16:00.000Z",
            "end": "2025-01-21T10:25:00.000Z",
            "action": "RequestChanges",
            "feedback": [
                "Add error handling for edge case",
                "Improve variable naming",
                "Add JSDoc comments"
            ]
        },
        {
            "task": "Address Feedback",
            "type": "claude",
            "start": "2025-01-21T10:25:00.000Z",
            "end": "2025-01-21T10:35:00.000Z",
            "action": "Complete",
            "changes": [
                "Added try-catch blocks",
                "Renamed variables for clarity",
                "Added comprehensive JSDoc"
            ]
        },
        {
            "task": "Review Implementation",
            "type": "review",
            "start": "2025-01-21T10:35:00.000Z",
            "end": "2025-01-21T10:40:00.000Z",
            "action": "Approve",
            "notes": "All feedback addressed satisfactorily"
        }
    ],
    "metadata": {
        "reviewCycles": 2,
        "totalChanges": 15,
        "linesAdded": 150,
        "linesRemoved": 30
    }
}