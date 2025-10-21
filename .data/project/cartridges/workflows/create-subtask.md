# Create Subtask

# Overview
Think carefully, go step by step and read all instructions before starting.

For this session you will supervise the construction (i.e. preparation) of a subtask. Note, we're not actually **doing** the coding work described by the subtask. We're preparing (i.e. documenting) the work that is to be done.

This session we are supervising the preparation of subtask {{subtaskId}} of story {{storyId}}.

# Required reading
Using `mcp__swic-dev__cartridge_read {scope: "project", name: "{{item}}`, read the following items (and follow nested instructions to read)
- problem-statements/story-{{storyId}}/required-reading.md
- {{additionalReading}}

Ensure that when you prompt subagents, you include the above content under `# Required reading` but excluding this line  

# Supervision Workflow

Note:
- A continuation is where an agent didn't finish a prepare, review or refine task and needed to be continued
- An iteration is one cycle of prepare, review, review feedback. Entering refine is akin to prepare but increments the iteration counter
- The story is located at `.private/projects/_Users_paulkelcey_Dev_gh_kelceyp-mcp-servers_swic-f7e4d327/Stories/In-Progress/{{storyId}}-{{storyName}}/`

## Step 1 - Prepare Subtask
I need you to task a 'tdd-engineer' subagent to prepare the subtask. This includes creating the folder representing the subtask (if it doesn't exist), creating the subtask.md that exists in the folder at the top level and creating the comments/prep-phase/planning-notes-1.md file (which captures their decisions, rationale and thought processes through-out the preparation task)

The 'tdd-engineer' agent preparing the subtask needs to read the story spec, design document(s) and whatever cartridges they think are relevant. Cartridges can be read using `mcp__swic-dev__cartridge_read {scope: "shared", name: "{{cartridge-name}}"}` (something the subagent will also need to know).

They also need to read the subtask.mds (but not any comments/) of all the subtasks that have come before this one for this story. They need to build up their understanding of what should available to build upon at the point in time when this subtask will be worked on.

They also need to be told the subtask format (described above)

Make sure they create the new subtask in `.private/projects/_Users_paulkelcey_Dev_gh_kelceyp-mcp-servers_swic-f7e4d327/Stories/In-Progress/{{storyId}}-{{storyName}}/subtasks/To-Do/`

The 'tdd-engineer' subagent's mission is to work out what's outstanding in order to meet the acceptance criteria in the story spec and pick the next bit of work that makes the most sense. They only need to define a self-contained cohesive bite sized piece. They need to ensure that we don't have a red build spanning subtasks. They should try and keep it under 20 checklist items.

It is **essential** that they not be prescriptive as to **how** but rather they should think about **what**. The only time prescriptiveness is tolerated is when suggesting using tdd for coding activities. This is encouraged and should be re-iterated that tdd means write 1 test, run it to verify it fails, write the code to make the test pass, run it to make sure it passes and then refactor if needed. Strongly encourage discipline here.

The required reading for the subtask preparer includes all the subtask.mds but the required reading specified for the tdd-engineer agent actually doing the building in future just needs the current subtask.md. In other words, the tdd-engineer agent doesn't need to waste context working out what the work should be but rather just how to do it.

They should be instructed to report whether they fully completed the work that session or not. They should be encouraged to end their session before completion and report that they didn't finished if they run low on context. This is preferable to rushing with low context. If either they didn't confidently say they finished or they say they didn't finish, repeat this first subagent task with 'continue' semantics. They will need all the same prompting but also that they should pick up where they left off last time. Note that it still counts as the first iteration. They can append to the comments/prep-phase/planning-notes-1.md file

Take your time to carefully construct the prompt so that you don't forget anything. Once you've tasked them, wait for them to complete. Read their output and decide whether to continue step 1 or move to step 2.

## Step 2 - Review Subtask
We will task a 'review-agent' subagent that will be given the same documents to read plus the subtask.md and the comments/prep-phase/planning-notes-x.md file. Note that I said 'x' because this step can be entered multiple times. The first time x will be 1.

Their mission is to review this with a critical eye and create a `comments/prep-phase/review-feedback-x`.md document listing anything that they think needs to be addressed. Hopefully, on subsequent iterations, this quickly drops to nothing (if not approved the first time around)

Much of that which was required reading in the first prompt (subtask structure, dont over prescribe, exit early if low on context etc.) should be provided here as well. They should present feedback as numbered items that can be address.

Wait for them to finish and report back. Note that the same continuation semantics apply if you dont feel they have finished.

If there is review feedback that needs doing (and you're the ultimate judge) based on their final report and the review-feedback-1.md document they created, you should goto step 3.

Otherwise you can goto step 4a.

## Step 3 - Review Feedback

Task another 'tdd-engineer' subagent, feed them all the same information as above plus the review-feedback.

Ask them to review the comments/prep-phase/review-feedback-x.md file and create a comments/prep-phase/feedback-review-x.md file where the refer by number to the review-feedback items and either concur or refute each item with their thinking. They should then report back.

If there are items they concur with, goto step 4.

If they refute all items, you need to judge.

If you agree with the reviewer update the feedback-review-1.md document and add your override and goto step 4.

If you agree with the tdd-engineer goto step 4a.

## Step 4 - Refine Subtask
Task a 'tdd-engineer' subagent to refine the subtask. They will need all of the relevant context including review-feedback-x.md and feedback-review-x.md.

After refining, proceed to Step 4a.

## Step 4a - Update Required Reading with Subtask Sliding Window

Once the subtask is finalized (whether after initial preparation or after refinement), update the required-reading.md file to include a sliding window of the most recent subtasks.

First, list all completed subtasks for this story (from the Done folder):
```bash
ls -1 .private/projects/_Users_paulkelcey_Dev_gh_kelceyp-mcp-servers_swic-f7e4d327/Stories/In-Progress/{{storyId}}-{{storyName}}/subtasks/Done/ 2>/dev/null | sort
```

Keep only the **3 most recent** subtasks. If there are fewer than 3, include all of them.

Read the current required-reading.md:
```
mcp__swic-dev__cartridge_read {scope: "project", name: "problem-statements/story-{{storyId}}/required-reading.md"}
```

Then update it using `mcp__swic-dev__cartridge_create` with:
- scope: "project"
- name: "problem-statements/story-{{storyId}}/required-reading.md"
- content: The existing content with updated subtask references

Add a subtasks section at the end. Example with 3 recent subtasks (001, 002, 003):
```markdown
The following is required reading for story-{{storyId}} and follow reading links recursively.

For each item below use `mcp__swic-dev__cartridge_read {scope: "project", name: "{{item}}"}` and read each

- glossary.md
- problem-statements/story-{{storyId}}/story-problem-statement.md

From the file system, also read the spec and relevant design documentation:
- .private/projects/_Users_paulkelcey_Dev_gh_kelceyp-mcp-servers_swic-f7e4d327/Stories/In-Progress/{{storyId}}-{{storyName}}/spec/spec.md
- .private/projects/_Users_paulkelcey_Dev_gh_kelceyp-mcp-servers_swic-f7e4d327/Stories/In-Progress/{{storyId}}-{{storyName}}/design/high-level-design.md

Recent subtasks (sliding window of most recent 3):
- .private/projects/_Users_paulkelcey_Dev_gh_kelceyp-mcp-servers_swic-f7e4d327/Stories/In-Progress/{{storyId}}-{{storyName}}/subtasks/Done/001-subtask-name/subtask.md
- .private/projects/_Users_paulkelcey_Dev_gh_kelceyp-mcp-servers_swic-f7e4d327/Stories/In-Progress/{{storyId}}-{{storyName}}/subtasks/Done/002-subtask-name/subtask.md
- .private/projects/_Users_paulkelcey_Dev_gh_kelceyp-mcp-servers_swic-f7e4d327/Stories/In-Progress/{{storyId}}-{{storyName}}/subtasks/Done/003-subtask-name/subtask.md
```

**Important:**
- Only include up to 3 most recent subtasks
- Only include subtasks from the Done/ folder (completed work)
- Replace any existing "Recent subtasks" section to maintain the sliding window
- If no subtasks are completed yet, omit the "Recent subtasks" section entirely

## Step 5 - Report and End Workflow
As the step description says, report on the process taken (number of iterations etc.) and the outcome

# Closing Notes

You should keep doing this until we have a nice high quality subtask md. Make sure each time you ask agents them to think carefully and go step by step and also ensure you're diligent with passing the appropriate context each time.

Use bash `say -v Zoe "Paul"` to get my attention just as you wrap up to get my attention.

Remember to encourage:
- End and report when low on context. Agent quality drops as they try to wrap up in time
- Not to be overly prescriptive (except for tdd)
- Add their notes incrementally