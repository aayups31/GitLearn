# GitLearn preview verification

## 0.3 implementation checks

Checked on Windows, October 10, 2026. The first daily-workspace stage is implemented; release packaging validation is in progress.

- TypeScript and production builds passed. The full backend suite passed 66 cases; a subsequent focused six-case run includes the additional moved-folder recovery case, bringing covered backend cases to 67.
- Six affected browser workflows passed on isolated ports without touching the learner's running app. The new flow exercised one project across two lessons, an actual error, hint attachment, a saved fix, reviewed checkpoints, restart, moved-folder recovery, and an isolated second course. Existing editor, setup, GitHub gating, and theme flows passed. The unchanged extension pairing/import/replay flow retains its 0.2 validation below; the 0.3 extension version is a packaging update.
- One live OpenAI check used only a tiny synthetic lesson and program. A real ReferenceError produced a course-cited hint, the corrected saved program ran successfully, and a reviewed checkpoint was saved. No learner files or paid-course material were read.
- The source Electron runtime passed first-run setup, encrypted sample-key persistence, extraction of its included extension, and local JavaScript execution. Expanded packaged checks and public asset verification remain pending at this checkpoint.

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
