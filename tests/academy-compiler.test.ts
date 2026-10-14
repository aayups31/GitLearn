import { it, expect } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Store } from "../src/server/store";
import { Application } from "../src/server/application";
import { Expansion } from "../src/server/expansion";
it("executes all reference checks, expects an incomplete starter and pins the actual project to Learn", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "outclass-compiler-")),
    store = new Store(path.join(dir, "data")),
    app = new Application(store),
    expansion = new Expansion(app);
  try {
    const c = expansion.saveCourse({
      title: "Python API",
      audience: "Beginners",
      outcome: "Build an activity API",
      rightsConfirmed: true,
      lessons: [
        {
          title: "Python",
          objective: "Validate input",
          practice: "Build a report",
          content: "Use functions and dictionaries",
        },
      ],
      expectedRevision: 0,
    });
    const report = await expansion.compiler.compile(c.id, c.revision, c);
    expect(report.reference.passed).toBe(18);
    expect(report.starter.passed).toBe(0);
    expect(report.verified).toBe(true);
    const r = expansion.release(c.id, { expectedRevision: 1, approve: true });
    expect(r.project?.id).toBe(report.id);
    expansion.enroll(r.id);
    await app.setup(path.join(dir, "history"), false);
    await expansion.launch(r.id, 0);
    const folder = store.state().session!.workspace;
    expect(await readFile(path.join(folder, "main.py"), "utf8")).toContain(
      "NotImplementedError",
    );
    expect(
      await readFile(path.join(folder, "test_project.py"), "utf8"),
    ).toContain("test_18_json_response");
  } finally {
    store.close();
    await rm(dir, { recursive: true, force: true });
  }
});
