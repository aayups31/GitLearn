# OutClass workspace evolution — October 13, 2026

## Product scope

OffCourse teaches within an explicitly selected course: permitted course passages, saved code, execution evidence, practical milestones and contribution context. The Architect owns a project notebook, decisions and architecture conversations. Original learner entries remain distinct from derived suggestions. Neither role changes code or executes commands. Shared notebook context is an explicit per-project setting, never an implicit cross-course merge.

Deliver a persistent interactive local terminal, keyboard/pointer accessible adjustable panels, saved layouts and focus/reset controls. Keep bounded Quick Run and Project Console evidence separate from an unrestricted terminal: arbitrary shell output is not verified test evidence.

Deliver an optional VS Code / Code OSS companion extension so existing editor extensions, terminals and debuggers work in the learner's preferred editor. Evaluate rather than claim a full Code OSS fork. The current application continues to own course tracking, local SQLite data and narrow authenticated APIs. A Microsoft marketplace-compatible fork cannot be promised: https://code.visualstudio.com/docs/supporting/faq . A full embedded Code OSS migration requires maintaining editor builds, extension-host trust and distribution; it is a separate milestone.

## AI access

One provider abstraction routes structured teaching and architect requests to a personal OpenAI key, an explicitly configured localhost model, or a hosted service. Local retrieval works without paid embeddings. The included-AI service keeps its provider secret server-side, verifies account tokens, reserves a bounded allowance atomically before each request, enforces request/concurrency limits, validates output, and records usage without storing prompt contents. Account sign-in, allowance and billing must show real states, never a fictional free tier. Hosted authentication/database/billing credentials and an endpoint are deployment prerequisites, not desktop assets.

## Notebook

Projects have a title, problem, course links and original notes. Notes can be edited or deleted. Optional automatic notes record explicit learner session reflections and checkpoints, with source IDs and deduplication; no background monitoring of arbitrary files or activity. Reviews derive connections from linked courses and dated notes. A review is explicitly requested or offered after several days, without a paid model call on every launch. Architect conversations and decision records are isolated per project. Launch capture is optional and dismissible.

## Validation

Test course/project isolation, permission changes and deletion, teacher freshness, provider routing, hosted authentication/allowance failures, terminal cwd and process shutdown, layout accessibility/persistence, actual desktop terminal input, the editor bridge, and production packaging. Keep existing Udemy, practice, project and contribution checks passing. Push completed increments to main. Publish only artifacts that passed their checks; report hosted deployment prerequisites clearly.
