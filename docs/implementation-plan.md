# Git for Learning: Full Scope and Implementation Plan

Status: the Udemy-first Windows 0.2 preview is delivered. [Current build](current-build.md) lists shipped capabilities. Updated direction, October 10, 2026: [Learning to contribution](learning-to-contribution-roadmap.md) is the active next-release plan, with [supporting architecture](learning-architecture.md). It prioritizes daily resume, contextual tutoring, real projects, practice, evidence-backed memory, and guided open source work. Coding-agent integration is deferred at the user's request. The older rollout below remains a reference; its platform-expansion sequence does not override the active roadmap.
Prepared October 4, 2026, from all 112 sections of `GIT_FOR_LEARNING_PRODUCT_SPEC.md`.
Architecture details: [architecture.md](architecture.md).

## 1. Product understanding

Git for Learning connects the context of learning with the work it produces. It preserves learner code, notes, attempts, progress evidence, and meaningful versions in a portable Git history. Its long-term value is answering “show me how I learned this” from the learner's own artifacts.

The three layers are:

| Layer | User outcome | Core capabilities |
| --- | --- | --- |
| Quick Save: Capture | My work is safely preserved with context | Accepted solutions, manual saves, meaningful checkpoints, grounded commits |
| Course Mirror: Structure | My course has a workspace that stays organized | Curriculum manifest, lesson folders, code/notes mapping, conservative refresh |
| Learning Memory: Remember | I can recover and compare what I learned | Timeline, search, cited questions, reattempt comparisons, concept evolution |

Course Mirror is explicitly enabled. Learning records preserve the learner's work and lightweight course structure/resources. They do not automatically copy full paid content. AI improves semantic descriptions; deterministic code owns storage, paths, events, Git, and synchronization.

The later specification (§§79–112) refines the earlier broad MVP (§59). The user selected Udemy with local coding for the first release. The October 10 direction adds a path from tutorial practice to independent projects and real open source contribution before broad platform expansion. Coding-problem capture and interactive course adapters remain planned. Filtering/secret scanning precedes AI, following §101.

## 2. Full product scope

| Area | Full planned capability | First delivery / later expansion | Spec |
| --- | --- | --- | --- |
| Coding problems | Problem context, exact accepted code, reattempts, multiple languages, optional failed attempts, linked equivalent problems | MVP 1 after Udemy: LeetCode, then NeetCode context; other platforms later | 4, 30–33 |
| Interactive browser courses | Curriculum/exercise detection, learner-code capture, completion evidence, ownership filtering | One of freeCodeCamp/Codecademy in MVP 2; the other and Coursera later | 5, 94, 110 |
| Video + local coding | Course/section/lesson context joined to approved workspace changes | Udemy and VS Code in MVP 0, the first release | 6, 61, 95 |
| Theory/no-code sessions | Learner notes, completion evidence, optional note cleanup | MVP 0 | 7, 24, 62 |
| Existing course repositories | Preserve source Git configuration/history; separate learner mirror or explicit direct-repo mode | Nonmutating source mirror in MVP 0; direct-repo automation later | 8, 32 |
| YouTube | Workspace association and timestamped checkpoints/notes | Expansion after MVP 2 | 9 |
| Independent learning | Topic + approved workspace without a browser platform | Shared session engine in MVP 0 | 10, 13 |
| Notebooks/data science | Meaningful notebook versions, configurable outputs, dataset references, token checks | Later local notebook support; Colab/Kaggle/JupyterLab adapters separately | 11 |
| Course projects | Project-sized work, promotion to a separate repo with meaningful history and timeline link | Later expansion | 12 |
| Independent practice | Contextual debugging, lesson tasks, changed-requirement attempts, hints, actual behavioral feedback | Active roadmap stages A–C | October 10 direction |
| Learning outcomes | Evidence-backed skill records, personal review, cited past attempts, project development story | Active roadmap stages C–D | October 10 direction |
| Live work | Explainable repository/issue matching, contribution prerequisites, repository tutor, reproduction/tests, reviewed PR drafts and feedback | Active roadmap stages E–F | October 10 direction |
| Coding agents | Explore provider-supported integrations and account entitlements only in a later separately scoped stage | Explicitly deferred | October 10 direction |
| Books/docs/articles/PDFs | Manual source/chapter/topic and permitted references | Manual context in MVP 0; richer capture later | 13, 53 |
| Onboarding/storage | Local-only, selected private GitHub repo, explicit new private repo; platform/workspace grants | MVP 0; public-product GitHub App later | 14, 28 |
| Session/checkpoint controls | Active/idle/pause/finish, notes, commit preview/edit/discard, exclusions, local-only, strong and soft triggers | Workspace sessions and controls in MVP 0; problem events in MVP 1 | 15–19, 45, 50–54 |
| Course Mirror | Optional Mirror Course action, manifest, scaffold, current lesson workspace, partial discovery, refresh, progress, resources, conflict review | MVP 0; richer interactive capture in MVP 2 | 79–95, 105–107 |
| Timeline/Continue | Recent sessions, last lesson/workspace, useful activity and progress views | Recent course sessions and Continue in MVP 0; richer views later | 20–21, 47–49 |
| AI assistance | Grounded commits, note cleanup, summaries, concept suggestions, ambiguous mapping proposals | Commits and note cleanup in MVP 0; richer analysis later | 25–26, 56, 97–103 |
| Learning Memory | Keyword/semantic search, historical questions with citations, comparisons, concept graph/evolution | After capture and mirror are reliable and real history exists | 22–23, 64, 104 |
| Further evidence features | Learning replay, personal-history tutor, resume evidence, course migration | Optional long-term roadmap | 65–69 |
| Reliability/portability | Offline checkpoints, push retries, conflicts, device IDs, understandable Git data and export | Single-device recovery from MVP 0; multi-device and richer export later | 34–37, 57–58, 107 |
| Privacy/ownership | Selected roots, hard exclusions, secret scans, private targets, course-content boundaries, provenance | Required from foundation | 27–29, 32, 91–93, 98–100 |
| Adapter maintenance | Isolated selectors, versions, capability checks, manual capture/lesson fallback | Required for every released adapter | 38–42, 54–55, 86–87 |

Progress means observed or declared completion/activity, never automatically asserted mastery. Preserve original notes and distinguish generated text. Every future memory answer must cite learner artifacts/commits.

## 3. Proposed defaults and scope decisions

These are the original proposed defaults. The first delivery uses the simplifications documented in [current-build.md](current-build.md).

| Decision | Proposed default |
| --- | --- |
| Initial platform coverage | Windows + Chrome; verify Edge before advertising it |
| Companion | Standalone local companion required for capture/Git; VS Code optional for Quick Save |
| First adapter | Udemy course/section/lesson context and accessible curriculum, with manual fallback |
| First course mirror | Udemy with partial accessible curriculum and manual lesson fallback |
| MVP 2 platform | freeCodeCamp proposed; switch to Codecademy if the adapter feasibility work demonstrates a better first supported flow |
| Primary repository | Private `learning` repository or user-selected equivalent; local-only available |
| GitHub onboarding | Existing Git credential helper/SSH; authenticated GitHub CLI for explicit private repo creation, guided creation fallback |
| Existing source repo | Nonmutating learner mirror; no changes to its index/remotes/history |
| Automation | First release uses explicit Start/Finish Session; lesson completion and note cleanup reviewed; soft triggers propose. Accepted-save follows in MVP 1 after target approval |
| AI and upload | Separate switches; strict local-only disables both GitHub and OpenAI |
| Filesystem behavior | Open the right lesson workspace; no silent moving/reorganizing of arbitrary files |
| API key | Companion-only `.env` for development; OS secret store for packaged use; support existing `OPEN_AI_API` alias |
| Dashboard/backend | Defer until capture and mirror are validated; initial history lives in extension/editor UI |
| AI model | Configurable, evaluated economical Structured Outputs model; pin during foundation work without tying domain logic to a model name |

Deliberate MVP exclusions: browser-only/GitHub-only execution, every learning platform at once, cross-device automation, arbitrary existing-repo commits, notebook cloud adapters, project history extraction, hosted accounts/billing, vector database, concept graph, tutor, and course downloads. These remain roadmap items where specified.

## 4. Delivery sequence

The active sequence after the shipped preview is A: daily workspace, B: practical projects, C: practice and feedback, D: memory and review, E: open source discovery, F: contribution workspace, then broader access. Each stage has user-outcome acceptance criteria in [the active roadmap](learning-to-contribution-roadmap.md#8-delivery-order-and-exit-criteria). The foundation/MVP sequence below records the original rollout and retained platform backlog.

### Foundation: reliable local save and integration feasibility

Build only the foundation needed by MVP 0. Confirm current Node/Git/packaging compatibility and choose pinned dependencies. Add `.gitignore` and safe example configuration before Git initialization or staging. Preserve the existing `.env`; never place its contents in generated documentation or browser bundles.

Deliverables:

- Workspace scripts, TypeScript setup, schema/protocol contracts, and shared IDs.
- Windows companion setup, native host registration, stable development browser ID, per-user IPC, secret provider, and packaged SQLite validation.
- SQLite migrations, durable event inbox/job journal, restricted local candidate store, deduplication, and restart recovery.
- Native Git target registration, deterministic organization, snapshot/ignore/secret pipeline, and deterministic commit fallback.
- Udemy feasibility spike: accessible course/section/lesson context, partial curriculum discovery, and explicit workspace binding, with manual selection fallback.
- OpenAI task schema/prompt and mock provider; model choice and real call only when implementation reaches the AI integration step.

Completion gate: a synthetic or manually supplied learner artifact produces a safe local Git checkpoint; a replay/restart does not duplicate it; the browser can exchange validated messages with the companion. Environment secrets are absent from the candidate, prompt fixtures, logs, and generated packages. A documented supported page flow passes feasibility; unknown flows are labeled unsupported.

### MVP 0: Udemy Course Mirror, local coding, and VS Code

This is the first user-facing release, as requested. Depends on foundation checkpoint/storage contracts. Implement the Udemy context/curriculum adapter, persistent browser outbox, VS Code client, trusted workspace grants, explicit session association, saved-file observation, and manual local topics/sources.

Add normalized manifests, Mirror Course configuration/preview, portable scaffold, stable ID/path mapping, Open Lesson Workspace, partial discovery, conservative refresh, resource references, note-only checkpoints, and grounded note cleanup. Source-workspace mirroring is explicit and nonmutating. Generated placeholders do not assert completion or manufacture code.

Include local-only onboarding, existing/private repository selection or creation, optional AI commit messages, a separate retryable GitHub push queue, exclusions, pause, checkpoint preview/edit/discard, Recent Learning, and Continue Learning. The end-to-end workflow is: open Udemy lesson, optionally mirror the course, select/open the local lesson workspace, start a session, watch and code normally, finish, review, save locally, and optionally sync.

Acceptance:

1. Explicit Mirror Course creates `COURSE.md`, `course.json`, useful section/lesson placeholders, and a correct active lesson destination.
2. Open Lesson Workspace attaches a session; selected code and notes checkpoint against that lesson. Tab changes and reference tabs do not end or misassign it.
3. A title/order change preserves item identity and allocated folder; new items add safely; absent items in partial parsing are not deleted.
4. Learner edits to notes/scaffolding survive refresh; source/mirror conflicts require review. Existing source-repo Git state remains unchanged.
5. A theory lesson records only completion evidence and actual learner notes. AI-disabled/offline save remains complete.
6. A local-only independent session works without a supported browser page. Strict local-only makes no OpenAI or GitHub request.
7. Progress distinguishes discovered versus total curriculum; manual lesson selection keeps the workflow usable when extraction fails.
8. A complete video-plus-local-code session creates a correct local commit and optional GitHub push without learner Git commands. Setup supports a new private repository, an existing private repository, or no GitHub connection.
9. Disconnected/restarted browser or companion recovers pending work. API failure permits a deterministic checkpoint; GitHub failure shows saved/committed/pending separately. Duplicate events do not duplicate checkpoints.
10. Known secret fixtures, excluded folders, untracked sensitive files, and hostile paths cannot reach commits, AI requests, or logs.

### MVP 1: Quick Save from a coding problem

Depends on the proven MVP 0 checkpoint/storage/sync infrastructure. Implement one LeetCode editor/submission flow, followed by NeetCode context. Add problem detection, language context, exact submitted-code capture, verdict association, deterministic artifact paths, and accepted-event triggers. Keep browser-specific code capture separate from Udemy's local-file workflow.

Acceptance:

1. A real supported accepted solution produces code, metadata, and a correct local commit and optional GitHub push under the configured policy.
2. Editing the page after submission does not alter the captured attempt; if exact matching fails, the UI requests manual capture.
3. A second language is stored separately; a changed later attempt remains traceable; duplicate events are idempotent.
4. Reuse MVP 0 privacy, restart, API-outage, GitHub-retry, preview, and local-only guarantees without platform-specific forks in the checkpoint engine.

### MVP 2: one interactive course platform

Depends on Course Mirror and ownership-aware capture. Confirm freeCodeCamp versus Codecademy using an authenticated real-page feasibility check before committing to the adapter. Implement one course/editor family well, including curriculum mapping, exact learner changes, visible exercise completion evidence, and incremental mirror progress.

Acceptance: a supported exercise maps to the right lesson, captures eligible learner work with starter-code provenance, excludes harness/instructions/hidden tests, updates observed progress, and creates a meaningful checkpoint. An adapter failure falls back to manual capture without breaking the other product layers.

### Expansion: portability, platforms, projects, and richer history

Add the second interactive platform, YouTube timestamps, Coursera where feasible, local notebooks, failed-attempt preservation, explicit attempt linking, richer timeline/filter/search, export/import, and multi-device reconciliation. Provide notebook output limits and dataset references before cloud notebook capture. Implement project promotion as an explicit operation with verified history preservation and a retained timeline link.

Acceptance gates are per capability: supported platform fixtures plus a real-flow check; export restores a readable history; multi-device conflicts do not lose work; project promotion preserves the selected history and leaves the original learning record accessible.

### Learning Memory and optional hosted product

After a useful corpus exists, add full-text/structured retrieval first, then opt-in embeddings, historical Git revision chunks, questions with citations, attempt comparisons, and concept evolution. Add concept graph/replay/tutor/resume evidence only when the corresponding evidence and evaluation coverage exist.

A hosted dashboard/account/API/GitHub App broker is a separate product milestone. Define authentication, per-user isolation, private-key handling, deletion/export, billing, and optional index synchronization before hosting content.

Acceptance: queries resolve to exact artifact revisions with usable citations; absent evidence yields an explicit gap; excluded/deleted data does not reappear through the index. The portable repository remains useful without the product or a hosted account.

## 5. Work ordering and parallelization

The dependency path is:

```text
contracts + grants + storage + transport
  -> workspace snapshots + safety + Git checkpoint
  -> Udemy adapter + parser + manifest + mirror + VS Code sessions
  -> optional AI + GitHub queue
  -> MVP 0: Udemy + local coding
  -> exact submitted-code capture + accepted-result correlation
  -> MVP 1: coding-problem Quick Save
  -> interactive adapter
  -> MVP 2
  -> expanded history/search
  -> Learning Memory / optional hosting
```

After agreeing schemas and ownership boundaries, work on the Udemy adapter, companion persistence/Git, mirror, and VS Code clients can advance as their dependencies permit. Mirror/VS Code work depends on stable session/checkpoint contracts. Implement coding-problem capture after the Udemy workflow is usable. Memory work depends on revision/citation metadata and a real corpus. Do not create empty future apps/packages just to match a diagram.

Time estimates should follow the feasibility/packaging milestone: authenticated platform extraction and installer behavior are the largest unknowns. The full spec is a multi-release product; treat each acceptance gate as a reviewable increment rather than promising the entire roadmap in one build.

## 6. Verification plan

| Concern | Meaningful verification |
| --- | --- |
| Exact capture | Submitted-content fixture and real attempt; edit editor before verdict to ensure no false association |
| Idempotency/recovery | Duplicate event, browser suspension, disconnected transport, and companion crash around persistence/commit boundaries |
| Snapshot integrity | File changes during scan/AI/preview; committed hashes must match reviewed and scanned candidate |
| Secret/privacy pipeline | Known keys/private keys/env files, notes/metadata secrets, removed diff lines, excluded roots, redacted diagnostics |
| Git safety | Temporary real repos with staged unrelated/overlapping work, concurrent HEAD changes, conditional ref-update failure, index reconciliation crash, unscanned outgoing commits, revoked credentials, protected branch and divergent remote |
| Mirror safety | Same title twice, stable-ID rename/reorder, partial curriculum, removed remote lesson, learner-edited generated file, source/mirror divergence |
| Paths/IPC | Traversal, symlink/junction escape, reserved names, malformed messages, wrong extension/client and revoked grants |
| Offline/local-only | Network-disabled capture; AI and GitHub independently disabled; restart with push pending |
| AI grounding | Mock responses plus small real evaluation: no invented features, complexity, mastery, or authorship; refusal/malformed/timeout fallback |
| Packaging | Clean Windows user install/uninstall, native host registry IDs, packaged DB/runtime, Chrome and separately Edge |
| Memory later | Exact commit/path/line or cell citations, older revisions, no-evidence answers, excluded/deleted chunk removal |

Use synthetic/sanitized fixtures in the implementation repository; do not commit private learner captures or platform credentials. Live authenticated platform checks happen against the user's supported access at implementation time. Tests verify safety and user outcomes rather than restating internal code.

## 7. User-review checkpoints

The user reviewed the direction, selected Udemy first, authorized implementation, and requested continued GitHub pushes. The source and Windows/Chrome preview downloads are published in the GitLearn repository. Vercel configuration is included, with account import required for the public landing page; Chrome Store submission is pending. A separate live check verified embeddings, a cited synthetic course answer, and an AI checkpoint without learner data. Credentials were not printed or bundled. See [release validation](release-validation.md).

The shipped product uses the Windows desktop app, Chrome, a local companion, an embedded editor with optional VS Code, optional learner GitHub setup, and nonmutating course checkpoints. The next work is defined in the October 10 roadmap. Additional adapters remain candidates to validate after the learning workflow is useful; no unimplemented platform is advertised as supported.

The MVP's usefulness is validated when a week of ordinary learning produces useful, recoverable, correctly attributed history with minimal manual organization, trustworthy checkpoints, and a clear Continue Learning view (§75). Automated fixture tests validate the first build's technical workflow; live course use remains necessary. AI and GitHub actions are explicit opt-ins in Setup.
