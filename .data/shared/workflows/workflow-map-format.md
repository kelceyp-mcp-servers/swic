---
synopsis: 
  - Knowledge cartridge
  - Detailed JSON structure specification for workflow maps
  - Field definitions, validation rules, and design patterns
  - Complete examples and common workflow patterns
  - Integration with prompt system templates and parameters
  - Best practices for creating robust workflow maps
---

# Workflow Map Format

## Audience
AI agents and developers creating workflow maps for the workflow orchestration system. This cartridge provides detailed JSON structure specifications, validation rules, and design patterns for building effective workflow maps.

## Abstract
Workflow maps are JSON files that define state machines with task definitions (states) and action definitions (transitions). This cartridge provides comprehensive guidance on the JSON structure, field specifications, validation requirements, and design patterns for creating robust workflow maps that integrate with the workflow orchestration system.

## Overview

Workflow maps serve as the blueprint for multi-step processes in the workflow orchestration system. They define:
- **What work can be performed** (task definitions)
- **How tasks connect together** (action definitions)
- **What data flows through the workflow** (workslip fields)
- **Where the workflow begins** (start task definition)

A well-designed workflow map balances several concerns:
- **Clarity**: Clear task names and action choices that agents can understand
- **Flexibility**: Action definitions that provide meaningful decision points
- **Resilience**: Error handling and resumption capabilities
- **Integration**: Proper use of existing prompt templates and parameters

## JSON Structure Specification

### Root Object

```json
{
    "description": "string (required)",
    "startTaskDefinition": "string (required)",
    "workslipFields": "object (optional)",
    "taskDefinitions": "object (required)"
}
```

#### Root Fields

**description** (string, required)
- Human-readable description of what this workflow accomplishes
- Used for documentation and workflow selection
- Should be clear and concise (1-2 sentences)

**startTaskDefinition** (string, required)
- Name of the task definition that begins workflow execution
- Must match a key in the taskDefinitions object
- Case-sensitive string matching

**workslipFields** (object, optional)
- Defines input parameters required for workflow execution
- Each field becomes available to all tasks as template parameters
- Used for validation before workflow execution begins

**taskDefinitions** (object, required)
- Collection of all task definitions in the workflow
- Keys are task names (used for referencing)
- Values are task definition objects

### Workslip Fields Structure

```json
"workslipFields": {
    "fieldName": {
        "type": "string|number|boolean",
        "description": "string (required)",
        "required": true|false
    }
}
```

#### Field Specification

**type** (string, required)
- Data type for validation and coercion
- Supported values: "string", "number", "boolean"
- Used by workflow script for parameter validation

**description** (string, required)
- Human-readable explanation of the field's purpose
- Used in error messages and documentation
- Should be clear and specific

**required** (boolean, required)
- Whether this field must be provided when starting the workflow
- Missing required fields cause workflow execution to fail
- Optional fields can be omitted from command line

#### Common Workslip Field Patterns

```json
"workslipFields": {
    "storyId": {
        "type": "string",
        "description": "The story identifier",
        "required": true
    },
    "subtaskId": {
        "type": "string",
        "description": "The subtask identifier",
        "required": true
    },
    "continue": {
        "type": "boolean",
        "description": "Whether to continue from previous session",
        "required": false
    }
}
```

### Task Definition Structure

```json
"taskDefinitions": {
    "Task Name": {
        "type": "claude|end",
        "promptTemplatePath": "string (conditional)",
        "promptTemplatePath": "string (conditional)",
        "prompt": "string (conditional)",
        "promptParams": "object (optional)",
        "actions": "object (conditional)"
    }
}
```

#### Task Definition Fields

**type** (string, required)
- Defines how this task is executed
- "claude": Executes Claude process with prompt specification
- "end": Terminates workflow execution

**promptTemplatePath** (string, conditional for claude tasks)
- Path to prompt template file relative to project root
- Must exist and be readable by the workflow system
- Uses existing prompt system templates with variable substitution
- Mutually exclusive with `promptTemplate` and `prompt`

**promptTemplate** (string, conditional for claude tasks)
- Inline prompt template content with variable substitution support
- Supports same variable substitution as file-based templates
- Mutually exclusive with `promptTemplatePath` and `prompt`

**prompt** (string, conditional for claude tasks)
- Direct prompt content used without variable substitution
- Simpler option for static prompts that don't need parameters
- Mutually exclusive with `promptTemplatePath` and `promptTemplate`

**Prompt Specification Requirements**:
- Exactly one of `promptTemplatePath`, `promptTemplate`, or `prompt` must be specified for claude tasks
- Multiple prompt properties or none will cause validation errors

**promptParams** (object, optional)
- Additional parameters beyond workslip fields
- Merged with workslip fields for prompt generation
- Useful for task-specific flags and options

**actions** (object, required for claude tasks)
- Defines possible transitions from this task
- Keys are action names (selected by Claude)
- Values are action definition objects

### Action Definition Structure

```json
"actions": {
    "Action Name": {
        "target": "string (required)",
        "args": "string (optional)",
        "choose": "string (optional)"
    }
}
```

#### Action Definition Fields

**target** (string, required)
- Name of the task definition to execute next
- Must match a key in the taskDefinitions object
- Case-sensitive string matching

**args** (string, optional)
- Additional command-line style arguments for the target task
- Format: "--param1=value1 --param2=value2"
- Parsed and added to task parameters

**choose** (string, optional)
- Human-readable guidance for when to select this action
- Helps Claude understand the decision criteria
- Appears in prompt templates as context

## Complete Example: Subtask Workflow

```json
{
    "description": "Orchestrate a complete code, review, and update cycle for a story subtask",
    "startTaskDefinition": "Code Subtask",
    "workslipFields": {
        "storyId": {
            "type": "string",
            "description": "The story identifier",
            "required": true
        },
        "subtaskId": {
            "type": "string",
            "description": "The subtask identifier",
            "required": true
        }
    },
    "taskDefinitions": {
        "Code Subtask": {
            "type": "claude",
            "promptTemplatePath": ".sdlc/prompts/system/code-subtask.md",
            "promptParams": {
                "continue": {
                    "type": "boolean",
                    "description": "Whether continuing from previous session",
                    "required": false
                }
            },
            "actions": {
                "Complete": {
                    "target": "Check Code Complete"
                }
            }
        },
        "Check Code Complete": {
            "type": "claude",
            "promptTemplatePath": ".sdlc/prompts/system/check-coding-complete.md",
            "actions": {
                "Continue Code Subtask": {
                    "target": "Code Subtask",
                    "args": "--continue=true",
                    "choose": "if the work is not complete"
                },
                "Start Review Work": {
                    "target": "Review Work",
                    "choose": "if the work is complete"
                }
            }
        },
        "Review Work": {
            "type": "claude",
            "promptTemplatePath": ".sdlc/prompts/system/review-work.md",
            "promptParams": {
                "continue": {
                    "type": "boolean",
                    "description": "Whether continuing review from previous session",
                    "required": false
                }
            },
            "actions": {
                "Complete": {
                    "target": "Check Review Complete"
                }
            }
        },
        "Check Review Complete": {
            "type": "claude",
            "promptTemplatePath": ".sdlc/prompts/system/check-review-complete.md",
            "actions": {
                "Continue Review Work": {
                    "target": "Review Work",
                    "args": "--continue=true",
                    "choose": "if the review is not complete"
                },
                "Start Review Feedback": {
                    "target": "Review Feedback",
                    "choose": "if the review is complete but there is feedback to address"
                },
                "Report Completion": {
                    "target": "Report Subtask Completion",
                    "choose": "if the review is complete and the work is satisfactory"
                }
            }
        },
        "Review Feedback": {
            "type": "claude",
            "promptTemplatePath": ".sdlc/prompts/system/review-feedback.md",
            "actions": {
                "Plan New Work": {
                    "target": "Plan New Work",
                    "choose": "if feedback requires additional implementation"
                },
                "Report Completion": {
                    "target": "Report Subtask Completion",
                    "choose": "if feedback has been adequately addressed"
                }
            }
        },
        "Plan New Work": {
            "type": "claude",
            "promptTemplatePath": ".sdlc/prompts/system/plan-new-work.md",
            "actions": {
                "Continue Coding": {
                    "target": "Code Subtask",
                    "choose": "if planning is complete and coding should continue"
                }
            }
        },
        "Report Subtask Completion": {
            "type": "claude",
            "promptTemplatePath": ".sdlc/prompts/system/report-subtask-complete.md",
            "actions": {
                "Complete": {
                    "target": "End Workflow"
                }
            }
        },
        "End Workflow": {
            "type": "end"
        }
    }
}
```

## Prompt Specification Examples

### Example: File-based Template (promptTemplatePath)
```json
{
    "Code Review": {
        "type": "claude",
        "promptTemplatePath": ".sdlc/prompts/system/code-review.md",
        "promptParams": {
            "focus": {
                "type": "string",
                "description": "Specific review focus area",
                "required": false
            }
        },
        "actions": {
            "Approve": { "target": "Merge Code" },
            "Request Changes": { "target": "Address Feedback" }
        }
    }
}
```

### Example: Inline Template (promptTemplate)
```json
{
    "Quick Check": {
        "type": "claude",
        "promptTemplate": "Review story ${storyId} subtask ${subtaskId}.\n\nCheck if all requirements are met:\n- Code compiles\n- Tests pass\n- Documentation updated\n\nRespond with:\nACTION: Complete (if all requirements met)\nACTION: Continue (if work remains)",
        "promptParams": {
            "checklist": {
                "type": "string",
                "description": "Additional checklist items",
                "required": false
            }
        },
        "actions": {
            "Complete": { "target": "Mark Done" },
            "Continue": { "target": "Resume Work" }
        }
    }
}
```

### Example: Direct Prompt (prompt)
```json
{
    "Final Notification": {
        "type": "claude",
        "prompt": "The workflow has completed successfully. All tasks have been executed and the story is ready for deployment. Please acknowledge the completion and provide any final observations.",
        "actions": {
            "Acknowledge": { "target": "End Workflow" }
        }
    }
}
```

## Design Patterns

### Linear Workflow Pattern

For simple sequential processes:

```json
{
    "description": "Linear process with sequential steps",
    "startTaskDefinition": "Step One",
    "taskDefinitions": {
        "Step One": {
            "type": "claude",
            "promptTemplatePath": ".sdlc/prompts/system/step-one.md",
            "actions": {
                "Complete": {
                    "target": "Step Two"
                }
            }
        },
        "Step Two": {
            "type": "claude",
            "promptTemplatePath": ".sdlc/prompts/system/step-two.md",
            "actions": {
                "Complete": {
                    "target": "End Workflow"
                }
            }
        },
        "End Workflow": {
            "type": "end"
        }
    }
}
```

### Work-Check-Continue Pattern

For tasks that may need multiple iterations:

```json
{
    "Work Task": {
        "type": "claude",
        "promptTemplatePath": ".sdlc/prompts/system/do-work.md",
        "promptParams": {
            "continue": {
                "type": "boolean",
                "description": "Whether continuing from previous session",
                "required": false
            }
        },
        "actions": {
            "Complete": {
                "target": "Check Work Complete"
            }
        }
    },
    "Check Work Complete": {
        "type": "claude",
        "promptTemplatePath": ".sdlc/prompts/system/check-work-complete.md",
        "actions": {
            "Continue Work": {
                "target": "Work Task",
                "args": "--continue=true",
                "choose": "if the work is not yet complete"
            },
            "Move to Next Phase": {
                "target": "Next Phase Task",
                "choose": "if the work is complete"
            }
        }
    }
}
```

### Decision Branch Pattern

For workflows with multiple possible paths:

```json
{
    "Evaluation Task": {
        "type": "claude",
        "promptTemplatePath": ".sdlc/prompts/system/evaluate-situation.md",
        "actions": {
            "Path A": {
                "target": "Handle Path A",
                "choose": "if condition A is met"
            },
            "Path B": {
                "target": "Handle Path B",
                "choose": "if condition B is met"
            },
            "Path C": {
                "target": "Handle Path C",
                "choose": "if neither condition A nor B is met"
            }
        }
    }
}
```

### Error Recovery Pattern

For handling failures and resumption:

```json
{
    "Risky Task": {
        "type": "claude",
        "promptTemplatePath": ".sdlc/prompts/system/risky-operation.md",
        "actions": {
            "Success": {
                "target": "Continue Normal Flow",
                "choose": "if the operation succeeded"
            },
            "Recoverable Error": {
                "target": "Error Recovery Task",
                "choose": "if there was an error that can be fixed"
            },
            "Fatal Error": {
                "target": "Error Reporting Task",
                "choose": "if there was an unrecoverable error"
            }
        }
    },
    "Error Recovery Task": {
        "type": "claude",
        "promptTemplatePath": ".sdlc/prompts/system/recover-from-error.md",
        "actions": {
            "Retry": {
                "target": "Risky Task",
                "choose": "if the error has been addressed"
            },
            "Escalate": {
                "target": "Error Reporting Task",
                "choose": "if the error cannot be resolved"
            }
        }
    }
}
```

## Validation Rules

### Required Structure Validation

1. **Root object must contain**:
   - `description` (non-empty string)
   - `startTaskDefinition` (non-empty string)
   - `taskDefinitions` (non-empty object)

2. **startTaskDefinition must reference valid task**:
   - Value must be a key in taskDefinitions object
   - Case-sensitive matching

3. **Task definitions must be valid**:
   - Each task must have a valid `type` field
   - Claude tasks must have exactly one prompt specification field
   - Claude tasks should have `actions` field (unless terminal)

4. **Prompt specification validation**:
   - Claude tasks must specify exactly one of: `promptTemplatePath`, `promptTemplate`, or `prompt`
   - Multiple prompt properties will cause validation errors
   - No prompt properties will cause validation errors
   - End tasks cannot have prompt properties

### Cross-Reference Validation

1. **Action targets must be valid**:
   - All action `target` values must reference existing task definitions
   - No dangling references allowed

2. **Prompt templates must exist**:
   - All `promptTemplate` paths should reference existing files
   - Paths are relative to project root

3. **Parameter consistency**:
   - promptParams should not conflict with workslipFields names
   - Type specifications should be consistent

### Best Practice Validation

1. **Naming conventions**:
   - Task names should be descriptive and action-oriented
   - Action names should indicate the decision or outcome
   - Field names should use camelCase

2. **Flow completeness**:
   - All non-end tasks should have actions
   - Should include at least one path to an end task
   - Avoid infinite loops without progression

## Common Mistakes and Solutions

### Missing End Tasks

**Problem**: Workflow has no clear termination point
```json
// ❌ Bad: No way to end the workflow
"actions": {
    "Continue": {
        "target": "Same Task"
    }
}
```

**Solution**: Always provide a path to completion
```json
// ✅ Good: Clear termination path
"actions": {
    "Continue": {
        "target": "Same Task",
        "choose": "if work is not complete"
    },
    "Complete": {
        "target": "End Workflow",
        "choose": "if work is complete"
    }
}
```

### Ambiguous Action Choices

**Problem**: Action choices are unclear or overlapping
```json
// ❌ Bad: Ambiguous decision criteria
"actions": {
    "Option A": {
        "target": "Task A"
    },
    "Option B": {
        "target": "Task B"
    }
}
```

**Solution**: Provide clear decision criteria
```json
// ✅ Good: Clear decision guidance
"actions": {
    "Success Path": {
        "target": "Success Task",
        "choose": "if the operation completed successfully"
    },
    "Error Path": {
        "target": "Error Task",
        "choose": "if there were errors or failures"
    }
}
```

### Missing Continue Parameters

**Problem**: No way to resume interrupted work
```json
// ❌ Bad: No resumption capability
"Work Task": {
    "type": "claude",
    "promptTemplatePath": ".sdlc/prompts/system/do-work.md"
}
```

**Solution**: Add continue parameter for resumption
```json
// ✅ Good: Supports resumption
"Work Task": {
    "type": "claude",
    "promptTemplatePath": ".sdlc/prompts/system/do-work.md",
    "promptParams": {
        "continue": {
            "type": "boolean",
            "description": "Whether continuing from previous session",
            "required": false
        }
    }
}
```

### Overly Complex Single Tasks

**Problem**: Single task trying to do too much
```json
// ❌ Bad: Task is too complex
"Do Everything": {
    "type": "claude",
    "promptTemplatePath": ".sdlc/prompts/system/do-everything.md",
    "actions": {
        "Done": {
            "target": "End Workflow"
        }
    }
}
```

**Solution**: Break into smaller, focused tasks
```json
// ✅ Good: Focused, composable tasks
"Analyze Requirements": {
    "type": "claude",
    "promptTemplatePath": ".sdlc/prompts/system/analyze-requirements.md",
    "actions": {
        "Start Implementation": {
            "target": "Implement Solution"
        }
    }
},
"Implement Solution": {
    "type": "claude",
    "promptTemplatePath": ".sdlc/prompts/system/implement-solution.md",
    "actions": {
        "Start Testing": {
            "target": "Test Solution"
        }
    }
}
```

## File Organization

### Naming Conventions

```
.sdlc/workflows/system/
├── do-subtask-map.json          # Primary subtask workflow
├── review-only-map.json         # Review-focused workflow
├── plan-story-map.json          # Story planning workflow
└── retrospective-map.json       # Retrospective analysis workflow

.sdlc/workflows/project/
├── deploy-release-map.json      # Project-specific deployment
├── setup-environment-map.json  # Environment setup workflow
└── migrate-data-map.json        # Data migration workflow
```

### Storage Location Rules

**System workflows** (`.sdlc/workflows/system/`):
- Reusable across all projects
- Core development processes
- Standard agent coordination patterns

**Shared workflows** (`.sdlc/workflows/shared/`):
- General patterns applicable to many projects
- Language or framework-specific workflows
- Common development tasks

**Project workflows** (`.sdlc/workflows/project/`):
- Specific to the current project
- Custom business logic or processes
- Project-specific integrations

## Integration with Prompt System

### Parameter Flow

Workflow maps integrate with the prompt system through parameter flow:

1. **Workslip fields** → Available in all task prompts
2. **Task promptParams** → Additional parameters for specific tasks
3. **Action args** → Override or supplement parameters for target tasks

### Template Requirements

Prompt templates used in workflow maps should:

1. **Include YAML front-matter** with parameter definitions
2. **Use ${paramName} syntax** for parameter substitution
3. **Support continue parameter** for resumption scenarios
4. **Provide clear action guidance** to help Claude select transitions

### Example Integration

```json
"Code Subtask": {
    "type": "claude",
    "promptTemplatePath": ".sdlc/prompts/system/code-subtask.md",
    "promptParams": {
        "continue": {
            "type": "boolean",
            "description": "Whether continuing from previous session",
            "required": false
        }
    }
}
```

Corresponding prompt template:
```markdown
---
parameters:
  storyId:
    required: true
    type: string
    description: "Story identifier"
  subtaskId:
    required: true
    type: string
    description: "Subtask identifier"
  continue:
    required: false
    type: boolean
    description: "Whether continuing from previous session"
---

# Code Subtask ${storyId}-${subtaskId}

${continue ? 'Continue working on' : 'Begin work on'} the subtask...

When complete, respond with:
ACTION: Complete
```

## Maintenance and Evolution

### When to Update Workflow Maps

- **New task patterns emerge** from successful agent coordination
- **Error scenarios are discovered** that need better handling
- **Prompt templates change** and require parameter updates
- **Integration points evolve** with other system components

### Versioning Strategy

Since workflow maps are part of the manual system:
- Use git history for version tracking
- Create new maps rather than modifying existing ones when making major changes
- Document breaking changes in commit messages
- Test workflow maps thoroughly before replacing existing ones

### Migration Considerations

As the system evolves toward automation:
- Workflow map patterns will inform database schema design
- JSON structure will influence REST API design
- Action selection patterns will guide UI workflow builders
- Parameter flow will inform automated template generation

This detailed specification provides the foundation for creating robust, maintainable workflow maps that integrate effectively with the broader workflow orchestration system.