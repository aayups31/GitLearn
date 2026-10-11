import { beforeEach, afterEach, it, expect } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Store } from "../src/server/store";
import { Application } from "../src/server/application";
import { Workspace } from "../src/server/workspace";
import { Practice } from "../src/server/practice";
import { ProjectRuntime } from "../src/server/project-runtime";
import { LiveWork } from "../src/server/live-work";
import { LearningPath } from "../src/server/learning-path";
let directory: string,
  store: Store,
  app: Application,
  workspace: Workspace,
  practice: Practice,
  runtime: ProjectRuntime,
  learning: LearningPath;
beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "outclass-path-"));
  store = new Store(path.join(directory, "data"));
  app = new Application(store);
  workspace = new Workspace(app);
  practice = new Practice(app, workspace);
  runtime = new ProjectRuntime(app, workspace);
  learning = new LearningPath(
    app,
    workspace,
    practice,
    runtime,
    new LiveWork(app, workspace, runtime, practice),
  );
  await app.setup(path.join(directory, "history"), false);
  for (const id of ["js", "other"])
    app.observe({
      eventId: randomUUID(),
      courseId: id,
      title: "JavaScript functions",
      url: `https://www.udemy.com/course/${id}/learn/lecture/1`,
      currentLessonId: "1",
      videoSeconds: 123,
      lessons: [
        {
          id: "1",
          title: "Functions and validation",
          section: "Basics",
          order: 0,
        },
        { id: "2", title: "Collections", section: "Next section", order: 1 },
      ],
    });
  await app.bindProject("js", "project");
  await app.start("js", "1");
});
afterEach(async () => {
  runtime.stopAll();
  await workspace.stopAll();
  store.close();
  await rm(directory, { recursive: true, force: true });
});
it("persists a personal direction, sizes practice, requires evidence for milestones, and does not overwrite project work", async () => {
  const status = learning.saveDirection("js", {
    goal: "Build a spending tracker",
    experience: "new",
    minutes: 10,
  });
  expect(status.direction?.goal).toBe("Build a spending tracker");
  expect(status.recommendation?.fitsSession).toBe(false);
  expect(() =>
    learning.complete(
      "js",
      "feature",
      randomUUID(),
      "I verified it with local examples.",
    ),
  ).toThrow("Attach");
  const id = store.state().session!.id;
  await workspace.save(
    id,
    "main.js",
    "console.log('a useful first feature');",
    null,
  );
  const run = await workspace.run(id, "main.js");
  expect(
    learning
      .complete(
        "js",
        "feature",
        run.run.id,
        "I ran my first example and observed its printed result.",
      )
      .milestones.find((m) => m.id === "feature")?.record?.reference,
  ).toBe(run.run.id);
  expect(() =>
    learning.complete(
      "other",
      "feature",
      run.run.id,
      "I ran my first example and observed its printed result.",
    ),
  ).toThrow("Attach");
  await learning.writeBrief("js");
  await expect(learning.writeBrief("js")).rejects.toThrow();
  expect((await workspace.read(id, "OUTCLASS-PROJECT.md")).content).toContain(
    "Build a spending tracker",
  );
});
it("blocks stale imported files and hints without execution, accepts a fresh run, and refuses old error attachments", async () => {
  const id = store.state().session!.id;
  await workspace.save(id, "helper.mjs", "export const value=1;", null);
  await workspace.save(
    id,
    "main.mjs",
    "import {value} from './helper.mjs';console.log(value);",
    null,
  );
  const first = await workspace.run(id, "main.mjs");
  await learning.rememberHelp("js");
  const helper = await workspace.read(id, "helper.mjs");
  await workspace.save(
    id,
    "helper.mjs",
    "export const value=2;",
    helper.version,
  );
  await expect(learning.assertFresh("js")).rejects.toThrow(
    "Test your changes first",
  );
  const second = await workspace.run(id, "main.mjs");
  expect((await learning.assertFresh("js"))?.id).toBe(second.run.id);
  await expect(learning.assertFresh("js", first.run.id)).rejects.toThrow(
    "newer result",
  );
  const impact = await learning.impact("js");
  expect(impact.baselineId).toBe(second.run.id);
});
it("supports bounded line input and rejects multiline input without using a system terminal", async () => {
  const id = store.state().session!.id;
  await workspace.save(
    id,
    "input.mjs",
    "process.stdout.write('Name? ');process.stdin.once('data',s=>{console.log('Hello '+s.toString().trim());process.exit(0);});",
    null,
  );
  const pending = workspace.run(id, "input.mjs");
  await expect.poll(() => workspace.runStatus(id).output).toContain("Name?");
  expect(() => workspace.input(id, "bad\nsecond")).toThrow("one short line");
  workspace.input(id, "Maya");
  const result = await pending;
  expect(result.output).toContain("Hello Maya");
  expect(result.exitCode).toBe(0);
  expect(workspace.runStatus(id).running).toBe(false);
  expect(() => workspace.input(id, "later")).toThrow("no longer");
});
it("flags an earlier successful file failing in a later lesson and reports possible dependent files", async () => {
  let id = store.state().session!.id;
  await workspace.save(id, "helper.mjs", "export const value=1;", null);
  await workspace.save(
    id,
    "main.mjs",
    "import {value} from './helper.mjs';console.log(value);",
    null,
  );
  const baseline = await workspace.run(id, "main.mjs");
  await app.sessionAction("discard");
  await app.start("js", "2");
  id = store.state().session!.id;
  const helper = await workspace.read(id, "helper.mjs");
  await workspace.save(
    id,
    "helper.mjs",
    "throw Error('regression');",
    helper.version,
  );
  const impact = await learning.impact("js");
  expect(impact.changed).toContain("helper.mjs");
  expect(
    impact.dependencies.find((d) => d.file === "main.mjs")?.references,
  ).toContain("helper.mjs");
  const failed = await workspace.run(id, "main.mjs");
  expect(failed.run.regression?.baselineId).toBe(baseline.run.id);
  expect(failed.run.regression?.changedFiles).toContain("helper.mjs");
});
it("a changed requirement rejects the old solution and records a distinct transfer attempt", async () => {
  const original = await practice.start("js", "javascript-collections"),
    id = store.state().session!.id;
  const source =
    "export function completedMinutes(sessions){return sessions.filter(s=>s.completed===true&&typeof s.minutes==='number'&&s.minutes>0).reduce((n,s)=>n+s.minutes,0);}";
  const file = await workspace.read(id, original.path);
  await workspace.save(id, original.path, source, file.version);
  expect((await practice.check(original.id, id)).status).toBe("completed");
  await expect(
    practice.start(
      "other",
      "javascript-collections-transfer",
      undefined,
      original.id,
    ),
  ).rejects.toThrow("original task");
  const challenge = await practice.start(
    "js",
    "javascript-collections-transfer",
    undefined,
    original.id,
  );
  expect(challenge.path).not.toBe(original.path);
  expect((await workspace.read(id, challenge.path)).content).not.toContain(
    "filter",
  );
  let changed = await workspace.read(id, challenge.path);
  await workspace.save(id, challenge.path, source, changed.version);
  expect((await practice.check(challenge.id, id)).attempts[0].passed).toBe(
    false,
  );
  changed = await workspace.read(id, challenge.path);
  await workspace.save(
    id,
    challenge.path,
    source.replace(
      "s.completed===true",
      "s.archived!==true&&s.completed===true",
    ),
    changed.version,
  );
  expect((await practice.check(challenge.id, id)).attempts[0].passed).toBe(
    true,
  );
});
it("freezes checkpoint video time and exact reflection, escapes ledger HTML, and discloses assistance and evidence limits", async () => {
  const id = store.state().session!.id;
  await workspace.save(id, "main.js", "console.log('hello');", null);
  await app.saveNote("I checked an example. <script>alert('no')</script>");
  const preview = await app.preview();
  expect(preview.video?.seconds).toBe(123);
  app.observe({
    eventId: randomUUID(),
    courseId: "js",
    title: "JavaScript functions",
    url: "https://www.udemy.com/course/js/learn/lecture/1",
    currentLessonId: "1",
    videoSeconds: 200,
    lessons: [],
  });
  await app.commit(preview.id, preview.message);
  expect(store.state().checkpoints[0].video?.seconds).toBe(123);
  expect(store.state().checkpoints[0].reflection).toBe(
    "I checked an example. <script>alert('no')</script>",
  );
  const html = await learning.ledger("js", "html");
  expect(html.content).toContain("&lt;script&gt;");
  expect(html.content).not.toContain("<script>");
  expect(html.content).toContain("not a certification");
  const md = await learning.ledger("js", "markdown");
  expect(md.content).toContain(store.state().checkpoints[0].sha);
  expect(md.digest).toBe(html.digest);
});
