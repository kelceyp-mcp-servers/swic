# Pipelines

State machine orchestration for multi-step processes, serving as the execution engine for stories and subtasks.

## Overview

Pipelines are JSON documents that define state machines with task definitions (states) and action definitions (transitions). They orchestrate the complete development lifecycle including coding, review cycles, testing, and user interactions. Pipelines execute in isolated docker-claude environments with worktree branch management for clean separation of work.

## Operations

1. **create** - Create a new pipeline
2. **read** - Read an existing pipeline
3. **edit** - Modify an existing pipeline (4 variants)
4. **delete** - Remove a pipeline from working copy
5. **list** - List all pipelines with synopsis
6. **execute** - Start a new pipeline execution (creates run)
7. **resume** - Continue pipeline from a specific task

## Compatible With

1. **search** - Full-text search across pipelines
2. **validate** - Check pipeline structure and references

## Operation Details

### Create
- Requires Method 1 addressing: `scope + type + path + name`
- Generates a unique ID (e.g., `ppl001`)
- Validates JSON structure and task references
- Returns the generated ID

### Read
- Supports full addressing (both Method 1 and Method 2)
- Returns the complete pipeline JSON document
- Version can be specified to read historical versions

### Edit
- Supports latest version addressing only
- Four variants using `EditOp` (same as cartridges)
- Validates JSON structure after edit
- Atomic write via file renaming

### Delete
- Stores the last version for recovery
- Removes from 'working copy' only
- Associated runs remain for audit trail

### List
- Provides a list of all pipelines in the scope
- Includes description from pipeline map
- Shows usage count from runs

### Execute
- Takes pipeline ID/path and initial parameters
- Creates new run with unique ID
- Starts docker-claude container if first task is AI
- Returns run ID for tracking

### Resume
- Takes run ID and optional task name
- Continues from last completed task or specified task
- Reloads context from run history
- Handles user task completion

## Pipeline Map Structure

```json
{
    "description": "Human-readable pipeline description",
    "startTaskDefinition": "First Task Name",
    "runFields": {
        "storyId": {
            "type": "string",
            "description": "Story identifier",
            "required": true
        },
        "subtaskId": {
            "type": "string",
            "description": "Subtask identifier",
            "required": false
        }
    },
    "taskDefinitions": {
        "First Task Name": {
            "type": "claude",
            "promptTemplatePath": "shared/tpl003",
            "promptParams": {
                "continue": {
                    "type": "boolean",
                    "description": "Continue from previous",
                    "required": false
                }
            },
            "dockerConfig": {
                "image": "docker-claude:latest",
                "worktree": true,
                "mounts": ["/Users/project:/workspace"]
            },
            "actions": {
                "Complete": {
                    "target": "Review Task",
                    "choose": "when implementation is complete"
                },
                "Continue": {
                    "target": "First Task Name",
                    "args": "--continue=true",
                    "choose": "when more work needed"
                }
            }
        }
    }
}
```

## Task Types

### claude
- Executes in docker-claude container
- Can mount worktree branch as volume
- Supports three prompt specifications
- Captures output to run log
- Parses action from output

### user
- Creates task for human completion
- Pipeline pauses until marked complete
- Can include instructions/checklist
- Supports deadline/reminder metadata
- Resumes when user signals completion

### review
- Special claude or user task for reviews
- Can access previous task outputs
- Supports approval/rejection flows
- May trigger rework cycles

### test
- Executes test suites
- Can be dockerized or native
- Pass/fail determines next action
- Captures test results to run

### end
- Terminates pipeline execution
- Updates run completion time
- Can trigger parent pipeline continuation
- May update story/subtask state

## Prompt Specifications

Claude tasks support three methods for specifying prompts:

### promptTemplatePath
- References a template by ID: `"shared/tpl003"`
- Template is rendered with parameters
- Supports full Handlebars syntax
- Most flexible approach

### promptTemplate
- Inline template content in pipeline
- Supports parameter substitution
- Good for simple, pipeline-specific prompts
- Uses same Handlebars support as templates

### prompt
- Direct prompt content without substitution
- Simplest option for static prompts
- No parameter processing

## Docker-Claude Integration

### Container Management
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

### Worktree Management
- Automatic branch creation for subtasks
- Isolated work environment per task
- Clean merging back to story branch
- Conflict detection and resolution

### Execution Isolation
- Each AI task runs in fresh container
- No state pollution between tasks
- Consistent environment setup
- Resource limits configurable

## Story/Subtask Context

### Story Pipelines
- Initialize story structure
- Create subtask pipelines
- Aggregate subtask completions
- Handle story state transitions
- Generate story documentation

### Subtask Pipelines
- Standard do/review cycles
- TDD implementation flow
- Integration with story context
- Completion triggers story updates

### Context Propagation
- Story ID flows to all subtasks
- Subtask state affects story state
- Parent-child pipeline relationships
- Shared knowledge via cartridges

## Do/Review Cycle Pattern

Standard pipeline pattern for development:

```json
{
    "taskDefinitions": {
        "Code Implementation": {
            "type": "claude",
            "promptTemplatePath": "shared/do-subtask",
            "actions": {
                "Complete": { "target": "Check Complete" }
            }
        },
        "Check Complete": {
            "type": "claude",
            "promptTemplatePath": "shared/check-complete",
            "actions": {
                "Continue": {
                    "target": "Code Implementation",
                    "args": "--continue=true"
                },
                "Review": { "target": "Review Implementation" }
            }
        },
        "Review Implementation": {
            "type": "review",
            "promptTemplatePath": "shared/review-code",
            "actions": {
                "Approve": { "target": "Complete Subtask" },
                "RequestChanges": { "target": "Address Feedback" }
            }
        },
        "Address Feedback": {
            "type": "claude",
            "promptTemplatePath": "shared/address-feedback",
            "actions": {
                "Complete": { "target": "Review Implementation" }
            }
        },
        "Complete Subtask": {
            "type": "end"
        }
    }
}
```

## User Task Handling

### Task Assignment
```json
"Architectural Review": {
    "type": "user",
    "assignee": "{story.architect}",
    "instructions": "Review the proposed architecture in worktree branch {branch}",
    "checklist": [
        "Verify separation of concerns",
        "Check error handling",
        "Validate API contracts"
    ],
    "deadline": "24h",
    "actions": {
        "Approve": { "target": "Implement Design" },
        "RequestChanges": { "target": "Revise Design" }
    }
}
```

### Resumption
- User signals completion via CLI/MCP
- Provides action selection
- May include feedback/notes
- Pipeline continues with selected action

## Front Matter

Pipelines support optional YAML front matter:

```yaml
---
type: story | subtask | utility | deployment
category: development | review | testing | documentation
tags: [tdd, refactoring, feature]
synopsis: "Brief pipeline description"
---
```

## Write Protection

Pipelines are not write-protectable in this specification. System pipelines may be protected in future versions.

## Example: Subtask Development Pipeline

```json
{
    "description": "Complete development cycle for a story subtask",
    "startTaskDefinition": "Initialize Subtask",
    "runFields": {
        "storyId": { "type": "string", "required": true },
        "subtaskId": { "type": "string", "required": true }
    },
    "taskDefinitions": {
        "Initialize Subtask": {
            "type": "claude",
            "promptTemplatePath": "shared/init-subtask",
            "dockerConfig": {
                "worktree": true,
                "branch": "story-{storyId}-subtask-{subtaskId}"
            },
            "actions": {
                "Ready": { "target": "Write Tests" }
            }
        },
        "Write Tests": {
            "type": "claude",
            "promptTemplatePath": "shared/write-tests",
            "actions": {
                "Complete": { "target": "Run Tests" }
            }
        },
        "Run Tests": {
            "type": "test",
            "command": "npm test",
            "actions": {
                "Pass": { "target": "Complete Subtask" },
                "Fail": { "target": "Implement Code" }
            }
        },
        "Implement Code": {
            "type": "claude",
            "promptTemplatePath": "shared/implement-code",
            "promptParams": {
                "continue": { "type": "boolean", "required": false }
            },
            "actions": {
                "Complete": { "target": "Run Tests" },
                "NeedHelp": { "target": "Developer Review" }
            }
        },
        "Developer Review": {
            "type": "user",
            "instructions": "Review implementation and provide guidance",
            "actions": {
                "Resolved": { "target": "Implement Code", "args": "--continue=true" },
                "TakeOver": { "target": "Complete Subtask" }
            }
        },
        "Complete Subtask": {
            "type": "end",
            "updateState": {
                "subtask": "complete",
                "story": "check-if-all-subtasks-complete"
            }
        }
    }
}