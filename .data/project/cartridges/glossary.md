**swic methodology:**
- a methodolgy for using stories/subtasks/designs/specs etc. to externalise context for claude plus pipelines, cartridges, prompt templates etc.
- can be performed manually without a software system (albeit is slightly tedious doing this although claude can help acting as the system)
- for use on any software project where the user is using claude or another agentic agent
- is being used to build the swic product (by claude instances working in the swic-src project)

**swic:**
- the product that can be installed by adding a package.json dependency and doing a npm install
- an implementation of the swic methodolgy automating all of the things we would otherwise do manually
- a stdio mcp-server that we're building that provides ecm and workflow capabilities (for sdlc) for claude
- published to npm so that any project can install it
- intended for use on any software project where the user is using claude code
- can be used in the development of swic itself (i.e. dogfooding) and incrementally replace the manual implementation of the methodology over time
- uses the data-folder primarily (**not** the project folder although there will be some project folder related capabilities coming soon)

**data-folder:**
- part of the product and exists at .data
- the ~/.data/ folder stores the documents (files/folders) for the system but importantly is an implementation detail of swic
- uses git to version control the files/folders here
- contains system and shared folders accessible via swic to all claudes working on any project
- contains a projects/ folder containing project scoped folders that are specific to each project that uses swic

**project-folder (other than swic/ )**
- installs swic via npm (code gets placed in the node_modules/ folder)
- has an entry in .mcp.json that refers to @kelceyp/swic
- enables the claude working on this repo to use swic and have access the system/, shared/ and project specific content

**swic-src:**
- the project folder containing the source code etc. (happens to use git)
- it's also called swic/ but to disambiguate from the project repo and the installed product, i'm calling it swic-src/ here
- we temporarily have created a symlink called .private/ so that claude can access data-folder inside project scoped permissions

**dev-workflow** (particularly regarding manual testing)
- claude can run swic/ directly from src/ folder but:
    - needs an entry in .msp.json to do anything with it (typically in .mcp.json as swic-dev)
    - in order to pick up changes after changing code will need one of:
        - require the user to quit claude and restart with -c flag to continue conversation thus reloading the mcp-server OR
        - require claude to use bash to run claude -p (might be possible with sub-agents but I suspect not)
- can be installed to node_modules as would be for a non-swic project-folder (typically in .mcp.json as swic) but:
    - needs an entry in .msp.json to do anything with it (typically in .mcp.json as swic)
    - in order to pick up changes after changing code will:
        - require the user to update package numbers (both a top of package.json and in the dependencies section)
        - require the user to publish to npm
        - require the user to do a npm install
        - one of
            - require the user to quit claude and restart with -c flag to continue conversation with the reloaded mcp-server OR
            - require claude to use bash to run claude -p (might be possible with sub-agents but I suspect not)

**claude:**
- this is you and only needs explaining because of the various 'hats' that can be worn
- there are three 'hats' i can think of off the top of my head
    - (hat 1) claude working on a project other than swic where swic was installed. claude is a **user** of swic
    - (hat 2) claude performing the manual work for the swic methodology before the swic is built. in this way, claude is acting **as** swic in lieu of swic
    - (hat 3) claude working on swic. claude is a **developer** of swic
- examples
    - user -- 'please build this non-swic feature' --> claude -- mcp-tool --> swic --> read cartridge --> then code (hat 1 - swic user)
    - user -- 'please transition subtask' --> claude --> manipulates ~/.swic/ folder (hat 2 - acting as swic)
    - user -- 'please build this swic feature' --> claude -- bash/coding/etc. --> swic source code & ~/.swic/ folder (hat 3 - swic developer)
- claude (hat 1) deals with their respective project folder
    - without knowledge of swic's implementation.
    - maybe with or without git. if that project uses subversion or mecurial or no source control at all - swic doesn't care (swic uses git in the data folder including the project data folder but **not** the project folder itself - e.g. my-game/)

**what does all this mean?**
- wrt data-folder and swic-src
    - claude wearing hat 1 (and arguably the most important hat) **must not** know about data-folder nor swic-src
    - claude wearing hats 2 and 3 **must** know about both to either act as swic or to code swic

- wrt project-data?
    - claude wearing hat 1 doesn't have access to the project scoped 'swic' project (cant see the stories, designs, etc. used to build swic)
        - it has it's own project stories/workslips it can see as it's project scoped data
    - claude wearing hats 2 and 3 are both working in the swic project and so **can** can the 'swic' scope project data folder
    - claude wearing hats 2 and 3 must **not** rely on .private symlink in the long run
        - as soon as swic-dev or swic mcp connectors provide access cease using it (its a backdoor violating information hiding principle)

- git
    - the data-folder is a git repo but it's an implementation detail (provides version control for system, shared and project documents)
    - claude wearing hat 1 knows **nothing** about the data-folder including it's usage of git
    - a project-folder **may** or **may not** use git (swic-src/ happens to use git)
    - the gitservice (part of swic) refers to (or should) the git instance running in the data-folder **not** a git repo in project folder (which might not even exist)
    - swic (the product) inherently knows where the root data-folder is and thus where system and shared scoped documents are