# GitLearn preview verification

## 0.4.1 Windows project-command patch

Verified on Windows, October 10, 2026. Restored the credential-free Windows system variables needed by installed tools launched through PowerShell. The console also removes terminal control sequences from displayed output.

- All 81 backend cases in 13 files passed, including actual native-tool execution through PowerShell with preserved nonzero exit status.
- A real generated React/Vite project installed its public npm dependencies, served its local application with HTTP 200, and stopped cleanly. This uses installed Node/npm; the bundled single-file JavaScript runner is separate.
- The affected practical-learning browser scenario passed: during-course suggestion, learner-written checks, hints, reflection, fresh review, console, and project scaffold. Both static-site scenarios passed. The previous complete nine-scenario browser run remains recorded below.
- The final packaged desktop scenario passed in 23.8 seconds, including a Windows external-tool command as well as encrypted-key persistence/removal, bundled JavaScript, restored files, practical checks, scaffolding, and stopping its tracked command on close.
- Production build, packaged version/privacy checks, and configured-key/environment-file exclusion scans passed.
- The [0.4.1 GitHub release](https://github.com/aayups31/GitLearn/releases/tag/v0.4.1) is public. Both download URLs returned HTTP 200; asset sizes, GitHub SHA-256 digests, and the downloaded checksum file match the local tested artifacts.
- The public site at https://git-learn-black.vercel.app/ was verified with the setup guide, privacy page, and release links. Vercel automatically deployed the `main` checkpoint `526f73c` successfully.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| GitLearn-Setup-0.4.1.exe | 115,970,859 | `2466120e9c6848ee31b5096cd350522d96927a583f8d3255af675800e057b0a1` |
| GitLearn-Chrome-0.4.1.zip | 137,008 | `76a70a107535d9d839c42b59079c0d4fd26266335d6608817eaf7c956dce797e` |

The installer remains unsigned. Chrome account verification/store review and real Udemy learner beta sessions are separate release gates. The six curated JavaScript/Python briefs do not claim broad curriculum coverage or certify industry readiness; remaining roadmap depth is described below and in the learning roadmap.

## 0.4 practical-learning and contribution preview

Verified on Windows, October 10, 2026. Implementation checkpoint: `dba7e54` on `main`.

- Full backend suite: 80 cases in 13 files passed; a subsequent focused four-case runtime run also passed the quoted Node-command fix. Real temporary repositories cover a separate contribution clone/branch, preserved upstream history, actual tests, local PR draft, and resumed contribution identity.
- All nine browser scenarios passed in 2.1 minutes, including practice suggested before course completion, failed and passing learner-written checks, hint use, reflection search, a fresh review file, project commands/scaffolds, checked-issue UI, course isolation/recovery, editor conflicts, HTML preview, GitHub setup gates, and theme persistence.
- The real built extension was copied to a disposable test folder with only its loopback address redirected to the isolated test companion. Pairing, explicit transcript import, restricted extension authority, offline queueing, and replay passed. The learner's active port was not used for pairing or mutation.
- Both static-site scenarios passed, including eight-step setup, mobile overflow, keyboard interactions, no workspace API calls, and operation without JavaScript. Workspace and live-work screenshots were visually reviewed.
- Source desktop scenario passed in 33.2 seconds. The final packaged executable passed in 29.3 seconds, covering encrypted key persistence/removal, renderer isolation, included extension version, saved files, bundled JavaScript, restore after restart, real practice checks, project scaffolding, and killing a tracked project command on app close.
- A live OpenAI request used synthetic course material and a real failed task. It returned one cited source and withheld a requested named full implementation. This is an observed response, not a guarantee about all model responses.
- Read-only live GitHub discovery returned four checked open/unassigned issues and eight contributor-guide sources. No account token, private learning record, clone, fork, comment, or PR was sent in this check.
- TypeScript/production builds, packaged version/privacy checks, configured-key scans, and environment-file exclusion checks passed. No developer key is included. The installer remains unsigned.

Final artifacts:

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| GitLearn-Setup-0.4.0.exe | 115,970,588 | `61811facd844c657a52e6c180ad3715da18f26165e12c2bbe56074e91679f28c` |
| GitLearn-Chrome-0.4.0.zip | 137,008 | `e91792e81ead0fec4ac557e2424f0bdfcd0ac86864ea916af5902c1f7446b873` |

Chrome upload was rejected by the dashboard because the publisher's Google account needs two-step verification. The ZIP is prepared; account verification and store review remain external release gates. Real learner beta sessions on Udemy, signed Windows distribution, broader platforms, generated transfer tasks, and the remaining roadmap depth are not claimed complete by these automated checks.

## 0.3 implementation checks

Checked on Windows, October 10, 2026. The first daily-workspace stage is implemented, its packaged Windows runtime has passed validation, and the [0.3.0 preview downloads](https://github.com/aayups31/GitLearn/releases/tag/v0.3.0) are published and verified.

- TypeScript and production builds passed. The full backend suite passed 66 cases; a subsequent focused six-case run includes the additional moved-folder recovery case, bringing covered backend cases to 67.
- Six affected browser workflows passed on isolated ports without touching the learner's running app. The new flow exercised one project across two lessons, an actual error, hint attachment, a saved fix, reviewed checkpoints, restart, moved-folder recovery, and an isolated second course. Existing editor, setup, GitHub gating, and theme flows passed. The unchanged extension pairing/import/replay flow retains its 0.2 validation below; the 0.3 extension version is a packaging update.
- One live OpenAI check used only a tiny synthetic lesson and program. A real ReferenceError produced a course-cited hint, the corrected saved program ran successfully, and a reviewed checkpoint was saved. No learner files or paid-course material were read.
- The source Electron runtime and actual packaged `GitLearn.exe` passed first-run setup, encrypted sample-key persistence, extraction of the included extension, a bound course project, local JavaScript execution, and restoration of the file, run output, and note across a full app restart. Readiness checks passed. The source scenario completed in twenty seconds and the packaged scenario in twenty-three seconds. Both used temporary profiles and a sample key without OpenAI requests.
- Both static-site scenarios passed desktop, phone, keyboard navigation, privacy, reduced-motion, and no-JavaScript checks. The site made no requests to workspace APIs. Packaged site copy includes the updated run-evidence privacy disclosure.
- Configured-key and environment-file scans passed for the staged source, public site, frontend, extension, desktop ASAR, and external extension resources. The packaged app and included extension both report version 0.3.0. Published download requests returned HTTP 200 with the expected sizes; GitHub's SHA-256 asset digests and the downloaded checksum file match the tested local assets.

| Public asset | Bytes | SHA-256 |
| --- | ---: | --- |
| GitLearn-Setup-0.3.0.exe | 115,946,942 | `97b35354ae3174ed3a113cadfc534944c4283748a5ac6b297eae16d42a6b2290` |
| GitLearn-Chrome-0.3.0.zip | 137,008 | `54bc402e754f87e9c29aea77e5e636f91d5b0c7dcc78783022857f4b01dd8d82` |

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
