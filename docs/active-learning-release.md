# OutClass active-learning implementation

The next preview connects the existing seven learning flows with five workflow improvements. The local Windows/Udemy architecture, optional AI key, course folders and manual private-GitHub sync remain compatible.

| Capability | Working implementation |
| --- | --- |
| Personal direction | Per-course goal, experience and 10–240-minute session budget; practical next steps and contribution preparation reference the goal. |
| Practice moments | Existing successful-run/checkpoint/section opportunities, explanations, task durations, deferral, and session-budget fit. |
| Attempt-aware teacher | Current saved execution, prior checks, hint count, reflection, personal goal and project milestones; diagnostic experiment and misconception hypotheses. No code-edit/run tools. |
| Transfer challenge | Four curated JS/Python changed-requirement tasks, unlocked by the matching completed task. Fresh starter files, distinct attempt evidence, original acceptance cases plus new behaviors. |
| Evolving project | Existing single course project plus six concrete milestones and a generated project brief. Explanations and course-scoped recorded evidence are required; milestone completion remains learner-reported. |
| Evidence memory | Historical attempts, source hashes/excerpts, help use, named checks, exact reflections, short reviews, cross-course search. |
| Contribution bridge | Existing checked public issues, prerequisite/contributor guides, isolated cloning, setup/investigation command records, learner changes and local truthful PR drafts. Personal goal/time budget added. |
| Stale-code guard | Server compares bounded workspace file hashes with the latest recorded run/check/command and previous hint context. Unsaved editor changes are blocked in the UI. Old run attachments and in-flight runs are refused. Course-source questions remain available. |
| Video sync | Extension records visible player position; fresh checkpoint previews freeze the observed position and reflection. A user-clicked history link opens the right Udemy lecture; the extension pauses/seeks the loaded player without autoplay. Older/no-video checkpoints have no invented timestamp. |
| Change impact | Compare bounded file hashes with a successful baseline, review source Git diff statistics when a source repository exists, and suggest directly referenced JS/Python files to recheck. An earlier success followed by failure across lessons produces a Regression Alert. |
| Bounded input | Saved-file JS/Python runs accept single lines, show incremental output, retain the ten-second/output limits and process-tree Stop. Project console retains explicit longer commands and input. No full PTY. |
| Learning ledger | Styled standalone HTML and Markdown exports with source structure, checkpoint Git references, exact reflections, named practice checks, code snapshots/hashes, help use and contribution-preparation records. HTML is escaped and exports are scanned for configured secrets. |

## Important product boundaries

Video anchors use the most recent visible-player observation (sampled every three seconds), only when the lesson matches and the observation is under fifteen seconds old. They are recorded references, not frame-accurate recordings of the click. Opening the link requires course access and the updated extension; the extension can seek only a visible HTML video element after metadata loads.

The runtime runs local learner programs with the user's permissions. Bounded execution is not OS isolation. Import matching is a static heuristic, not a complete dependency graph or proof that a particular edit caused a regression. Existing passed checks describe the named behavior at the recorded time, not all current code.

Milestone explanations and checklist stages are learner reports. Local SQLite records can be edited; a ledger is not an unforgeable credential, a certification of mastery, or proof of authorship. Help from OutClass is recorded; external assistance is not measured. The teacher policy discourages complete solutions but does not guarantee model behavior. Coding-agent integration remains deferred.
