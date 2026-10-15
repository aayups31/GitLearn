# Connected OutClass product implementation

Finalized direction, October 15, 2026. This refines the master specification; it does not imply that every roadmap item has shipped.

- **Learn / OffCourse:** learner workspace, local attempts, evidence and course-aware teaching. Learners write and run their own work.
- **Academy / Academy Architect:** instructor tools that strengthen a course and author its Learn package: exercises, prerequisites, starter resources, acceptance criteria, hint ladders, assessments and project milestones. Course generation is optional, not the core product. Instructor preview uses the existing Learn workspace.
- **Creator Studio / Creative Director:** production workspace for teaching videos, audio, graphics and supporting assets. It owns reusable production capabilities, not a mandatory manual marketing handoff.
- **GTM / Growth Strategist:** creates channel-specific promotional posts and previews from authorized course material, prepares assets, schedules and distributes them to linked accounts under explicit publishing permissions.
- **GTM / Analytics specialist:** independently interprets actual provider observations and supplied reports. It distinguishes observed facts, calculations, gaps and hypotheses, then feeds bounded recommendations back to Growth and Academy.

## Shared context and handoffs

Released course versions and their Learn packages are immutable. Creator assets and GTM promotions pin their source version. Each agent receives the allowed artifacts relevant to its role, with provenance and source IDs. Derived work is traceable to the source release and never silently updates when a draft changes.

Learner files, conversations and private Git history are excluded from creator and marketing context. Instructor preview remains local. Evidence shared upstream must be explicitly selected and must not be relabelled as learner mastery, verified revenue or a testimonial.

## Implementation order

1. Preserve and finish the current source preview, setup instructions and native OAuth links.
2. Add versioned instructor-authored Learn packages, real learner delivery, instructor preview and release validation.
3. Add shared agent context, a distinct analytics role and revision-safe handoffs.
4. Add GTM-owned channel content/previews, approved scheduling, bounded publishing and result collection. No developer credentials or real posts are needed for offline verification.
5. Verify connected workflows and update source documentation. Packaging a new installer is deferred at the user's request. Platform account configuration remains a separate live-validation step.

Use the existing local Node/React/SQLite stack and hosted account gateway. No framework migration, unbounded agent loops, implicit external publishing, fabricated metrics or automatic paid ad campaigns. Commit and push tested functional milestones to main; report limits accurately.

## Implemented connected learning milestone

Instructor-authored lesson packages now carry acceptance criteria, prerequisite lesson links, progressive hints, reflection prompts, transfer challenges and safe starter files. Release validation rejects cyclic prerequisites, duplicate paths and excessive content. Learn receives the immutable package, preserves existing files, displays the assignment, protects unsaved reviews and shares only revealed hints with OffCourse. Instructor preview uses a separate local course/workspace and review history. Self-review is explicitly not automated grading or mastery evidence.

Academy lesson sources now survive workspace reindexing. A separate Analytics specialist can interpret provider observations and deterministic manual-report metrics. Reviewed agent handoffs pin the source release/hash; accepting a handoff adds labeled context for another specialist without applying changes or forwarding learner conversations. Focused domain tests and a real browser course → Learn → Creator → GTM flow verify this milestone without paid model calls.

## Implemented GTM production and distribution milestone

GTM now creates source-based or bounded AI-assisted channel drafts from a selected course lesson. Rights confirmation is explicit. Drafts are editable and source-linked; approval creates idempotent channel campaigns and approved copy artifacts. Promotional graphics and actual FFmpeg previews can be produced directly in GTM using the shared production engine. Owned footage can be imported there, and the actual video must be reviewed and approved before a video publication is prepared.

The local publishing queue stores exact post hashes, account identities, scheduled UTC times, consent and dispatch receipts. It automatically dispatches approved posts while OutClass is running, blocks changed accounts and expired windows, and never silently reposts uncertain submissions. A one-hour dispatch/confirmation window, ten-post UTC daily cap per account, minimum one-minute spacing and at most twelve confirmation checks bound the workflow. Restarted or disconnected sessions require reconnection; this is not an always-on cloud scheduler or permission to generate unlimited new campaigns. LinkedIn's limited confirmation remains explicitly unverified.

The published installer remains v0.7.1 by request. New source features are not advertised as included in that download. Live validation of the four social integrations still requires developer apps, eligible accounts and platform permissions. Social tests use offline transports; no real social posts were sent. The final AI smoke check used two bounded calls with synthetic course data: the first correctly rejected an overlong X draft, and the second passed after enforcing the channel-specific schema limit. No learner files, conversations or private course content were sent in that smoke check.

## Verification and remaining operational limits

The connected source preview passed 34 targeted domain/account tests and a real browser flow covering instructor packages, local learning, actual media ingestion, editable timelines, manual campaign evidence and GTM-owned promotional creation. Local Python checks and FFmpeg output QA use actual processes. The frontend production build passes; its pre-existing large editor chunk remains a performance warning.

GTM now has separate creation and campaign/insight sections. Timestamped platform observations are retained locally; reported count changes compare the same publication over time and preserve unavailable values. They are not unique learners, enrollment attribution or settled revenue. The Analytics specialist receives these observations alongside clearly labeled manual reports.

Still required for a public release: eligible developer apps and live validation for social channels, verified production email delivery, public OAuth/token persistence infrastructure, and the deferred installer. The local scheduled queue only operates while OutClass is running and connected; it is not an always-on cloud service. Paid-course commerce, instructor payouts, ad-network ingestion and broad professional-quality evaluations remain separate work rather than implied capabilities of this milestone.


## Platform-native composing milestone

GTM now has separate local, revision-checked post drafts per campaign/platform, live platform-style feed previews, mobile/desktop and light/dark views, photo ordering and alt text, optional campaign links, and a YouTube watch view with playable approved video, title/description, audience, tags, visibility and thumbnail. Generated source-grounded graphics can open directly as a post attachment or YouTube thumbnail. The preview and publishing payload use the same text and prepared JPEG/approved MP4 bytes; the platform's final layout and transcoding are not claimed to be pixel-identical.

X and LinkedIn adapters now upload and attach photos or approved videos rather than silently publishing text alone. Instagram adds photo and ordered photo-carousel containers alongside Reels. YouTube uploads the reviewed custom thumbnail and reports a thumbnail failure separately from an accepted video. Uploaded X/LinkedIn videos persist processing state and can finish without reuploading. X uses its official weighted text parser and requires granted media.write scope for attachments. See the social-publishing document for supported formats and operational gates. Live provider testing still requires the owner's developer apps; tests do not send actual public posts.
