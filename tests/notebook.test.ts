import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { Store } from "../src/server/store";
import { Application } from "../src/server/application";
import { IdeaNotebook } from "../src/server/notebook";
let directory: string, store: Store, app: Application, notebook: IdeaNotebook;
beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "outclass-notebook-"));
  store = new Store(path.join(directory, "data"));
  app = new Application(store);
  await app.setup(path.join(directory, "history"), false);
  for (const id of ["python", "react"])
    app.observe({
      eventId: id,
      courseId: id,
      title: id,
      url: `https://www.udemy.com/course/${id}/learn/lecture/1`,
      lessons: [{ id: "1", title: "Functions", section: "Basics", order: 0 }],
    });
  notebook = new IdeaNotebook(app);
});
afterEach(async () => {
  store.close();
  await rm(directory, { recursive: true, force: true });
});
function create(title = "Club tool", courseIds = ["python"]) {
  return notebook.create({
    title,
    problem: "Organize our club's events",
    courseIds,
    shareWithOffCourse: false,
  });
}
it("keeps project ideas, decisions and conversations isolated, with optional sharing", async () => {
  const a = create(),
    b = create("Website", ["react"]);
  notebook.note(a.id, { text: "An API for club events", kind: "idea" });
  notebook.note(b.id, {
    text: "A website for another project",
    kind: "decision",
  });
  expect(notebook.context(a.id).notes[0].text).toContain("API");
  expect(JSON.stringify(notebook.context(a.id))).not.toContain(
    "another project",
  );
  expect(() => notebook.context(a.id, "python")).toThrow("Enable sharing");
  notebook.update(a.id, {
    title: a.title,
    problem: a.problem,
    courseIds: a.courseIds,
    shareWithOffCourse: true,
  });
  expect(notebook.context(a.id, "python").title).toBe(a.title);
  expect(() => notebook.context(a.id, "react")).toThrow("link this course");
  await notebook.ask(a.id, "What first experiment fits?");
  expect(
    notebook.status().projects.find((p) => p.id === b.id)?.messages,
  ).toHaveLength(0);
});
it("captures checkpoint reflections only with consent, deduplicates, and respects deletion", () => {
  const p = create();
  const state = store.state();
  state.checkpoints.push({
    id: "checkpoint-one",
    sessionId: "session",
    courseId: "python",
    courseTitle: "Python",
    lessonTitle: "Functions",
    timestamp: new Date(Date.now() - 4 * 86400000).toISOString(),
    message: "Saved work",
    sha: "abc",
    files: [],
    sync: "local",
    reflection: "I separated the validation from the output.",
  });
  store.save(state);
  expect(notebook.status().projects[0].notes).toHaveLength(0);
  notebook.preferences({ launchPrompt: true, automaticNotes: true });
  const captured = notebook.status().projects[0].notes;
  expect(captured).toHaveLength(1);
  expect(captured[0].origin).toBe("checkpoint");
  expect(notebook.status().reviewDue).toContain(p.id);
  expect(notebook.status().projects[0].notes).toHaveLength(1);
  notebook.removeNote(p.id, captured[0].id);
  expect(notebook.status().projects[0].notes).toHaveLength(0);
});
it("clears derived project and teacher memory after edits or deletion", async () => {
  const p = create();
  const n = notebook.note(p.id, { text: "One original thought", kind: "idea" })
    .notes[0];
  await notebook.ask(p.id, "How to begin?");
  store.put("chat:python", [
    { projectId: p.id, text: "Old derived idea" },
    { text: "Unrelated course conversation" },
  ]);
  notebook.note(p.id, {
    noteId: n.id,
    text: "Changed original thought",
    kind: "decision",
  });
  expect(notebook.status().projects[0].messages).toHaveLength(0);
  expect(store.get<any[]>("chat:python")).toEqual([
    { text: "Unrelated course conversation" },
  ]);
  notebook.remove(p.id);
  expect(notebook.status().projects).toHaveLength(0);
});
it("rejects fabricated model connections and a note deletion during inference", async () => {
  const p = create();
  const state = store.state();
  state.settings.assistantEnabled = true;
  store.save(state);
  vi.spyOn(app.ai, "ready").mockReturnValue(true);
  vi.spyOn(app.ai, "structured").mockResolvedValue({
    answer: "A possible design",
    connections: [
      { noteId: "invented", courseId: "python", explanation: "Unfounded" },
    ],
  });
  await expect(notebook.ask(p.id, "Plan it")).rejects.toThrow(
    "unsupported connection",
  );
  let finish!: (v: any) => void;
  vi.mocked(app.ai.structured).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const response = notebook.ask(p.id, "Plan it");
  notebook.note(p.id, { text: "A new constraint", kind: "decision" });
  finish({ answer: "Old suggestion", connections: [] });
  await expect(response).rejects.toThrow("changed during");
});
it("keeps local planning available when a connection is configured but AI is disabled", async () => {
  const p = create();
  vi.spyOn(app.ai, "ready").mockReturnValue(true);
  const infer = vi.spyOn(app.ai, "structured");
  const result = await notebook.ask(
    p.id,
    "What should my first version do?",
    true,
  );
  expect(result.review?.mode).toBe("local");
  expect(infer).not.toHaveBeenCalled();
  expect(notebook.status().aiReady).toBe(false);
});
it("persists original notes and project settings across restarts without AI", () => {
  const p = create();
  notebook.note(p.id, { text: "A durable project decision", kind: "decision" });
  store.close();
  store = new Store(path.join(directory, "data"));
  app = new Application(store);
  notebook = new IdeaNotebook(app);
  expect(notebook.status().projects[0].notes[0].text).toBe(
    "A durable project decision",
  );
  expect(notebook.status().aiReady).toBe(false);
});
