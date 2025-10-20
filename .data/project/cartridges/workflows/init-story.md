# Init Story

# Overview
Think carefully, go step by step and read all instructions before starting.

This workflow guides you through initializing a new story by:
1. Determining the story ID
2. Creating the problem statement folder and initial required reading
3. Interviewing the user to understand the problem
4. Creating the problem statement document
5. Updating the required reading
6. Creating the story folder structure

This is a prerequisite for running the `create-spec.md` workflow.

# Required reading
Using `mcp__claw-dev__cartridge_read {scope: "project", name: "{{item}}"}`, read the following:
- glossary.md

# Workflow Steps

## Step 1 - Determine Story ID

Scan the Stories directory to find existing story IDs:
```bash
ls -1 .private/projects/_Users_paulkelcey_Dev_gh_kelceyp-mcp-servers_claw-f7e4d327/Stories/Done/ \
     .private/projects/_Users_paulkelcey_Dev_gh_kelceyp-mcp-servers_claw-f7e4d327/Stories/In-Progress/ \
     .private/projects/_Users_paulkelcey_Dev_gh_kelceyp-mcp-servers_claw-f7e4d327/Stories/To-Do/ 2>/dev/null | \
     grep -E '^[0-9]{3}-' | cut -d'-' -f1 | sort -u
```

Identify the highest existing ID and suggest the next sequential ID (e.g., if you see 002 and 003, suggest 004).

**Ask the user:** "I found stories with IDs: [list]. I suggest using ID **[next-id]** for the new story. Is that correct, or would you like to use a different ID?"

Wait for user response before proceeding. Store the confirmed ID as `{{storyId}}`.

## Step 2 - Create Problem Statement Folder

Create the problem statement folder using bash:

```bash
mkdir -p .private/projects/_Users_paulkelcey_Dev_gh_kelceyp-mcp-servers_claw-f7e4d327/cartridges/problem-statements/story-{{storyId}}
```

## Step 3 - Create Initial Required Reading

Create the initial required-reading.md file with minimal content.

Use `mcp__claw-dev__cartridge_create` with:
- scope: "project"
- name: "problem-statements/story-{{storyId}}/required-reading.md"
- content:

```markdown
The following is required reading for story-{{storyId}} and follow reading links recursively.

For each item below use `mcp__claw-dev__cartridge_read {scope: "project", name: "{{item}}"}` and read each

- glossary.md
```

## Step 4 - Interview User About the Problem

Conduct a turn-by-turn interview to gather information for the problem statement. Ask each question individually and wait for the user's response before moving to the next question.

**Important:** Do NOT ask for a story name. You will infer it from the problem description.

### Question 1: Problem Description
**Ask:** "What is the problem this story aims to solve? Please describe the core issue."

Wait for response. Store as `{{problemDescription}}`.

### Question 2: Context and Background
**Ask:** "What context or background information is relevant to understanding this problem? (e.g., how was it discovered, what led to this, related systems)"

Wait for response. Store as `{{context}}`.

### Question 3: Expected Behavior
**Ask:** "What is the expected or desired behavior? What should happen instead?"

Wait for response. Store as `{{expectedBehavior}}`.

### Question 4: Current Behavior
**Ask:** "What is the current behavior? (If this is a new feature request, you can say 'N/A' or describe what's missing)"

Wait for response. Store as `{{currentBehavior}}`.

### Question 5: Evidence
**Ask:** "Is there any evidence, data, or observations that demonstrate this problem? (e.g., performance metrics, error logs, user reports)"

Wait for response. Store as `{{evidence}}`.

### Question 6: Success Criteria
**Ask:** "What are the success criteria? How will we know when this story is complete?"

Wait for response. Store as `{{successCriteria}}`.

### Question 7: Scope - In Scope
**Ask:** "What is explicitly IN SCOPE for this story? What should be included in the solution?"

Wait for response. Store as `{{inScope}}`.

### Question 8: Scope - Out of Scope
**Ask:** "What is explicitly OUT OF SCOPE for this story? What should be deferred to future work?"

Wait for response. Store as `{{outOfScope}}`.

### Question 9: Related Files
**Ask:** "Are there any specific files, modules, or components that are related to this problem? (If unknown, just say 'unknown')"

Wait for response. Store as `{{relatedFiles}}`.

### Question 10: Additional Notes
**Ask:** "Are there any additional notes, considerations, or context you'd like to capture? (If none, just say 'none')"

Wait for response. Store as `{{additionalNotes}}`.

## Step 5 - Infer Story Name

Based on the problem description provided by the user, create a concise, descriptive story name in kebab-case format.

The story name should:
- Be 2-5 words
- Capture the essence of the problem
- Be suitable for a folder name (lowercase, hyphens only)
- Be clear and descriptive

Examples:
- Problem: "The cartridge_create tool is too slow" → Name: "cartridge-create-performance"
- Problem: "Need ability to read cartridges" → Name: "cartridge-read-feature"
- Problem: "CLI and MCP interfaces don't align" → Name: "cli-mcp-alignment"

Store the inferred name as `{{storyName}}`.

## Step 6 - Create Problem Statement

Using all the information gathered from the interview, create the problem statement document.

Use `mcp__claw-dev__cartridge_create` with:
- scope: "project"
- name: "problem-statements/story-{{storyId}}/story-problem-statement.md"
- content: Follow the format below

### Problem Statement Format

Structure the problem statement following this template (adapt based on the information provided):

```markdown
## Problem Statement: {{brief title based on problemDescription}}

### Problem

{{problemDescription}}

### Context

{{context}}

### Evidence

{{evidence}}

(If no specific evidence was provided, you can omit this section or note "To be gathered during investigation")

### Expected Behavior

{{expectedBehavior}}

### Current Behavior

{{currentBehavior}}

(If N/A, you can omit this section for new features)

### Success Criteria

{{successCriteria}}

(Format as bullet points if multiple criteria were provided)

### Scope

**In Scope:**
{{inScope}}

(Format as bullet points)

**Out of Scope:**
{{outOfScope}}

(Format as bullet points)

### Related Files

{{relatedFiles}}

(Format as bullet points if multiple files listed, or note "To be identified during spec creation")

### Notes

{{additionalNotes}}

(Include any additional context, considerations, or observations)
```

**Important formatting notes:**
- Use markdown formatting throughout
- Convert lists to bullet points where appropriate
- Keep the tone professional and clear
- Focus on describing WHAT the problem is, not HOW to solve it
- Ensure all sections are included even if some are brief

## Step 7 - Update Required Reading

Update the required-reading.md file to include the newly created problem statement.

Use `mcp__claw-dev__cartridge_create` with:
- scope: "project"
- name: "problem-statements/story-{{storyId}}/required-reading.md"
- content:

```markdown
The following is required reading for story-{{storyId}} and follow reading links recursively.

For each item below use `mcp__claw-dev__cartridge_read {scope: "project", name: "{{item}}"}` and read each

- glossary.md
- problem-statements/story-{{storyId}}/story-problem-statement.md
```

## Step 8 - Create Story Folder

Create the story folder in the To-Do directory using bash:

```bash
mkdir -p ".private/projects/_Users_paulkelcey_Dev_gh_kelceyp-mcp-servers_claw-f7e4d327/Stories/To-Do/{{storyId}}-{{storyName}}"
```

Confirm to the user: "Created story folder: `Stories/To-Do/{{storyId}}-{{storyName}}/`"

## Step 9 - Report Completion

After successfully creating all artifacts, report to the user:

```
Story initialization complete!

Story ID: {{storyId}}
Story name: {{storyName}}

📁 Story folder created: Stories/To-Do/{{storyId}}-{{storyName}}/
📄 Problem statement created: problem-statements/story-{{storyId}}/story-problem-statement.md
📄 Required reading created: problem-statements/story-{{storyId}}/required-reading.md

Next steps:
1. You can now run the create-spec workflow to generate a specification
2. Move the story to In-Progress when ready to start work
3. Access via:
   - mcp__claw-dev__cartridge_read {scope: "project", name: "problem-statements/story-{{storyId}}/required-reading.md"}
```

Use `say -v Zoe "Paul"` to get the user's attention.

# Key Principles

1. **One question at a time** - Don't batch questions. Wait for each response before asking the next.
2. **Be conversational** - This is an interview, not a form. Adapt based on user responses.
3. **Capture what's provided** - If the user says "unknown" or gives minimal info, that's fine. Don't force completeness.
4. **No validation** - Trust the user's input. This is a lean process.
5. **No subagents** - You handle this entire workflow directly.
6. **Be explicit** - Show the user what you're creating and where.
7. **Infer intelligently** - Create a meaningful story name from the problem description.

# Notes

- The story starts in the To-Do folder and can be moved to In-Progress or other states as needed
- The required-reading.md starts minimal (just glossary) and grows as story artifacts are created
- The required-reading.md uses recursive reading instruction to ensure full context loading
- The story name is inferred from the problem description, not requested from the user
- Keep this process simple and fast - don't overthink or over-engineer
- Focus on capturing the essential information needed for the create-spec workflow
