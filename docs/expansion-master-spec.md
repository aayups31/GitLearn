# OUTCLASS --- THE COMPLETE EXPANSION BLUEPRINT

**Academy · Creator Studio · Go-To-Market Intelligence**\
**Product requirements document + AI agent specification + systems architecture + implementation playbook**\
**Version:** 1.0 · October 2026\
**Existing product:** [OutClass](https://github.com/aayups31/OutClass)\
**Status:** Vision and implementation specification; features below are **proposed**, not assertions of existing functionality.

> **North star:** An instructor turns expertise into a rigorous, executable course; transforms that course into authentic creative assets; distributes those assets; learns which channels produce enrollment and revenue; and uses actual student outcomes to improve the course. All practical learning happens in the **existing OutClass Learn workspace**.

------------------------------------------------------------------------

## 0. The non-negotiable product contract

OutClass Learn already exists. **Do not rebuild, replace, or substantially redesign the learner workspace.** The new work consists of exactly three major products:

1.  **OutClass Academy:** course commerce, discovery, authoring, delivery, executable curriculum, learning intelligence, and the **Academy Architect**.
2.  **OutClass Creator Studio:** brand-aware, course-grounded multimedia production, editable assets, and the **Creative Director**.
3.  **OutClass GTM:** organic distribution, advertising, attribution, experimentation, and the **Growth Strategist**.

The existing learning app is a *capability provider*, not a fourth implementation track. Inspect its actual interfaces before integrating: lesson/course context, coding execution, repositories/Git, assessments, retrieval, local data, permissions, and optional synchronization. Build thin adapters, versioned contracts, and consent-based data exchange; never assume APIs or schemas exist without verifying them.

**The central moat is the feedback loop:** course design → real exercises → demonstrated skills → creator-quality evidence → campaigns → paid enrollment → learning outcomes → better curriculum. A traditional marketplace could build pieces of this, but OutClass can integrate them natively because it already owns a practical learning workflow.

### Product principles

-   **Execution over consumption.** A course is valuable when students can *do* something they could not do before.
-   **Evidence over claims.** Never fabricate educational outcomes, marketing metrics, testimonials, source citations, agent actions, or platform integration status.
-   **Creative control.** AI proposes and produces; instructors retain ownership, editability, approval, and the ability to decline recommendations.
-   **Business accountability.** Measure acquisition and attributable revenue, not only impressions, content volume, or vanity engagement.
-   **Human authority over consequences.** Payments, public publishing, course changes, advertising spend, and external submissions require explicit permission and appropriate review.
-   **Local-first respect.** No covert upload of learner repositories, source code, notes, or personal information.
-   **Depth before breadth.** A real working YouTube integration beats eight pretend social integrations. A verified executable project beats a thousand generated quiz questions.
-   **Modular agentic intelligence.** Three flagship agents, each backed by specialized workers, tools, memories, validators, and evaluations. Avoid pointless agent proliferation.

### Outcomes by persona

  ----------------------------------------------------------------------------------------------------------------------------------------------------------
  Persona                   Job to be done                                   Evidence of success
  ------------------------- ------------------------------------------------ -------------------------------------------------------------------------------
  Independent educator      Turn knowledge into a compelling course          Published course with tested lessons, exercises, and clear learning outcomes

  Technical instructor      Turn tutorials into real engineering practice    Runnable projects, test suites, authentic scenarios, skill evidence

  Course creator            Turn existing material into professional media   Editable, approved, platform-specific videos, graphics, and copy

  Solo education business   Grow without hiring an entire marketing team     Attributed enrollment, spend, conversion, revenue, and repeatable experiments

  Learner                   Learn and demonstrate independent competence     Project artifacts and verified assessments in existing OutClass Learn

  Academy operator          Maintain marketplace trust                       Reliable checkout, rights management, moderation, refunds, payouts, quality
  ----------------------------------------------------------------------------------------------------------------------------------------------------------

------------------------------------------------------------------------

# PART I --- OUTCLASS ACADEMY

## 1. Academy: product mission

**Academy is an executable education marketplace.** It hosts and sells courses, but its defining feature is an agent that can design a *living, assessable, project-based curriculum* connected to OutClass Learn. An instructor may start with a finished course, rough recordings, PDFs, a repository, or just a subject and teaching objectives. Academy Architect should help turn that into a course with validated concepts, projects, exercises, grading rubrics, optional adaptive branches, and meaningful proof of work.

The product must also work for educators who already sell elsewhere: offer import/analysis of **authorized** material and an embeddable or companion practical-learning layer, where allowed, before insisting they migrate their business.

## 2. Academy surface area

### 2.1 Public marketplace and discovery

-   Search by outcome, topic, skill, difficulty, duration, language, instructor, format, price, and prerequisites.
-   Goal-based search: "Build a production API," "Learn Python automation," "Prepare for systems interviews," rather than only keyword matches.
-   Course pages with clear outcomes, instructor credentials as provided and verified where possible, curriculum, prerequisites, sample lessons, projects, assessment model, accessibility, refund terms, and honest completion expectations.
-   Transparent ratings and verified-enrollment reviews, abuse prevention, moderation, disclosure for sponsored placement.
-   Recommendations that explain fit: prerequisite match, goals, content format, budget, and available evidence; avoid pretending to know a student's ability.
-   Free previews, free courses, paid courses, bundles, cohorts, subscriptions **as later optional business models**, and instructor-owned landing pages.
-   Structured metadata for discoverability: canonical URLs, appropriate schema markup, indexing controls, sitemap, open-graph images, creator pages, shareable projects, and localization.
-   Public course comparison and "what you will actually build" project showcase, without exposing private or proprietary solutions.

### 2.2 Creator administration

-   Individual and organization accounts; multiple instructors, editors, reviewers, finance admins, and support staff.
-   Course drafts, scheduled publishing, version history, change review, rollback, prerequisite checks, lesson preview, access windows, instructor announcements, cohorts, and student support.
-   Lesson types: video, article, interactive notebook/code exercise, quiz, scenario, assignment, capstone, live session link, file/resource, external authorized embed.
-   Assessment rubrics, question banks, partial credit where reliable, attempts and deadlines, accommodations, plagiarism review with due process, instructor override.
-   Enrollment analytics, curriculum analytics, learner feedback, revenue reporting, refunds, support tickets, moderation queue, content ownership/license tracking.
-   Reusable components across courses: prerequisite modules, coding labs, validated question banks, project templates, diagrams, and branded course templates.

### 2.3 Enrollment and commerce

-   Entitlement-based access; free enrollment and paid purchase; receipts, invoices as supported, promotions/coupons, gifting later, refunds and disputes.
-   Provider-hosted checkout; verified webhooks; idempotent enrollment provisioning; price snapshots; tax handling by applicable jurisdictions; currency and creator payout support subject to provider capability.
-   Distinguish gross sales, refunds, processing fees, taxes, platform fees, net proceeds, pending payouts, and completed payouts.
-   Anti-fraud signals, abuse review, chargeback workflows, role-separated financial operations, immutable financial event history.
-   Accessible billing explanations and creator financial exports.

### 2.4 Delivery through existing OutClass Learn

-   Learner opens a lesson from Academy, then **launches the existing OutClass workspace** for its exercise/project using a signed, scoped, expiring launch grant or another verified integration method.
-   Synchronize only approved identifiers and data: course, lesson, assignment, enrollment entitlement, project template version, progress events, assessment results, and opt-in skill evidence.
-   Support offline learning with later reconciliation if existing architecture permits; show synchronization state and conflicts.
-   Preserve the desktop app's local data ownership and existing AI learning flows. Academy must not run its own shadow IDE or duplicate existing Tutor/Architect functionality.
-   Instructors can choose what evidence is visible: aggregate completion, specific assessment submissions, or explicitly consented project artifacts. Private Git history remains private unless shared.

## 3. Academy Architect --- flagship agent

**Persona:** elite curriculum designer + technical educator + software architect + assessment engineer + research librarian + educational data analyst + quality engineer.

**Core mandate:** turn a subject or source material into an educational system whose outcomes can be tested, practiced, demonstrated, and improved.

### 3.1 Inputs

-   Instructor brief: topic, audience, goals, teaching philosophy, required prerequisites, time budget, constraints, difficulty, desired projects, languages, standards, accessibility requirements.
-   Source materials: recordings, transcripts, slide decks, PDFs, documents, licensed articles, code repositories, existing lessons, quizzes, datasets, instructor examples.
-   Course business context: target audience, price positioning, existing learner feedback, competing public curricula (authorized research only), and creator brand.
-   Optional aggregate, privacy-safe outcomes from OutClass Learn: failed tests by objective, hint usage patterns, assessment performance, common conceptual errors, project completion and time ranges.

### 3.2 Outputs --- always structured and editable

-   Course design brief, audience/personas, competency objectives, prerequisite DAG, lesson map, time estimates and workload assumptions.
-   Evidence-backed course research notes with sources and confidence/limitations.
-   Complete lesson drafts, code examples, diagrams, slides/scripts, resource lists, accessibility review.
-   Exercise specifications, starter repositories, test harnesses, grading rubrics, capstone architecture, and scenario environments.
-   Instructor review packets, risk register, quality/validation reports, publication checklist, and revision proposals.
-   Course-version manifest connecting all assets and executable learning artifacts.

### 3.3 Agent workflow

1.  **Discover:** interview instructor and inspect source materials; ask only consequential questions.
2.  **Map:** build concept graph, measurable outcomes, and prerequisite dependencies.
3.  **Design:** propose modules, pedagogical progression, projects, practice cadence, and evaluation plan.
4.  **Critique:** subject specialist and pedagogy specialist challenge gaps and unsupported claims.
5.  **Produce:** generate drafts, exercises, source-linked explanations, and technical artifacts.
6.  **Execute:** compile/run code, verify test cases, launch scenario sandboxes, and validate starter assets.
7.  **Review:** instructor approves, edits, or rejects individual changes; maintain provenance and diffs.
8.  **Publish:** validate entitlements, rights, accessibility, and course manifest before publication.
9.  **Observe:** ingest permitted learning evidence, detect systematic weaknesses, propose experiments.
10. **Improve:** stage revisions, run regression tests, compare cohorts cautiously, release with rollback.

### 3.4 Academy Architect subagents and their tools

  -----------------------------------------------------------------------------------------------------------------------------------------------------------------
  Specialist                    Deep capability                                                       Required tools/validation
  ----------------------------- --------------------------------------------------------------------- -------------------------------------------------------------
  Curriculum Systems Designer   Objective decomposition, prerequisite DAG, instructional sequencing   Graph validator, curriculum diff, coverage matrix

  Domain Researcher             Subject research and source provenance                                Search/retrieval adapters, citations, fact ledger

  Technical Instructor          Accurate explanations and worked examples                             Code execution, symbolic/numeric checks where relevant

  Project Compiler              Transform outcomes into milestone-based runnable projects             Template generator, build runner, tests, package manifest

  Assessment Engineer           Questions, rubrics, hidden tests, item analysis                       Test harness, grading schema, leakage checks

  Scenario Engineer             Reproducible bugs, outages, incident environments                     Sandbox, fault injection, seed control, reset/snapshot

  Pedagogy Critic               Cognitive load, accessibility, scaffold levels                        Objective coverage, readability checks, accessibility tests

  Skill Evidence Analyst        Connect work artifacts to competencies with uncertainty               Event queries, evidence graph, confidence calibration

  Course QA Auditor             Verify consistency, legal rights, technical validity                  Link checker, license audit, dependency/install tests

  Curriculum Optimizer          Suggest measurable revisions based on aggregate evidence              Cohort analysis, experiment planning, approval workflow
  -----------------------------------------------------------------------------------------------------------------------------------------------------------------

These are capabilities, not a requirement to spawn ten models on every task. Use deterministic checks first; invoke specialist reasoning only when needed.

## 4. Academy's signature features --- maximum differentiation

### A1. Course-to-Project Compiler (flagship)

An instructor uploads a conventional Python/backend/React/C++ course. The agent identifies the concepts, builds a project dependency map, and generates an *entire sequence of working engineering deliverables*.

**Output example --- backend engineering course:**

1.  Request parsing and validation micro-lab.
2.  REST CRUD service with correct status codes.
3.  Persistent storage with migrations and indexes.
4.  Authentication, authorization, and permission tests.
5.  Concurrency and idempotency challenges.
6.  Observability, fault recovery, and performance tests.
7.  Final independently scoped service with README, architecture decisions, and CI.

For each stage generate: learning objective, starter project, repository structure, acceptance criteria, visible tests, private evaluator tests, environment specification, reference solution for instructor-only review, rubric, hint ladder, expected runtime, and failure modes. **Execute and verify** reference solutions before release. Mark unverified artifacts as drafts.

### A2. Executable Course Validation Laboratory

Before publication, run a course through an automated lab:

-   Check every referenced repository, package, dependency, version, command, environment variable, link, and file.
-   Compile and run code examples in declared environments.
-   Test starter projects and reference solutions separately; ensure starter intentionally fails only expected tests.
-   Validate exercise test determinism, timeouts, memory usage, platform support, hidden-test fairness, and resetability.
-   Detect lessons whose code contradicts explanations or whose stated prerequisites are absent.
-   Generate a precise validation report: pass/fail, evidence, environment, logs, and suggested repairs.
-   Revalidate on course updates, dependency upgrades, or runtime changes.

This is a **course CI/CD pipeline**, not a decorative "quality score."

### A3. Living Skill Graph and Evidence Ledger

Model each skill as a versioned node linked to prerequisites, lessons, exercises, rubric criteria, and project evidence. Record observed events with provenance: which test passed, which concept was demonstrated, what help was used, what instructor assessed, and when. Separate:

-   Exposure: student encountered a topic.
-   Guided performance: student completed with hints.
-   Independent performance: student solved without substantial scaffolding.
-   Transfer: student applied it to a novel context.
-   Retention: student demonstrated it after time elapsed.

Do not label students "mastered" from one passed test. Use calibrated, interpretable confidence and allow correction. Give learners control over sharing. Show instructors **aggregate concept bottlenecks** without exposing private code by default.

### A4. Adaptive Project Compiler / Branching Curriculum

The Architect maintains instructor-approved core objectives while offering individualized optional paths:

-   Remediation: a smaller exercise targeting an identified prerequisite.
-   Stretch: add concurrency, scale, testing, security, or performance requirements.
-   Domain branch: same concept expressed through games, finance, scientific computing, football analytics, or robotics.
-   Scaffold branch: guided → collaborative → independent, with explicit learner control.
-   Accessibility branch: equivalent objectives through alternative formats or accommodations.

Adapt using multiple signals and explicit preferences, not simplistic completion time or opaque labels. Preserve comparable learning outcomes across branches.

### A5. Independent Builder Challenge

The final exam is an unfamiliar engineering brief, not a repetition of the tutorial project. The agent produces a fresh problem instance, testable constraints, acceptance criteria, and evaluation rubric. Example: after a course on APIs and SQL, the learner designs an event registration service with waitlists, cancellation, and concurrency. Evaluate code correctness with deterministic tests; use a review rubric for architecture and trade-offs; include a learner defense explaining decisions. Detect assessment leakage and separate public hints from private test cases.

### A6. Real-World Engineering Incident Simulator

Generate controlled, reproducible scenarios: broken migrations, race conditions, cache inconsistency, invalid auth, network failures, dependency regressions, slow queries, bad deployment configuration, and production-style logs. Students investigate rather than follow a step-by-step recipe. Every scenario includes a deterministic seed, initial state, allowed tools, incident timeline, objective, reset button, expected remediation, and audit log. Run in isolated environments with no uncontrolled external impact.

### A7. Course Digital Twin / Preflight Learner Simulator

Before launching a course, the agent constructs a **simulation of the curriculum's structure**, not a claim to simulate real human learning. It walks prerequisite paths, attempts generated exercise specifications, checks whether required information is introduced before it is assessed, and tests sample personas for missing entry requirements. Use synthetic scenarios only for structural QA. **Never present simulated students as evidence of real student satisfaction or educational efficacy.**

### A8. Dynamic Capstone Generator

Instructor specifies the target skill bundle; the agent creates multiple comparable capstone variants with different domains, datasets, constraints, and failure modes. A learner interested in motorsport could build telemetry ingestion; another interested in commerce could build inventory reservation. Both can be evaluated on API design, data modeling, testing, and reliability. Preserve objective equivalence, reproducibility, and rubric parity.

### A9. AI Help Provenance / Independence Meter

The learning workspace already provides AI assistance. Academy should accept **consented, summarized assistance metadata** where supported: no help, conceptual hint, targeted debug hint, code suggestion, substantial generated code. Use it to contextualize assessments and help learners understand independence. Do **not** use it for punitive surveillance or infer cheating from an imperfect model. Allow human review and contestation.

### A10. Proof-of-Work Skill Passport

Issue opt-in, verifiable artifacts: course/assessment IDs, versioned rubrics, project milestone attestations, signed instructor endorsements, approved repository references, test summaries, and explanations. Separate *verified by tests*, *reviewed by instructor*, and *self-reported*. Support revocation/correction and protect private source code. A certificate alone is not proof of employability.

### A11. Open-Source Contribution Navigator

Match demonstrated skills to verified, active public issues. Check repository health, contribution rules, licensing, issue status, maintainer expectations, and complexity. Offer codebase onboarding maps and a contribution plan through the existing workspace. **Never mass-generate PRs, auto-submit changes, or misrepresent AI assistance.** Require learner approval and respect maintainers.

### A12. Instructor Curriculum Autopilot (approval-based)

Aggregate opt-in learning signals to propose precise changes: "In module 4, 41% of eligible attempts failed because of transaction boundaries; add a 12-minute lab before the capstone." Show cohort size, uncertainty, evidence, candidate revision, expected mechanism, and how to evaluate. Generate the proposed lab, run it through Course CI, then stage it for instructor approval. No silent edits to published courses.

### A13. Assessment Robustness Lab

Challenge generated assessments with mutation tests, alternate valid solutions, adversarial inputs, common wrong approaches, timeouts, ambiguous wording checks, rubric consistency, and solution leakage checks. Detect overfitted tests and evaluate whether passing genuinely supports the claimed skill. Use human moderation for subjective scoring.

### A14. Course Knowledge Graph / Cross-Course Credit

Connect related competencies across courses without assuming completion equivalence. Recommend skipping *optional* redundant content only after a learner demonstrates prerequisites through accepted evidence or an instructor-approved diagnostic. Support stackable pathways ("SQL fundamentals" → "production backend" → "data engineering"), course dependency maps, and explicit credit rules.

### A15. Live Lab Generator from Instructor Demonstrations

When the instructor records a code walkthrough, align transcript timestamps with repository commits or file diffs if supplied. Convert the demo into checkpointed interactive labs: pause points, incomplete starter state, expected output, common mistakes, and independent extensions. Do not infer invisible code changes without evidence; flag ambiguous steps for review.

### A16. Cohort Mission Control

For instructors running cohorts: track assignment readiness, concept bottlenecks, unanswered questions, code-review workload, lab environment failures, and intervention suggestions. Provide aggregated dashboards and permissioned individual views. Offer live session agendas based on recurring questions, with privacy safeguards and instructor control.

### A17. Project Portfolio Gallery and Hiring Evidence

Students may publish selected projects, architecture decisions, demos, and verified assessments. Provide polished project pages and structured evidence of work; integrate creator/course attribution where authorized. No public leaderboard that pressures disclosure of private work; no claim of employer verification without an actual verification process.

### A18. Localization with Technical Consistency

Translate course text, subtitles, and accessible descriptions while preserving code syntax, terminology, assessment equivalence, and prerequisite structure. Flag ambiguous technical translations. Require human review for consequential content and provide language-specific search metadata.

### A19. Content Rights and Version Intelligence

Track original ownership, licenses, source versions, derived assets, permissions, and affected downstream lessons. If a creator removes a video or updates a code repository, surface all dependent lessons, assessments, promotional assets, and active campaigns for review.

### A20. Academy-to-Growth Outcome Loop

Expose *aggregate, permissioned* learning outcomes to Creator Studio and GTM: "Students build a working API by week three," only when verified and properly contextualized. Permit truthful course demonstrations as promotional evidence. Never turn individual learner activity into marketing material without explicit permission.

## 5. Academy Architect: tool stack and reliability

**Tools:** document/transcript parsers; authorized web research; semantic and keyword retrieval; knowledge graph engine; AST/code analysis; repository manager; sandbox build/test runner; dependency resolver; assessment engine; rubric evaluator; data/analytics queries; artifact/version store; accessibility validator; human approval service.

**Memory:** instructor style and constraints; course design decisions; source provenance; objective graph; accepted/rejected suggestions; versioned course history; evaluation outcomes. Scope memory by organization/course, provide inspection and deletion, and never mingle creators' private materials.

**Agent planning:** long tasks produce a plan with checkpoints and explicit artifacts. Separate proposal, draft, validated, approved, published, and superseded states. Subagents may critique one another, but final validation should rely on tests and human review where feasible.

**Acceptance examples:**

-   Given a 12-lesson Python course and a target capstone, the Architect produces a coherent 4-stage project, runnable starter repo, passing instructor reference solution, and testable rubric.
-   Given a broken dependency in lesson 6, Course CI identifies the exact command, failure, affected course versions, and remediation before publication.
-   Given low performance on an objective, the agent proposes a targeted exercise with evidence, validates it, and **waits** for instructor approval.
-   Given a learner who declines telemetry, the Academy still delivers the course; no secret progress collection occurs.

------------------------------------------------------------------------

# PART II --- OUTCLASS CREATOR STUDIO

## 6. Creator Studio: product mission

**Creator Studio is a course-aware creative production suite.** It turns real instructional material into professional video, image, audio-adjacent, and written assets that educators can edit, approve, export, and use across channels. It should feel closer to a small production agency and editor than a prompt box that returns generic marketing copy.

It must work with Academy courses **and authorized external courses**. Its key advantage is semantic access to the underlying lessons, runnable projects, validated outcomes, creator voice, and actual demonstrations. Every creative asset should be grounded in something real.

### 6.1 Primary workspace

-   Projects, folders, campaigns, asset library, searchable transcripts, source-to-asset provenance, brand kits, reusable templates, production queues, review comments, approvals, versions, exports, and usage rights.
-   Three full studios: **Video Studio**, **Design Studio**, **Writing Studio**. Shared brief and Brand DNA across all.
-   Professional editing affordances: timeline, storyboard, layers, properties inspector, asset browser, safe-area guides, undo/redo, keyboard shortcuts, live preview, comparison, and autosave.
-   Collaborative review: comment on a timestamp, frame, design element, or paragraph; compare revisions; approve or request changes; lock published assets.
-   Explicit cost/credit estimate before expensive rendering or model usage; retry, cancel, resume, and report failed renders.
-   Export editable project manifests where possible, not just flattened media.

## 7. Creative Director --- flagship agent

**Persona:** creative director + documentary editor + educational storyteller + motion designer + brand strategist + copy chief + production manager.

**Core mandate:** transform real source material into original, authentic, high-performing creative assets without making up evidence or sacrificing creator control.

### 7.1 Inputs

-   Course syllabus, approved learning objectives, lesson transcripts, video/audio, screen recordings, slides, project demos, screenshots, approved student work, creator commentary, licensed assets.
-   Brand DNA: tone, pacing, typography, color, logo, visual references, platform preferences, audience, banned phrases, required disclaimers, pronunciation and accessibility preferences.
-   Creative brief: intended platform, objective, target audience, funnel stage, offer, length, budget, references, and constraints.
-   Performance data from GTM when authorized: creative variant results, audience response, watch-time curves, click-through data, and landing-page conversions.

### 7.2 Outputs

-   Creative strategy and concept board; source-grounded hooks; storyboards and shot lists; scripts; editing decision lists; platform variants; subtitles; thumbnails; editable design compositions; post copy; accessible alt text; export packages; evidence and rights report; quality review.

### 7.3 Agent workflow

1.  **Understand:** inspect course and creator identity; identify genuinely interesting source moments.
2.  **Brief:** select target audience, platform, content objective, offer, and tone.
3.  **Ideate:** propose distinct concepts with why they might work; avoid shallow permutations.
4.  **Ground:** link every meaningful claim, clip, demo, or outcome to an approved source.
5.  **Storyboard:** define structure, pacing, visuals, text, and CTA.
6.  **Produce:** execute real video edits, render designs, draft copy, and create variants.
7.  **Critique:** evaluate factual fidelity, visual polish, clarity, rights, accessibility, and platform fit.
8.  **Review:** present editable artifacts and revision controls; human approval.
9.  **Package:** export correct formats and metadata; hand approved assets to GTM.
10. **Learn:** use approved creative feedback and real performance data to improve future work.

### 7.4 Creative Director subagents

  ------------------------------------------------------------------------------------------------------------------------------------------------
  Specialist                       Responsibility                                      Key tools
  -------------------------------- --------------------------------------------------- -----------------------------------------------------------
  Course Content Miner             Locate compelling teaching moments and demos        Transcript search, timestamp alignment, source citations

  Audience Storyteller             Develop angle, narrative arc, tension, payoff       Brief optimizer, concept evaluator

  Scriptwriter                     Write natural spoken scripts, hooks, CTAs           Brand voice memory, claim ledger

  Video Editor                     Construct timelines, cuts, reframes, captions       FFmpeg, media probe, NLE-style edit graph

  Motion Designer                  Animate titles, callouts, diagrams                  Keyframe/scene compositor, vector/animation renderer

  Graphic Designer                 Thumbnails, carousels, educational visual systems   Layout engine, templates, vector editor

  Audio Engineer                   Clean audio, balance levels, subtitles              Audio analysis, normalization, transcription

  Copy Chief                       Posts, headlines, ads, landing-page copy            Platform validators, style checker

  Brand Guardian                   Maintain voice, design tokens, visual consistency   Brand Kit, approval history

  Rights & Authenticity Reviewer   Check permissions and factual grounding             Rights ledger, claim-to-source validator

  Quality Controller               Verify exported files and human-visible results     Playback, frame sampling, subtitle sync, accessibility QA
  ------------------------------------------------------------------------------------------------------------------------------------------------

Again, use these as skills and delegated workflows, not an always-on chain of eleven expensive LLM calls.

## 8. Creator Studio's signature features

### C1. One Course → Complete Launch Creative System (flagship)

From one course, generate an **editorially coherent campaign package** rather than random isolated posts:

-   One hero course trailer with real instructor and project footage.
-   A set of concept-led short-form videos, each with distinct hook and payoff.
-   One or more YouTube educational teasers.
-   Instagram and LinkedIn carousels built from actual course concepts.
-   Project walkthrough graphics and thumbnails.
-   Search-friendly course description, email sequence drafts, social captions, landing-page copy, and optional ad variants.
-   Content matrix mapping asset → audience → platform → funnel stage → claim → CTA → tracking link.

Each asset retains its source evidence and editable production project. Creators approve the package; GTM handles distribution and measurement.

### C2. Transcript-to-Scene Intelligence

Index video at word, sentence, topic, timestamp, slide, screen change, and optionally code-change boundaries. Search for "the moment the instructor explains database indexes," then jump to the exact clip. Identify coherent clip boundaries, avoid cutting off a thought, and propose opening context and end payoff. Show why a segment was selected. Validate timestamp alignment.

### C3. Authenticity-First Smart Editing

Use source footage and real screenshots by default. Automate silence trimming, reframing, audio normalization, speaker-safe cropping, subtitle synchronization, jump-cut smoothing where appropriate, and visual callouts. Never silently alter the meaning of a demonstration. Offer optional synthetic visuals/voice only with rights, consent, and disclosure controls.

### C4. Platform-Native Creative Compiler

One approved story concept can be **recomposed**, not merely resized, for:

-   YouTube long-form and Shorts.
-   Instagram Reel, Story, feed image, carousel.
-   TikTok short-form video.
-   LinkedIn native video, document carousel, professional post.
-   X, Threads, Facebook, Pinterest, and other supported destinations.

Each variant has a platform-specific edit graph, safe areas, pacing, subtitle placement, cover crop, caption, CTA, length constraints, and validation. Capabilities depend on actual platform policies; previews are simulations, not pixel-perfect official renders.

### C5. Source-to-Claim Evidence Graph

Every promotional claim has a record: text, supporting source, approved context, restrictions, review status, and expiry. Example: "Build a REST API with tests" can be linked to the actual published capstone; "Get hired in 30 days" should be blocked absent compelling evidence and lawful substantiation. Detect contradictions when course content changes.

### C6. Brand DNA Engine

Build a brand model from approved examples, explicit preferences, fonts, logo, colors, recurring layouts, pronunciation, instructor tone, and rejected phrases. Learn from edit feedback: "Less hype," "Use my real screen recording," "No AI-looking thumbnails," "Shorter intros." Show a versioned, editable style guide. Never train across creators without permission.

### C7. Director's Cut / Human-in-the-Loop Timeline

Present an editable timeline containing tracks for video, audio, captions, graphics, overlays, and music. Each AI recommendation is a reversible edit with a reason and source. Creator can say: "Keep the first 12 seconds, remove the second hook, move the terminal demo earlier, make captions smaller." Translate these into structured timeline mutations, preview, and render. Maintain undo/redo and versions.

### C8. Project Demo Cinematographer

With instructor approval, ingest a real project demo or sanitized repository walkthrough. Generate visual narratives that show the app working: feature overview, architecture diagram, code-to-output transition, and before/after bug fix. Do not fake working product states or fabricate terminal output. If a demo cannot be executed or captured, flag it and request real footage.

### C9. Adaptive Creative Variants with Controlled Differences

Produce genuinely distinct hooks, story arcs, thumbnails, and CTAs while preserving the factual core. Maintain an experiment manifest describing the variable changed. GTM can then run controlled tests. Avoid "A/B testing" five variables at once and calling the result causal.

### C10. Long-to-Short Editorial Storyboard

From a 60-minute lecture, create a *candidate* short-form series with narrative sequencing: problem → surprising failure → technique → working result. Human selects episodes. Optimize for educational value and relevance, not sensational clipping or misleading statements.

### C11. Interactive Visual Explainer Factory

Generate accurate diagrams and motion explainers for concepts such as call stacks, database indexes, neural network state, Git branching, API request lifecycles, and algorithm complexity. Prefer programmatic diagrams and validated source data; provide editable SVG/vector or scene manifests. Never generate a pretty but technically false diagram without warning.

### C12. Thumbnail and First-Frame Laboratory

Design thumbnails using real instructor/project assets. Analyze hierarchy, legibility at mobile sizes, cropping, contrast, visual clutter, brand consistency, and truthful content representation. Generate controlled variants with clear differences. Use actual performance data later; never promise a winning thumbnail from aesthetic heuristics alone.

### C13. Multilingual Localization Studio

Transcribe, translate, subtitle, and adapt marketing assets with language-aware terminology, pacing, and visual text layout. Maintain glossary for technical words, names, product terms, and pronunciation. Human review for high-stakes claims. Optional dubbing only with rights and explicit consent; label synthetic voice use appropriately.

### C14. Accessibility-First Production

Automatic caption drafts with human correction, speaker identification, readable contrast, safe motion/reduced-motion alternatives, alt text, transcript exports, accessible PDF/carousel alternatives, and audio description where practical. Track unresolved issues before approval.

### C15. Creative Asset Lineage and Dependency Graph

A published video is linked to source clips, transcripts, course version, project demo, brand kit version, licensed music, fonts, and exported platform variants. If a course outcome changes or a license expires, identify every dependent creative asset and campaign for review. Support targeted regeneration rather than starting over.

### C16. Creator Collaboration and Review Rooms

Timecoded review comments, approval roles, client/instructor review links with expiring permissions, side-by-side revisions, change requests, and immutable approval history. A creator can approve video but reject copy; do not collapse approval into a single all-or-nothing switch.

### C17. Creator Media Library with Rights Intelligence

Track ownership, allowed uses, geographic/platform restrictions, license expiration, attribution requirements, student consent, and reuse rights. Reject exports that include restricted media. Support duplicate detection and searchable asset tags. Avoid downloading protected third-party course media without permission.

### C18. Content Series Engine

Develop coherent recurring formats: "One bug, one fix," "Build it in 60 seconds," "What the course actually teaches," "From lesson to production," "Instructor office hours." Maintain series consistency and freshness. Prevent repetitious auto-generated spam.

### C19. Content Quality Gate

Before export, verify video decodes, audio exists and is audible, captions align, required claims have evidence, no forbidden assets appear, platform format is valid, text is not clipped, CTA destination is valid, and brand rules pass. Provide a human-readable QA report and a preview. No "render successful" state without artifact verification.

### C20. Performance-Informed Creative Briefing

GTM may return permissioned data: one hook type had strong retention but poor conversion; another had lower reach but higher paid enrollments. The Creative Director suggests a new hypothesis and controlled variants, clearly separating correlation from proven effects. Optimize toward meaningful outcomes, not clickbait alone.

## 9. Production pipeline: actual engineering

### 9.1 Video workflow

`source media → media probe → transcript/scene index → editorial plan → structured edit decision list → timeline validation → FFmpeg/compositor render → quality inspection → human preview → export`.

-   Use a typed, versioned **Edit Decision List (EDL)** or equivalent composition graph: source asset IDs, in/out timestamps, track positions, crop, keyframes, overlays, subtitle segments, audio settings, transitions, and output presets.
-   Render asynchronously in durable jobs with progress, cancellation, retries, quotas, caching, and immutable source assets.
-   Verify actual codecs, dimensions, durations, captions, file sizes, and thumbnails.
-   Use media proxies for fast preview and high-resolution render for final export.
-   Implement safe upload validation, transcoding isolation, virus scanning where appropriate, and object-store lifecycle management.
-   Respect music, stock, fonts, creator likeness, and voice licensing. No hidden watermark removal.

### 9.2 Design workflow

`creative brief → source evidence → layout plan → editable design scene → font/image validation → human edits → format-specific export → QA`.

Scene graph: artboards, layers, text spans, images, vector paths, charts, guides, brand tokens, and export presets. Support PNG/JPEG/WebP, SVG where appropriate, and editable source project format. Avoid rasterizing text until final export unless necessary.

### 9.3 Writing workflow

`brief → source retrieval → claim plan → channel-specific draft → style/claims check → human edits → approved copy → GTM handoff`.

Support reusable copy variants, link tracking insertion by GTM, character-limit validation, accessibility, and creator-controlled tone. Keep original author intent. Do not auto-generate fabricated social proof.

### 9.4 Rendering infrastructure

-   Background worker pool with quotas and bounded concurrency.
-   Media artifact store, signed upload/download URLs, checksum and content hash.
-   Deterministic render manifests and reproducible output settings where possible.
-   Preview/render cost estimates; cloud vs local rendering options if feasible.
-   Job states: queued, preparing, processing, awaiting_review, succeeded, failed, canceled.
-   Logs and trace IDs that expose technical failures without leaking private media.

## 10. Creator Studio UX details

**Creative home:** "Create from course," "Start from footage," "Create a campaign package," "Continue draft."

**Course Intelligence panel:** searchable teaching moments, projects, validated outcomes, course version, approved claims, suggested narratives.

**Storyboard view:** each scene shows source clip, text, purpose, duration, visual reference, claim provenance, and editable instruction.

**Video Studio:** timeline, preview, transcript editor, caption style panel, crop controls, audio mixer basics, asset library, render queue.

**Design Studio:** artboard, layers, templates, brand tokens, image placement, typography, mobile preview, multi-artboard carousel.

**Writing Studio:** side-by-side platform variants, evidence highlighting, tone control, approved claims, tracked links preview, revision history.

**Review Center:** draft → review requested → changes requested → approved → exported/sent to GTM. Approvals tied to exact version/hash.

**Agent console:** what it plans to do, source materials used, estimated time/cost, tools invoked, artifacts produced, uncertainties, and approval requests. Do not show invented progress steps.

## 11. Creator Studio evaluation and acceptance

**Metrics:** approved asset rate; editing time saved (measured, not assumed); time to first usable draft; render success; media QA pass rate; rights violations prevented; creator revision count; cost per finished asset; factual claim grounding; accessibility coverage; downstream attributable outcomes when available.

**Acceptance tests:**

-   From a real 20-minute lesson, identify three coherent timestamped clip candidates and generate a 45-second video with synchronized captions and a valid export.
-   Produce platform variants that are **compositionally different** and pass target-format validation.
-   After "replace the opening hook and preserve the rest," modify only relevant edit-graph nodes and keep an undoable revision.
-   Reject a fabricated testimonial and show which claims lack evidence.
-   When an asset's rights are revoked, identify dependent drafts and prevent unauthorized export/publication.

------------------------------------------------------------------------

# PART III --- OUTCLASS GO-TO-MARKET INTELLIGENCE

## 12. GTM: product mission

**OutClass GTM is the growth operating system for education businesses.** It unifies course positioning, campaign planning, organic publishing, paid media, conversion tracking, enrollment economics, and evidence-based optimization.

A creator should be able to ask: **"I have a course, \$300, and four weeks. How do I reach the right students, what should I publish, what should I spend, and how do I know if it worked?"** The Growth Strategist should create an actionable plan, delegate production to Creator Studio, coordinate approved distribution, connect analytics, and update recommendations as actual results arrive.

Do not confuse "AI growth" with auto-posting. The hardest value is **measurement and decision quality**.

## 13. Growth Strategist --- flagship agent

**Persona:** head of growth + product marketer + paid media specialist + conversion analyst + SEO strategist + experiment scientist + marketing operations engineer.

**Core mandate:** grow enrollments and sustainable creator economics through defensible, measurable strategies, with strict controls on public actions and spending.

### 13.1 Inputs

-   Course offer, pricing, target audience, learning outcomes, positioning, brand, creative library, sales pages, launch calendar, constraints, target geography, budget, creator goals.
-   Authorized marketing data: social metrics, ad accounts, website events, enrollments, payments, refunds, UTM tracking, landing-page experiments, creator CRM/email data if connected and consented.
-   External research: search intent, public market trends, platform capabilities, competitor positioning, seasonality, and channel benchmarks with sources and uncertainty.

### 13.2 Outputs

-   Go-to-market brief, positioning map, audience hypotheses, channel strategy, campaign calendar, content requests to Creator Studio, ad briefs, tracking plan, conversion funnel, budget proposals, experiment backlog, weekly performance analysis, revenue attribution, recommendations, and audit-ready decisions.

### 13.3 Growth agent workflow

1.  **Diagnose:** establish offer, target audience, funnel, budget, baseline metrics, and data quality.
2.  **Research:** identify promising channels and messages with evidence and explicit hypotheses.
3.  **Plan:** set objectives, budgets, creatives, tracking, experiment design, and stopping rules.
4.  **Commission:** request approved creative work from Creator Studio with structured briefs.
5.  **Review:** ensure creative truthfulness, platform policy compliance, and creator approval.
6.  **Launch:** schedule organic posts; prepare paid campaigns; obtain required permissions and spend approvals.
7.  **Measure:** ingest platform data and first-party events; reconcile conversions and costs.
8.  **Analyze:** compare channels, creatives, cohorts, attribution methods, and financial outcomes.
9.  **Recommend:** explain next actions with uncertainty, expected upside, risks, and required approvals.
10. **Learn:** persist experiment results, channel limitations, and approved strategic decisions.

### 13.4 GTM specialist subagents

  ------------------------------------------------------------------------------------------------------------------------------------------
  Specialist                     Responsibility                                          Tools/validation
  ------------------------------ ------------------------------------------------------- ---------------------------------------------------
  Audience & Market Researcher   Segments, jobs-to-be-done, positioning                  Authorized research, source ledger

  SEO/Discovery Strategist       Search intent, metadata, topic clusters                 Search/SEO connectors where available, page audit

  Organic Channel Planner        Platform strategy and publishing cadence                Capability registry, editorial calendar

  Paid Media Planner             Account structure, audiences, budgets, creative tests   Official ads APIs, budget validator

  Campaign Operations Agent      Scheduling and platform-specific validation             OAuth adapters, durable job queue

  Attribution Analyst            Join click/session/enrollment/payment evidence          Event warehouse, identity/consent logic

  Growth Data Scientist          Cohorts, experiments, uncertainty, forecasts            SQL, statistical evaluation, simulation

  Conversion Optimizer           Landing-page and checkout improvements                  Funnel analytics, controlled test system

  Lifecycle Strategist           Permissioned email/onboarding/win-back                  Consent management, email integration

  Financial Risk Controller      Spend limits, approval, ROAS vs margin                  Policy engine, financial ledger, audit trail

  Compliance Reviewer            Advertising and platform restrictions                   Platform policy checks, legal review queue
  ------------------------------------------------------------------------------------------------------------------------------------------

## 14. GTM signature features

### G1. One-Click Campaign Blueprint (flagship)

Creator selects a course and states a goal: "Get my first 30 paid enrollments with a \$250 test budget." Growth Strategist generates:

-   Positioning and audience hypotheses.
-   Proposed channel mix with rationale and uncertainty.
-   Organic content schedule and briefs for Creator Studio.
-   Paid creative variants and proposed budgets, if appropriate.
-   Landing-page recommendations.
-   Tracking specification, UTM plan, and conversion events.
-   Experiment structure, success thresholds, and stopping rules.
-   Expected scenarios **as assumptions, not promises**.
-   A preflight checklist of missing permissions, accounts, creatives, pixels, or data.

A single action should **prepare a reviewable campaign package**, not silently launch paid ads.

### G2. Unified Organic + Paid Command Center

Connect supported social and advertising accounts to show one timeline of posts, ads, campaigns, spend, creative, visits, enrollment, and revenue. Filter by course, campaign, creator, channel, creative format, audience (when supported), date, and organic/paid. Normalize metrics but retain source-specific definitions and original values. Clearly label delayed or missing data.

### G3. Revenue Truth Engine

Reconcile marketing performance with Academy commerce: order created, payment confirmed, enrollment provisioned, refund, chargeback, fees, and creator earnings. Separate **reported conversion value**, **first-party observed revenue**, **refunded revenue**, and **estimated margin**. Explain why a campaign can show 2.0× ROAS but still be unprofitable. Maintain ledger-level auditability.

### G4. Attribution Confidence and Model Comparison

Track UTM links, first-party session IDs where consented, campaign identifiers, click IDs when allowed, referral sources, enrollment, and purchase events. Compare first-touch, last-touch, and platform-reported attribution **without summing overlapping conversions**. Show coverage and uncertainty. "Unattributed" is a valid bucket; do not force every purchase onto a channel.

### G5. Creator's Growth Scientist

Turn vague marketing decisions into explicit experiments: hypothesis, primary metric, variants, unit of randomization, audience, budget, minimum practical effect, stopping rules, duration, and analysis plan. Warn about underpowered tests, multiple comparisons, novelty effects, seasonality, and selection bias. Store results and follow-up decisions.

### G6. Budget Allocation Advisor

Given spend and conversion data, recommend *proposed* allocations with constraints, uncertainty intervals, diminishing returns, platform minimums, and risk of sparse data. Offer conservative/base/aggressive scenarios, but avoid treating observational ROAS as causal marginal return. Require approval before changing budgets; no autonomous runaway spending.

### G7. Creative-to-Revenue Traceability

Track exact approved creative asset version → published post/ad → campaign → landing page → attributable visits → purchases/refunds. Enable questions such as "Which actual project demo drove paid enrollments?" rather than "Which video had the most views?" Keep privacy and platform-data limitations visible.

### G8. Landing Page Intelligence

Audit Academy course pages for message clarity, pricing transparency, proof, load performance, accessibility, trust, CTA placement, and mobile conversion friction. Generate **editable** proposed variants. Run consent-aware controlled tests when traffic supports them. Do not invent testimonials, scarcity, or urgency.

### G9. Channel Capability Autopilot

For each platform/account, dynamically discover and display verified abilities: read analytics, create draft, publish, schedule, manage ads, upload media, fetch conversion metrics. Adapt the workflow to the real permissions. If publishing is unsupported, provide a manual export/handoff. Never pretend an API can do something it cannot.

### G10. Marketing Data Quality Monitor

Detect missing UTMs, broken redirect links, duplicated conversion events, late-arriving ad spend, invalid currency normalization, stale tokens, mismatched reporting windows, partial refunds, and unexpected drops in tracking coverage. Show confidence indicators and block aggressive optimization recommendations when data quality is poor.

### G11. Growth Memory and Strategy Journal

Store campaign hypotheses, approved decisions, creative variants, outcomes, failures, and lessons learned in a structured journal. The agent should be able to answer "What did we try last month and why didn't it work?" with links to actual data and explicit caveats.

### G12. Creator Economics Simulator

Model course price, discounts, payment fees, platform take rate, refunds, tax assumptions, CAC, contribution margin, repeat purchase, and cohort retention. Allow scenario planning: "At \$49 price and 10% refunds, what acquisition cost can I sustain?" Clearly label assumptions and avoid presenting forecasts as facts.

### G13. SEO + Search Demand Planner

Identify audience questions, relevant search terms, educational snippets, public course page opportunities, video descriptions, structured data, and topic clusters. Generate truthful content briefs for Creator Studio and measurable publishing plans. Respect search engine guidelines; no mass-produced low-value SEO spam.

### G14. Lifecycle Growth Journeys

With appropriate consent, help creators draft and manage onboarding, abandoned checkout follow-ups where lawful, lesson milestone celebrations, course update notices, referral invitations, and optional cross-sell. Support frequency caps, unsubscribe, consent records, deliverability, and respectful communication. No unsolicited mass outreach.

### G15. Conversion Funnel Debugger

Trace the funnel: impression → click → landing view → enrollment intent → checkout → payment → course access. Diagnose high drop-off, mobile UX errors, broken payment flows, misleading targeting, and slow pages. Separate technical failures from marketing hypotheses.

### G16. Creator Cross-Channel Calendar

One calendar for organic posts, ads, launch milestones, course events, landing-page tests, email sequences, and creative deadlines. Show dependency warnings: ad scheduled before course page published, content awaiting approval, missing social authorization, expired asset license, or budget conflict.

### G17. Competitive Positioning Radar

Track public, lawful information about similar courses: price, format, visible positioning, published topics, public reviews, and search presence. Summarize differentiation opportunities. Do not scrape private dashboards, misrepresent competitors, or present incomplete data as exhaustive market research.

### G18. Audience-Offer Fit Laboratory

Compare positioning angles with small, consent-aware experiments: beginner-friendly, portfolio-first, industry-specific, project-based, instructor-led. Connect creative variants to downstream conversion while acknowledging limited sample sizes. Surface evidence for improving course offer itself, not just ads.

### G19. Launch Readiness Gate

Before public launch, validate course page, payment flow, attribution links, tracking consent, creative approval, publishing permissions, ad policy status, support contact, refund policy, and analytics dashboard. Produce a launch checklist with verified vs pending states. No "launch ready" badge based on mocked integrations.

### G20. Revenue-Driven Curriculum Feedback

Use GTM + Academy together to compare promises made during acquisition with actual course experiences. If campaigns attract the wrong audience, suggest clearer prerequisites and messaging; if refund reasons reveal a real curriculum gap, route evidence to Academy Architect. Do not optimize course content merely to satisfy misleading marketing claims.

### G21. Campaign Incident Response

Alert on materially unusual conditions: sudden spend spike, tracking outage, rejected ads, repeated publishing failure, landing-page downtime, refund surge, or unexpectedly broken checkout. Offer diagnosis and approved mitigation. Automated pause is allowed **only** if the creator explicitly preauthorizes a narrowly defined protective policy and the platform supports it; otherwise request approval.

### G22. Creator Portfolio / Multi-Course Optimization

For instructors with several courses, analyze cross-sell opportunities, audience overlap, acquisition costs, course bundles, lifecycle value, and cannibalization. Keep per-course attribution and financial reporting separate; avoid optimizing solely for gross revenue at the expense of learner fit.

### G23. Attribution-Safe Influencer and Affiliate Tracking

Optional future system for referral links, creator partnerships, coupons, disclosure requirements, fraud controls, commission rules, and payouts. Track actual referred orders and refunds. Do not claim influencer ROI from vanity impressions.

### G24. AI Growth Reviews and Executive Briefings

Generate weekly/monthly summaries that answer: what changed, why it may have changed, what data is reliable, which experiments concluded, what money was spent, what revenue was observed, what decisions need approval, and what to test next. Include source links and uncertainties. Support opt-in scheduled reports.

## 15. Social platform integrations

Use official, authorized platform APIs. Build an adapter with a **capability matrix**, not a hardcoded assumption that all platforms support the same operations.

  -----------------------------------------------------------------------------------------------------------------------------------------
  Platform                Desired features                                          Verification requirement
  ----------------------- --------------------------------------------------------- -------------------------------------------------------
  YouTube                 Upload video/Shorts, metadata, analytics                  Current Google API scopes, quota, eligibility, review

  Instagram               Business/creator publishing, insights                     Meta account type, app review, supported media flows

  Facebook Pages          Page posts, video, insights                               Page permissions, app review, policy

  LinkedIn                Organization/member posting where authorized, analytics   Approved product/API permissions, account context

  TikTok                  Video posting and analytics where approved                TikTok developer product eligibility and review

  X                       Posts, media, analytics if exposed                        Current paid API access, scope, limits

  Threads                 Publishing/insights where supported                       Current official API scopes and eligibility

  Pinterest               Pins, boards, metrics where supported                     Current API permissions and account type
  -----------------------------------------------------------------------------------------------------------------------------------------

**Important:** This is a target matrix, **not a claim of available APIs or approved access**. Research current documentation at implementation time. Some platforms require business accounts, app review, paid access, or do not expose desired metrics. Unsupported operations become export/manual workflows.

### 15.1 Publishing states

`draft → ready_for_review → approved → scheduled → queued → publishing → confirmed_published | rejected | failed | canceled`.

-   Approval references the exact immutable asset version and copy.
-   Publication requires a live authorized account and platform validation.
-   Deduplicate retries using idempotency keys and platform post IDs.
-   Store errors, rate-limit windows, and next retry time.
-   Distinguish platform accepted/processing from actually published.
-   Support cancellation where platform and state permit.
-   Never fabricate success or simulate publication as real.

## 16. Paid advertising: staged integration

**Phase A: read-only** connection, campaign/spend/performance ingestion, normalization, and dashboard. **Phase B: draft** creative, audiences, budgets, and tracking for review. **Phase C: approved write** operations only when API access and safeguards are verified.

Target networks: **Google Ads, LinkedIn Ads, Meta Ads** first. Each has different account hierarchies, permissions, review policies, metric definitions, and available management operations. Use a per-network adapter and permission matrix.

### 16.1 Ad campaign entities

Advertising account → campaign → ad group/ad set → creative/ad → performance snapshots → conversion definitions → change log. Store source IDs and original currencies. Normalize separately with documented exchange-rate source and date if cross-currency comparisons are needed.

### 16.2 Spend governance

-   Read-only by default; separate read, draft, and write permissions.
-   User approval for launch, budget increases, audience changes, campaign activation, and material edits.
-   Clear amount, currency, account, dates, destination, and potential platform spend behavior at approval time.
-   Configurable platform-supported daily/lifetime limits; organization-level soft limits and alerts; explicit acknowledgement where hard caps cannot be guaranteed.
-   Immutable change log with actor, before/after, external platform response, and rollback availability.
-   No unlimited autonomous optimization loops or unauthorized ad account actions.
-   Emergency pause and protective rules only where technically supported and explicitly authorized.

### 16.3 Policy and truthfulness

Review educational claims, pricing, discounts, student outcomes, targeting, landing pages, consent, and disclosures. Do not bypass platform reviews or automate prohibited targeting. No fake testimonials, scarcity, guaranteed employment claims, or fabricated enrollment numbers.

## 17. Attribution and analytics specification

### 17.1 First-party event taxonomy

Every event has `event_id`, `occurred_at`, `received_at`, `schema_version`, `course_id` if applicable, `anonymous_session_id` when permitted, `user_id` only with proper basis, `campaign_id`, `source`, `medium`, `content`, `term`, `consent_state`, and idempotency metadata as applicable.

Core events:

-   `landing_page_viewed`
-   `course_page_viewed`
-   `course_preview_started`
-   `enrollment_started`
-   `checkout_started`
-   `payment_succeeded`
-   `enrollment_confirmed`
-   `payment_refunded`
-   `chargeback_recorded`
-   `course_access_granted`
-   `social_post_published`
-   `ad_campaign_updated`
-   `campaign_link_clicked` (only when reliably observable)

Events should not be double-counted; payment truth comes from verified provider events and internal order records, not untrusted browser callbacks.

### 17.2 Attribution hierarchy

1.  **Financial source of truth:** verified orders, settlements, refunds, and internal entitlements.
2.  **First-party observed conversion:** consented session/campaign linkage with defined attribution windows.
3.  **Platform-reported conversion:** useful but may use different windows, modeled data, and overlapping claims.
4.  **Unattributed:** preserve honestly when linkage is absent.

Show each category separately. Never add platform-reported conversions together as though mutually exclusive.

### 17.3 Core formulas

-   `CTR = clicks / impressions × 100%`.
-   `CPC = ad_spend / clicks`.
-   `CPM = ad_spend / impressions × 1,000`.
-   `Landing conversion = enrollments / eligible landing sessions` (define denominator).
-   `CAC = attributable acquisition cost / newly acquired paying customers` (define cost scope).
-   `ROAS = attributed gross or net revenue / ad_spend` (always label revenue basis).
-   `Contribution = collected revenue − refunds − variable fees − attributable ad spend − other defined variable costs`.
-   `Contribution ROI = contribution / defined investment` only with an explicit definition; avoid ambiguous "ROI."
-   `LTV` is an estimate requiring cohort history and assumptions; do not present immature forecasts as observed fact.

**Illustration:** \$5 ad spend, \$10 attributed gross course revenue → 2.0× gross ROAS. If \$3 in fees/refunds/other variable costs, contribution before other costs is \$2, not \$5. The actual economics depend on precisely defined inputs.

### 17.4 Analytics data model

-   Raw immutable source snapshots and API sync checkpoints.
-   Normalized metric tables with source/platform/time-zone definitions.
-   Campaign/ad/creative dimensions and exact external IDs.
-   First-party event stream and order ledger.
-   Attribution assignments with method/version/window and uncertainty flags.
-   Aggregated dashboard views and reproducible query definitions.
-   Freshness and quality indicators per metric.

### 17.5 Dashboard modules

1.  **Executive overview:** enrollments, collected revenue, spend, attributed revenue, ROAS, refunds, and tracking coverage.
2.  **Channel explorer:** organic vs paid performance, trend, funnel, source caveats.
3.  **Campaign detail:** assets, budget, spend, outcomes, experiments, change history.
4.  **Creative explorer:** versions, formats, engagement, conversion, provenance.
5.  **Funnel:** landing → checkout → payment → course access with drop-offs.
6.  **Cohorts:** enrollment date, course, geography where lawful, refund and retention trends.
7.  **Experiments:** hypotheses, assignments, results, statistical limitations.
8.  **Data health:** API sync, OAuth expiry, missing UTMs, duplicate events, consent coverage.
9.  **Recommendations:** evidence, expected trade-offs, approval requirements, dismiss/feedback.
10. **Finance:** creator revenue, fees, payouts, refunds, reconciliations.

## 18. Growth experiments: scientific discipline

-   Prefer randomized assignment for landing-page experiments where technically and ethically appropriate.
-   Pre-register primary metric, eligible population, start/end, planned analysis, and stopping rule.
-   Use appropriate confidence intervals or Bayesian intervals with declared assumptions.
-   Guard against peeking, small sample overconfidence, multiple testing, and channel attribution confounding.
-   When data is too sparse, recommend *qualitative discovery* or instrumentation improvements rather than false precision.
-   Separate **observed outcome**, **inference**, and **recommendation** in every report.

## 19. GTM evaluation and acceptance

**Metrics:** attributable paid enrollments; gross and net revenue; spend; ROAS; contribution; tracking coverage; data freshness; platform publishing success; experiment validity; creator decision adoption; time to identify broken funnels; false-positive alert rate; agent recommendations with verifiable supporting data.

**Acceptance tests:**

-   Creator links a course to an approved video and schedules it; only confirmed external publication is marked successful.
-   Two ad networks claim the same purchase; dashboard does **not** sum both into two sales.
-   Refund occurs after conversion; financial reporting updates and maintains event history.
-   Creator asks to increase ad budget; agent creates a proposal and **does not execute** without authorization.
-   A social API lacks publishing rights; UI offers truthful manual export rather than a fake publish button.
-   Sparse conversion data produces uncertainty warnings, not confident "winning channel" claims.

------------------------------------------------------------------------

# PART IV --- SHARED PLATFORM, AGENT RUNTIME AND ENGINEERING

## 20. Target system architecture

The following is a **candidate architecture**, subject to repository audit. Avoid inventing current infrastructure. Reuse the actual OutClass stack where sound.

``` text
                       PUBLIC WEB / CREATOR WEB
              Academy   |   Creator Studio   |   GTM
                              |
                    API / AUTH / POLICY
                              |
          +-------------------+--------------------+
          |                   |                    |
     Course/Commerce      Asset/Media         Campaign/Growth
       Domain API          Domain API            Domain API
          |                   |                    |
          +-------------------+--------------------+
                              |
                    Shared Agent Runtime
          Academy Architect / Creative Director /
                     Growth Strategist
                              |
              Tools + Workflow + Approvals
                              |
       +------------+---------+----------+---------+
       |            |                    |         |
    Relational    Object Store        Job Queue   Analytics
      Store      + CDN/Media          + Workers   Store/Views
       |            |                    |         |
       +------------+--------------------+---------+
                              |
          Official Social/Ads/Payment Integrations
                              |
                 VERSIONED LEARN ADAPTER
                              |
          EXISTING OUTCLASS LEARN (UNCHANGED CORE)
          Local workspace / Git / execution / AI
```

### 20.1 Boundary decisions

-   **Academy owns** catalog, courses, lessons, publication versions, enrollments, entitlements, assessments metadata, commerce, instructor organization, and approved learning evidence.
-   **Creator Studio owns** media projects, brand kits, source provenance, editable compositions, render jobs, reviews, approved creative assets.
-   **GTM owns** campaigns, channel connections, publishing, ads, performance ingestion, attribution, experiments, and optimization proposals.
-   **Shared services own** identity, organization membership, audit log, secrets, approval engine, job orchestration, and event transport.
-   **OutClass Learn owns** the local workspace and learner's local project data. Academy receives only explicitly permitted events and artifacts through a versioned interface.

Use a modular monolith initially if it simplifies development, with durable workers for long-running tasks. Extract services only when independent scaling, isolation, or team ownership justifies it.

## 21. Shared AI agent runtime --- "stacked" without chaos

Each flagship agent must have a genuine operating system for tasks, not just a long prompt.

### 21.1 Agent anatomy

-   **Planner:** interprets goal, constraints, expected output, budget, and required approvals.
-   **Task graph:** decomposes work into dependent, resumable steps with typed artifacts.
-   **Specialist router:** invokes relevant specialist capabilities only when justified.
-   **Retrieval layer:** accesses course materials, creator memory, source evidence, and permissioned metrics.
-   **Tool layer:** performs deterministic work such as parsing, execution, rendering, SQL, publishing, and validation.
-   **Critic/evaluator:** checks quality against rubrics and executable validators.
-   **Approval controller:** blocks consequential side effects until an authorized person approves the exact action.
-   **Memory:** stores scoped, versioned decisions and approved preferences.
-   **Observability:** records status, artifacts, costs, errors, and source references.

### 21.2 Workflow state machine

`created → scoped → planned → executing → validating → awaiting_approval → applying → completed`

Failure branches: `retryable_failure`, `blocked_external`, `rejected`, `canceled`, `failed_terminal`.

A workflow must be resumable after process failure and must not repeat side effects after retry. Persist tool-call intent, idempotency keys, outputs, and approval versions. Use bounded retries with exponential backoff for transient errors; never retry permanent authorization failures indefinitely.

### 21.3 Tool contracts

Every tool definition needs:

-   Name, purpose, owner domain.
-   Typed input/output schema with validation.
-   Permissions and identity context.
-   Whether it reads data or changes external state.
-   Cost/latency estimate and limits.
-   Idempotency and retry semantics.
-   Failure taxonomy and logs.
-   Auditability and rollback/compensation where possible.

Use deterministic services for math, media rendering, tests, permissions, payment reconciliation, and metrics. LLMs should not be trusted to invent execution results or calculate money from loosely formatted prose.

### 21.4 Model selection and cost discipline

-   Lightweight models for extraction, classification, and formatting when evaluation shows adequacy.
-   Strong reasoning models for curriculum architecture, editorial planning, and complex growth analysis.
-   Specialized speech/vision models for transcription, segmentation, and asset understanding.
-   Deterministic validators for execution, financial math, platform constraints, and schema checking.
-   Cache source embeddings, transcripts, media probes, approved brand context, and stable subtask outputs.
-   Set per-task budgets, maximum recursion/delegation depth, timeout, token limits, and render limits.
-   Show the user estimated cost for expensive actions and stop safely when budget is exhausted.

### 21.5 Prompt-injection and untrusted data

Course PDFs, transcripts, websites, social comments, analytics fields, and repository files are untrusted content. Do not execute instructions embedded in them as agent commands. Separate retrieved evidence from privileged system instructions, restrict tools by task, sanitize outputs, and require approval for external side effects. Never grant a research subagent access to advertising write permissions.

### 21.6 Agent evaluation harness

Create a benchmark dataset per flagship agent:

-   **Academy:** prerequisite consistency, runnable project quality, test validity, explanation correctness, rubric agreement, instructor acceptance.
-   **Creator:** claim grounding, real-source usage, technical export quality, caption alignment, brand consistency, human preference scores.
-   **GTM:** financial metric accuracy, attribution deduplication, experiment quality, policy compliance, recommendation calibration, no unauthorized spend.

Use held-out scenarios, deterministic fixtures, human review samples, regression gates, and cost/latency dashboards. Track whether model upgrades improve outcomes rather than assuming newer is better.

## 22. Core entities and relational data model

A normalized starter schema, to refine against the repository:

  ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  Domain                  Entities                                                                               Critical invariants
  ----------------------- -------------------------------------------------------------------------------------- ------------------------------------------------------------
  Identity                users, organizations, memberships, roles, invitations                                  Org boundaries enforced server-side

  Academy                 courses, course_versions, modules, lessons, objectives, prerequisite_edges             Published version immutable; drafts editable

  Academy practice        exercise_specs, project_templates, test_artifacts, rubrics, assessment_attempts        Evaluator/test version pinned to submission

  Learn bridge            learn_launch_grants, progress_events, skill_evidence, sync_checkpoints                 Consent and enrollment required; no secret repository sync

  Commerce                prices, orders, payments, refunds, entitlements, payout_entries                        Verified payment events; idempotent access grants

  Creator                 brand_kits, source_assets, rights, creative_projects, scene_graphs, edit_manifests     Every export traces to source/version/license

  Creator production      render_jobs, exports, asset_variants, review_comments, approvals                       Approved artifact hash immutable

  GTM                     channel_accounts, oauth_grants, capability_snapshots, campaigns, posts, publish_jobs   Least privilege; external ID and status recorded

  Ads                     ad_accounts, ad_campaigns, ad_groups, ads, spend_snapshots, ad_change_requests         No writes without explicit approved change request

  Analytics               events, sessions, attribution_assignments, order_ledger, metric_snapshots              Deduplication, timestamps, source and window recorded

  Experiments             experiments, variants, assignments, observations, analyses                             Predefined metrics and versioned methods

  Agents                  workflows, tasks, tool_calls, artifacts, memories, evaluations                         Resumable, auditable, cost bounded

  Governance              audit_events, policy_decisions, consent_records, deletion_jobs                         Retention, correction, access controls
  ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------

Use PostgreSQL or another justified relational database for shared cloud transactional data, and object storage for media. Respect any existing Supabase/SQLite architecture discovered during audit. Use migrations and backfills; never overwrite current learner data.

## 23. Proposed API and event contracts

### 23.1 Example REST resource boundaries

``` text
POST   /api/academy/courses
GET    /api/academy/courses/:id
POST   /api/academy/courses/:id/versions
POST   /api/academy/courses/:id/validate
POST   /api/academy/courses/:id/publish
POST   /api/academy/courses/:id/enrollments
POST   /api/academy/learn-launch-grants
POST   /api/academy/agent-runs

POST   /api/creator/projects
POST   /api/creator/assets/uploads
POST   /api/creator/creative-briefs
POST   /api/creator/agent-runs
POST   /api/creator/render-jobs
POST   /api/creator/assets/:id/reviews
POST   /api/creator/assets/:id/approve

POST   /api/gtm/campaigns
POST   /api/gtm/channel-connections
POST   /api/gtm/publish-jobs
POST   /api/gtm/ad-change-requests
POST   /api/gtm/ad-change-requests/:id/approve
GET    /api/gtm/analytics/overview
GET    /api/gtm/analytics/attribution
POST   /api/gtm/experiments
POST   /api/gtm/agent-runs

GET    /api/agents/runs/:id
POST   /api/agents/runs/:id/cancel
GET    /api/agents/runs/:id/artifacts
```

These are illustrative resource contracts, **not claims that the routes already exist**. Define OpenAPI/typed contracts before implementing.

### 23.2 Event-driven integration

``` text
academy.course.published
academy.course.version_changed
academy.enrollment.confirmed
academy.assessment.completed
academy.learning_evidence.consented
academy.payment.refunded
creator.asset.approved
creator.render.completed
creator.asset.rights_changed
gtm.post.published
gtm.campaign.created
gtm.ad_spend.ingested
gtm.attribution.updated
gtm.experiment.completed
```

Events must have stable IDs, schema versions, event timestamps, source service, tenant ID, trace ID, and replay/idempotency semantics. Consumers should be safe against duplicate and out-of-order delivery.

### 23.3 Example Academy → Learn launch payload

``` json
{
  "contract_version": "1.0",
  "launch_grant": "opaque-short-lived-token",
  "course_id": "course_123",
  "course_version": "v4",
  "lesson_id": "lesson_07",
  "exercise_id": "exercise_11",
  "project_template_id": "template_09",
  "allowed_scopes": ["read_assignment", "submit_result"],
  "expires_at": "2026-10-14T21:00:00Z"
}
```

The grant must be issued server-side to an entitled user, cryptographically verified, scoped, and short-lived. Never embed permanent API credentials in deep links. The exact payload and handoff mechanism depend on the existing desktop architecture.

## 24. Identity, security, rights and privacy

### 24.1 Security essentials

-   Authentication, verified sessions, MFA support for creator/admin roles where feasible.
-   Tenant and object-level authorization enforced server-side and in the data layer.
-   Secure OAuth PKCE/state, minimum scopes, encrypted tokens, revocation and refresh handling.
-   Secret management, rotation, audit logging, no credentials in browser storage or logs where avoidable.
-   Signed webhooks for payments and integrations; replay protection; idempotency.
-   Safe uploads: file type/content validation, size limits, scanning where appropriate, isolation for media parsing and code execution.
-   Background worker identity with least privilege and scoped access.
-   Rate limiting, anti-abuse, CSRF protection as applicable, input validation, output encoding.
-   Data export/deletion, retention schedules, backup/recovery, breach response process.

### 24.2 Consent boundaries

-   A student buying a course does **not** consent to marketing use of private code, project history, grades, or personal behavior.
-   Instructor-visible individual assessment data requires a clear educational purpose and appropriate notice.
-   Cross-product analytics should prefer aggregate, de-identified measures where possible.
-   Course screenshots, student testimonials, and student work require appropriate rights and consent.
-   Tracking must respect applicable privacy law and user choices; handle anonymous and consent-restricted users honestly.

### 24.3 Creator rights and content ownership

Keep source rights, derivative rights, usage restrictions, and provenance. Do not ingest DRM-protected or restricted third-party materials without authorization. Support creator removal requests and downstream dependency reviews. Clarify ownership and licensing in product terms before commercial launch.

## 25. Design system and interaction principles

The product should feel like **one coherent premium workspace** with three specialized modes, not three unrelated admin templates.

### 25.1 Shared visual language

-   Existing OutClass branding and design tokens first; refine only after inspecting current UI.
-   Strong type hierarchy, generous but efficient spacing, accessible contrast, restrained motion, polished loading/empty/error states.
-   Desktop-grade productivity interactions: command palette, keyboard shortcuts, split panes, searchable assets, filters, bulk actions, context menus, drag-and-drop where useful.
-   Responsive web experience; mobile should support review and insights even if full video editing is desktop-first.
-   Transparent AI interaction: plan, sources, artifact preview, revision, approval, actual action status.

### 25.2 Product-specific experience

**Academy:** beautiful discovery and course pages; a serious Course Builder with curriculum graph, exercise validation, publish checklist, learner outcome analytics.

**Creator Studio:** media-forward, timeline-centered editor; professional layer tools, brand panels, source clips, render previews, timecoded comments.

**GTM:** analytics-first, finance-aware command center; readable funnel charts, experiment reports, publishing calendar, spend controls, clear uncertainty and freshness.

### 25.3 Accessibility

Keyboard navigation, visible focus, semantic controls, screen-reader labels, reduced-motion support, captions, alt text, accessible forms, and appropriate WCAG-oriented testing. Do not hide essential information only in color or animation.

## 26. Observability, reliability and performance

-   Structured logs with correlation IDs across frontend/API/workers/integrations.
-   Metrics: latency, error rate, queue depth, retry count, media render time, token spend, API quotas, failed webhooks, attribution freshness.
-   Distributed tracing for expensive agent workflows and publishing pipelines.
-   Durable queues with dead-letter handling; manual replay and compensation paths.
-   Backup, recovery, disaster recovery goals, migration strategy, storage lifecycle, cost alerts.
-   Feature flags and staged rollouts for creator accounts, AI agents, payments, publishing, and ad writes.
-   Service-level objectives set after real usage measurement; do not invent reliability guarantees.

## 27. Business model and packaging

Treat pricing as hypotheses to validate, not final commitments.

  ----------------------------------------------------------------------------------------------------------------------------------------------
  Tier concept            Offering                                                                        Cost/abuse considerations
  ----------------------- ------------------------------------------------------------------------------- --------------------------------------
  Academy Core            Course creation, free courses, basic delivery, basic AI curriculum assistance   Storage, inference, hosting, support

  Academy Pro             Advanced executable curriculum, validation labs, skill analytics, cohorts       Sandbox compute, evaluations

  Creator Studio          Media library, brand kit, editing, limited exports                              Rendering and model costs

  Creator Studio Pro      Full campaign creative packages, higher render limits, team review              High-resolution rendering, storage

  GTM Insights            Organic performance, attribution, course conversion                             Data connectors, API quotas

  GTM Growth              Cross-channel experiments, ad reporting, advanced analysis                      API access, analytics compute

  Enterprise/Schools      Organizations, governance, SSO, audit, custom policies                          Support, security, SLAs
  ----------------------------------------------------------------------------------------------------------------------------------------------

Potential Academy take rate, creator subscriptions, usage credits, and paid add-ons should be tested against real costs and creator willingness to pay. Never charge a percentage of *ad spend* without a clear value proposition and transparent terms. Track unit economics: AI cost per course, validation compute, render cost per finished minute, storage/bandwidth, API connector costs, payment fees, support burden.

------------------------------------------------------------------------

# PART V --- EXECUTION PLAN

## 28. Build order: vertical slices, not three giant simultaneous rewrites

### Phase 0 --- Repository and feasibility audit

**Deliver:** architecture map, existing Learn integration points, current auth/storage/data stack, missing contracts, source licensing model, social/ads API feasibility matrix, cost envelope, security threat model, prioritized implementation plan.

**Exit criteria:** every proposed reused capability is verified in the repository; no fabricated integrations; target architecture reviewed.

### Phase 1 --- Academy foundation

-   Creator identity and organizations; course drafts, modules/lessons, preview and publishing.
-   Public catalog/course page and free enrollment.
-   Signed Learn handoff with a real course exercise and permissioned progress return.
-   Academy Architect v1: curriculum outline + project plan + instructor review.

**Demo:** instructor publishes a free course; learner enrolls and opens the actual existing OutClass workspace.

### Phase 2 --- Academy's differentiation wedge

-   Course-to-Project Compiler v1 for **one supported technical stack**.
-   Runnable starter repositories, acceptance tests, instructor reference validation.
-   Course CI/Validation Laboratory.
-   Independent Builder Challenge and basic objective/evidence mapping.

**Demo:** a course is converted into a validated multi-milestone project that students can execute in Learn.

### Phase 3 --- Creator Studio foundation

-   Brand Kit, source media ingestion, transcript/timestamp index.
-   Creative brief, storyboards, text studio, image templates, video clip extraction.
-   Editable timeline or edit graph, actual FFmpeg render, captions, export QA.
-   Approval workflow and immutable creative asset versions.

**Demo:** one real lesson produces an approved video, carousel, thumbnail, and platform-specific copy.

### Phase 4 --- Creative Director power features

-   Multi-agent editorial critique, authentic project demo cinematography.
-   Advanced timeline editing, motion graphics, localization, brand memory.
-   Complete launch creative packages and controlled variants.

**Demo:** creator changes a storyboard by natural-language instruction and receives a valid revised export.

### Phase 5 --- GTM organic launch

-   Campaign objects, UTM/link builder, publishing calendar.
-   **One or two verified official social integrations** and truthful manual fallbacks.
-   Durable publishing, approval gates, confirmed post status.
-   Basic organic reporting and first-party Academy conversion events.

**Demo:** approved asset publishes to an authorized account and is associated with observed visits/enrollments where tracking permits.

### Phase 6 --- Academy commerce and revenue truth

-   Paid checkout, verified webhook fulfillment, refunds, financial ledger, creator earnings.
-   Funnel analytics, conversion deduplication, source freshness and consent handling.
-   Financial dashboard distinguishing spend, revenue, fees, refunds, and contribution.

**Demo:** paid enrollment appears once, is tied to its actual order, and reconciles correctly after a refund.

### Phase 7 --- Paid advertising reporting

-   Read-only Google Ads, LinkedIn Ads, and Meta Ads **as individually approved and available**.
-   Normalized spend/performance, attribution model comparison, data quality checks.
-   GTM agent v1: campaign analysis, recommendations, experiment plans.

**Demo:** creator connects an authorized ad account, imports real metrics, and gets a grounded recommendation with uncertainties.

### Phase 8 --- Approved ad operations and growth scientist

-   Draft campaign creation, explicit change approvals, audit trails, policy checks.
-   Controlled campaign write operations only for supported APIs and accounts.
-   Experiment engine, landing-page variants, budget advisor, protective alerts.

**Demo:** agent proposes a budget change, displays financial implications, waits for approval, applies only the authorized action, and records the external response.

### Phase 9 --- Cross-product intelligence

-   Skill graph and adaptive course branches, aggregate curriculum improvement proposals.
-   Creative performance feedback to Creator Studio.
-   Acquisition promise vs actual learning outcome analysis.
-   Multi-course creator economics and long-term strategy memory.

**Demo:** weak learner outcomes trigger an instructor-reviewed curriculum fix; revised course outcomes inform truthful marketing assets; GTM tracks downstream impact without exposing private student data.

## 29. Priority scoring: what actually creates a moat

  ------------------------------------------------------------------------------------------------------------
  Feature                                User value        Technical difficulty   Recommended order
  -------------------------------------- ----------------- ---------------------- ----------------------------
  Academy + existing Learn launch        Very high         Medium/High            1

  Course-to-Project Compiler             Exceptional       High                   2

  Executable Course CI                   Exceptional       High                   3

  Creator course-to-campaign package     Very high         High                   4

  Editable, real video render            Very high         High                   5

  Social publishing + content calendar   High              Medium/High            6

  Paid enrollment + revenue ledger       Very high         High                   7

  Organic/paid attribution               Exceptional       Very high              8

  GTM experiment scientist               High              Very high              9

  Living skill graph                     Exceptional       Very high              10

  Ad write automation                    High but risky    Very high              After read-only validation

  Cross-product curriculum/growth loop   Exceptional       Very high              After sufficient real data
  ------------------------------------------------------------------------------------------------------------

**Strategic wedge:** prove **course → validated project → authentic creative → tracked enrollment** before trying to become an entire creator economy operating system.

## 30. Full end-to-end acceptance scenarios

### Scenario A --- A new instructor creates an executable course

1.  Instructor provides syllabus, recordings, code repo, objectives, and target audience.
2.  Academy Architect proposes curriculum, prerequisite graph, and four projects.
3.  Instructor edits and approves.
4.  Course CI compiles code, validates reference solutions and tests, flags failures.
5.  Instructor fixes issues and publishes a free course.
6.  Learner enrolls and launches an exercise in existing OutClass Learn.
7.  Learn returns only authorized completion/evidence events.
8.  Instructor sees actual progress and aggregate bottlenecks.

**Pass:** course works end to end, no duplicate IDE, no hidden learner data upload, no unverified executable assets published as verified.

### Scenario B --- A creator produces a launch campaign

1.  Creator selects course and imports approved source footage.
2.  Creative Director identifies five source-grounded moments.
3.  Creator selects a concept and brand template.
4.  Agent generates a 45-second video, thumbnail, carousel, and three distinct posts.
5.  Creator adjusts captions, changes opening scene, and approves exact versions.
6.  Renderer exports technically valid media with source and rights manifest.
7.  Approved assets become available to GTM.

**Pass:** editable, real media artifacts; no fake footage/testimonials; platform variants are genuinely adapted.

### Scenario C --- Organic campaign to attributable sale

1.  GTM creates a channel plan and UTM links.
2.  Creator approves assets and scheduled publication.
3.  Authorized integration publishes and confirms status.
4.  User visits course page via a tracked, consent-eligible session.
5.  User pays for course; verified payment webhook provisions access once.
6.  Dashboard shows observed order and appropriately qualified attribution.
7.  Refund adjusts net revenue without erasing history.

**Pass:** no duplicate sale, no fake post, no unsupported attribution certainty.

### Scenario D --- Paid campaign with financial guardrails

1.  Creator connects ad account with read-only access.
2.  GTM ingests actual spend and performance.
3.  Agent proposes a new campaign with budget and creative.
4.  Creator grants required write scope and approves exact action.
5.  System validates account capability and advertising policy.
6.  External API confirms campaign creation or reports failure.
7.  Budget monitoring and audit logs record changes.
8.  Experiment analysis explains outcomes with uncertainty.

**Pass:** no write before approval; real account and API status; budget warnings; financial math reproducible.

### Scenario E --- Feedback loop from learning to business

1.  Aggregate student evidence reveals a prerequisite problem.
2.  Academy Architect proposes a new lab and validates it.
3.  Instructor approves a new course version.
4.  Creator Studio identifies new truthful demonstrations.
5.  GTM tests revised positioning and measures enrollment and refund trends.
6.  Reports separate observed outcomes from hypotheses about cause.

**Pass:** versioned provenance across all three products; student privacy respected.

## 31. Definition of done per flagship agent

### Academy Architect is done for its first release when:

-   It can build a structured, instructor-editable course plan from actual inputs.
-   It can generate at least one **runnable, tested** project sequence in a supported stack.
-   It can produce an actionable validation report and prevent false verification claims.
-   It can hand assignments to the existing Learn workspace without rebuilding it.
-   It can accept human corrections and preserve versions/provenance.

### Creative Director is done for its first release when:

-   It can find source-grounded moments in real course footage.
-   It can produce an editable video composition and actual rendered file.
-   It can produce usable image and text variants for at least two destinations.
-   It can honor brand rules, rights, and approval controls.
-   Its outputs pass automated media QA and human preview.

### Growth Strategist is done for its first release when:

-   It can create a measurable campaign plan with source-backed rationale.
-   It can schedule and confirm a real authorized social post or provide honest manual fallback.
-   It can report real Academy enrollments/revenue and observed channel traffic with limitations.
-   It can connect at least one verified read-only ad integration when approval is available.
-   It can produce evidence-backed recommendations without unauthorized spending or fabricated certainty.

## 32. Open questions the engineering team must resolve

1.  What is the actual current OutClass architecture, runtime, database, and deployment topology?
2.  Which course/lesson/project APIs or internal data contracts already exist?
3.  Can the desktop app receive authenticated deep links or signed launch grants safely?
4.  What learning progress data can be shared without undermining local-first trust?
5.  Which creator persona is the first paying customer: independent instructor, bootcamp, technical YouTuber, or institution?
6.  Does Academy launch as a marketplace, creator-hosted storefront, or both in sequence?
7.  Which technical language/framework is best for the first Course-to-Project Compiler?
8.  What are the actual provider costs and access requirements for payments and creator payouts in target jurisdictions?
9.  Which social platforms will approve direct publishing and analytics for this application?
10. Which advertising APIs and scopes are realistically accessible at current company stage?
11. What first-party tracking can be implemented lawfully for the initial markets?
12. What are the cost ceilings for video rendering, agent workflows, storage, and sandbox execution?
13. How are student project artifacts licensed, shared, and revoked?
14. Which course claims are allowed to be used in marketing, and who approves them?
15. What minimum data volume is needed before GTM gives quantitative optimization advice?

## 33. Instructions for the coding agent implementing this specification

> **You are the principal engineer and technical product lead for OutClass.** The repository is `https://github.com/aayups31/OutClass`. The existing OutClass Learn product is functional and must be preserved. Your mandate is to add **OutClass Academy, OutClass Creator Studio, and OutClass GTM** as three integrated products, each with a deeply capable flagship AI agent and specialized, permissioned workflows. This document is the long-term product specification; do not treat it as permission to generate thousands of unreviewed lines or pretend external integrations work.

**Step 1 --- Audit.** Inspect source, tests, docs, architecture, existing agents, UI, storage, auth, and deployment. Produce an evidence-based inventory of reusable capabilities, missing contracts, risks, and unknowns. Do not invent current features.

**Step 2 --- Architecture.** Propose module boundaries, data model, APIs, Learn adapter, worker architecture, agent runtime, authorization, cost estimates, and a staged migration plan. Document major decisions and alternatives.

**Step 3 --- Vertical slice.** Implement the smallest complete Academy journey: create → validate → publish → enroll → launch actual existing Learn workspace. Add tests and prove it works.

**Step 4 --- Differentiation.** Build the first Course-to-Project Compiler and Course CI with a supported language stack, executable validation, instructor approval, and realistic error handling.

**Step 5 --- Creator Studio.** Implement real source ingestion, storyboarding, editable compositions, render pipeline, brand kit, review, and exports. Do not substitute a text-only "video prompt" for actual video production.

**Step 6 --- GTM.** Implement campaigns, links, first-party enrollment/revenue events, a verified organic integration, real analytics, and eventually read-only ads reporting. Never invent metrics or publication status.

**Step 7 --- Deepen agents.** Add specialist skills, scoped memory, evaluations, structured tool use, artifact provenance, approval gates, and cost controls. Optimize for measured usefulness.

**Step 8 --- Report honestly after every stage.** Provide files changed, migrations, tests run and results, actual working flows, screenshots/previews when appropriate, API limitations, pending credentials/reviews, cost impact, and next steps. Distinguish implemented, partially implemented, simulated, and blocked.

### Engineering rules

-   No rewrites of working OutClass Learn features unless essential and approved.
-   No placeholders presented as functioning features.
-   No fake dashboard data presented as live.
-   No ad spend, public post, payment, or destructive action without appropriate authorization.
-   No unauthorized ingestion of external course material or private student code.
-   No unbounded agent loops, runaway rendering, or silent third-party API charges.
-   No unsupported "guaranteed results" or fabricated educational claims.
-   No architecture astronautics: prefer a well-structured modular system and real tests.
-   No huge single-step implementation. Work incrementally with observable checkpoints.

**Final product vision:** A course is not merely uploaded; it is engineered into a validated learning experience. Marketing content is not merely generated; it is produced from authentic evidence. Growth is not merely claimed; it is measured against real enrollments, revenue, and learning outcomes.

------------------------------------------------------------------------

## Appendix A --- Recommended first demo

**"One Python course, one creator, one measurable launch."**

-   Academy Architect takes a small real Python course and builds a tested four-milestone API project.
-   The instructor publishes the course, and a student completes one milestone in the existing OutClass workspace.
-   Creative Director extracts a genuine 30-second teaching/demo clip, produces an editable short, thumbnail, carousel, and caption.
-   GTM prepares a launch plan, publishes to one authorized channel, and attaches a tagged link.
-   A real enrollment and, when paid checkout is implemented, a verified purchase appear in the dashboard with attribution caveats.

This demo proves the product's unique connected loop. It is more persuasive than three disconnected dashboards with dozens of unverified integrations.

## Appendix B --- Product one-liners

**OutClass Academy:** *Turn expertise into courses that teach people to actually build.*

**OutClass Creator Studio:** *Turn real teaching into professional content worth watching.*

**OutClass GTM:** *Turn distribution into measurable enrollment and sustainable growth.*

**Together:** *Create the course. Prove the learning. Tell the story. Grow with evidence.*
