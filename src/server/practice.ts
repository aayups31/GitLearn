import { randomUUID, createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import type { Application } from "./application.js";
import type { Workspace } from "./workspace.js";
import { assertClean, UserError } from "./safety.js";

type Case = {
  label: string;
  args: unknown[];
  expected?: unknown;
  throws?: boolean;
};
export type Exercise = {
  id: string;
  title: string;
  language: "javascript" | "python";
  kind: "practice" | "project";
  skill: string;
  minutes: number;
  brief: string;
  requirements: string[];
  hints: string[];
  function: string;
  starter: string;
  cases: Case[];
  topics: string[];
};
export const exercises: Exercise[] = (
  ["javascript", "python"] as const
).flatMap((language) => {
  const js = language === "javascript";
  const spec = [
    {
      key: "validation",
      title: "Build a price calculator",
      skill: "Functions and validation",
      minutes: 15,
      fn: js ? "discountedPrice" : "discounted_price",
      topics: ["function", "return", "condition", "validation"],
      brief:
        "A shop needs reliable discounted prices. Implement a reusable function instead of copying a tutorial example.",
      requirements: [
        "Accept a non-negative numeric price and a discount between 0 and 100.",
        "Return the discounted price rounded to two decimal places.",
        "Reject negative prices and discounts outside the range with an error.",
      ],
      hints: [
        "What should the function do before calculating anything? Write down the invalid inputs.",
        "Think about the fraction of the original price that remains after a percentage discount.",
        "Try the calculation on paper for a price of 80 and a 25 percent discount. Then consider rounding.",
      ],
      cases: [
        {
          label: "No discount preserves the price",
          args: [80, 0],
          expected: 80,
        },
        {
          label: "A percentage discount is applied",
          args: [80, 25],
          expected: 60,
        },
        {
          label: "A complete discount returns zero",
          args: [50, 100],
          expected: 0,
        },
        {
          label: "Money is rounded to two decimals",
          args: [19.99, 15],
          expected: 16.99,
        },
        { label: "Negative prices are rejected", args: [-1, 20], throws: true },
        {
          label: "Out-of-range discounts are rejected",
          args: [80, 101],
          throws: true,
        },
      ],
    },
    {
      key: "collections",
      title: "Turn raw events into useful data",
      skill: "Collections and transformation",
      minutes: 20,
      fn: js ? "completedMinutes" : "completed_minutes",
      topics: [
        "array",
        "list",
        "loop",
        "filter",
        "map",
        "object",
        "dictionary",
      ],
      brief:
        "A learning app receives session records. Calculate useful activity without counting unfinished or malformed sessions.",
      requirements: [
        "Accept a collection of records with minutes and completed fields.",
        "Sum minutes only when completed is true and minutes is a positive number.",
        "Ignore invalid minutes and unfinished sessions; an empty collection returns zero.",
      ],
      hints: [
        "Which records are eligible before you add their minutes?",
        "Separate deciding whether a record counts from updating the total.",
        "Use an empty input and a record with negative minutes to check your initial value and validation.",
      ],
      cases: [
        { label: "An empty collection returns zero", args: [[]], expected: 0 },
        {
          label: "Completed sessions are summed",
          args: [
            [
              { minutes: 15, completed: true },
              { minutes: 25, completed: true },
            ],
          ],
          expected: 40,
        },
        {
          label: "Unfinished sessions are ignored",
          args: [[{ minutes: 15, completed: false }]],
          expected: 0,
        },
        {
          label: "Malformed minutes are ignored",
          args: [
            [
              { minutes: -2, completed: true },
              { minutes: "5", completed: true },
              { completed: true },
            ],
          ],
          expected: 0,
        },
        {
          label: "Mixed input preserves valid activity",
          args: [
            [
              { minutes: 8, completed: true },
              { minutes: 10, completed: false },
              { minutes: 2.5, completed: true },
            ],
          ],
          expected: 10.5,
        },
      ],
    },
    {
      key: "project",
      title: "Build a learning activity report",
      skill: "Project data modeling",
      minutes: 60,
      fn: js ? "activityReport" : "activity_report",
      topics: ["project", "data", "collection", "array", "list"],
      brief:
        "Build the data layer for a personal learning dashboard. Start from a written brief, handle imperfect input, and explain your design.",
      requirements: [
        "Accept session records containing course, minutes, and completed.",
        "Return { totalMinutes, completedSessions, byCourse } using only completed sessions with positive numeric minutes and a non-empty course name.",
        "byCourse maps each course name to its total minutes. Empty input returns zero totals and an empty map.",
        "Add a README describing setup, examples, edge cases, and one design tradeoff. Tests verify the function; documentation needs your review.",
      ],
      hints: [
        "Start with one record and the shape of the report. Which fields need to change?",
        "Reuse the validation reasoning from your earlier task. How will you accumulate minutes for an existing course?",
        "Before polishing, test the empty input and two courses. Keep the report function separate from any presentation.",
      ],
      cases: [
        {
          label: "Empty report",
          args: [[]],
          expected: { totalMinutes: 0, completedSessions: 0, byCourse: {} },
        },
        {
          label: "Aggregate across courses",
          args: [
            [
              { course: "JS", minutes: 10, completed: true },
              { course: "JS", minutes: 20, completed: true },
              { course: "Python", minutes: 5, completed: true },
            ],
          ],
          expected: {
            totalMinutes: 35,
            completedSessions: 3,
            byCourse: { JS: 30, Python: 5 },
          },
        },
        {
          label: "Ignore incomplete and invalid records",
          args: [
            [
              { course: "JS", minutes: 10, completed: false },
              { course: "", minutes: 5, completed: true },
              { course: "JS", minutes: -3, completed: true },
              { course: "JS", minutes: "4", completed: true },
            ],
          ],
          expected: { totalMinutes: 0, completedSessions: 0, byCourse: {} },
        },
        {
          label: "Fractional minutes",
          args: [[{ course: "JS", minutes: 1.5, completed: true }]],
          expected: {
            totalMinutes: 1.5,
            completedSessions: 1,
            byCourse: { JS: 1.5 },
          },
        },
      ],
    },
  ];
  return spec.map((item) => ({
    id: `${language}-${item.key}`,
    title: item.title,
    language,
    kind: item.key === "project" ? ("project" as const) : ("practice" as const),
    skill: item.skill,
    minutes: item.minutes,
    brief: item.brief,
    requirements: item.requirements,
    hints: item.hints,
    function: item.fn,
    cases: item.cases,
    topics: item.topics,
    starter: js
      ? `// ${item.title}\n// Read the brief, then implement your own approach.\nexport function ${item.fn}(${item.key === "validation" ? "price, discount" : "sessions"}) {\n  throw new Error("Not implemented yet");\n}\n`
      : `# ${item.title}\n# Read the brief, then implement your own approach.\ndef ${item.fn}(${item.key === "validation" ? "price, discount" : "sessions"}):\n    raise NotImplementedError("Implement your own approach")\n`,
  }));
});

export interface Attempt {
  id: string;
  at: string;
  fileVersion: string;
  stale: boolean;
  passed: boolean;
  checks: { label: string; passed: boolean }[];
  output: string;
  hints: number;
  source: string;
  sourceTruncated: boolean;
}
export interface PracticeTask {
  id: string;
  courseId: string;
  lessonId: string;
  exerciseId: string;
  path: string;
  workspace: string;
  createdAt: string;
  status: "active" | "paused" | "completed";
  hints: number;
  reflection: string;
  attempts: Attempt[];
  reviewOf?: string;
}
const digest = (text: string) =>
  createHash("sha256").update(text).digest("hex");
export function runtimeEnvironment() {
  const env: NodeJS.ProcessEnv = {};
  for (const key of [
    "PATH",
    "Path",
    "SYSTEMROOT",
    "SystemRoot",
    "WINDIR",
    "ComSpec",
    "SystemDrive",
    "OS",
    "PATHEXT",
    "TEMP",
    "TMP",
    "USERPROFILE",
    "HOME",
    "APPDATA",
    "LOCALAPPDATA",
  ])
    if (process.env[key]) env[key] = process.env[key];
  env.PYTHONIOENCODING = "utf-8";
  return env;
}
export class Practice {
  private checking = new Set<string>();
  constructor(
    private app: Application,
    private workspace: Workspace,
  ) {}
  tasks() {
    return this.app.store.get<PracticeTask[]>("practice:tasks") || [];
  }
  search(query: string) {
    const words =
      query
        .toLowerCase()
        .match(/[a-z0-9]{2,}/g)
        ?.slice(0, 8) || [];
    if (!words.length) return [];
    return this.tasks()
      .filter((task) =>
        words.some((word) =>
          (
            this.exercise(task.exerciseId).title +
            " " +
            this.exercise(task.exerciseId).skill +
            " " +
            task.reflection +
            " " +
            task.attempts[0]?.output
          )
            .toLowerCase()
            .includes(word),
        ),
      )
      .slice(0, 20)
      .map((task) => ({
        taskId: task.id,
        courseId: task.courseId,
        courseTitle:
          this.app.store.state().courses.find((c) => c.id === task.courseId)
            ?.title || "Course",
        title: this.exercise(task.exerciseId).title,
        reflection: task.reflection,
        attempt: task.attempts[0],
      }));
  }
  task(id: string) {
    const task = this.tasks().find((item) => item.id === id);
    if (!task) throw new UserError("That practical task was not found.", 404);
    return task;
  }
  exercise(id: string) {
    const spec = exercises.find((item) => item.id === id);
    if (!spec) throw new UserError("Choose an available practical task.");
    return spec;
  }
  persist(task: PracticeTask) {
    const tasks = this.tasks();
    const index = tasks.findIndex((item) => item.id === task.id);
    if (index >= 0) tasks[index] = task;
    else tasks.unshift(task);
    this.app.store.put("practice:tasks", tasks);
  }
  dashboard(courseId?: string) {
    const state = this.app.configured();
    const courses = courseId
      ? state.courses.filter((c) => c.id === courseId)
      : state.courses;
    const tasks = this.tasks();
    const reviews = tasks
      .filter((t) => t.status === "completed" && !t.reviewOf)
      .map((task) => {
        const evidence = task.attempts.find((a) => a.passed && !a.stale)!;
        const repeats = tasks.filter(
          (t) => t.reviewOf === task.id && t.status === "completed",
        ).length;
        const days = [1, 3, 7, 14][Math.min(repeats, 3)];
        const latest =
          tasks
            .filter((t) => t.reviewOf === task.id && t.status === "completed")
            .flatMap((t) => t.attempts.filter((a) => a.passed && !a.stale))
            .sort((a, b) => b.at.localeCompare(a.at))[0] || evidence;
        return {
          taskId: task.id,
          courseId: task.courseId,
          title: this.exercise(task.exerciseId).title,
          dueAt: new Date(
            Date.parse(latest.at) + days * 86400000,
          ).toISOString(),
          evidenceId: latest.id,
        };
      });
    const opportunities = courses.flatMap((course) => {
      const active = tasks.find(
        (t) => t.courseId === course.id && t.status === "active",
      );
      if (active) return [];
      const checkpoints = state.checkpoints.filter(
        (c) => c.courseId === course.id,
      );
      const runs =
        this.app.store.get<import("../shared.js").RunEvidence[]>(
          `runs:${course.id}`,
        ) || [];
      const successful = tasks.filter(
        (t) =>
          t.courseId === course.id && t.status === "completed" && !t.reviewOf,
      );
      const successfulRun = runs.find(
        (r) =>
          r.exitCode === 0 && !r.timedOut && !r.stopped && !r.changedDuringRun,
      );
      const lesson = course.lessons.find(
        (l) =>
          l.id ===
          (state.session?.courseId === course.id
            ? state.session.lessonId
            : course.currentLessonId),
      );
      const titles = [
        course.title,
        lesson?.title || "",
        ...checkpoints.slice(0, 3).map((c) => c.lessonTitle),
      ]
        .join(" ")
        .toLowerCase();
      const language =
        successfulRun?.path.endsWith(".py") || /python/.test(titles)
          ? "python"
          : /\.(?:[cm]?js|jsx|tsx?)$/.test(successfulRun?.path || "") ||
              /javascript|typescript|react|\bjs\b/.test(titles)
            ? "javascript"
            : undefined;
      if (!language) return [];
      const eligible = exercises.filter(
        (e) =>
          e.language === language &&
          !successful.some((t) => t.exerciseId === e.id),
      );
      const spec =
        eligible.find(
          (e) =>
            e.kind === "project" &&
            successful.filter(
              (t) => this.exercise(t.exerciseId).kind === "practice",
            ).length >= 2,
        ) ||
        eligible.find(
          (e) =>
            e.kind === "practice" &&
            e.topics.some((topic) => titles.includes(topic)),
        ) ||
        eligible.find((e) => e.kind === "practice");
      if (!spec || (!checkpoints.length && !successfulRun)) return [];
      const reason =
        spec.kind === "project"
          ? "You completed two practical tasks. Combine those skills in a small project before moving further through the course."
          : checkpoints.length
            ? `You saved work from “${checkpoints[0].lessonTitle}”. Try applying a related programming skill before the next lesson.`
            : "You ran saved code successfully. This is a useful moment to try a small task of your own.";
      const previousLesson = course.lessons.filter(
        (l) => l.title === checkpoints[0]?.lessonTitle,
      );
      const atBoundary =
        lesson &&
        previousLesson.length === 1 &&
        previousLesson[0].section !== lesson.section;
      const key = `${course.id}:${spec.id}`;
      const deferred =
        this.app.store.get<Record<string, number>>("practice:deferred") || {};
      if ((deferred[key] || 0) > Date.now()) return [];
      return [
        {
          key,
          courseId: course.id,
          exerciseId: spec.id,
          reason: atBoundary
            ? `You moved from “${previousLesson[0].section}” to “${lesson.section}”. Apply the earlier ideas before adding more. ${reason}`
            : reason,
          lessonId: lesson?.id,
          evidence: checkpoints[0]?.id || successfulRun?.id,
          courseTitle: course.title,
        },
      ];
    });
    return {
      exercises: exercises.map(({ starter, hints, ...spec }) => spec),
      tasks: courseId ? tasks.filter((t) => t.courseId === courseId) : tasks,
      opportunities,
      liveOpportunities: courses.flatMap((course) => {
        const completed = tasks.filter(
          (t) =>
            t.courseId === course.id && t.status === "completed" && !t.reviewOf,
        );
        const key = `${course.id}:live`;
        if (
          !completed.length ||
          (this.app.store.get<Record<string, number>>("practice:deferred")?.[
            key
          ] || 0) > Date.now()
        )
          return [];
        return [
          {
            courseId: course.id,
            key,
            courseTitle: course.title,
            evidence: completed[0].id,
            reason:
              "You completed practical work. Explore a small real issue now: read its requirements, reproduce behavior, or improve documentation before taking on a larger code change.",
          },
        ];
      }),
      reviews: reviews.filter((r) => !courseId || r.courseId === courseId),
      reviewEnabled:
        this.app.store.get<boolean>("practice:reviewsEnabled") !== false,
      skills: tasks
        .filter(
          (t) =>
            t.status === "completed" && (!courseId || t.courseId === courseId),
        )
        .map((t) => ({
          courseId: t.courseId,
          taskId: t.id,
          skill: this.exercise(t.exerciseId).skill,
          evidence: t.attempts.find((a) => a.passed && !a.stale)!.id,
          assistance: t.attempts.find((a) => a.passed && !a.stale)!.hints
            ? "Practiced with OutClass help"
            : "Passed without OutClass hints in this attempt",
        })),
    };
  }
  defer(key: string, days: number) {
    const deferred =
      this.app.store.get<Record<string, number>>("practice:deferred") || {};
    // Bound dismissal memory; one suggestion never becomes a permanent interruption.
    this.app.store.put("practice:deferred", {
      ...Object.fromEntries(
        Object.entries(deferred)
          .filter(([, at]) => at > Date.now())
          .slice(-200),
      ),
      [key]: Date.now() + days * 86400000,
    });
  }
  async start(courseId: string, exerciseId: string, reviewOf?: string) {
    const spec = this.exercise(exerciseId),
      state = this.app.configured();
    const course = state.courses.find((c) => c.id === courseId);
    if (!course) throw new UserError("Choose a course first.");
    if (
      this.tasks().some((t) => t.courseId === courseId && t.status === "active")
    )
      throw new UserError(
        "Continue or pause your current practical task first.",
        409,
      );
    if (reviewOf) {
      const original = this.task(reviewOf);
      if (
        original.courseId !== courseId ||
        original.exerciseId !== exerciseId ||
        original.status !== "completed" ||
        original.reviewOf
      )
        throw new UserError("Choose a completed task to revisit.");
    }
    if (state.session && state.session.courseId !== courseId)
      throw new UserError("Finish the current course session first.", 409);
    if (state.session?.contributionId)
      throw new UserError(
        "End contribution work before starting a course practice task.",
        409,
      );
    if (!state.session) {
      const anchor = this.app.store.get<import("../shared.js").ResumeAnchor>(
        `resume:${courseId}`,
      );
      if (anchor && !anchor.contributionId)
        await this.app.continueCourse(courseId);
      else {
        const lesson =
          course.lessons.find((l) => l.id === course.currentLessonId) ||
          course.lessons[0];
        if (!lesson) throw new UserError("Add a lesson to the course first.");
        await this.app.start(courseId, lesson.id);
      }
    }
    const session = this.app.configured().session!;
    const id = randomUUID(),
      file = `practice/${spec.id}-${id.slice(0, 6)}/solution.${spec.language === "python" ? "py" : "mjs"}`;
    await this.workspace.save(session.id, file, spec.starter, null);
    await this.workspace.save(
      session.id,
      `${file.slice(0, file.lastIndexOf("/"))}/BRIEF.md`,
      `# ${spec.title}\n\n${spec.brief}\n\n${spec.requirements.map((r) => `- ${r}`).join("\n")}\n\nCurated OutClass exercise v1. Associated lesson: ${session.lessonTitle}. This is transfer practice, not a claim about the instructor's exact assignment.\n`,
      null,
    );
    const task: PracticeTask = {
      id,
      courseId,
      lessonId: session.lessonId,
      exerciseId,
      path: file,
      workspace: session.workspace,
      createdAt: new Date().toISOString(),
      status: "active",
      hints: 0,
      reflection: "",
      attempts: [],
      reviewOf,
    };
    this.persist(task);
    await this.workspace.editorAnchor(session.id, file, 0);
    return task;
  }
  update(
    id: string,
    action: "pause" | "resume" | "reflection",
    reflection = "",
  ) {
    const task = this.task(id);
    if (this.checking.has(id))
      throw new UserError("Wait for the checks to finish.", 409);
    if (action === "reflection") {
      assertClean(reflection, "practice reflection");
      task.reflection = reflection.slice(0, 4000);
    } else {
      if (task.status === "completed")
        throw new UserError(
          "Start a fresh review attempt for a completed task.",
        );
      if (
        action === "resume" &&
        this.tasks().some(
          (t) =>
            t.courseId === task.courseId &&
            t.id !== id &&
            t.status === "active",
        )
      )
        throw new UserError("Pause the other task first.", 409);
      task.status = action === "pause" ? "paused" : "active";
    }
    this.persist(task);
    return task;
  }
  hint(id: string) {
    const task = this.task(id),
      spec = this.exercise(task.exerciseId);
    const hint = spec.hints[Math.min(task.hints, spec.hints.length - 1)];
    task.hints++;
    this.persist(task);
    return { hint, level: Math.min(task.hints, 3) };
  }
  context(courseId: string) {
    const task = this.tasks().find(
      (t) => t.courseId === courseId && t.status === "active",
    );
    const session = this.app.store.state().session;
    if (!task || session?.workspace !== task.workspace) return undefined;
    const { starter, hints, ...exercise } = this.exercise(task.exerciseId);
    return {
      taskId: task.id,
      exercise,
      reflection: task.reflection,
      latestAttempt: task.attempts[0],
      hintsRequested: task.hints,
      path: task.path,
      reviewOf: task.reviewOf,
      teacherPolicy:
        "Guide this attempt with a diagnostic question and one progressive hint. Do not provide the implementation or complete the task, even if asked. Explain concepts with a different small example. The learner writes and tests the solution.",
    };
  }
  recordHelp(id: string) {
    const task = this.task(id);
    task.hints++;
    this.persist(task);
  }
  async check(id: string, sessionId: string) {
    const task = this.task(id),
      spec = this.exercise(task.exerciseId),
      session = this.workspace.session(sessionId);
    if (
      task.courseId !== session.courseId ||
      task.workspace !== session.workspace
    )
      throw new UserError(
        "Open this task's original course folder before checking it.",
        409,
      );
    if (task.status !== "active")
      throw new UserError(
        "Resume this task or start a fresh review before checking.",
      );
    if (this.checking.has(id) || this.workspace.isRunning(sessionId))
      throw new UserError("Wait for the current checks or program.", 409);
    this.checking.add(id);
    try {
      const file = await this.workspace.read(sessionId, task.path);
      const { target } = await this.workspace.location(sessionId, task.path);
      const js = spec.language === "javascript";
      const prefix = `GITLEARN_CHECK_${randomUUID()}:`;
      const data = JSON.stringify(spec.cases);
      const script = js
        ? `import assert from 'node:assert/strict'; const m = await import(${JSON.stringify(pathToFileURL(target).href)}); const f=m[${JSON.stringify(spec.function)}]; const checks=[]; for(const t of ${data}) {let passed=false; try {if(t.throws) {await assert.rejects(async()=>await f(...t.args));} else {assert.deepStrictEqual(await f(...t.args),t.expected);} passed=true;} catch {} checks.push({label:t.label,passed});} console.log(${JSON.stringify(prefix)}+JSON.stringify(checks));`
        : `import runpy,json\nm=runpy.run_path(${JSON.stringify(target)})\nf=m.get(${JSON.stringify(spec.function)})\nchecks=[]\nfor t in json.loads(${JSON.stringify(data)}):\n    passed=False\n    try:\n        value=f(*t['args'])\n        passed=not t.get('throws',False) and value==t.get('expected')\n    except Exception:\n        passed=t.get('throws',False)\n    checks.append({'label':t['label'],'passed':passed})\nprint(${JSON.stringify(prefix)}+json.dumps(checks))`;
      const runtime = js
        ? process.execPath
        : await this.workspace.pythonRuntime(session.workspace);
      this.workspace.session(sessionId);
      const env = runtimeEnvironment();
      if (js && process.versions.electron) env.ELECTRON_RUN_AS_NODE = "1";
      if (this.workspace.isRunning(sessionId))
        throw new UserError(
          "A program started while preparing these checks.",
          409,
        );
      const result = await new Promise<{ output: string; code: number | null }>(
        (resolve, reject) => {
          const job = spawn(
            runtime,
            js ? ["--input-type=module", "-e", script] : ["-u", "-c", script],
            {
              cwd: session.workspace,
              env,
              shell: false,
              windowsHide: true,
              detached: process.platform !== "win32",
              stdio: ["ignore", "pipe", "pipe"],
            },
          );
          this.workspace.track(sessionId, job);
          let output = "";
          const timer = setTimeout(() => this.workspace.stop(sessionId), 10000);
          const append = (chunk: Buffer) => {
            output = (output + chunk.toString()).slice(0, 32000);
            if (output.length >= 32000) this.workspace.stop(sessionId);
          };
          job.stdout.on("data", append);
          job.stderr.on("data", append);
          job.on("error", () => {
            clearTimeout(timer);
            this.workspace.untrack(sessionId, job);
            reject(
              new UserError(
                "The required runtime could not start. Check Workspace settings.",
                503,
              ),
            );
          });
          job.on("close", (code) => {
            clearTimeout(timer);
            this.workspace.untrack(sessionId, job);
            resolve({ output, code });
          });
        },
      );
      let checks = spec.cases.map((c) => ({ label: c.label, passed: false }));
      const line = result.output
        .split(/\r?\n/)
        .find((s) => s.startsWith(prefix));
      if (line && result.code === 0) {
        try {
          const parsed = JSON.parse(line.slice(prefix.length));
          if (
            Array.isArray(parsed) &&
            parsed.length === checks.length &&
            parsed.every(
              (p, i) =>
                p.label === checks[i].label && typeof p.passed === "boolean",
            )
          )
            checks = parsed;
        } catch {
          /* An incomplete runner response cannot pass. */
        }
      }
      const current = await readFile(target, "utf8").catch(() => "");
      const stale = digest(current) !== file.version;
      let output = result.output
        .split(/\r?\n/)
        .filter((s) => !s.startsWith(prefix))
        .join("\n")
        .slice(0, 8000);
      try {
        assertClean(output, "practice result");
        if (this.app.apiKey && output.includes(this.app.apiKey)) throw Error();
      } catch {
        output = "Sensitive output excluded.";
      }
      const latest = this.task(id);
      let source = file.content.slice(0, 16000);
      try {
        assertClean(source, "practice source");
        if (this.app.apiKey && source.includes(this.app.apiKey)) throw Error();
      } catch {
        source = "Sensitive content excluded from learning history.";
      }
      const attempt: Attempt = {
        id: randomUUID(),
        at: new Date().toISOString(),
        fileVersion: file.version,
        stale,
        passed: !stale && result.code === 0 && checks.every((c) => c.passed),
        checks,
        output,
        hints: latest.hints,
        source,
        sourceTruncated: file.content.length > 16000,
      };
      // Read the latest record so a concurrent hint cannot be lost.
      latest.attempts = [attempt, ...latest.attempts].slice(0, 50);
      if (attempt.passed) latest.status = "completed";
      this.persist(latest);
      return latest;
    } finally {
      this.checking.delete(id);
    }
  }
}
