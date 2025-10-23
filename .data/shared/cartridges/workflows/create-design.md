# Create Design

# Overview
Think carefully, go step by step and read all instructions before starting.

For this session you will supervise the construction (i.e. writing) of design documents for a story. Note, we're not actually **doing** the implementation work described by the design. We're defining (i.e. documenting) HOW to build what the spec defines as WHAT.

This session we are supervising the creation/update of the design for story {{storyId}}.

# Required reading
Using `mcp__claw-dev__cartridge_read {scope: "project", name: "{{item}}`, read the following items (and follow nested instructions to read)
- design-structure.md
- The story's spec/spec.md (to understand WHAT needs to be built)

Ensure that when you prompt subagents, you include the above content under `# Required reading` but excluding this line  

# Supervision Workflow

Note:
- A continuation is where an agent didn't finish a write, review or refine task and needed to be continued
- An iteration is one cycle of write, review, review feedback. Entering refine is akin to write but increments the iteration counter
- The story is located at `.private/projects/_Users_paulkelcey_Dev_gh_kelceyp-mcp-servers_claw-f7e4d327/Stories/In-Progress/{{storyId}}-{{storyName}}/`
- The design follows a folder structure to support the documentation process

**Design Folder Structure:**
```
design/
  high-level-design.md           # Required: architecture overview
  [domain]-specific.md           # As needed: domain-specific designs
  examples/                      # Optional: example code/configs
  comments/                      # Process documentation
    design-notes-1.md           # Writing notes for iteration 1
    review-feedback-1.md        # Review feedback for iteration 1
    feedback-review-1.md        # Response to review feedback for iteration 1
```

## Step 1 - Write Design
I need you to task a 'design' subagent to write the design. This includes:
- Creating the design folder (if it doesn't exist): `.private/projects/_Users_paulkelcey_Dev_gh_kelceyp-mcp-servers_claw-f7e4d327/Stories/In-Progress/{{storyId}}-{{storyName}}/design/`
- Creating the high-level-design.md file (required starting point)
- Creating additional domain-specific design documents as needed
- Creating the comments/design-notes-1.md file (which captures their decisions, rationale and thought processes throughout the writing task)

The 'design' agent writing the design needs to read the story spec, whatever cartridges they think are relevant, and any existing design documents. Cartridges can be read using `mcp__claw-dev__cartridge_read {scope: "shared", name: "{{cartridge-name}}"}` (something the subagent will also need to know).

They also need to be told the design format from design-structure.md cartridge and should reference the exemplar design mentioned in that cartridge.

The 'design' subagent's mission is to define HOW to build the system, not WHAT. They should:
- Create architecture diagrams (Mermaid) showing system context and layers
- Define component responsibilities and interactions
- Explain design decisions with rationale and tradeoffs
- Provide sequence diagrams for key flows
- Specify how the architecture enables testing
- Reference relevant cartridges and patterns
- Break complex areas into focused domain-specific documents

It is **essential** that they explain HOW without redefining WHAT (that's the spec's job). They should focus on architecture, component design, and implementation approach.

They should start with high-level-design.md and create additional documents only as needed to keep each document focused.

They should be instructed to report whether they fully completed the work that session or not. They should be encouraged to end their session before completion and report that they didn't finished if they run low on context. This is preferable to rushing with low context. If either they didn't confidently say they finished or they say they didn't finish, repeat this first subagent task with 'continue' semantics. They will need all the same prompting but also that they should pick up where they left off last time. Note that it still counts as the first iteration. They can append to the design/comments/design-notes-1.md file

Take your time to carefully construct the prompt so that you don't forget anything. Once you've tasked them, wait for them to complete. Read their output and decide whether to continue step 1 or move to step 2.

## Step 2 - Review Design
We will task a 'design' subagent that will be given the same documents to read plus all the design/*.md files and the design/comments/design-notes-x.md file. Note that I said 'x' because this step can be entered multiple times. The first time x will be 1.

Their mission is to review this with a critical eye and create a `design/comments/review-feedback-x.md` document listing anything that they think needs to be addressed. Hopefully, on subsequent iterations, this quickly drops to nothing (if not approved the first time around)

Much of that which was required reading in the first prompt (design structure, how vs what, exit early if low on context etc.) should be provided here as well. They should present feedback as numbered items that can be addressed.

They should evaluate:
- Architectural clarity (layers, components, boundaries clear?)
- Completeness (all spec aspects addressed? any gaps?)
- Testability (components testable in isolation? dependencies injectable?)
- Design decisions (choices explained with rationale and tradeoffs?)
- Diagrams (Mermaid diagrams accurate and helpful?)
- Layer violations (design respects boundaries?)
- Module patterns (following prescribed patterns?)
- How vs What (explains how without redefining what?)

Wait for them to finish and report back. Note that the same continuation semantics apply if you dont feel they have finished.

If there is review feedback that needs doing (and you're the ultimate judge) based on their final report and the review-feedback-x.md document they created, you should goto step 3.

Otherwise you can goto step 4a.

## Step 3 - Review Feedback

Task another 'design' subagent, feed them all the same information as above plus the review-feedback.

Ask them to review the design/comments/review-feedback-x.md file and create a design/comments/feedback-review-x.md file where they refer by number to the review-feedback items and either concur or refute each item with their thinking. They should then report back.

If there are items they concur with, goto step 4.

If they refute all items, you need to judge.

If you agree with the reviewer update the feedback-review-x.md document and add your override and goto step 4.

If you agree with the design agent goto step 4a.

## Step 4 - Refine Design
Task a 'design' subagent to refine the design. They will need all of the relevant context including review-feedback-x.md and feedback-review-x.md.

After refining, proceed to Step 4a.

## Step 4a - Update Required Reading with Design Documents

Once the design is finalized (whether after initial write or after refinement), update the required-reading.md file to include all design document paths.

First, list all design documents created:
```bash
ls -1 .private/projects/_Users_paulkelcey_Dev_gh_kelceyp-mcp-servers_claw-f7e4d327/Stories/In-Progress/{{storyId}}-{{storyName}}/design/*.md 2>/dev/null | grep -v '/comments/'
```

Read the current required-reading.md:
```
mcp__claw-dev__cartridge_read {scope: "project", name: "problem-statements/story-{{storyId}}/required-reading.md"}
```

Then update it using `mcp__claw-dev__cartridge_create` with:
- scope: "project"
- name: "problem-statements/story-{{storyId}}/required-reading.md"
- content: The existing content plus all design document paths

Add each design document to the "From the file system" section. Example for a story with high-level-design.md and testing-strategy.md:
```markdown
The following is required reading for story-{{storyId}} and follow reading links recursively.

For each item below use `mcp__claw-dev__cartridge_read {scope: "project", name: "{{item}}"}` and read each

- glossary.md
- problem-statements/story-{{storyId}}/story-problem-statement.md

From the file system, also read the spec and relevant design documentation:
- .private/projects/_Users_paulkelcey_Dev_gh_kelceyp-mcp-servers_claw-f7e4d327/Stories/In-Progress/{{storyId}}-{{storyName}}/spec/spec.md
- .private/projects/_Users_paulkelcey_Dev_gh_kelceyp-mcp-servers_claw-f7e4d327/Stories/In-Progress/{{storyId}}-{{storyName}}/design/high-level-design.md
- .private/projects/_Users_paulkelcey_Dev_gh_kelceyp-mcp-servers_claw-f7e4d327/Stories/In-Progress/{{storyId}}-{{storyName}}/design/testing-strategy.md
```

**Important:** Include ALL .md files from the design/ folder except those in design/comments/.

## Step 5 - Report and End Workflow
As the step description says, report on the process taken (number of iterations etc.) and the outcome

# Closing Notes

You should keep doing this until we have a nice high quality design. Make sure each time you ask agents them to think carefully and go step by step and also ensure you're diligent with passing the appropriate context each time.

Use bash `say -v Zoe "Paul"` to get my attention just as you wrap up to get my attention.

Remember to encourage:
- End and report when low on context. Agent quality drops as they try to wrap up in time
- Explain HOW, not WHAT (what is in the spec)
- Add their notes incrementally
- Focus on architecture and testability
- Use diagrams to illustrate design
- Justify design decisions with rationale and tradeoffs
