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
