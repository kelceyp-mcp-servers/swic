# Create Spec

# Overview
Think carefully, go step by step and read all instructions before starting.

For this session you will supervise the construction (i.e. writing) of a story specification. Note, we're not actually **doing** the implementation work described by the spec. We're defining (i.e. documenting) the requirements and what needs to be built.

This session we are supervising the creation/update of the spec for story {{storyId}}.

# Required reading
Using `mcp__claw-dev__cartridge_read {scope: "project", name: "{{item}}`, read the following items (and follow nested instructions to read)
- spec-structure.md
- problem-statements/story-{{storyId}}/required-reading.md

Ensure that when you prompt subagents, you include the above content under `# Required reading` but excluding this line  

# Supervision Workflow

Note:
- A continuation is where an agent didn't finish a write, review or refine task and needed to be continued
- An iteration is one cycle of write, review, review feedback. Entering refine is akin to write but increments the iteration counter
- The story is located at `.private/projects/_Users_paulkelcey_Dev_gh_kelceyp-mcp-servers_claw-f7e4d327/Stories/In-Progress/{{storyId}}-{{storyName}}/`
- The spec follows a folder structure to support the documentation process

**Spec Folder Structure:**
```
spec/
  spec.md                    # The specification document
  comments/                  # Process documentation
    spec-notes-1.md         # Writing notes for iteration 1
    review-feedback-1.md    # Review feedback for iteration 1
    feedback-review-1.md    # Response to review feedback for iteration 1
```

## Step 1 - Write Spec
I need you to task a 'product-owner' subagent to write the spec. This includes:
- Creating the spec folder (if it doesn't exist): `.private/projects/_Users_paulkelcey_Dev_gh_kelceyp-mcp-servers_claw-f7e4d327/Stories/In-Progress/{{storyId}}-{{storyName}}/spec/`
- Creating the spec.md file inside the spec folder
- Creating the comments/spec-notes-1.md file (which captures their decisions, rationale and thought processes throughout the writing task)

The 'product-owner' agent writing the spec needs to read whatever cartridges they think are relevant. Cartridges can be read using `mcp__claw-dev__cartridge_read {scope: "shared", name: "{{cartridge-name}}"}` (something the subagent will also need to know).

They also need to be told the spec format from spec-structure.md cartridge and should reference the exemplar spec mentioned in that cartridge.

The 'product-owner' subagent's mission is to define WHAT needs to be built, not HOW. They should:
- Define complete public interfaces (CLI and/or MCP)
- Specify exact behaviors with Given/Then examples
- Define all error cases with exact error messages
- Establish explicit scope boundaries (in-scope vs out-of-scope)
- Specify testing requirements
- Define measurable success criteria
- Reference relevant cartridges and patterns

It is **essential** that they not be prescriptive as to **how** but rather they should focus on **what**. The only time prescriptiveness is tolerated is when encouraging tdd as a practice. This is encouraged and should be re-iterated that tdd means write 1 test, run it to verify it fails, write the code to make the test pass, run it to make sure it passes and then refactor if needed. Strongly encourage discipline here.

They should be instructed to report whether they fully completed the work that session or not. They should be encouraged to end their session before completion and report that they didn't finished if they run low on context. This is preferable to rushing with low context. If either they didn't confidently say they finished or they say they didn't finish, repeat this first subagent task with 'continue' semantics. They will need all the same prompting but also that they should pick up where they left off last time. Note that it still counts as the first iteration. They can append to the spec/comments/spec-notes-1.md file

Take your time to carefully construct the prompt so that you don't forget anything. Once you've tasked them, wait for them to complete. Read their output and decide whether to continue step 1 or move to step 2.

## Step 2 - Review Spec
We will task a 'product-owner' subagent that will be given the same documents to read plus the spec/spec.md and the spec/comments/spec-notes-x.md file. Note that I said 'x' because this step can be entered multiple times. The first time x will be 1.

Their mission is to review this with a critical eye and create a `spec/comments/review-feedback-x.md` document listing anything that they think needs to be addressed. Hopefully, on subsequent iterations, this quickly drops to nothing (if not approved the first time around)

Much of that which was required reading in the first prompt (spec structure, what vs how, exit early if low on context etc.) should be provided here as well. They should present feedback as numbered items that can be addressed.

They should evaluate:
- Interface completeness (all parameters, exit codes, examples)
- Behavior clarity (concrete examples, no vague descriptions)
- Scope discipline (explicit boundaries)
- Error coverage (all error cases with exact messages)
- Testability (measurable acceptance criteria)
- Precision (no ambiguity in formats, paths, codes)
- What vs How (spec defines what, not how)

Wait for them to finish and report back. Note that the same continuation semantics apply if you dont feel they have finished.

If there is review feedback that needs doing (and you're the ultimate judge) based on their final report and the review-feedback-x.md document they created, you should goto step 3.

Otherwise you can goto step 4a.

## Step 3 - Review Feedback

Task another 'product-owner' subagent, feed them all the same information as above plus the review-feedback.

Ask them to review the spec/comments/review-feedback-x.md file and create a spec/comments/feedback-review-x.md file where they refer by number to the review-feedback items and either concur or refute each item with their thinking. They should then report back.

If there are items they concur with, goto step 4.

If they refute all items, you need to judge.

If you agree with the reviewer update the feedback-review-x.md document and add your override and goto step 4.

If you agree with the product-owner goto step 4a.

## Step 4 - Refine Spec
Task a 'product-owner' subagent to refine the spec. They will need all of the relevant context including review-feedback-x.md and feedback-review-x.md.

After refining, proceed to Step 4a.

## Step 4a - Update Required Reading with Spec

Once the spec is finalized (whether after initial write or after refinement), update the required-reading.md file to include the spec path.

Read the current required-reading.md to see what's already there:
```
mcp__claw-dev__cartridge_read {scope: "project", name: "problem-statements/story-{{storyId}}/required-reading.md"}
```

Then update it using `mcp__claw-dev__cartridge_create` with:
- scope: "project"
- name: "problem-statements/story-{{storyId}}/required-reading.md"
- content: The existing content plus the new spec path

Add this line to the "From the file system, also read" section:
```
- .private/projects/_Users_paulkelcey_Dev_gh_kelceyp-mcp-servers_claw-f7e4d327/Stories/In-Progress/{{storyId}}-{{storyName}}/spec/spec.md
```

If the "From the file system" section doesn't exist yet, create it after the cartridge reads section:
```markdown
The following is required reading for story-{{storyId}} and follow reading links recursively.

For each item below use `mcp__claw-dev__cartridge_read {scope: "project", name: "{{item}}"}` and read each

- glossary.md
- problem-statements/story-{{storyId}}/story-problem-statement.md

From the file system, also read the spec and relevant design documentation:
- .private/projects/_Users_paulkelcey_Dev_gh_kelceyp-mcp-servers_claw-f7e4d327/Stories/In-Progress/{{storyId}}-{{storyName}}/spec/spec.md
```

## Step 5 - Report and End Workflow
As the step description says, report on the process taken (number of iterations etc.) and the outcome

# Closing Notes

You should keep doing this until we have a nice high quality spec.md. Make sure each time you ask agents them to think carefully and go step by step and also ensure you're diligent with passing the appropriate context each time.

Use bash `say -v Zoe "Paul"` to get my attention just as you wrap up to get my attention.

Remember to encourage:
- End and report when low on context. Agent quality drops as they try to wrap up in time
- Not to be overly prescriptive (except for encouraging TDD as a practice)
- Add their notes incrementally
- Focus on WHAT, not HOW
- Use concrete examples, not vague descriptions
- Define exact error messages and exit codes
