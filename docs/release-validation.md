# GitLearn 0.2.0 preview verification

Checked on Windows, October 10, 2026.

- TypeScript check and production build succeeded.
- All 59 backend tests passed. HTTP pairing checks also verify that unauthenticated clients cannot focus the desktop and paired extension clients cannot edit files, run programs, or use AI.
- The actual Electron app passed first-run setup, isolated renderer/limited bridge checks, encrypted key persistence, setup recovery, real local file creation, and bundled JavaScript execution. The distributed win-unpacked executable passed the same functional scenario using a temporary profile and sample key; no OpenAI requests were made.
- Udemy browser workflows passed course entry, reviewed checkpoints, private GitHub setup gating, actual unpacked extension pairing/transcript import/offline replay, and theme persistence. The editor scenario additionally verified external-edit preservation, course sources/citations, local execution, HTML preview isolation, shared note state, and checkpoint saving.
- Static site checks passed desktop 1440 and 1280, phone widths 375, keyboard assistant tabs, FAQ/privacy, no JavaScript, live reduced-motion changes, no horizontal document overflow, and no requests to workspace APIs.
- Site copy passed the 10k-websites em-dash and stock-language scan. Screenshots were visually reviewed.
- Exact configured-key scan and environment-file checks passed for public site, app frontend, extension, and packaged desktop ASAR. Production dependency audit reported zero vulnerabilities. The installer is unsigned; this is disclosed in the guide and release notes. Build-tool dependency audit reports eight moderate transitive findings, with no current upstream fixed version of the affected formatter dependency.

Two test-harness issues were corrected: a hidden packaged-window screenshot could stall, so optional visual capture stays in the development visual pass while the packaged test validates actual functional behavior; native/site test artifacts now have separate output folders. A reviewed Git preview exceeded a five-second assertion while native and browser tests ran together, so its operation wait allows thirty seconds. The editor rerun passed in 17 seconds and the packaged functional scenario in 30 seconds.

The independently hosted site's entire source tree is approximately 251 KB, including the real workspace PNG, two compact self-hosted fonts, and their licenses. The Windows x64 installer is approximately 111 MB. These are artifact sizes, not invented live-network performance scores; live Vercel verification remains part of deployment.
