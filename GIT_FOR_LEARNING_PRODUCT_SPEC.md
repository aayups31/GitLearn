# Git for Learning --- Product & Build Specification

> **Working idea:** An AI-powered learning companion that automatically
> organizes, versions, and preserves what you learn across coding
> platforms, video courses, browser IDEs, and local development
> environments.

------------------------------------------------------------------------

## 1. The Problem

Learning to code happens across too many disconnected places.

A single person might use:

-   Udemy for long-form video courses
-   Coursera for structured courses and assignments
-   freeCodeCamp for interactive exercises
-   Codecademy for browser-based coding
-   LeetCode and NeetCode for interview practice
-   YouTube for tutorials
-   Jupyter notebooks or Google Colab for data/ML courses
-   VS Code or another local IDE for course projects
-   PDFs, documentation, and articles for theory
-   random local folders for experiments

The learning itself may be structured, but the learner's files usually
are not.

Common outcomes:

-   `Downloads/course-project-final-2/`
-   solutions scattered across browser platforms
-   no version history
-   no record of when or why something was written
-   course exercises mixed with personal projects
-   no consistent Git workflow for small exercises
-   notes separated from the code they describe
-   no easy way to answer "when did I learn this?"
-   completed exercises disappear into a platform account
-   local code is lost when machines or folders change
-   learners avoid Git because manually creating repositories and
    commits for every exercise is excessive

Git solves version control for software projects.

It does not solve version control for **learning**.

------------------------------------------------------------------------

# 2. Product Thesis

## Git for Learning

The product automatically creates a persistent, structured history of a
person's technical learning.

Instead of requiring the learner to think:

> I should create a repository, organize this folder, stage these files,
> write a commit, push it, and update my notes.

the system observes meaningful learning events and handles the
organization.

The user focuses on learning.

The product handles:

-   context
-   organization
-   snapshots
-   commits
-   progress
-   notes
-   history
-   retrieval

The core promise:

> **Learn anywhere. Your learning history maintains itself.**

------------------------------------------------------------------------

# 3. The Important Product Shift

The product is **not** primarily:

> AI that automatically commits your code to GitHub.

That is a feature.

The actual product is:

> **Automatic version control and memory for learning.**

GitHub is initially the durable storage and version-history layer.

The system connects two kinds of context:

### Learning Context

What is the user currently learning?

Examples:

-   course
-   section
-   lesson
-   problem
-   topic
-   exercise
-   difficulty
-   platform

### Work Context

What did the user actually do?

Examples:

-   wrote code
-   modified files
-   solved a problem
-   ran tests
-   wrote notes
-   completed an exercise
-   watched a lesson
-   built a small project

The product connects both.

``` text
Learning Platform
        │
        │ "Pointers → Dynamic Allocation"
        ▼
Learning Companion
        ▲
        │ "main.cpp changed"
        │
Local IDE / Browser Editor
        │
        ▼
Structured Learning History
        │
        ▼
GitHub / Local Git
```

------------------------------------------------------------------------

# 4. Learning Modes

The system should explicitly support several learning modes rather than
pretending every platform works the same way.

------------------------------------------------------------------------

## Mode A --- Coding Problem Platforms

Examples:

-   LeetCode
-   NeetCode
-   HackerRank
-   Codewars
-   CodeSignal
-   similar problem-solving sites

### Available Context

The browser extension can usually identify:

-   platform
-   problem title
-   problem identifier
-   topic/tags
-   difficulty
-   programming language
-   current solution
-   submission state
-   accepted/completed state

### Ideal Flow

1.  User opens a problem.
2.  Extension detects the problem.
3.  User writes a solution.
4.  User submits it.
5.  Accepted submission becomes a meaningful learning event.
6.  Extension captures the user's solution.
7.  System organizes it.
8.  AI creates a useful commit message.
9.  Solution is committed to the configured learning repository.

Example:

``` text
learning/
└── neetcode/
    └── arrays-and-hashing/
        ├── contains-duplicate/
        │   ├── solution.py
        │   └── metadata.json
        ├── valid-anagram/
        └── two-sum/
```

Example commit:

``` text
feat(neetcode): solve Contains Duplicate

- implement hash-set lookup
- achieve O(n) time
- complete Arrays & Hashing exercise
```

### Reattempts

Do not overwrite learning history.

If the learner revisits the problem six weeks later and creates a better
solution, commit the change.

This makes Git history valuable:

``` text
Oct 03
solve Two Sum using hash map

Nov 21
revisit Two Sum with cleaner single-pass implementation
```

------------------------------------------------------------------------

# 5. Mode B --- Browser-Based Interactive Courses

Examples:

-   freeCodeCamp
-   Codecademy
-   Coursera browser labs
-   interactive educational sandboxes

These contain both learning context and code.

### Flow

The extension observes:

``` text
Course:
Scientific Computing with Python

Module:
Data Structures

Exercise:
Implement a Stack
```

The user completes the browser exercise.

The system captures:

-   user-authored code
-   course/module/exercise metadata
-   completion state
-   language
-   timestamp

Then creates:

``` text
freecodecamp/
└── scientific-computing-python/
    └── data-structures/
        └── stack/
            ├── solution.py
            └── metadata.json
```

The product should distinguish between:

-   user-authored code
-   platform boilerplate
-   generated test harnesses
-   instructions
-   hidden tests

Only appropriate learner-owned material should be persisted.

------------------------------------------------------------------------

# 6. Mode C --- Video Course + Local Coding

This is critical for platforms such as Udemy.

Many courses contain videos but expect learners to write code locally.

The browser knows what the learner is watching.

The local machine knows what the learner is writing.

The product joins those contexts.

### Example

Browser:

``` text
Udemy
C++ Masterclass
Section 8: Pointers
Lesson 42: Dynamic Memory Allocation
```

VS Code:

``` text
~/learning/cpp-course/
├── main.cpp
└── pointer_examples.cpp
```

### Flow

1.  User opens the lesson.
2.  Extension recognizes the course/section/lesson.
3.  User clicks **Start Learning Session**, or automatic session
    detection activates.
4.  User selects or confirms a local workspace.
5.  Local companion watches that workspace.
6.  User watches the video and writes code.
7.  Meaningful file changes are detected.
8.  At lesson completion/session end, the system creates a checkpoint.
9.  AI generates a commit based on the lesson context and actual
    changes.
10. Changes are committed.

Example:

``` text
course(cpp): practice dynamic memory allocation

- use new and delete
- experiment with heap-allocated integers
- add pointer cleanup examples
```

The browser extension provides **why** the code exists.

The local companion provides **what changed**.

------------------------------------------------------------------------

# 7. Mode D --- Video/Theory Lesson With No Code

Not every useful learning session produces source code.

Examples:

-   architecture lectures
-   ML theory
-   networking concepts
-   algorithm explanations
-   Git lessons
-   operating systems theory
-   mathematics
-   conceptual Udemy lessons

The system should still preserve progress without manufacturing fake
knowledge.

Example:

``` text
udemy/
└── cpp-masterclass/
    └── pointers/
        └── memory-management/
            └── notes.md
```

Possible checkpoint:

``` markdown
# Memory Management

Course: C++ Masterclass
Section: Pointers
Lesson: Dynamic Memory

## Session
Lesson completed.

## My Notes
- Stack memory is automatically managed.
- Heap allocation requires explicit lifetime management.
- Raw pointers can create dangling references.

## Artifacts
No coding exercise for this lesson.
```

### Important AI Rule

The AI should not pretend it knows what the learner learned merely
because a video was marked complete.

Prefer:

-   lesson metadata
-   learner-written notes
-   learner questions
-   actual code
-   explicit user annotations

over invented summaries.

A useful UI interaction:

``` text
Lesson complete

What did you learn?
[ pointers store addresses; finally understood why dereferencing is needed ]

[ Save checkpoint ]
```

AI can clean and structure **the user's note** without replacing it with
hallucinated course content.

------------------------------------------------------------------------

# 8. Mode E --- Video Course + Existing Course Repository

Some courses provide a repository.

The learner may:

-   clone instructor starter code
-   work through branches
-   modify examples
-   complete TODOs

The product should detect that the directory already uses Git.

Options:

### Existing Repo Mode

Do not create another nested repository.

Instead:

-   preserve existing Git configuration
-   optionally create learner commits
-   associate learning metadata separately
-   never silently rewrite history
-   never force-push

### Learning Mirror Mode

If modifying the course repository is undesirable, maintain a separate
private learning repository containing only learner-owned changes/notes.

------------------------------------------------------------------------

# 9. Mode F --- YouTube Tutorials

YouTube is less structured than Udemy but extremely common.

Possible detected context:

``` text
Video:
Build a Transformer From Scratch

Channel:
...

Timestamp:
01:17:32
```

The user can attach the video to a workspace.

Then:

``` text
youtube/
└── transformer-from-scratch/
    ├── src/
    ├── notes.md
    └── metadata.json
```

Useful feature:

### Timestamped Learning Checkpoint

The learner writes:

``` text
Attention dimensions finally make sense here.
```

The system stores:

``` text
Video timestamp: 01:17:32
Note: Attention dimensions finally make sense here.
```

This creates a connection between notes, code, and the exact point in
the learning resource.

------------------------------------------------------------------------

# 10. Mode G --- Local-Only Learning

Sometimes there is no browser course at all.

Examples:

-   experimenting with a library
-   following documentation
-   writing practice programs
-   learning C++ from a book
-   implementing algorithms independently

The local extension should work independently.

The user can create:

``` text
New Learning Session

Topic: C++ Templates
Workspace: ~/practice/templates
```

Then the same versioning system works without a browser.

------------------------------------------------------------------------

# 11. Mode H --- Jupyter / Data Science / ML

Common environments:

-   `.ipynb`
-   Google Colab
-   JupyterLab
-   local notebooks
-   Kaggle notebooks

The system should capture meaningful notebook states without creating
enormous noisy histories.

Possible behavior:

-   save notebook at session completion
-   optionally strip transient output
-   preserve important charts/results when requested
-   capture related datasets by reference rather than duplicating huge
    files
-   generate learning metadata
-   detect secrets/API tokens

Example:

``` text
machine-learning/
└── linear-regression/
    ├── notebook.ipynb
    ├── notes.md
    └── metadata.json
```

------------------------------------------------------------------------

# 12. Mode I --- Course Projects

Some lessons turn into substantial projects.

Examples:

-   React weather app
-   C++ game
-   REST API
-   ML classifier
-   portfolio project

These should eventually graduate from the monolithic learning
repository.

Possible action:

``` text
This workspace has become a project.

[ Keep in Learning Repo ]
[ Promote to New Repository ]
```

Promotion can:

1.  create a dedicated GitHub repository
2.  preserve meaningful history
3.  generate an initial README
4.  retain a link from the learning timeline

------------------------------------------------------------------------

# 13. Mode J --- PDFs, Books, Documentation and Articles

The product can eventually support learning sources without a
traditional course platform.

Examples:

``` text
Source: Effective Modern C++
Chapter: Smart Pointers
Workspace: cpp-practice/
```

or:

``` text
Source: PostgreSQL documentation
Topic: Indexes
Workspace: database-practice/
```

The user manually or automatically establishes context, and normal
learning checkpoints continue.

------------------------------------------------------------------------

# 14. Core User Experience

## First-Time Setup

User installs the extension.

### Step 1 --- Connect GitHub

Request only necessary permissions.

### Step 2 --- Choose Storage

Recommended default:

``` text
Repository: learning
Visibility: Private
```

Allow:

-   existing repository
-   new repository
-   local-only mode

### Step 3 --- Install Optional Local Companion

Needed for:

-   VS Code/local IDE learning
-   Udemy + local code
-   Coursera + local code
-   local-only sessions

### Step 4 --- Configure Preferences

Examples:

``` text
Automatic commits:          On
Default repository:         learning
Default visibility:         Private
Secret scanning:            On
Commit on accepted problem: On
Commit on lesson complete:  Ask
Include AI notes:           Ask
```

------------------------------------------------------------------------

# 15. Session Model

The fundamental internal object should be a **Learning Session**.

Example:

``` json
{
  "platform": "udemy",
  "course": "C++ Masterclass",
  "section": "Pointers",
  "lesson": "Dynamic Memory Allocation",
  "workspace": "~/learning/cpp",
  "started_at": "...",
  "ended_at": "...",
  "artifacts": [],
  "notes": [],
  "events": []
}
```

A session joins external learning context with local activity.

------------------------------------------------------------------------

# 16. Meaningful Events

Do not commit every keystroke.

Potential commit triggers:

### Strong Automatic Triggers

-   accepted coding-problem submission
-   completed exercise
-   passed course exercise tests
-   explicit lesson completion
-   project milestone
-   user clicks "Finish Session"

### Soft Triggers

-   20--30 minutes of meaningful work
-   significant file change
-   tests begin passing
-   inactivity after substantial work

Soft triggers should generally create a proposed checkpoint rather than
blindly pushing.

------------------------------------------------------------------------

# 17. Smart Commit Generation

Bad:

``` text
update files
```

Better:

``` text
course(cpp): implement pointer traversal
```

Best:

``` text
course(cpp): practice pointer traversal

- add Node pointer chain
- traverse linked structure
- handle null termination
```

Commit generation should use:

-   actual diff
-   filenames
-   detected language
-   lesson/problem context
-   test status
-   user notes

It should **not invent functionality not visible in the diff/context**.

------------------------------------------------------------------------

# 18. Repository Structure

A possible unified repository:

``` text
learning/
│
├── leetcode/
│   ├── arrays/
│   ├── binary-search/
│   ├── dynamic-programming/
│   └── graphs/
│
├── neetcode/
│   └── neetcode-150/
│
├── udemy/
│   ├── cpp-masterclass/
│   │   ├── 01-basics/
│   │   ├── 02-functions/
│   │   └── 08-pointers/
│   └── react-course/
│
├── coursera/
│   └── machine-learning/
│
├── freecodecamp/
│   └── scientific-computing-python/
│
├── codecademy/
│   └── typescript/
│
├── youtube/
│   └── transformer-from-scratch/
│
└── independent/
    ├── rust/
    └── postgres/
```

The structure should be configurable.

------------------------------------------------------------------------

# 19. Metadata

Each learning artifact can have lightweight metadata.

Example:

``` json
{
  "platform": "neetcode",
  "type": "coding_problem",
  "topic": ["arrays", "hashing"],
  "difficulty": "easy",
  "language": "python",
  "completed": true,
  "attempt": 1
}
```

For a course:

``` json
{
  "platform": "udemy",
  "type": "course_lesson",
  "course": "C++ Masterclass",
  "section": "Pointers",
  "lesson": "Dynamic Memory Allocation",
  "artifacts": [
    "main.cpp",
    "pointer_examples.cpp"
  ]
}
```

Metadata enables the product's intelligence without forcing everything
into README text.

------------------------------------------------------------------------

# 20. Learning Timeline

Git history can power a human-readable timeline.

``` text
October 3

✓ NeetCode — Contains Duplicate
  Arrays & Hashing · Python

✓ C++ Masterclass — Dynamic Memory
  43 min · 2 files changed

✓ freeCodeCamp — Stack Exercise
  Python · exercise completed
```

This makes Git useful even to learners who never inspect Git logs.

------------------------------------------------------------------------

# 21. Continue Learning

The extension home screen should answer:

> What was I doing?

Example:

``` text
Continue Learning

C++ Masterclass
68%
Last: Smart Pointers
Last session: 2 days ago

NeetCode 150
37 / 150
Last: Binary Search

freeCodeCamp
Scientific Computing with Python
42%
```

This is more useful than a generic streak.

------------------------------------------------------------------------

# 22. Learning Memory

Once enough history exists, the product can answer questions over the
learner's own work.

Examples:

> When did I first use dynamic programming?

> Show me the first implementation where I misunderstood pointers.

> What graph algorithms have I implemented?

> Have I ever written Dijkstra's algorithm in C++?

> What did I learn about React hooks?

> Compare my first and latest binary-search implementations.

> What topics do I keep revisiting?

Answers should cite the learner's actual artifacts/commits.

This is where AI becomes genuinely useful rather than decorative.

------------------------------------------------------------------------

# 23. Concept Evolution

A powerful feature is showing how understanding changed.

Example:

``` text
Binary Search

Sep 10
First implementation
- off-by-one bug
- incorrect right boundary

Sep 17
Second implementation
- correct closed interval

Oct 02
Rotated array variant
- applied binary-search invariant
```

The product becomes a record of **learning progression**, not merely
completion.

------------------------------------------------------------------------

# 24. Notes

Notes should remain lightweight.

Possible sources:

### Manual Note

``` text
I keep forgetting why mid + 1 is safe here.
```

### Code Annotation

User selects code and chooses:

``` text
Add learning note
```

### Lesson Note

``` text
What did you learn?
```

### AI Cleanup

User:

``` text
pointer basically holds address and * gets actual thing there
```

Stored cleanly:

``` text
A pointer stores a memory address; dereferencing accesses the value at that address.
```

Optionally retain the original note.

------------------------------------------------------------------------

# 25. AI Responsibilities

AI should be used where semantic understanding adds value.

Good uses:

-   commit message generation
-   organizing ambiguous files
-   converting rough learner notes into structured notes
-   detecting concepts in code
-   explaining differences between attempts
-   semantic search across learning history
-   suggesting repository structure
-   identifying meaningful milestones
-   generating session summaries from **actual user artifacts**
-   detecting when a folder appears to have become a standalone project

Avoid AI for things deterministic code can do reliably.

Do not use an LLM merely to:

-   detect file extensions
-   calculate durations
-   determine whether Git changed
-   identify a known URL pattern
-   perform basic directory operations

------------------------------------------------------------------------

# 26. AI Safety / Accuracy Rules

The system must never quietly fabricate learning history.

AI output should be grounded in:

-   diffs
-   files
-   user notes
-   platform metadata
-   test results
-   explicit completion events

Distinguish:

``` text
Lesson completed
```

from:

``` text
Concept mastered
```

Watching a video does not prove mastery.

Passing one LeetCode problem does not prove mastery.

The product records evidence. It should not make exaggerated claims.

------------------------------------------------------------------------

# 27. Secret Protection

Automatic Git operations introduce a serious risk:

> accidentally committing secrets.

Before every automated commit, scan for:

-   `.env`
-   API keys
-   access tokens
-   SSH/private keys
-   database credentials
-   cloud credentials
-   auth cookies
-   certificate files
-   suspicious high-entropy strings

Default ignored files:

``` text
.env
.env.*
node_modules/
venv/
.venv/
dist/
build/
__pycache__/
.DS_Store
```

If something suspicious appears:

``` text
Commit paused

Potential secret detected:
OPENAI_API_KEY in .env

.env has been excluded.

[ Review ]
[ Continue safely ]
```

Never send detected secrets to the AI model unnecessarily.

------------------------------------------------------------------------

# 28. Privacy Defaults

Recommended defaults:

-   GitHub repository is **private**
-   local files stay local unless selected
-   no automatic public repository creation
-   user sees what is about to be uploaded
-   clear per-platform controls
-   easy pause switch
-   easy exclusion patterns

The system should never treat "automatic" as permission to upload
everything on a machine.

------------------------------------------------------------------------

# 29. Course Content / Copyright Boundaries

The product should focus on preserving the learner's work, not copying
entire paid courses.

Prefer storing:

-   user's code
-   user's notes
-   lesson title
-   section title
-   timestamps
-   metadata
-   user-created artifacts

Avoid automatically storing:

-   full video transcripts
-   downloaded course videos
-   instructor source material without need
-   complete problem descriptions
-   paid PDFs
-   proprietary hidden tests

For coding problems, storing a title/identifier plus the learner's
solution is generally cleaner than cloning the entire platform page.

------------------------------------------------------------------------

# 30. Duplicate Detection

A learner may:

-   solve a LeetCode problem
-   later solve the same problem through NeetCode
-   revisit it locally

The product should recognize possible relationships.

Example:

``` text
This appears to be another attempt at:
Two Sum

Previous attempt:
Sep 12 · Python · NeetCode

[ Link Attempts ]
[ Treat Separately ]
```

------------------------------------------------------------------------

# 31. Multiple Languages

The same concept may be practiced in several languages.

Example:

``` text
two-sum/
├── python/
│   └── solution.py
├── cpp/
│   └── solution.cpp
└── typescript/
    └── solution.ts
```

These should be preserved as separate learning attempts.

------------------------------------------------------------------------

# 32. Starter Code

Course exercises often contain starter code.

The system should distinguish:

``` text
Provided by course
```

from:

``` text
Written/modified by learner
```

Commit summaries should describe learner changes, not claim authorship
over the entire file.

------------------------------------------------------------------------

# 33. Failed Attempts

Do not assume only successful work matters.

Optional setting:

``` text
Preserve failed attempts: On
```

Example history:

``` text
Attempt 1
O(n²) solution — timed out

Attempt 2
Hash-map solution — accepted
```

That history can be more educational than storing only the final answer.

------------------------------------------------------------------------

# 34. Offline Mode

Learning should not depend on an active internet connection.

The local companion can queue checkpoints:

``` text
3 learning checkpoints waiting to sync.
```

When online:

``` text
Syncing...
✓ 3 checkpoints pushed
```

------------------------------------------------------------------------

# 35. GitHub Failure Handling

Never lose work because GitHub is unavailable.

Possible states:

``` text
Saved locally
Commit created
Push pending
```

Git and GitHub should be treated separately.

A failed push does not mean a failed learning checkpoint.

------------------------------------------------------------------------

# 36. Merge Conflicts

The product should avoid pretending merge conflicts do not exist.

For the main learning repository:

-   pull/rebase safely before automated pushes
-   never force-push by default
-   pause automation on unresolved conflict
-   explain the conflict simply

Example:

``` text
Sync paused

The remote copy of this file changed since your last session.

[ Review Changes ]
```

------------------------------------------------------------------------

# 37. Multiple Computers

A learner may use:

-   desktop
-   laptop
-   university computer
-   cloud IDE

GitHub provides synchronization, but session identity should be
device-aware.

Possible metadata:

``` text
device: macbook
```

No sensitive hardware fingerprinting is needed.

------------------------------------------------------------------------

# 38. Platform Adapter Architecture

Do not hard-code the entire product around one site.

Use adapters.

``` text
PlatformAdapter
│
├── LeetCodeAdapter
├── NeetCodeAdapter
├── UdemyAdapter
├── CourseraAdapter
├── FreeCodeCampAdapter
├── CodecademyAdapter
└── YouTubeAdapter
```

Common interface conceptually:

``` ts
interface PlatformAdapter {
  detectPage(): boolean;
  getCourseContext(): CourseContext | null;
  getProblemContext(): ProblemContext | null;
  getCompletionState(): CompletionState;
  getUserCode?(): string | null;
}
```

This keeps platform-specific DOM logic isolated.

------------------------------------------------------------------------

# 39. System Architecture

A possible architecture:

``` text
┌──────────────────────────┐
│     Browser Extension    │
│                          │
│ platform adapters        │
│ lesson/problem context   │
│ completion detection     │
└────────────┬─────────────┘
             │
             │ session context
             ▼
┌──────────────────────────┐
│     Session Manager      │
│                          │
│ active learning session  │
│ metadata                 │
│ events                   │
│ artifact relationships   │
└────────────┬─────────────┘
             │
       ┌─────┴─────┐
       ▼           ▼
┌─────────────┐  ┌─────────────────┐
│ VS Code /   │  │ Browser Coding  │
│ Local Agent │  │ Capture         │
│             │  │                 │
│ file watch  │  │ user solution   │
│ git diff    │  │ submission      │
│ tests       │  │ result          │
└──────┬──────┘  └────────┬────────┘
       │                  │
       └─────────┬────────┘
                 ▼
        ┌─────────────────┐
        │ Checkpoint      │
        │ Engine          │
        │                 │
        │ meaningful diff │
        │ secret scan     │
        │ ignore rules    │
        └────────┬────────┘
                 ▼
        ┌─────────────────┐
        │ AI Layer        │
        │                 │
        │ commit message  │
        │ note cleanup    │
        │ concept tags    │
        └────────┬────────┘
                 ▼
        ┌─────────────────┐
        │ Git Layer       │
        │                 │
        │ stage           │
        │ commit          │
        │ push            │
        └────────┬────────┘
                 ▼
              GitHub
```

------------------------------------------------------------------------

# 40. Browser Extension Responsibilities

The extension should handle:

-   platform detection
-   page context
-   course/lesson/problem metadata
-   completion signals
-   user controls
-   session status
-   browser-editor extraction where permitted
-   local companion communication
-   quick notes
-   pause/resume

It should **not** become responsible for arbitrary filesystem access.

------------------------------------------------------------------------

# 41. Local Companion Responsibilities

A local component can handle:

-   workspace selection
-   file watching
-   Git operations
-   diffs
-   `.gitignore`
-   secret scanning
-   test status integrations
-   session checkpoints
-   offline queue

Implementation possibilities:

-   VS Code extension first
-   standalone local daemon later
-   JetBrains plugin later
-   CLI fallback

A VS Code extension is probably the easiest initial bridge because
technical learners already spend significant time there.

------------------------------------------------------------------------

# 42. Communication Between Browser and Local Agent

Potential approaches:

### Browser Native Messaging

Browser extension communicates with an installed local application.

Advantages:

-   designed for extension ↔ local app communication
-   controlled interface

### Localhost Service

Local companion exposes something like:

``` text
localhost:<port>
```

and authenticates the extension.

Requires careful security.

### VS Code URI / Extension Bridge

Useful for initial MVP but less general.

Regardless of method:

-   authenticate communication
-   bind narrowly
-   do not expose arbitrary filesystem commands
-   require explicit workspace permission

------------------------------------------------------------------------

# 43. Backend

The MVP may need surprisingly little backend infrastructure.

Possible backend responsibilities:

-   authentication
-   encrypted integration metadata
-   AI requests
-   cross-device session metadata
-   dashboard data
-   semantic learning index

But actual Git content can remain in GitHub.

This reduces duplicated storage.

------------------------------------------------------------------------

# 44. Data Model

Core entities:

``` text
User
Integration
Platform
Course
Section
Lesson
Problem
LearningSession
Artifact
Checkpoint
Commit
Note
Concept
Attempt
Workspace
```

Possible relationships:

``` text
Course
 └── Section
      └── Lesson
           └── LearningSession
                ├── Artifact
                ├── Note
                └── Checkpoint
                     └── Commit
```

Problem flow:

``` text
Problem
 └── Attempt
      └── Checkpoint
           └── Commit
```

------------------------------------------------------------------------

# 45. Local Configuration

A project could contain:

``` text
.learning/
└── config.json
```

Example:

``` json
{
  "course": "C++ Masterclass",
  "platform": "udemy",
  "repository": "learning",
  "path": "udemy/cpp-masterclass",
  "auto_commit": true,
  "secret_scan": true
}
```

This makes workspace relationships persistent.

------------------------------------------------------------------------

# 46. Proposed Extension UI

Minimal popup:

``` text
┌───────────────────────────────┐
│ Learning Companion            │
│                               │
│ ● Active                      │
│                               │
│ Udemy                         │
│ C++ Masterclass               │
│ Dynamic Memory Allocation     │
│                               │
│ Workspace                     │
│ ~/learning/cpp                │
│                               │
│ 2 files changed               │
│ 31 min                        │
│                               │
│ [ Add Note ]                  │
│ [ Finish Session ]            │
│                               │
│ Auto checkpoint: ON           │
└───────────────────────────────┘
```

For LeetCode:

``` text
┌───────────────────────────────┐
│ NeetCode                      │
│                               │
│ Contains Duplicate            │
│ Arrays & Hashing · Easy       │
│ Python                        │
│                               │
│ Waiting for submission...     │
│                               │
│ Auto-save accepted: ON        │
└───────────────────────────────┘
```

------------------------------------------------------------------------

# 47. Dashboard

Do not build the dashboard first.

Eventually it can show:

``` text
This Week

12 problems solved
4 course lessons completed
3 coding sessions
7.2 hours of active learning

Topics
Arrays & Hashing     ███████████
Pointers             ███████
React                █████
Dynamic Programming  ███
```

More important than raw statistics:

### Recent Learning

``` text
Today
C++ — Dynamic Memory
NeetCode — Valid Anagram

Yesterday
C++ — Pointer Arithmetic
freeCodeCamp — Stack Exercise
```

### Continue

Shows unfinished learning.

### Search

``` text
Search your learning...
```

------------------------------------------------------------------------

# 48. Metrics That Actually Matter

Avoid vanity gamification.

Useful:

-   exercises completed
-   meaningful coding sessions
-   topics practiced
-   concepts revisited
-   course progress
-   active learning time
-   problems revisited
-   implementation languages
-   learning consistency

Potentially misleading:

-   raw Git commit count
-   lines of code
-   number of files

A learner should not be encouraged to generate garbage commits to
increase a score.

------------------------------------------------------------------------

# 49. GitHub Contribution Graph

The tool may naturally create GitHub contribution activity, but this
should **not** be the product promise.

Otherwise users may optimize for green squares rather than learning.

The goal is preserving meaningful work.

------------------------------------------------------------------------

# 50. Commit Granularity

Avoid:

``` text
watched 3 more minutes
changed one variable
paused video
changed one comment
```

Prefer:

``` text
complete linked-list insertion exercise
```

or:

``` text
checkpoint pointer practice session
```

The checkpoint engine should aggregate related edits.

------------------------------------------------------------------------

# 51. Manual Control

Automation must always have an escape hatch.

Controls:

``` text
Pause Tracking
Exclude File
Exclude Folder
Discard Checkpoint
Edit Commit Message
Commit Now
Save Locally Only
End Session
```

------------------------------------------------------------------------

# 52. Course Switching

If the learner changes tabs from:

``` text
C++ Masterclass
```

to:

``` text
NeetCode
```

the system should not immediately terminate the first session.

Possible states:

``` text
Active
Idle
Paused
Completed
```

Sessions can idle while the learner briefly checks documentation or
another tab.

------------------------------------------------------------------------

# 53. Documentation Tabs

A learner frequently opens:

-   Stack Overflow
-   MDN
-   cppreference
-   official docs

Do not create new learning sessions for every reference tab.

Instead, optionally associate them as session resources:

``` text
Resources consulted:
- cppreference: std::unique_ptr
```

This should be opt-in or carefully filtered to avoid collecting browsing
history unnecessarily.

------------------------------------------------------------------------

# 54. Course Progress Detection

Platforms differ.

Possible methods:

-   DOM completion indicators
-   route changes
-   platform APIs when officially available
-   explicit user action
-   exercise success state

Adapters should degrade gracefully.

If completion cannot be reliably detected:

``` text
Mark lesson complete?
[ Yes ]
```

Never fake reliability.

------------------------------------------------------------------------

# 55. Platform Changes

Sites change their DOM frequently.

Adapters need:

-   versioning
-   health checks
-   selectors isolated from core logic
-   telemetry that does not expose learner content
-   fallback manual capture

Example:

``` text
Automatic Udemy lesson detection is unavailable.

[ Select Current Lesson Manually ]
```

The rest of the product should still work.

------------------------------------------------------------------------

# 56. AI Cost Control

Do not call an expensive model for every event.

Possible strategy:

### No AI

-   file watching
-   metadata parsing
-   known platform detection
-   secret scanning
-   deterministic path generation

### Small/Fast Model

-   commit message
-   note cleanup
-   concept tagging

### Stronger Model

Only when requested:

-   learning-history analysis
-   compare implementations
-   explain progression
-   answer semantic questions over many artifacts

------------------------------------------------------------------------

# 57. Local-First Possibility

A strong long-term principle:

> The learner owns the learning history.

Git repository = portable data.

Even if the product disappears, the user still has:

``` text
code
notes
metadata
Git history
```

That is a major advantage over locking learning history inside another
SaaS dashboard.

------------------------------------------------------------------------

# 58. Export

Users should be able to leave.

Support:

``` text
Export Learning Data
```

Possible output:

``` text
learning/
├── code/
├── notes/
├── metadata/
└── history.json
```

No hostage data.

------------------------------------------------------------------------

# 59. MVP

Do **not** start by supporting every platform.

## MVP Goal

Prove:

> Learners value automatic, structured versioning enough to keep it
> running.

### MVP Platforms

1.  LeetCode / NeetCode
2.  Udemy
3.  VS Code
4.  GitHub

These cover the two hardest/most important patterns:

``` text
Browser coding
```

and

``` text
Video course + local coding
```

### MVP Features

-   GitHub connection
-   private learning repository creation
-   LeetCode/NeetCode problem detection
-   accepted solution capture
-   Udemy lesson detection
-   Start Learning Session
-   link lesson to VS Code workspace
-   detect changed files
-   secret scanning
-   intelligent commit generation
-   push to GitHub
-   simple recent-learning view
-   manual pause
-   manual checkpoint

Nothing more is required to test the core idea.

------------------------------------------------------------------------

# 60. MVP User Story 1 --- NeetCode

``` text
Aayu opens NeetCode.
        ↓
Extension detects:
"Contains Duplicate"
        ↓
Aayu solves in Python.
        ↓
Submission accepted.
        ↓
Extension captures solution.
        ↓
Creates:
neetcode/arrays-and-hashing/contains-duplicate/solution.py
        ↓
AI generates:
feat(neetcode): solve Contains Duplicate
        ↓
Secret scan.
        ↓
Commit.
        ↓
Push.
        ↓
Done.
```

Zero Git commands.

------------------------------------------------------------------------

# 61. MVP User Story 2 --- Udemy

``` text
Aayu opens:
C++ Masterclass
→ Pointers
→ Dynamic Memory
        ↓
Extension detects lesson.
        ↓
"Start Session"
        ↓
Workspace:
~/learning/cpp
        ↓
Aayu watches video.
        ↓
Writes main.cpp in VS Code.
        ↓
Runs program.
        ↓
Returns to video.
        ↓
Changes pointer example.
        ↓
Clicks "Finish Session".
        ↓
System analyzes Git diff.
        ↓
AI creates:
course(cpp): practice dynamic allocation
        ↓
Commit + push.
```

That flow alone validates a large part of the product.

------------------------------------------------------------------------

# 62. MVP User Story 3 --- Theory Lesson

``` text
Aayu watches:
Smart Pointers Explained
        ↓
No code changed.
        ↓
Lesson finishes.
        ↓
Extension:
"No code changed. Save a learning checkpoint?"
        ↓
Aayu writes:
"unique_ptr owns one object, shared_ptr has shared ownership"
        ↓
AI cleans note.
        ↓
notes.md updated.
        ↓
Commit:
notes(cpp): complete smart pointers lesson
```

------------------------------------------------------------------------

# 63. Version 2

After validating MVP:

-   freeCodeCamp
-   Codecademy
-   Coursera
-   YouTube
-   Jupyter
-   better learning timeline
-   learning search
-   course progress
-   multi-device sync
-   failed-attempt preservation
-   implementation comparisons

------------------------------------------------------------------------

# 64. Version 3

The deeper intelligence layer:

### Learning Memory

Ask questions over historical work.

### Concept Graph

``` text
Pointers
├── raw pointers
├── ownership
├── heap allocation
└── smart pointers
```

Connections derive from actual work.

### Weakness Signals

Carefully worded evidence:

``` text
Dynamic Programming has appeared in 7 sessions.
You revisited state-transition notes 4 times.
```

Do not claim:

``` text
You are bad at dynamic programming.
```

### Evolution View

Compare early and later implementations.

------------------------------------------------------------------------

# 65. Potential Future Feature --- Resume Evidence

Because the history is grounded in real artifacts, the product could
eventually help answer:

> What have I actually built while learning C++?

or:

> Which course projects are substantial enough to show?

It can surface evidence.

It should not turn every tutorial into a fake portfolio project.

------------------------------------------------------------------------

# 66. Potential Future Feature --- Course-Agnostic Search

``` text
"Where did I first learn about virtual memory?"
```

Result:

``` text
CS course notes
Sep 18

Udemy Operating Systems
Sep 24

Local cache simulator
Sep 27
```

Now the product acts like personal technical memory.

------------------------------------------------------------------------

# 67. Potential Future Feature --- Learning Replay

Imagine opening a concept:

``` text
Linked Lists
```

and seeing:

``` text
Sep 03 — watched introduction
Sep 03 — first Node implementation
Sep 04 — insertion exercise
Sep 11 — LeetCode Reverse Linked List
Oct 01 — implemented linked list in C++
```

That is a much richer representation of learning than:

``` text
Linked Lists: 100% complete
```

------------------------------------------------------------------------

# 68. Potential Future Feature --- AI Tutor With Personal History

Instead of a generic tutor:

> Explain pointers.

the assistant knows the learner's history.

It could say:

``` text
In your Sep 12 pointer exercise you already used `Node* next`.

A pointer is the same underlying idea: `next` stores the address of another Node.
```

Grounding explanations in the learner's own code can make tutoring
substantially more relevant.

------------------------------------------------------------------------

# 69. Potential Future Feature --- Course Migration

If a learner stops using one platform:

``` text
You completed 41% of this Python course.

Your code, notes and learning history remain available here.
```

The learner's history is independent of the platform.

------------------------------------------------------------------------

# 70. What the Product Should NOT Become

Avoid becoming:

### Another generic note-taking app

Notion already exists.

### Another generic Git GUI

GitHub Desktop already exists.

### Another course platform

Do not compete with Udemy by hosting courses.

### Another LeetCode tracker

Problem tracking alone is too narrow.

### An AI summarizer

"Summarize this video with AI" is not the core product.

### A contribution-graph farming tool

Meaningful learning \> fake commits.

The unique layer is:

> **Automatically connecting learning context to the learner's actual
> artifacts and preserving their evolution.**

------------------------------------------------------------------------

# 71. Key Technical Challenges

The most interesting engineering problems are:

1.  reliable platform context extraction
2.  browser ↔ local workspace association
3.  meaningful checkpoint detection
4.  safe automated Git operations
5.  secret detection
6.  identifying learner-authored vs provided code
7.  platform adapter maintenance
8.  preventing noisy histories
9.  semantic indexing over learning artifacts
10. cross-device synchronization
11. privacy-preserving context collection
12. handling existing repositories safely

------------------------------------------------------------------------

# 72. Suggested Initial Stack

One possible stack:

### Browser Extension

``` text
TypeScript
React
Chrome Manifest V3
```

### VS Code Extension

``` text
TypeScript
VS Code Extension API
```

### Backend

``` text
Next.js / Node
PostgreSQL / Supabase
```

### GitHub

Prefer GitHub's supported authentication/API mechanisms plus local Git
where appropriate.

### AI

Model API for:

-   commit messages
-   note cleanup
-   semantic tagging
-   later learning-memory queries

### Local Git

Use native Git operations through a constrained local companion rather
than attempting to recreate Git.

------------------------------------------------------------------------

# 73. Suggested Repository Structure for the Product

``` text
git-for-learning/
│
├── apps/
│   ├── browser-extension/
│   ├── vscode-extension/
│   ├── web-dashboard/
│   └── api/
│
├── packages/
│   ├── platform-adapters/
│   ├── session-core/
│   ├── git-core/
│   ├── checkpoint-engine/
│   ├── secret-scanner/
│   ├── ai/
│   ├── shared-types/
│   └── ui/
│
├── docs/
│   ├── architecture.md
│   ├── security.md
│   ├── platform-adapters.md
│   └── mvp.md
│
└── README.md
```

------------------------------------------------------------------------

# 74. Build Order

## Phase 0 --- Prototype

Prove the core mechanics manually.

-   detect one LeetCode/NeetCode page
-   extract problem metadata
-   capture solution
-   write it into a local repo
-   generate commit
-   push

No dashboard.

------------------------------------------------------------------------

## Phase 1 --- Problem Platforms

Build:

``` text
NeetCode/LeetCode
→ solution
→ structured folder
→ commit
→ GitHub
```

Get this extremely reliable.

------------------------------------------------------------------------

## Phase 2 --- Local Bridge

Build VS Code extension.

Capabilities:

-   register workspace
-   observe changed files
-   expose diff
-   create checkpoint
-   Git commit/push

------------------------------------------------------------------------

## Phase 3 --- Udemy Context

Build Udemy adapter.

Connect:

``` text
Udemy lesson
↔
VS Code workspace
```

This is the point where the product becomes meaningfully different from
existing auto-LeetCode uploaders.

------------------------------------------------------------------------

## Phase 4 --- Notes / Theory

Allow learning checkpoints without code.

------------------------------------------------------------------------

## Phase 5 --- Timeline

Build a simple interface over the history.

------------------------------------------------------------------------

## Phase 6 --- Learning Memory

Only after meaningful history exists, add semantic retrieval and AI
questions.

------------------------------------------------------------------------

# 75. Success Criteria for MVP

The MVP succeeds if a user can spend a week learning and realize:

> I never thought about organizing or committing any of this, but
> everything I did is cleanly saved.

Specific signals:

-   users leave automatic tracking enabled
-   users rarely edit generated commits
-   commits remain meaningful rather than noisy
-   users return to previous learning artifacts
-   users use more than one learning source
-   users trust automatic commits
-   users recover something they otherwise would have lost
-   users can answer "what was I working on?" immediately

------------------------------------------------------------------------

# 76. North Star

The long-term product should make this possible:

A learner spends several years studying computer science, software
engineering, ML, algorithms, frameworks, and independent projects.

At any point they can ask:

> **Show me how I learned this.**

And instead of producing a generic AI answer, the system can reconstruct
the journey from their own evidence:

-   the course
-   the lesson
-   the notes
-   the first attempt
-   the failed implementation
-   the working implementation
-   the later revisit
-   the project where the concept was eventually used

That is the real product.

Not an AI Git commit bot.

Not another course tracker.

Not another notes application.

## A version-controlled memory of becoming better at something.

------------------------------------------------------------------------

# 77. One-Line Product Definition

> **Learn anywhere. Your code, notes, progress, and learning history
> organize and version themselves.**

Alternative internal framing:

> **Git for learning.**

------------------------------------------------------------------------

# 78. Core Design Principle

Every feature should pass one test:

> **Does this help preserve or reconstruct meaningful learning without
> adding work for the learner?**

If not, it probably does not belong in the product.

---

# 79. Course Mirror — First-Class Product Mode

Course Mirror is an optional mode that reconstructs a learner-owned workspace around the structure of a course.

The goal is **not** to clone or redistribute a course.

The goal is to mirror the structure necessary to organize the learner's own work:

```text
Course Platform
      │
      ├── curriculum structure
      ├── lesson/exercise metadata
      ├── completion state
      ├── permitted resource references
      └── learner-authored code
               │
               ▼
          Mirror Engine
          ↙           ↘
 Local Workspace     GitHub
```

Core idea:

> The course provides the structure. The learner's work fills it.

---

# 80. Mirror Course Button

When a supported course is detected, the extension can expose:

```text
┌───────────────────────────────────┐
│ Learning Companion                │
│                                   │
│ Codecademy                        │
│ Learn C++                         │
│                                   │
│ Course detected                   │
│                                   │
│ [ Start Learning ]                │
│ [ Mirror Course ]                 │
└───────────────────────────────────┘
```

Selecting **Mirror Course** opens configuration:

```text
Mirror "Learn C++"?

Create and maintain a structured learning
workspace based on this course.

☑ Course structure
☑ My exercise code
☑ My projects
☑ My notes
☑ Progress metadata
☑ Permitted resource references

Destination:
● Local + GitHub
○ GitHub only
○ Local only

Repository:
learning

[ Create Course Workspace ]
```

Mirroring must always be explicit and optional.

---

# 81. Mirror Output — Interactive Coding Course

For a course such as Codecademy or freeCodeCamp:

```text
codecademy/
└── learn-cpp/
    ├── COURSE.md
    ├── course.json
    │
    ├── 01-hello-world/
    │   ├── README.md
    │   ├── hello.cpp
    │   └── notes.md
    │
    ├── 02-variables/
    │   ├── README.md
    │   ├── variables.cpp
    │   └── exercises/
    │
    ├── 03-conditionals/
    │   ├── exercise-01.cpp
    │   ├── exercise-02.cpp
    │   └── project/
    │
    └── 04-functions/
```

The mirror can exist before every exercise is complete.

Example status:

```text
Learn C++

✓ 01 Hello World
✓ 02 Variables
◐ 03 Conditionals
○ 04 Functions
○ 05 Classes
○ 06 References & Pointers
```

The repository therefore becomes both a workspace and a persistent representation of progress.

---

# 82. Mirror Output — Udemy / Video-First Course

Video courses often do not contain browser editors.

The mirror should still reconstruct the course hierarchy where that hierarchy is available to the learner.

Example:

```text
udemy/
└── cpp-masterclass/
    ├── COURSE.md
    ├── course.json
    │
    ├── 01-introduction/
    │   └── notes.md
    │
    ├── 02-variables/
    │   ├── notes.md
    │   └── exercises/
    │
    ├── 03-control-flow/
    ├── 04-functions/
    ├── 05-oop/
    ├── 06-pointers/
    ├── 07-smart-pointers/
    └── 08-stl/
```

When the learner reaches:

```text
Section 6
Lesson 3
Pointer Arithmetic
```

the extension can resolve the active destination:

```text
06-pointers/
└── 03-pointer-arithmetic/
```

If the learner starts coding locally, the workspace already has a natural home for the files.

---

# 83. Open Current Lesson in VS Code

For mirrored video courses, a high-value action is:

```text
[ Open Lesson Workspace ]
```

Example:

```text
learning/
└── udemy/
    └── cpp-masterclass/
        └── 06-pointers/
            └── 03-pointer-arithmetic/
```

The VS Code extension opens the correct folder and attaches the active Learning Session automatically.

This directly solves the common workflow:

```text
Desktop/
└── test/
    └── main2.cpp
```

becoming disconnected from the course that caused it to exist.

---

# 84. Mirror Engine

Course Mirror should be implemented as its own subsystem.

```text
Platform Adapter
      │
      ▼
Course Parser
      │
      ▼
Course Manifest
      │
      ▼
Mirror Engine
      │
      ├── directory planner
      ├── artifact mapper
      ├── progress synchronizer
      ├── resource-reference mapper
      ├── learner-code mapper
      └── sync-state manager
      │
      ▼
Workspace
```

The Mirror Engine should not depend directly on Codecademy, Udemy, or freeCodeCamp.

Platform-specific parsing belongs in adapters.

---

# 85. Course Manifest

A mirrored course should have a normalized internal representation.

Conceptual example:

```json
{
  "platform": "udemy",
  "course_id": "platform-specific-id",
  "title": "C++ Masterclass",
  "sections": [
    {
      "id": "section-6",
      "title": "Pointers",
      "order": 6,
      "lessons": [
        {
          "id": "lesson-3",
          "title": "Pointer Arithmetic",
          "order": 3,
          "type": "video",
          "completed": false
        }
      ]
    }
  ]
}
```

The platform adapter translates the site's representation into this normalized manifest.

The filesystem generator operates on the manifest rather than directly on webpage DOM.

---

# 86. Course Parser

A Course Parser attempts to identify:

- course title
- section names
- lesson names
- ordering
- exercise names
- project names
- completion state
- lesson type
- available resource references
- stable platform identifiers where available

It should prefer structured data and official APIs where available over brittle DOM scraping.

When only DOM information is available, selectors should remain isolated inside the platform adapter.

---

# 87. Partial Parsing

The system must work even when a platform does not expose the complete curriculum at once.

Possible state:

```text
Mirror status

42 lessons discovered
31 structured
11 discovered as you progress
```

The mirror can expand over time.

It should not require perfect course parsing to remain useful.

---

# 88. Mirror Synchronization

Course Mirror is not merely a one-time import.

The system can maintain synchronization between:

```text
Course
  ↕
Course Manifest
  ↕
Learning Workspace
```

Possible changes:

- learner completes a lesson
- learner unlocks a new section
- course author adds a lesson
- lesson title changes
- new permitted resource appears
- learner completes an exercise
- learner creates local code

Synchronization should be conservative.

Never delete learner files simply because the remote course changed.

---

# 89. Sync States

Each mirrored item can have a state such as:

```text
remote-only
local-placeholder
active
completed
modified
archived-remotely
conflict
```

Example:

```text
Pointers
├── ✓ Pointer Basics
├── ✓ Dereferencing
├── ◐ Pointer Arithmetic
└── ○ Function Pointers
```

The filesystem does not need to be regenerated from scratch on every sync.

---

# 90. Course Changes

Suppose an instructor renames:

```text
Pointer Basics
```

to:

```text
Introduction to Pointers
```

The system should use stable platform IDs where possible to recognize that these are the same lesson.

Do not create duplicate directories purely because display text changed.

If identity is ambiguous, preserve the learner's existing folder and request confirmation rather than destructively reorganizing it.

---

# 91. Learner Files Always Win

The mirror structure is scaffolding.

Learner artifacts are primary.

Rules:

- never silently delete learner-authored files
- never overwrite learner notes
- never replace learner code with platform code
- never reset Git history
- never force-push
- never destructively rename ambiguous folders without confirmation

Remote course structure can change.

The learner's history should remain stable.

---

# 92. Resource Mirroring

Resources need multiple handling modes.

### Reference

Store a link or identifier:

```markdown
# Resources

- Pointer Visualizer — external resource
- cppreference — pointers
- Section exercise — course resource
```

### Metadata

Store:

```text
resource title
resource type
associated lesson
source platform
```

### Local Copy

Only when copying/downloading is permitted and intentionally selected by the user.

The default should be **reference, not duplication**.

---

# 93. Copyright / Paid Course Boundary for Mirror Mode

Course Mirror must not become a paid-course ripping tool.

Do not automatically mirror:

```text
❌ course videos
❌ full transcripts
❌ full lesson prose
❌ paid PDFs
❌ proprietary assessments
❌ hidden tests
❌ instructor-owned repositories or files beyond permitted use
```

Prefer:

```text
✓ curriculum hierarchy
✓ lesson titles
✓ section titles
✓ progress state
✓ user's own notes
✓ user's own code
✓ user's own project files
✓ lightweight metadata
✓ permitted resource references
```

If a resource can legitimately be downloaded for the learner's use, the system can support an explicit resource action while preserving source attribution and platform rules.

---

# 94. Mirror Mode for Codecademy / freeCodeCamp

Interactive courses are particularly well suited to mirroring.

Flow:

```text
Course detected
      ↓
Parse curriculum
      ↓
Generate workspace skeleton
      ↓
User enters exercise
      ↓
Map exercise → folder
      ↓
Capture learner-authored code
      ↓
Exercise passes
      ↓
Update local artifact
      ↓
Update progress
      ↓
Create meaningful checkpoint
```

The product should distinguish learner code from:

- platform boilerplate
- test harnesses
- instructions
- hidden tests
- generated files

---

# 95. Mirror Mode for Udemy

Udemy-style flow:

```text
Course detected
      ↓
Parse accessible curriculum structure
      ↓
Create course workspace
      ↓
Learner opens lesson
      ↓
Resolve lesson directory
      ↓
Start Learning Session
      ↓
Open/link VS Code workspace
      ↓
Watch + code + take notes
      ↓
Finish session
      ↓
Checkpoint learner artifacts
```

A lesson with no code can still update:

```text
notes.md
progress metadata
session history
```

---

# 96. Quick Save vs Course Mirror vs Learning Memory

The product now has three coherent layers.

## Layer 1 — Quick Save

```text
"I did something.
Save and version it."
```

Examples:

- LeetCode solution
- one-off exercise
- local experiment

## Layer 2 — Course Mirror

```text
"I'm learning something.
Build and maintain the workspace around me."
```

Examples:

- Codecademy course
- freeCodeCamp curriculum
- Udemy course
- Coursera specialization

## Layer 3 — Learning Memory

```text
"I learned this before.
Help me reconstruct it."
```

Examples:

- search old implementations
- compare attempts
- retrieve notes
- trace concept evolution

Product progression:

> **Capture → Structure → Remember**

---

# 97. OpenAI API Integration

The project can use a user-configured OpenAI API integration for semantic tasks.

The API is an intelligence layer, not the core storage or synchronization mechanism.

Good API responsibilities:

- generate commit messages from grounded diffs
- clean rough learner notes
- generate concise session summaries
- identify concepts demonstrated by learner code
- map ambiguous artifacts to likely course lessons
- compare two learner implementations
- answer questions over retrieved learning history
- generate human-readable descriptions of progress
- assist with ambiguous course-structure normalization when deterministic parsing is insufficient

Deterministic/local code should continue to handle:

- Git operations
- file watching
- directory generation
- platform URL detection
- known curriculum parsing
- progress flags
- timestamps
- secret scanning
- hashing
- diff calculation
- ignore rules

---

# 98. OpenAI API Key Handling

The API key must never be:

- committed to Git
- stored in course metadata
- exposed to webpage JavaScript
- sent through platform adapters
- included in AI prompts
- written into logs
- included in generated notes
- pushed to the learning repository

For a local-first prototype, store the key using an operating-system or editor secret-storage mechanism where possible.

For a hosted product, prefer server-side API calls with authenticated users rather than exposing a product-owned key to the browser.

If users bring their own key, store it only through an appropriate encrypted/secret mechanism.

---

# 99. AI Context Minimization

Do not send an entire mirrored course to the model merely to generate a commit message.

For each task, send the minimum grounded context necessary.

Example commit request:

```text
Course:
C++ Masterclass

Lesson:
Pointer Arithmetic

Changed files:
pointer_arithmetic.cpp

Diff:
<relevant learner-authored diff>

User note:
"trying pointer increment and array traversal"
```

The model does not need:

- unrelated course lessons
- browsing history
- the entire repository
- paid course transcripts
- API credentials

---

# 100. Grounded AI Contract

Every AI-generated learning artifact should be traceable to evidence.

Inputs can include:

```text
course metadata
lesson metadata
Git diff
user notes
test result
completion state
previous learner artifacts
```

Generated output should never claim unsupported mastery.

Good:

```text
Practiced pointer arithmetic and array traversal.
```

Bad:

```text
Mastered advanced C++ memory management.
```

The system records evidence of learning activity, not psychological certainty.

---

# 101. AI Commit Pipeline

Possible pipeline:

```text
Changed files
      ↓
Ignore/filter rules
      ↓
Secret scan
      ↓
Git diff
      ↓
Learning-session context
      ↓
OpenAI API
      ↓
Proposed commit message
      ↓
Validation
      ↓
Git commit
      ↓
Push
```

If the API is unavailable:

```text
course(cpp): checkpoint pointer arithmetic lesson
```

can be generated deterministically.

AI failure should never prevent saving work.

---

# 102. AI Note Pipeline

User writes:

```text
unique ptr owns one thing shared ptr can have multiple owners and deletes when no owners
```

The system can produce:

```markdown
## My Notes

- `std::unique_ptr` represents exclusive ownership.
- `std::shared_ptr` supports shared ownership.
- A shared object is destroyed when the final owning `shared_ptr` is released.
```

The user's original note can optionally be preserved.

The model is cleaning and structuring user-provided understanding, not pretending to reproduce the instructor's lesson.

---

# 103. AI-Assisted Artifact Mapping

Sometimes the user writes:

```text
main.cpp
```

while watching:

```text
Section 8 → Smart Pointers → unique_ptr
```

The deterministic system already has a strong mapping.

AI is unnecessary.

But suppose several files changed across multiple lessons:

```text
main.cpp
node.cpp
memory.cpp
```

and session boundaries are ambiguous.

AI can propose:

```text
Suggested organization

07-smart-pointers/
├── unique-ptr/
│   ├── main.cpp
│   └── memory.cpp
└── linked-ownership-example/
    └── node.cpp
```

The user can approve the reorganization.

AI should propose destructive filesystem changes, not silently perform them.

---

# 104. Mirror-Aware Learning Search

Course Mirror creates structured retrieval context.

A future query:

> Where did I learn smart pointers?

can resolve:

```text
Udemy
C++ Masterclass
Section 7 — Smart Pointers

Sep 18
unique_ptr lesson
- notes.md
- ownership.cpp

Sep 19
shared_ptr lesson
- graph.cpp
- session notes

Oct 02
Independent project
- used unique_ptr in resource manager
```

The model can answer from the learner's actual history.

---

# 105. Course Manifest + Git

The manifest itself can be versioned.

Example:

```text
course.json
```

Changes might show:

```text
Sep 01
course mirrored

Sep 05
functions module completed

Sep 11
pointers section discovered

Sep 18
smart pointers completed
```

However, avoid producing a Git commit for every tiny progress toggle.

Manifest changes should generally travel with meaningful learning checkpoints.

---

# 106. Mirror Refresh

Possible UI:

```text
C++ Masterclass

Mirror status: Up to date
Last checked: Today

2 new lessons available

[ Review Changes ]
[ Refresh Mirror ]
```

Automatic refresh can be optional.

The refresh process should show structural changes before any potentially disruptive local reorganization.

---

# 107. Mirror Portability

A mirrored course should remain understandable even without the extension installed.

At minimum:

```text
COURSE.md
course.json
section folders
learner code
learner notes
Git history
```

This preserves the local-first principle.

The product should add convenience, not create a proprietary format that makes the learning history useless without the product.

---

# 108. Updated Product Architecture

```text
┌───────────────────────────────┐
│       Browser Extension       │
│                               │
│ platform adapters             │
│ curriculum detection          │
│ lesson/problem context        │
│ completion signals            │
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│       Course Parser           │
│                               │
│ normalize curriculum          │
│ normalize resources           │
│ normalize progress            │
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│       Course Manifest         │
└──────────────┬────────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌───────────────┐  ┌────────────────┐
│ Mirror Engine │  │ Session Manager│
│               │  │                │
│ scaffold      │  │ active lesson  │
│ sync          │  │ notes          │
│ map artifacts │  │ events         │
└───────┬───────┘  └───────┬────────┘
        │                  │
        └─────────┬────────┘
                  ▼
┌───────────────────────────────┐
│    VS Code / Local Agent      │
│                               │
│ file watch                    │
│ workspace                     │
│ Git diff                      │
│ local checkpoint              │
└──────────────┬────────────────┘
               ▼
┌───────────────────────────────┐
│       Safety Pipeline         │
│                               │
│ ignore rules                  │
│ learner ownership filter      │
│ secret scan                   │
└──────────────┬────────────────┘
               ▼
┌───────────────────────────────┐
│       OpenAI API Layer        │
│                               │
│ commit semantics              │
│ notes                         │
│ concept tagging               │
│ retrieval answers             │
└──────────────┬────────────────┘
               ▼
┌───────────────────────────────┐
│           Git Layer           │
│                               │
│ commit                        │
│ local history                 │
│ push                          │
└──────────────┬────────────────┘
               ▼
             GitHub
```

---

# 109. Updated Package Structure

```text
git-for-learning/
│
├── apps/
│   ├── browser-extension/
│   ├── vscode-extension/
│   ├── web-dashboard/
│   └── api/
│
├── packages/
│   ├── platform-adapters/
│   │   ├── leetcode/
│   │   ├── neetcode/
│   │   ├── udemy/
│   │   ├── codecademy/
│   │   └── freecodecamp/
│   │
│   ├── course-parser/
│   ├── course-manifest/
│   ├── mirror-engine/
│   ├── session-core/
│   ├── git-core/
│   ├── checkpoint-engine/
│   ├── secret-scanner/
│   ├── openai/
│   ├── shared-types/
│   └── ui/
│
└── docs/
    ├── architecture.md
    ├── course-mirror.md
    ├── security.md
    ├── openai-integration.md
    ├── platform-adapters.md
    └── mvp.md
```

---

# 110. Updated MVP Strategy

Course Mirror is strategically important, but the first implementation should remain narrow.

## MVP 0

```text
NeetCode/LeetCode
→ capture accepted solution
→ organize
→ OpenAI-generated commit
→ GitHub
```

## MVP 1

```text
Udemy
→ detect course/lesson
→ parse basic curriculum
→ Mirror Course button
→ generate workspace skeleton
→ link VS Code workspace
→ save code to correct lesson
→ OpenAI-generated checkpoint
→ GitHub
```

## MVP 2

```text
Codecademy OR freeCodeCamp
→ parse curriculum
→ mirror exercises
→ capture learner code
→ synchronize completion
```

Do one interactive course platform extremely well before supporting both.

---

# 111. Updated North Star

The product should eventually make this workflow normal:

```text
Find course
     ↓
[ Mirror Course ]
     ↓
Workspace appears
     ↓
Learn normally
     ↓
Code automatically lands
where it belongs
     ↓
Notes and checkpoints
stay connected
     ↓
Git history preserves
the evolution
     ↓
Ask:
"Show me how I learned this."
```

The learner should never again need to create:

```text
course/
test/
test2/
final/
final-final/
random.cpp
```

just because the learning platform and the development environment do not know about each other.

Course Mirror bridges that gap.

---

# 112. Updated Product Definition

> **Learn anywhere. Mirror the course, keep your work, and build a version-controlled memory of everything you learn.**

The three product layers remain:

> **Capture → Structure → Remember**

with:

```text
Quick Save      → Capture
Course Mirror   → Structure
Learning Memory → Remember
```

