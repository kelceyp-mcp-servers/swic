---
synopsis: 
  - Knowledge cartridge
  - Workflow orchestration with maps and workslips
  - State machine execution replacing script loops
  - Task and action definition patterns
  - Workslip state management and resumption capabilities
  - Integration with prompt system and SDLC scripts
---

# Workflow System

## Audience
AI agents and developers using the workflow orchestration system to execute complex multi-step processes with proper error handling, resumption capabilities, and structured state management.

## Abstract
The workflow orchestration system provides a more robust alternative to brittle script loops with a structured state machine approach that provides better control, auditability, and resilience for multi-step development processes. It uses workflow maps (JSON definitions) and workslips (execution instances) to orchestrate agent tasks with proper state transitions and resumption capabilities.

## Overview

The workflow system is an orchestration framework that enables structured execution of multi-step processes. Built around the core scripts `workflow.ts` and `task.ts`, it provides a state machine approach to replace the rigid loops currently used for coordinating agent work.

This system is part of the **manual workflow** that we're evolving toward the automated MCP Stories unified server. While transitional, it provides immediate value through:
- Structured state machine execution instead of brittle script loops
- Complete execution history capture in workslips
- Resumption capability from any point of failure or interruption
- Integration with existing prompt templates

## Core Components

### Workflow Maps

**Workflow maps** are JSON files that define state machines with states (task definitions) and transitions (action definitions). They serve as the blueprint for what work can be performed and how tasks connect together.

#### Key Components

**workslipFields**: Define input parameters required for workflow execution (storyId, subtaskId, etc.)

**taskDefinitions**: Define work units with types ('claude' or 'end'), prompt templates, and action transitions

**startTaskDefinition**: Identifies which task begins execution when the workflow runs

**📖 For detailed JSON structure, field specifications, validation rules, and design patterns, see @.sdlc/cartridges/system/workflow-map-format.md**

### Workslips

**Workslips** are execution instances that capture what actually happened during a workflow run. They provide complete auditability and enable resumption from any point.

#### Directory Structure
```
.sdlc/workslips/system/do-subtask-slips/
└── slip-001/
    ├── data.json                               # Workslip metadata and execution history
    ├── task-001-code-subtask-prompt.md         # Generated prompts for each task
    ├── task-001-code-subtask.log               # Claude output from each task
    ├── task-002-check-code-complete-prompt.md
    ├── task-002-check-code-complete.log
    └── ...
```

#### data.json Structure
```json
{
    "map": ".sdlc/workflows/system/do-subtask-map.json",
    "start": "2025-01-21T10:30:00.000Z",
    "end": "2025-01-21T11:15:00.000Z",
    "path": ".sdlc/workslips/system/do-subtask-slips/slip-001/",
    "workslipFields": {
        "storyId": "37",
        "subtaskId": "98"
    },
    "history": [
        {
            "name": "Code Subtask",
            "start": "2025-01-21T10:30:00.000Z",
            "end": "2025-01-21T10:45:00.000Z",
            "action": "Complete",
            "prompt": "task-001-code-subtask-prompt.md",
            "log": "task-001-code-subtask.log"
        }
    ]
}
```

The history array captures the complete execution path, including:
- Task names and execution times
- Actions selected (transition decisions)
- File references for prompts and logs
- Complete auditability of what happened

### Core Scripts

#### workflow.ts - Orchestration Entry Point

The main entry point for workflow execution:

```bash
# Execute a workflow from a workflow map
bun workflow.ts run --workflowMap=".sdlc/workflows/system/do-subtask-map.json" --storyId=42 --subtaskId=3
```

**Core Functions**:
- Loads and validates workflow maps
- Creates workslip folders with sequential numbering
- Initializes workslip data.json with proper structure
- Executes the first task by calling task.ts
- Provides comprehensive error handling

#### task.ts - Task Execution Engine

Handles individual workflow task execution with both library and CLI interfaces:

```bash
# CLI usage
bun task.ts run --slip=".sdlc/workslips/system/do-subtask-slips/slip-001/" --taskDefinitionName="Code Subtask"

# Library usage (called by workflow.ts)
await task.run({ workslip, map, taskDefinition });
```

**Core Functions**:
- Generates prompts from templates with parameter substitution
- Executes Claude processes with output capture
- Updates workslip history regardless of success/failure (for resumption)
- Parses action selection from Claude output
- Recursively executes next tasks based on action selection
- Handles 'end' type tasks for workflow completion

## Structure

The workflow system follows the established SDLC patterns. Note git operations in the project repo won't affect shared or system workflows nor any workslips (as they are symlinked to repos outside of the project repo by design)

### Workflow Maps Storage
```
.sdlc/workflows/system/
.sdlc/workflows/shared/
.sdlc/workflows/project/
```

### Workslips Storage
```
# Centralized storage (preserves history across worktrees)
.sdlc/workslips/system/
.sdlc/workslips/shared/
.sdlc/workslips/project/
```

### Scripts Location
```
# Core scripts in system repo
.sdlc/scripts/system/workflow.ts
.sdlc/scripts/system/task.ts
```

## Usage Patterns

### Basic Workflow Execution

```bash
# Execute a complete subtask workflow
bun workflow.ts run \
  --workflowMap=".sdlc/workflows/system/do-subtask-map.json" \
  --storyId=42 \
  --subtaskId=3
```

This command:
1. Loads the workflow map and validates structure
2. Creates a new workslip folder (slip-001, slip-002, etc.)
3. Initializes data.json with provided parameters
4. Begins execution with the startTaskDefinition
5. Continues until workflow completion or failure

### Workflow Resumption

If a workflow fails or is interrupted, it can be resumed from the exact point of failure:

```bash
# Resume a specific task after interruption
bun task.ts run \
  --slip=".sdlc/workslips/system/do-subtask-slips/slip-001/" \
  --taskDefinitionName="Review Work" \
  --continue=true
```

The workslip history enables:
- Precise resumption from any task
- Complete audit trail of what was attempted
- Parameter continuation with state preservation

### Error Handling Patterns

**Claude Process Failures**: Non-zero exit codes are captured in workslip history before throwing errors, enabling resumption analysis.

**Missing Files**: Comprehensive validation with descriptive error messages for workflow maps, prompt templates, and workslip data.

**JSON Parsing**: Robust parsing with syntax error reporting and structure validation.

**File System Operations**: Graceful handling of permission issues, disk space, and directory creation failures.

## Integration Points

### With Prompt System

The workflow system leverages existing prompt templates through the prompt system patterns:

- **Template Reuse**: Workflow tasks reference existing `.sdlc/prompts/` templates
- **Parameter Binding**: Workslip fields automatically become template parameters
- **YAML Front-matter**: Task prompt templates use existing validation patterns
- **Parameter Substitution**: Uses `${paramName}` syntax for dynamic content

### With SDLC Automation Scripts

Workflow maps and workslips are part of the manual system:

- **Directory Structure**: Follows established `.sdlc/` organization patterns
- **Symlink Architecture**: Leverages existing symlink patterns for code reuse
- **Script Patterns**: Follows established CLI patterns and error handling
- **File Operations**: Uses consistent file system manipulation approaches

### With Story Workflow

Workflow orchestration serves specific story workflow needs:

- **Subtask Execution**: `do-subtask` workflows coordinate code/review cycles
- **State Management**: Complements story state tracking with execution detail
- **Quality Gates**: Integrates with existing linting and testing requirements
- **Review Processes**: Supports existing review → done state transitions