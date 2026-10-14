import { createHash, randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import {
  courseDraft,
  creativeDraft,
  campaignDraft,
  type AcademyDraft,
  type ExpansionState,
  type CourseRelease,
} from "../expansion-contract.js";
import type { Application } from "./application.js";
import { assertClean, slug, UserError } from "./safety.js";

const key = "expansion:v1";
const stamp = () => new Date().toISOString();
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const edit = {
  id: z.string().uuid().optional(),
  expectedRevision: z.number().int().min(0),
};
const releaseRequest = z
  .object({ expectedRevision: z.number().int(), approve: z.literal(true) })
  .strict();
export function validateCourse(course: AcademyDraft) {
  const issues: string[] = [];
  if (!course.audience) issues.push("Describe who the course is for.");
  if (!course.outcome)
    issues.push("Define what the learner will build or demonstrate.");
  if (!course.rightsConfirmed)
    issues.push("Confirm your rights to the course material.");
  if (!course.lessons.length) issues.push("Add at least one lesson.");
  course.lessons.forEach((lesson, i) => {
    for (const field of ["title", "objective", "practice", "content"] as const)
      if (!lesson[field]) issues.push(`Lesson ${i + 1}: add ${field}.`);
  });
  return {
    valid: !issues.length,
    issues,
    technicalVerification: "not_run" as const,
    scope:
      "Structure and required content only; code examples have not been executed.",
  };
}
export class Expansion {
  constructor(readonly app: Application) {}
  state(): ExpansionState {
    return (
      this.app.store.get<ExpansionState>(key) || {
        schemaVersion: 1,
        courses: [],
        releases: [],
        enrollments: [],
        creatives: [],
        campaigns: [],
      }
    );
  }
  private change<T>(fn: (state: ExpansionState) => T): T {
    let result!: T;
    this.app.store.transaction(() => {
      const state = this.state();
      result = fn(state);
      this.app.store.put(key, state);
    });
    return result;
  }
  saveCourse(raw: unknown) {
    const input = courseDraft.extend(edit).parse(raw);
    const { id, expectedRevision, ...draft } = input;
    assertClean(JSON.stringify(draft), "course draft");
    return this.change((state) => {
      const old = state.courses.find((c) => c.id === id);
      this.checkRevision(id, old?.revision, expectedRevision);
      if (!old && state.courses.length >= 40)
        throw new UserError("This local preview supports 40 course drafts.");
      const next = {
        ...draft,
        id: id || randomUUID(),
        revision: expectedRevision + 1,
        updatedAt: stamp(),
      };
      state.courses = [...state.courses.filter((c) => c.id !== id), next];
      return next;
    });
  }
  private checkRevision(
    id: string | undefined,
    actual: number | undefined,
    expected: number,
  ) {
    if ((id && actual === undefined) || (actual || 0) !== expected)
      throw new UserError(
        "This draft changed in another window. Reload it before saving.",
        409,
      );
  }
  release(id: string, raw: unknown) {
    const input = releaseRequest.parse(raw);
    return this.change((state) => {
      const draft = state.courses.find((c) => c.id === id);
      if (!draft) throw new UserError("Course draft not found.", 404);
      this.checkRevision(id, draft.revision, input.expectedRevision);
      const validation = validateCourse(draft);
      if (!validation.valid) throw new UserError(validation.issues.join(" "));
      const existing = state.releases.find(
        (r) => r.courseId === id && r.revision === draft.revision,
      );
      if (existing) return existing;
      if (state.releases.length >= 120)
        throw new UserError("The local release limit has been reached.");
      const { id: courseId, updatedAt: _at, ...content } = draft;
      const release: CourseRelease = {
        ...content,
        courseId,
        id: randomUUID(),
        publishedAt: stamp(),
        hash: hash(content),
        visibility: "local",
      };
      state.releases.push(release);
      return release;
    });
  }
  enroll(releaseId: string) {
    return this.change((state) => {
      if (!state.releases.some((r) => r.id === releaseId))
        throw new UserError("Released course not found.", 404);
      const previous = state.enrollments.find((e) => e.releaseId === releaseId);
      if (previous) return previous;
      const enrollment = { releaseId, enrolledAt: stamp() };
      state.enrollments.push(enrollment);
      return enrollment;
    });
  }
  async launch(releaseId: string, lessonIndex: number) {
    const expansion = this.state();
    const release = expansion.releases.find((r) => r.id === releaseId);
    if (
      !release ||
      !expansion.enrollments.some((e) => e.releaseId === releaseId)
    )
      throw new UserError(
        "Enroll in this local release before opening Learn.",
        403,
      );
    const lesson = release.lessons[lessonIndex];
    if (!lesson) throw new UserError("Lesson not found.", 404);
    const state = this.app.configured();
    const courseId = `academy:${releaseId}`,
      lessonId = `lesson-${lessonIndex}`;
    if (state.session) {
      if (
        state.session.courseId === courseId &&
        state.session.lessonId === lessonId
      )
        return { courseId, sessionId: state.session.id };
      throw new UserError(
        "Finish or discard the current Learn session before opening this lesson.",
        409,
      );
    }
    if (!state.courses.some((c) => c.id === courseId)) {
      state.courses.push({
        id: courseId,
        platform: "academy",
        title: release.title,
        url: `https://git-learn-black.vercel.app/academy#${releaseId}`,
        path: `academy-${slug(release.title)}-${releaseId.slice(0, 8)}`,
        mirrored: false,
        observedAt: stamp(),
        lessons: release.lessons.map((l, i) => ({
          id: `lesson-${i}`,
          title: l.title,
          section: "Academy",
          order: i,
          path: `academy/${String(i + 1).padStart(2, "0")}-${slug(l.title)}`,
        })),
      });
      this.app.store.save(state);
    }
    await this.app.mirror(courseId);
    await this.app.start(courseId, lessonId);
    await this.app.saveNote(
      `${lesson.content}\n\nObjective: ${lesson.objective}\n\nPractice: ${lesson.practice}`,
    );
    return { courseId, sessionId: this.app.store.state().session!.id };
  }
  saveCreative(raw: unknown) {
    const { id, expectedRevision, ...draft } = creativeDraft
      .extend(edit)
      .parse(raw);
    assertClean(JSON.stringify(draft), "creative draft");
    return this.change((state) => {
      const old = state.creatives.find((c) => c.id === id);
      this.checkRevision(id, old?.revision, expectedRevision);
      const release = state.releases.find((r) => r.id === draft.releaseId);
      if (!release?.lessons[draft.lessonIndex])
        throw new UserError("Select a lesson from a local course release.");
      if (!old && state.creatives.length >= 100)
        throw new UserError("Local creative limit reached.");
      const next = {
        ...draft,
        id: id || randomUUID(),
        revision: expectedRevision + 1,
        updatedAt: stamp(),
      };
      state.creatives = [...state.creatives.filter((c) => c.id !== id), next];
      return next;
    });
  }
  approveCreative(id: string, raw: unknown) {
    const input = releaseRequest.parse(raw);
    return this.change((state) => {
      const creative = state.creatives.find((c) => c.id === id);
      if (!creative) throw new UserError("Creative not found.", 404);
      this.checkRevision(id, creative.revision, input.expectedRevision);
      if (!creative.rightsConfirmed || !creative.copy || !creative.brief)
        throw new UserError(
          "Add copy, a brief and confirm rights before approving.",
        );
      const { approval: _approval, ...content } = creative;
      creative.approval = {
        hash: hash(content),
        revision: creative.revision,
        approvedAt: stamp(),
      };
      return creative;
    });
  }
  saveCampaign(raw: unknown) {
    const { id, expectedRevision, ...draft } = campaignDraft
      .extend(edit)
      .parse(raw);
    assertClean(JSON.stringify(draft), "campaign draft");
    const url = new URL(draft.destination);
    if (url.protocol !== "https:" || url.username || url.password)
      throw new UserError(
        "Use an HTTPS destination without embedded credentials.",
      );
    url.searchParams.set("utm_source", draft.source);
    url.searchParams.set("utm_medium", draft.medium);
    url.searchParams.set("utm_campaign", slug(draft.title));
    url.searchParams.delete("utm_content");
    return this.change((state) => {
      const old = state.campaigns.find((c) => c.id === id);
      this.checkRevision(id, old?.revision, expectedRevision);
      const creative = state.creatives.find((c) => c.id === draft.creativeId);
      if (!creative?.approval)
        throw new UserError(
          "Approve the exact creative revision before preparing its campaign.",
        );
      if (!old && state.campaigns.length >= 100)
        throw new UserError("Local campaign limit reached.");
      url.searchParams.set(
        "utm_content",
        `${creative.id}-v${creative.revision}`,
      );
      const next = {
        ...draft,
        id: id || randomUUID(),
        revision: expectedRevision + 1,
        updatedAt: stamp(),
        creativeHash: creative.approval.hash,
        creativeSnapshot: structuredClone(creative),
        trackedUrl: url.href,
        status: "draft" as const,
      };
      state.campaigns = [...state.campaigns.filter((c) => c.id !== id), next];
      return next;
    });
  }
}
export function expansionRoutes(app: Application) {
  const router = Router(),
    expansion = new Expansion(app);
  router.get("/state", (_req, res) => res.json(expansion.state()));
  router.post("/courses/save", (req, res) =>
    res.json(expansion.saveCourse(req.body)),
  );
  router.post("/courses/:id/validate", (req, res) => {
    const course = expansion
      .state()
      .courses.find((c) => c.id === req.params.id);
    if (!course) throw new UserError("Course not found.", 404);
    res.json(validateCourse(course));
  });
  router.post("/courses/:id/release", (req, res) =>
    res.json(expansion.release(req.params.id, req.body)),
  );
  router.post("/releases/:id/enroll", (req, res) => {
    z.object({}).strict().parse(req.body);
    res.json(expansion.enroll(req.params.id));
  });
  router.post("/releases/:id/launch", async (req, res) => {
    const input = z
      .object({ lessonIndex: z.number().int().min(0).max(29) })
      .strict()
      .parse(req.body);
    res.json(
      await app.serial(() =>
        expansion.launch(req.params.id, input.lessonIndex),
      ),
    );
  });
  router.post("/creatives/save", (req, res) =>
    res.json(expansion.saveCreative(req.body)),
  );
  router.post("/creatives/:id/approve", (req, res) =>
    res.json(expansion.approveCreative(req.params.id, req.body)),
  );
  router.post("/campaigns/save", (req, res) =>
    res.json(expansion.saveCampaign(req.body)),
  );
  return router;
}
