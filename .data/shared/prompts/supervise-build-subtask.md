# Overview
Think carefully, go step by step and read all instructions before starting.

For this session you will supervise the delivery of a subtask.

You will manage the workflow, maintaining and communicating state and task subagents (one after the other) with various prompts to deliver and review the work.

This session we are delivering subtask 006 of story 002.

see `.private/projects/_Users_paulkelcey_Dev_gh_kelceyp-mcp-servers_claw/Stories/` for stories

Story is here
`.private/projects/_Users_paulkelcey_Dev_gh_kelceyp-mcp-servers_claw/Stories/In-Progress/002-minimal-create-cartridge/`

it is essential to read .private/projects/_Users_paulkelcey_Dev_gh_kelceyp-mcp-servers_claw/Stories/In-Progress/002-minimal-create-cartridge/subtasks/To-Do/006-realignment-to-correct-misconceptions/comments/message-from-user.md (both for you and all subagent you prompt)

You need to understand structure of subtasks (described below) plus you will need to share this information with the subagents when you prompt them

# Subtasks
## Subtask structure

├── subtasks/
│   ├── Done/
│   ├── In-Progress/
│   ├── Ready/
│   ├── Review/
│   ├── To-Do/
│   │   ├── 001-set-up-infrastructure/            <-- the subtask is a folder that follows a naming convention (see below)
│   │   │   ├── subtask.md                        <-- the main file - always called subtask.md (see format below)
│   │   │   └── comments/                         <-- the comments made about the subtask by agents (note that the number of files can grow)
│   │   │       ├── prep-phase/
│   │   │       │   ├── planning-notes-1.md       <-- the notes made by the author (coder subagent) on the first iteration of prep phase
│   │   │       │   └── review-plan-feedback-1.md      <-- the notes made by the reviewer (reviewer subagent) on the first iteration of prep phase
│   │   │       └── build-phase/

in the example above, the review agent approved it first time. if there was feedback that needed to be done however then these will be added
- plan-feedback-review-1.md (by the coder agent - concur or refute each feedback item)
- planning-notes-2.md (by coder agent assuming they concurred with a least 1 item)
- review-plan-feedback-2.md (by reviewer agent)

## state folders
note the folders called Done/, In-Progress/ etc. these are used when the subtask is being coded. we will move the subtask around.

## naming convention
{id}-{subtask-folder-name-in-kebab-case}/         <-- id is passed in (i.e. mentioned above)

## subtask.md template
use the following template

```markdown
# Description

# Prerequisite reading
story spec and design
list relevant cartridges applicable to the checklist items below

# Important
- check off the checklist items as you go else we run the risk of not knowing where you got to if you run out of context
- update the implementation notes (described below) that you'll create with each checklist item

# Checklist groups
## House keeping <-- this is standard
[ ] Create an implementation-notes-1.md that describes how you went about implementing each checklist item (your thought processes etc.)
[ ] Perform a green build check (if the build is red, it doesnt matter who did it - we stop and fix it)

## Error Infrastructure
- [ ] Using TDD, build error factory that creates typed ClawError objects with string codes (...)
- [ ] Using TDD, build type guard function isClawError() that safely narrows unknown to ClawError
- etc.
```

# Supervision workflow

note:
- a continuation is where an agent didnt finish delivery, review or refine task and needed to be continued
- an iteration is one cycle of deliver, review, review feedback. entering refine is akin to prepare but increments the iteration counter

## step 1 - deliver (e.g. code) subtask
move the subtask to 'In-Progress'

i need you to task a 'coding' subagent to deliver the subtask. this includes the doing the work (coding, documentation etc.) as well as updating both the subtask.md checklist items and creating then updating the comments/build-phase/implementation-notes-1.md

for each checklist item, and **before** moving onto the next checklist item, the subagent should:
1. do the work described in the checklist item to a high standard
2. update the implementation-notes-1.md with their thought processes etc.
3. **only** then mark the checklist item as done

the work isn't until the implementation-notes are updated and under no circumstances can the agent move onto the next checklist item until the one they are working on is done.

the 'coding' agent preparing the subtask needs to read the story spec, design document(s) and whatever cartridges they think are relevant. cartridges are located at .private/shared/cartridges/ (something the subagent will also need to know)

they also need to be told the subtask format (described above)

they should be instructed to report whether they fully completed the work that session or not. they should be encouraged to end their session before completion and report that they didn't finish if they run low on context. this is preferable to rushing with low context.

if either they didn't confidently say they finished or they say they didn't finish, repeat this first subagent task with 'continue' semantics. they will need all the same prompting but also that they should pick up where they left off last time. Note that it still counts as the first iteration. they can append to the comments/prep-phase/planning-notes-1.md file

take your time to carefully construct the prompt so that you dont forget anything. once youve tasked them, wait for them to complete. read their output and decide whether to continue step 1 or move to step 2.

**when you are satisfied with the coding agent's work and ready to move to step 2 (review), you must first:**
1. commit all changes to git with a descriptive commit message (e.g., "Complete subtask 004 iteration 1 - CLI and MCP interfaces")
2. capture the git commit hash (using `git rev-parse HEAD`)
3. record this hash - you will pass it to the reviewer in step 2

## step 2 - review work
move the subtask to 'Review'

we will task a 'review' subagent that will be given the same documents to read plus the subtask.md and the comments/build-phase/implementation-notes-x.md file. note that I said 'x' because this step can be entered multiple times. the first time x will be 1.

**important: provide the review agent with the git commit hash from step 1. this allows them to reference the exact state of the code they're reviewing and provides a rollback point if needed.**

their mission is to review the work with a critical eye and create a comments/build-phase/review-work-feedback-x.md document listing anything that they think needs to be addressed. hopefully, on subsequent iterations, this quickly drops to nothing (if not approved the first time around)

much of that which was required reading in the first prompt (subtask structure, exit early if low on context etc.) should be provided here as well. they should present feedback as numbered items that can be addressed.

wait for them to finish and report back. note that the same continuation semantics apply if you dont feel they have finished.

if there is review feedback that needs doing (and you're the ultimate judge) based on their final report and the review-work-feedback-x.md document they created, you should goto step 3.

otherwise you can goto step 6.

## step 3 - review work feedback
task another 'coding' subagent, feed them all the same information as above plus the review-work-feedback.

ask them to review the comments/build-phase/review-work-feedback-x.md file and create a comments/build-phase/work-feedback-review-x.md file where they refer by number to the review-work-feedback items and either concur or refute each item with their thinking. they should then report back.

if there are items they concur with, goto step 4.

if they refute all items, you need to judge.

if you agree with the reviewer update the work-feedback-review-1.md document and add your override and goto step 4.

if you agree with the coder goto step 6.

## step 4 - additional planning
move the subtask to 'In-Progress'

task a 'coder' subagent to refine the plan the additional work. this is a build-phase activity even though we're planning. it's dynamic planning in response to feedback.

i need you to task a 'coding' subagent to refine the subtask document. this will generally include adding additional checklist groups. they also need to create a comments/build-phase/planning-notes-x.md file to capture their thought processes.

the 'coding' agent preparing the subtask needs to read the story spec, design document(s) and whatever cartridges they think are relevant. cartridges are located at .private/shared/cartridges/ (something the subagent will also need to know)

they also need to be told the subtask format (described above)

they also need to read the subtask.mds (but not any comments/) of all the subtasks that have come before this one for this story. they need to build up their understanding of what should available to build upon at the point in time when this subtask will be worked on. they can check the code also.

the 'coding' subagent's mission is to add additional planning (e.g. checklist groups) needed to deliver the feedback items.

it is **essential** that they not be prescriptive as to **how** but rather they should think about **what**. the only time prescriptiveness is tolerated is when suggesting using tdd for coding activities. this is encouraged and should be re-iterated that tdd means write 1 test, run it to verify it fails, write the code to make the test pass, run it to make sure it passes and then refactor if needed. strongly encourage discipline here.

they should be instructed to report whether they fully completed the work that session or not. they should be encouraged to end their session before completion and report that they didn't finished if they run low on context. this is preferable to rushing with low context. if either they didn't confidently say they finished or they say they didn't finish, repeat this first subagent task with 'continue' semantics. they will need all the same prompting but also that they should pick up where they left off last time. Note that it still counts as the first iteration. they can append to the comments/build-phase/planning-notes-x.md file

## step 5 - review additional planning
we will task a 'review' subagent that will be given the same documents to read plus the subtask.md and the comments/build-phase/planning-notes-x.md file. note that I said 'x' because this step can be entered multiple times.

their mission is to review the updated subtask with a critical eye and create a comments/build-phase/review-plan-feedback-x.md document listing anything that they think needs to be addressed. hopefully, on subsequent iterations, this quickly drops to nothing (if not approved the first time around)

much of that which was required reading in the first prompt (subtask structure, dont over prescribe, exit early if low on context etc.) should be provided here as well. they should present feedback as numbered items that can be address.

wait for them to finish and report back. note that the same continuation semantics apply if you dont feel they have finished.

if there is review plan feedback that needs doing (and you're the ultimate judge) based on their final report and the review-feedback-1.md document they created, you should goto step 4.

if the updated plan looks good, goto 1 with continue semantics.

**before returning to step 1, you must first:**
1. commit the updated planning documents to git with a descriptive message (e.g., "Add iteration 2 planning for subtask 004 - address review feedback")
2. capture the git commit hash (using `git rev-parse HEAD`)
3. record this hash - you will pass it to the next reviewer when you eventually reach step 2 again

## step 6 - report and end workflow
move the subtask to 'Done'

as the step description says, report on the process taken (number of iterations etc.) and the outcome

include in your report:
- the git commit hashes from each iteration
- summary of what was committed at each hash
- this provides traceability and rollback points

# closing notes
you should keep doing this until we have a nice high quality subtask md. make sure each time you ask agents them to think carefully and go step by step and also ensure you're dilligent with passing the appropriate context each time.

remember to encourage:
- end and report when low on context. agent quality drops as they try to wrap up in time
- not to be overly prescriptive (except for tdd)
- add their notes incrementally

remember git discipline:
- commit after coding work completes (before review)
- commit after planning updates (before returning to deliver)
- capture and track all commit hashes
- pass hashes to reviewers for traceability
- never allow work to proceed without commits (prevents loss of TDD tests and other work)
