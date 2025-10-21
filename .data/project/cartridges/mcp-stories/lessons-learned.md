---
audience: claude code
abstract: Retrospective on mcp-stories - what worked, what got messy, and why swic exists
---

# mcp-stories Lessons Learned

## Core Insight

**The fundamental mistake:** Not finessing the first slice before expanding.

Without careful review and refinement of the initial implementation, complexity accumulated. What started as promising patterns degraded into messy code because the foundation wasn't solid.

## What Worked Well

### 1. Cartridge System
**Pattern:** Modular knowledge units for AI context loading

**Why it worked:**
- Clear separation of concerns (knowledge vs. mechanics)
- Just-in-time loading (only load what's needed)
- Hierarchical organization (system/shared/project scopes)
- Reusable across multiple agents and sessions
- Self-documenting (audience/abstract in frontmatter)

**Evidence:** 75+ cartridges created and actively used across system/shared/project

**Carry forward to swic:** ✓ Cartridges are a proven pattern

### 2. Template Rendering (Handlebars + YAML)
**Pattern:** Parameterized prompts with validation

**Why it worked:**
- Handlebars provided sufficient power without excessive complexity
- YAML frontmatter made parameters explicit and parseable
- Fail-fast validation prevented subtle bugs
- Type coercion with clear error messages
- Enabled supervisor orchestration (render prompt → task agent)

**Evidence:** 27 prompt templates, supervisor successfully orchestrated multi-agent workflows

**Carry forward to swic:** ✓ Template rendering is valuable, but design clean from scratch

### 3. Iteration/Continuation Pattern
**Pattern:** Distinguish between feedback cycles and within-session resumption

**Why it worked:**
- Clear semantics ("Iteration 2" vs "Continuation 3")
- Templates adapted instructions based on state
- Enabled long-running work across multiple sessions
- Agents could resume from Implementation Notes

**Evidence:** Templates successfully handled both fresh starts and continuations

**Carry forward to swic:** ✓ Pattern is sound, but needs cleaner implementation

### 4. Supervisor Orchestration
**Pattern:** State machine supervising specialized agents

**Why it worked:**
- Separation of orchestration logic from execution
- Specialized agents for specific tasks (coder, reviewer)
- State-based workflow (9 states in supervise-subtask.md)
- Template rendering enabled dynamic prompt generation

**Evidence:** 327-line supervisor template successfully coordinated multi-agent workflows

**Carry forward to swic:** ✓ Orchestration is powerful, but state machines need refinement

### 5. Security-First Path Validation
**Pattern:** Whitelist approach to prevent directory traversal

**Why it worked:**
- Comprehensive validation (absolute paths, .., null bytes, control chars)
- Hierarchical paths supported (forward slashes)
- Path sanitization (normalize multiple slashes)
- Failed loudly with clear error messages

**Evidence:** No security incidents, clear error messages when users made mistakes

**Carry forward to swic:** ✓ Security pattern is solid

### 6. MCP Tool Approach vs Slash Commands
**Pattern:** Programmatic tools instead of user-only slash commands

**Why it worked:**
- Agents can call tools (not just users)
- Supervisors can orchestrate other agents
- No context waste (tools are efficient)
- Parameter validation built-in
- Type-safe with clear schemas

**Evidence:** 50+ tools enabled comprehensive document/story/subtask management

**Carry forward to swic:** ✓ MCP tools > slash commands for agent orchestration

## What Got Messy

### 1. First Slice Not Finessed
**Problem:** Didn't review and refine initial implementation carefully

**Symptoms:**
- Code organization unclear
- Multiple approaches coexisting (legacy vs new)
- Accumulated technical debt
- Hard to distinguish historical vs current

**Root cause:** Moved too fast to add features before solidifying foundation

**Lesson for swic:** Build thin exemplary vertical slice BEFORE expanding

### 2. Multiple Template Syntaxes
**Problem:** ${} (legacy) and {{}} (Handlebars) coexisting

**Symptoms:**
- Confusion about which syntax to use
- Migration path unclear (breaking change)
- Some templates incompatible with render_template tool
- README warnings about syntax differences

**Root cause:** Started with simple replacement, evolved to Handlebars, didn't migrate fully

**Lesson for swic:** Pick one approach and stick to it from the start

### 3. Unclear What's Historical vs Current
**Problem:** Hard to know which code/templates were active vs experiments

**Symptoms:**
- Root-level prompt templates (13 files) using ${} syntax
- build/ and plan/ subdirectories using {{}} syntax
- No clear markers for "deprecated" or "experimental"
- Documentation didn't distinguish between approaches

**Root cause:** Rapid iteration without pruning old approaches

**Lesson for swic:** Mark experimental work clearly, remove when superseded

### 4. Multi-Repository Complexity
**Problem:** Four separate repositories for data (mcp-stories, sdlc-system, sdlc-shared, mcp-stories-sdlc)

**Symptoms:**
- Configuration complexity (multiple SDLC_*_PATH env vars)
- Hard to understand what lives where
- Syncing changes across repos
- Onboarding friction

**Root cause:** Premature abstraction (shared before knowing what should be shared)

**Lesson for swic:** Centralize in ~/.swic/ until proven need for separation

### 5. Code Not Reviewed Closely Enough
**Problem:** User didn't review implementations carefully before moving on

**Symptoms:**
- Architecture drift (composition root pattern added later)
- Inconsistent patterns (some stateless, some not)
- Technical debt accumulation
- Messy code organization

**Root cause:** Too much trust in initial implementations without verification

**Lesson for swic:** Review every implementation carefully before accepting it

### 6. Accumulated Complexity
**Problem:** System grew complex without refactoring

**Symptoms:**
- 50+ tools (good) but some overlapping (bad)
- Multiple ways to do similar things
- Deep call stacks
- Hard to reason about system behavior

**Root cause:** Additive development without subtraction

**Lesson for swic:** Refactor aggressively, remove duplication, keep it simple

### 7. No Clear Versioning Strategy
**Problem:** Templates had no versioning or compatibility markers

**Symptoms:**
- Breaking changes with no migration path
- No way to know if template works with current render_template
- Experimentation mixed with production usage

**Root cause:** Didn't plan for evolution from the start

**Lesson for swic:** Version templates if they become critical infrastructure

## Architecture Lessons

### What Worked

**Stateless service pattern:**
- Explicit `callingUserId` parameter
- No implicit state
- Easier to reason about
- Better for testing

**Factory pattern:**
- `.create()` methods everywhere
- Dependency injection
- Testable components

**Layered architecture:**
- Transport → Tools → Services → Storage
- Clear separation of concerns
- Easy to swap implementations

**Transaction-based operations:**
- Database transactions for atomicity
- All-or-nothing updates
- Data consistency guaranteed

### What Got Messy

**Composition root not implemented initially:**
- Added later (subtask 022)
- Should have been there from the start
- Resulted in scattered dependencies

**Inconsistent patterns:**
- Some services stateless, some not
- Some using factories, some not
- Led to confusion about "the right way"

**Module pattern violations:**
- Fixed in iteration 3 (subtask 022)
- Should have been caught earlier with better review

## Process Lessons

### What Worked

**Story-driven development:**
- Stories provided clear scope
- Subtasks broke down work
- Implementation notes tracked progress
- Retrospectives captured learnings

**Questionnaire pattern:**
- Gathered context, not content
- Prevented premature solutions
- Ensured agent understood problem

**TDD methodology:**
- Red-green-refactor cycle
- Tests documented expected behavior
- Caught regressions

### What Got Messy

**Large stories:**
- Some stories too big (needed splitting)
- Hard to complete in reasonable time
- Lost momentum

**Manual git operations:**
- Story transitions via `git mv` (emoji folders)
- Error-prone
- Should have been automated sooner

**Workslip overhead:**
- Queue-based retrospective work added complexity
- Not clear it was necessary

## Technical Debt Examples

From actual subtasks in mcp-stories-sdlc:

**Subtask 022 - Composition Root Pattern** (iteration 4, phases 16-19)
- Had to refactor to add composition root
- Should have been designed in from start
- Took multiple iterations to get right

**Subtask 023 - Remove Auto-Append .md Extension**
- Feature added without thinking through implications
- Later realized it was problematic
- Had to remove it (breaking change)

**Code Convention Fixes** (subtask 022, iteration 3)
- Module pattern violations
- Hardcoded Zod schema mappings
- Should have been caught in initial review

## Key Insight: The "Exemplar Slice" Principle

**mcp-stories lesson:** Built wide before going deep

**Result:** Lots of features, messy foundation

**swic approach:** Build thin vertical slice to exemplary quality

**Goal:**
1. Pick ONE small feature
2. Implement it to production quality
3. Review ruthlessly until it's exemplary
4. Use it as the template for everything else
5. THEN expand horizontally

**What "exemplary" means:**
- Clean code (reviewed and refactored)
- Well-tested (unit + integration)
- Clear patterns (consistent throughout)
- Minimal complexity (no gold plating)
- Self-documenting (code is readable)
- Security-first (validated from start)
- No technical debt (pay as you go)

## Specific Anti-Patterns to Avoid in swic

1. **Don't add features before finessing foundation**
   - Resist temptation to expand quickly
   - Each addition should match exemplar quality

2. **Don't let multiple approaches coexist**
   - Pick one pattern and commit
   - Remove superseded approaches immediately

3. **Don't skip code review**
   - Review every implementation carefully
   - Don't trust first-pass code without verification

4. **Don't accumulate technical debt**
   - Refactor as you go
   - Pay debt immediately, not "later"

5. **Don't premature abstract**
   - Start concrete, extract patterns when proven
   - Avoid "shared" repos until clear need

6. **Don't build features you don't need yet**
   - YAGNI (You Aren't Gonna Need It)
   - Wait for concrete use case

7. **Don't leave unclear code**
   - If it's not obvious, it's not done
   - Refactor until it's self-documenting

## What to Carry Forward

**Proven patterns:**
- ✓ Cartridge system (modular knowledge)
- ✓ Template rendering (Handlebars + YAML)
- ✓ MCP tools (not slash commands)
- ✓ Security-first validation
- ✓ Stateless services
- ✓ Factory pattern
- ✓ Iteration/continuation tracking

**Proven anti-patterns to avoid:**
- ✗ Multiple syntax approaches
- ✗ Unreviewed code
- ✗ Premature feature expansion
- ✗ Technical debt accumulation
- ✗ Multi-repo complexity (too early)
- ✗ Unclear historical vs current

## The Central Lesson

**"Finesse the first slice"** is not just about code quality.

It's about:
- Establishing patterns that scale
- Building confidence in the foundation
- Creating a reference for all future work
- Avoiding rework later
- Moving fast sustainably (not just fast)

mcp-stories proved the concepts. swic will implement them cleanly.

## Using This Knowledge in swic

**Don't treat mcp-stories as:**
- Implementation guide to copy
- Best practices documentation
- Architectural blueprint

**Do treat mcp-stories as:**
- Proof that concepts work
- Map of problem space
- Warning signs to avoid
- Reference when exploring solutions
- Context for understanding why swic exists

**Remember:** swic is the opportunity to do it right, informed by mcp-stories experience but not constrained by its implementations.
