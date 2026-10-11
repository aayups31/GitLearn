# GitLearn preview verification

## 0.3 implementation checks

Checked on Windows, October 10, 2026. The first daily-workspace stage is implemented and its packaged Windows runtime has passed validation. Public asset verification remains pending at this checkpoint.

- TypeScript and production builds passed. The full backend suite passed 66 cases; a subsequent focused six-case run includes the additional moved-folder recovery case, bringing covered backend cases to 67.
- Six affected browser workflows passed on isolated ports without touching the learner's running app. The new flow exercised one project across two lessons, an actual error, hint attachment, a saved fix, reviewed checkpoints, restart, moved-folder recovery, and an isolated second course. Existing editor, setup, GitHub gating, and theme flows passed. The unchanged extension pairing/import/replay flow retains its 0.2 validation below; the 0.3 extension version is a packaging update.
- One live OpenAI check used only a tiny synthetic lesson and program. A real ReferenceError produced a course-cited hint, the corrected saved program ran successfully, and a reviewed checkpoint was saved. No learner files or paid-course material were read.
- The source Electron runtime and actual packaged `GitLearn.exe` passed first-run setup, encrypted sample-key persistence, extraction of the included extension, a bound course project, local JavaScript execution, and restoration of the file, run output, and note across a full app restart. Readiness checks passed. The source scenario completed in twenty seconds and the packaged scenario in twenty-three seconds. Both used temporary profiles and a sample key without OpenAI requests.
- Both static-site scenarios passed desktop, phone, keyboard navigation, privacy, reduced-motion, and no-JavaScript checks. The site made no requests to workspace APIs. Packaged site copy includes the updated run-evidence privacy disclosure.
- Configured-key and environment-file scans passed for the staged source, public site, frontend, extension, desktop ASAR, and external extension resources. The packaged app and included extension both report version 0.3.0. Installer and extension ZIP checksums have been generated; public asset verification remains pending.

## 0.2.0 preview verification

Checked on Windows, October 10, 2026.

- TypeScript check and production build succeeded.
- All 59 backend tests passed. HTTP pairing checks also verify that unauthenticated clients cannot focus the desktop and paired extension clients cannot edit files, run programs, or use AI.
- A separate live OpenAI check passed semantic embedding, a grounded course answer with a valid citation, and an AI checkpoint message using a tiny synthetic lesson. It used the developer's local key; no learner course material or code was accessed. Routine tests continue to use mocks and never spend API credits.
- The actual Electron app passed first-run setup, isolated renderer/limited bridge checks, encrypted key persistence, setup recovery, real local file creation, and bundled JavaScript execution. The final distributed win-unpacked executable passed the same functional scenario plus extraction of its included Chrome extension into a real directory. It used a temporary profile and sample key; no OpenAI requests were made in the desktop test.
- Udemy browser workflows passed course entry, reviewed checkpoints, private GitHub setup gating, actual unpacked extension pairing/transcript import/offline replay, and theme persistence. The editor scenario additionally verified external-edit preservation, course sources/citations, local execution, HTML preview isolation, shared note state, and checkpoint saving.
- Static site checks passed desktop 1440 and 1280, phone widths 375, keyboard assistant tabs, FAQ/privacy, no JavaScript, live reduced-motion changes, no horizontal document overflow, and no requests to workspace APIs.
- Site copy passed the 10k-websites em-dash and stock-language scan. Screenshots were visually reviewed.
- Exact configured-key scan and environment-file checks passed for public site, app frontend, extension, packaged desktop ASAR, and external extension resources. Production dependency audit reported zero vulnerabilities. The installer is unsigned; this is disclosed in the guide and release notes. Build-tool dependency audit reports eight moderate transitive findings, with no current upstream fixed version of the affected formatter dependency.

Packaging validation caught a Windows ASAR directory-copy limitation in the included-extension action. The installer now ships those resources outside ASAR, and the test checks the copied manifest and built background script. The final packaged functional scenario passed in 28 seconds. Native/site test artifacts have separate output folders; optional hidden-window screenshots stay in the development visual pass. The editor workflow passed in 17 seconds with its checkpoint operation allowed thirty seconds.

The independently hosted site's entire source tree is approximately 251 KB, including the real workspace PNG, two compact self-hosted fonts, and their licenses. The Windows x64 installer is approximately 111 MB. These are artifact sizes, not invented live-network performance scores; live Vercel verification remains part of deployment.
