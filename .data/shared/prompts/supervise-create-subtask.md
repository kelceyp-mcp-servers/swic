# Overview
Think carefully, go step by step and read all instructions before starting.

For this session you will supervise the construction (i.e. preparation) of a subtask. note, we're not actually **doing** the coding work described by the subtask. we're **preparing** (i.e. documenting) the work that is to be done. Technically, we're **supervising** the workflow for preparing the subtask

You will manage the workflow, maintaining and communicating state and task subagents (one after the other) with various prompts to do the preparation work.

This session we are preparing subtask 005 of story 002. 

see `.private/projects/_Users_paulkelcey_Dev_gh_kelceyp-mcp-servers_claw/Stories/`

Story is here
`.private/projects/_Users_paulkelcey_Dev_gh_kelceyp-mcp-servers_claw/Stories/In-Progress/002-minimal-create-cartridge/`

We will leave it to the subagent to describe what the scope of the subtask is. They will 'bite off' whatever they think makes sense based on how much has been done to date and what is outstanding based on delivering the spec and the design.

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
note the folders called Done/, In-Progress/ etc. these are used when the subtask is being coded. for this session, we don't need to move the subtask out of To-Do/. and this is where the substask should be created and prepared.

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
- a continuation is where an agent didnt finish a prepare, review or refine task and needed to be continued
- an iteration is one cycle of prepare, review, review feedback. entering refine is akin to prepare but increments the iteration counter

## step 1 - prepare subtask
i need you to task a 'coding' subagent to prepare the subtask. this includes creating the folder representing the subtask (if it doesn't exist), creating the subtask.md that exists in the folder at the top level and creating the comments/prep-phase/planning-notes-1.md file (which captures their decisions, rationale and thought processes through out the preparation task)

the 'coding' agent preparing the subtask needs to read the story spec, design document(s) and whatever cartridges they think are relevant. cartridges are located at .private/shared/cartridges/ (something the subagent will also need to know)

they also need to read the subtask.mds (but not any comments/) of all the subtasks that have come before this one for this story. they need to build up their understanding of what should available to build upon at the point in time when this subtask will be worked on.

it is likely the work for the previous subtask has **not** been done. we'll typically prepare subtasks for a story before implementing. not always so it's worth checking but in most cases the code for the previous subtasks won't yet exist.

they also need to be told the subtask format (described above)

the 'coding' subagent's mission is to work out what's outstanding in order to meet the acceptance criteria in the story spec and pick the next bit of work that makes the most sense. they only need to define a self-contained cohesive bite sized piece. they need to ensure that we dont have a red build spanning subtasks. they should try and keep it under 20 checklist items.

it is **essential** that they not be prescriptive as to **how** but rather they should think about **what**. the only time prescriptiveness is tollerated is when suggesting using tdd for coding activities. this is encouraged and should be re-iterated that tdd means write 1 test, run it to verify it fails, write the code to make the test pass, run it to make sure it passes and then refactor if needed. strongly encourage discipline here.

the required reading for the subtask preparer includes all the subtask.mds but the required reading specified for the coding agent actually doing the building in future just needs the current subtask.md. in other words, the agent coding doesnt need to waste context working what the work should be but rather just how to do it.

they should be instructed to report whether they fully completed the work that session or not. they should be encouraged to end their session before completion and report that they didnt finished if they run low on context. this is preferable to rushing with low context. if either they didn't confidently say they finished or they say they didn't finish, repeat this first subagent task with 'continue' semantics. they will need all the same prompting but also that they should pick up where they left off last time. Note that it still counts as the first iteration. they can append to the comments/prep-phase/planning-notes-1.md file

take your time to carefully construct the prompt so that you dont forget anything. once youve tasked them, wait for them to complete. read their output and decide whether to continue step 1 or move to step 2.

## step 2 - review subtask
we will task a 'review' subagent that will be given the same documents to read plus the subtask.md and the comments/prep-phase/planning-notes-x.md file. note that I said 'x' because this step can be entered multiple times. the first time x will be 1.

their mission is to review this with a critical eye and create a comments/prep-phase/review-plan-feedback-x.md document listing anything that they think needs to be addressed. hopefully, on subsequent iterations, this quickly drops to nothing (if not approved the first time around)

much of that which was required reading in the first prompt (subtask structure, dont over prescribe, exit early if low on context etc.) should be provided here as well. they should present feedback as numbered items that can be address.

wait for them to finish and report back. note that the same continuation semantics apply if you dont feel they have finished.

if there is review feedback that needs doing (and you're the ultimate judge) based on their final report and the review-plan-feedback-1.md document they created, you should goto step 3.

otherwise you can goto step 5.

## step 3 - review feedback

task another 'coding' subagent, feed them all the same information as above plus the review-plan-feedback-x.md

ask them to review the comments/prep-phase/review-plan-feedback-x.md file and create a comments/prep-phase/plan-feedback-review-x.md file where the refer by number to the review-plan-feedback items and either concur or refute each item with their thinking. they should then report back.

if there are items they concur with, goto step 4.

if they refute all items, you need to judge.

if you agree with the reviewer update the plan-feedback-review-1.md document and add your override and goto step 4.

if you agree with the coder goto step 5.

## step 4 - refine subtask
task a 'coder' subagent to refine the subtask. they will need all of the relevant context including review-plan-feedback-x.md and plan-feedback-review-x.md.

## step 5 - report and end workflow
as the step description says, report on the process taken (number of iterations etc.) and the outcome

# closing notes
you should keep doing this until we have a nice high quality subtask md. make sure each time you ask agents them to think carefully and go step by step and also ensure you're dilligent with passing the appropriate context each time.

remember to encourage:
- end and report when low on context. agent quality drops as they try to wrap up in time
- not to be overly prescriptive (except for tdd)
- add their notes incrementally

when you've finished use bash `say -v Zoe "Paul"` to get my attention


