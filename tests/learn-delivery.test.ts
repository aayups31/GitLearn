import { it, expect } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Store } from "../src/server/store";
import { Application } from "../src/server/application";
import { Expansion, validateCourse } from "../src/server/expansion";
import { LearnDelivery } from "../src/server/learn-delivery";
import { starterPath } from "../src/learn-package-contract";
import { CourseLibrary } from "../src/server/library";
const plan = {
  minutes: 20,
  prerequisiteLessons: [],
  acceptanceCriteria: ["Group repeated names correctly", "Handle empty input"],
  hints: [
    "Predict the total for one name.",
    "What state must survive each iteration?",
  ],
  reflection: "Explain why your accumulator works.",
  transferChallenge: "Support a minimum activity threshold.",
  starterFiles: [
    { path: "main.py", content: "# Implement the report yourself.\n" },
  ],
};
const draft = {
  title: "Build activity reports",
  audience: "Python learners",
  outcome: "A useful report",
  rightsConfirmed: true,
  lessons: [
    {
      title: "Accumulate",
      objective: "Group activity by name",
      practice: "Write your own report",
      content: "A dictionary retains totals.",
      learn: plan,
    },
  ],
};
it("rejects unsafe starter paths and cyclic learning prerequisites", () => {
  for (const p of [
    "../secret.py",
    "C:/secret.py",
    ".env",
    "nested/.git/config",
    "dir\\main.py",
    "CON.py",
  ])
    expect(starterPath.safeParse(p).success).toBe(false);
  expect(
    validateCourse({
      ...draft,
      lessons: [
        { ...draft.lessons[0], learn: { ...plan, prerequisiteLessons: [1] } },
        { ...draft.lessons[0], learn: { ...plan, prerequisiteLessons: [0] } },
      ],
    }).issues,
  ).toContain(
    "Lesson prerequisites contain a cycle. Keep the learning path achievable.",
  );
});
it("delivers immutable instructor packages into Learn without overwriting work, and keeps self-review distinct from verified mastery", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "outclass-delivery-")),
    store = new Store(path.join(dir, "data")),
    app = new Application(store),
    expansion = new Expansion(app),
    delivery = new LearnDelivery(app);
  try {
    await app.setup(path.join(dir, "learning"), false);
    const course = expansion.saveCourse({ ...draft, expectedRevision: 0 }),
      release = expansion.release(course.id, {
        expectedRevision: 1,
        approve: true,
      });
    expansion.enroll(release.id);
    const launch = await expansion.launch(release.id, 0),
      file = path.join(
        store.state().session!.workspace,
        "assignments/lesson-0/main.py",
      );
    expect(await readFile(file, "utf8")).toContain("yourself");
    expect(
      delivery.snapshot(launch.courseId, "lesson-0")?.plan.acceptanceCriteria,
    ).toHaveLength(2);
    expect(
      delivery.teacherContext(launch.courseId, "lesson-0")?.revealedHints,
    ).toEqual([]);
    const hint = delivery.hint(launch.courseId, "lesson-0")!;
    expect(hint.progress.revealedHints).toBe(1);
    expect(
      delivery.teacherContext(launch.courseId, "lesson-0")?.revealedHints,
    ).toEqual([plan.hints[0]]);
    expect(() =>
      delivery.save(launch.courseId, "lesson-0", {
        expectedRevision: 0,
        checked: [],
        reflection: "",
        reviewed: false,
      }),
    ).toThrow(/changed/);
    expect(() =>
      delivery.save(launch.courseId, "lesson-0", {
        expectedRevision: 1,
        checked: [0],
        reflection: "An explanation about my work",
        reviewed: true,
      }),
    ).toThrow(/every criterion/);
    const reviewed = delivery.save(launch.courseId, "lesson-0", {
      expectedRevision: 1,
      checked: [0, 1],
      reflection: "I tested an empty list and repeated names locally.",
      reviewed: true,
    })!;
    expect(reviewed.assessment).toBe("instructor_criteria_self_review");
    expect(reviewed.progress.reviewedAt).toBeTruthy();
    const seed = await delivery.seed(launch.courseId, "lesson-0");
    expect(seed?.find((f) => f.path.endsWith("main.py"))?.status).toBe(
      "preserved",
    );
    expansion.saveCourse({
      ...draft,
      id: course.id,
      expectedRevision: 1,
      lessons: [{ ...draft.lessons[0], learn: { ...plan, minutes: 60 } }],
    });
    expect(delivery.snapshot(launch.courseId, "lesson-0")?.plan.minutes).toBe(
      20,
    );
    await new CourseLibrary(app).index(launch.courseId, false);
    expect(
      store.db
        .prepare(
          "SELECT count(*) AS total FROM rag_documents WHERE course_id=? AND kind='academy'",
        )
        .get(launch.courseId),
    ).toMatchObject({ total: 1 });
    const learnerWorkspace = store.state().session!.workspace;
    await app.sessionAction("discard");
    const preview = await expansion.launch(release.id, 0, true);
    expect(preview.courseId).not.toBe(launch.courseId);
    expect(store.state().session!.workspace).not.toBe(learnerWorkspace);
    expect(delivery.snapshot(preview.courseId, "lesson-0")?.preview).toBe(true);
    expect(
      delivery.snapshot(preview.courseId, "lesson-0")?.progress.checked,
    ).toEqual([]);
  } finally {
    store.close();
    await rm(dir, { recursive: true, force: true });
  }
});
