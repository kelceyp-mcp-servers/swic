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