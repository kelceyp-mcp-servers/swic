# Do Subtask

# Overview
Think carefully, go step by step and read all instructions before starting.

For this session you will supervise the delivery (i.e. implementation) of a subtask. Note, we're not **preparing** the subtask documentation. We're **implementing** the work described in the subtask.

This session we are delivering subtask {{subtaskId}} of story {{storyId}}.

# Required reading
Using `mcp__swic-dev__cartridge_read {scope: "project", name: "{{item}}"}`, read the following items (and follow nested instructions to read)
- problem-statements/story-{{storyId}}/required-reading.md

Ensure that when you prompt subagents, you include the above content under `# Required reading` but excluding this line

# Supervision Workflow

Note:
- A continuation is where an agent didn't finish delivery, review or refine task and needed to be continued
- An iteration is one cycle of deliver, review, review feedback. Entering refine is akin to prepare but increments the iteration counter
- The story is located at `.private/projects/_Users_paulkelcey_Dev_gh_kelceyp-mcp-servers_swic-f7e4d327/Stories/In-Progress/{{storyId}}-{{storyName}}/`

## Step 1 - Deliver (Code) Subtask
Move the subtask from `subtasks/To-Do/` to `subtasks/In-Progress/`

I need you to task a 'tdd-engineer' subagent to deliver the subtask. This includes doing the work (coding, documentation etc.) as well as updating both the subtask.md checklist items and creating then updating the comments/build-phase/implementation-notes-1.md

For each checklist item, and **before** moving onto the next checklist item, the subagent should:
1. Do the work described in the checklist item to a high standard
2. Update the implementation-notes-1.md with their thought processes etc.
3. **Only** then mark the checklist item as done

The work isn't done until the implementation notes are updated and under no circumstances can the agent move onto the next checklist item until the one they are working on is complete.

The 'tdd-engineer' agent delivering the subtask needs to read the story spec, design document(s), the subtask.md and whatever cartridges they think are relevant. Cartridges can be read using `mcp__swic-dev__cartridge_read {scope: "shared", name: "{{cartridge-name}}"}` (something the subagent will also need to know).

They also need to read the subtask.mds (but not any comments/) of all the subtasks that have come before this one for this story. They need to build up their understanding of what should be available to build upon at the point in time when this subtask is being worked on.

They should be instructed to report whether they fully completed the work that session or not. They should be encouraged to end their session before completion and report that they didn't finish if they run low on context. This is preferable to rushing with low context.

If either they didn't confidently say they finished or they say they didn't finish, repeat this first subagent task with 'continue' semantics. They will need all the same prompting but also that they should pick up where they left off last time. Note that it still counts as the first iteration. They can append to the comments/build-phase/implementation-notes-1.md file

Take your time to carefully construct the prompt so that you don't forget anything. Once you've tasked them, wait for them to complete. Read their output and decide whether to continue step 1 or move to step 2.

**When you are satisfied with the tdd-engineer's work and ready to move to step 2 (review), you must first:**
1. Commit all changes to git with a descriptive commit message (e.g., "Complete subtask {{subtaskId}} iteration 1 - [brief description]")
2. Capture the git commit hash (using `git rev-parse HEAD`)
3. Record this hash - you will pass it to the reviewer in step 2

## Step 2 - Review Work
Move the subtask from `subtasks/In-Progress/` to `subtasks/Review/`

We will task a 'review-agent' subagent that will be given the same documents to read plus the subtask.md and the comments/build-phase/implementation-notes-x.md file. Note that I said 'x' because this step can be entered multiple times. The first time x will be 1.

**Important: Provide the review-agent with the git commit hash from step 1. This allows them to reference the exact state of the code they're reviewing and provides a rollback point if needed.**

Their mission is to review the work with a critical eye and create a comments/build-phase/review-work-feedback-x.md document listing anything that they think needs to be addressed. Hopefully, on subsequent iterations, this quickly drops to nothing (if not approved the first time around)

Much of that which was required reading in the first prompt (subtask structure, exit early if low on context etc.) should be provided here as well. They should present feedback as numbered items that can be addressed.

Wait for them to finish and report back. Note that the same continuation semantics apply if you don't feel they have finished.

If there is review feedback that needs doing (and you're the ultimate judge) based on their final report and the review-work-feedback-x.md document they created, you should goto step 3.

Otherwise you can goto step 6.

## Step 3 - Review Work Feedback
Task another 'tdd-engineer' subagent, feed them all the same information as above plus the review-work-feedback-x.md.

Ask them to review the comments/build-phase/review-work-feedback-x.md file and create a comments/build-phase/work-feedback-review-x.md file where they refer by number to the review-work-feedback items and either concur or refute each item with their thinking. They should then report back.

If there are items they concur with, goto step 4.

If they refute all items, you need to judge.

If you agree with the reviewer update the work-feedback-review-x.md document and add your override and goto step 4.

If you agree with the tdd-engineer goto step 6.

## Step 4 - Additional Planning
Move the subtask from `subtasks/Review/` to `subtasks/In-Progress/`

Task a 'tdd-engineer' subagent to plan the additional work. This is a build-phase activity even though we're planning. It's dynamic planning in response to feedback.

I need you to task a 'tdd-engineer' subagent to update the subtask document. This will generally include adding additional checklist groups. They also need to create a comments/build-phase/planning-notes-x.md file to capture their thought processes.

The 'tdd-engineer' agent planning the additional work needs to read the story spec, design document(s) and whatever cartridges they think are relevant. Cartridges can be read using `mcp__swic-dev__cartridge_read {scope: "shared", name: "{{cartridge-name}}"}` (something the subagent will also need to know).

They also need to read the subtask.mds (but not any comments/) of all the subtasks that have come before this one for this story. They need to build up their understanding of what should be available to build upon at the point in time when this subtask is being worked on. They can check the code also.

The 'tdd-engineer' subagent's mission is to add additional planning (e.g. checklist groups) needed to deliver the feedback items.

It is **essential** that they not be prescriptive as to **how** but rather they should think about **what**. The only time prescriptiveness is tolerated is when suggesting using TDD for coding activities. This is encouraged and should be re-iterated that TDD means write 1 test, run it to verify it fails, write the code to make the test pass, run it to make sure it passes and then refactor if needed. Strongly encourage discipline here.

They should be instructed to report whether they fully completed the work that session or not. They should be encouraged to end their session before completion and report that they didn't finish if they run low on context. This is preferable to rushing with low context. If either they didn't confidently say they finished or they say they didn't finish, repeat this task with 'continue' semantics. They will need all the same prompting but also that they should pick up where they left off last time. They can append to the comments/build-phase/planning-notes-x.md file

## Step 5 - Review Additional Planning
We will task a 'review-agent' subagent that will be given the same documents to read plus the subtask.md and the comments/build-phase/planning-notes-x.md file. Note that I said 'x' because this step can be entered multiple times.

Their mission is to review the updated subtask with a critical eye and create a comments/build-phase/review-plan-feedback-x.md document listing anything that they think needs to be addressed. Hopefully, on subsequent iterations, this quickly drops to nothing (if not approved the first time around)

Much of that which was required reading in the first prompt (subtask structure, don't over prescribe, exit early if low on context etc.) should be provided here as well. They should present feedback as numbered items that can be addressed.

Wait for them to finish and report back. Note that the same continuation semantics apply if you don't feel they have finished.

If there is review plan feedback that needs doing (and you're the ultimate judge) based on their final report and the review-plan-feedback-x.md document they created, you should goto step 4.

If the updated plan looks good, goto step 1 with continue semantics (but increment the iteration counter for the next implementation-notes file).

**Before returning to step 1, you must first:**
1. Commit the updated planning documents to git with a descriptive message (e.g., "Add iteration 2 planning for subtask {{subtaskId}} - address review feedback")
2. Capture the git commit hash (using `git rev-parse HEAD`)
3. Record this hash - you will pass it to the next reviewer when you eventually reach step 2 again

## Step 6 - Report and End Workflow
Move the subtask from `subtasks/Review/` to `subtasks/Done/`

As the step description says, report on the process taken (number of iterations etc.) and the outcome

Include in your report:
- The git commit hashes from each iteration
- Summary of what was committed at each hash
- This provides traceability and rollback points

# Closing Notes

You should keep doing this until we have high quality implemented work. Make sure each time you ask agents them to think carefully and go step by step and also ensure you're diligent with passing the appropriate context each time.

Use bash `say -v Zoe "Paul"` to get my attention just as you wrap up to get my attention.

Remember to encourage:
- End and report when low on context. Agent quality drops as they try to wrap up in time
- Not to be overly prescriptive (except for TDD)
- Add their notes incrementally

Remember git discipline:
- Commit after coding work completes (before review)
- Commit after planning updates (before returning to deliver)
- Capture and track all commit hashes
- Pass hashes to reviewers for traceability
- Never allow work to proceed without commits (prevents loss of TDD tests and other work)