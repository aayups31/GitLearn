import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mkdtemp, rm, writeFile, readFile, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Store } from "../src/server/store";
import { Application } from "../src/server/application";
import { Workspace } from "../src/server/workspace";
let directory: string,
  store: Store,
  app: Application,
  workspace: Workspace,
  id: string,
  root: string;
beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "gitlearn-editor-"));
  store = new Store(path.join(directory, "data"));
  app = new Application(store);
  workspace = new Workspace(app);
  await app.setup(path.join(directory, "history"), false);
  app.observe({
    eventId: "editor",
    courseId: "javascript",
    title: "JavaScript",
    url: "https://www.udemy.com/course/javascript/learn/lecture/1",
    lessons: [{ id: "1", title: "Functions", section: "Basics", order: 0 }],
  });
  await app.start("javascript", "1");
  id = store.state().session!.id;
  root = store.state().session!.workspace;
});
afterEach(async () => {
  vi.unstubAllEnvs();
  store.close();
  await rm(directory, { recursive: true, force: true });
});
it("creates and saves a real file, but preserves changes made in another editor", async () => {
  const file = await workspace.save(
    id,
    "src/main.js",
    "console.log('first');",
    null,
  );
  expect(await readFile(path.join(root, "src", "main.js"), "utf8")).toBe(
    file.content,
  );
  await writeFile(path.join(root, "src", "main.js"), "// External edit");
  await expect(
    workspace.save(id, file.path, "// My older draft", file.version),
  ).rejects.toThrow("changed on disk");
  expect(await readFile(path.join(root, "src", "main.js"), "utf8")).toBe(
    "// External edit",
  );
});
it("blocks traversal, secret files, stale sessions, and overwriting on create", async () => {
  for (const name of [
    "../outside.js",
    ".env",
    "node_modules/main.js",
    "C:/outside.js",
    "con.py",
  ])
    await expect(workspace.save(id, name, "text", null)).rejects.toThrow();
  await expect(workspace.list("an-old-session")).rejects.toThrow(
    "session has changed",
  );
  await workspace.save(id, "main.js", "// Saved", null);
  await expect(
    workspace.save(id, "main.js", "// Replaced", null),
  ).rejects.toThrow("already exists");
});
it("does not follow directory junctions out of the selected workspace", async () => {
  const outside = path.join(directory, "outside");
  const { mkdir } = await import("node:fs/promises");
  await mkdir(outside);
  await writeFile(path.join(outside, "private.txt"), "outside");
  await symlink(
    outside,
    path.join(root, "linked"),
    process.platform === "win32" ? "junction" : "dir",
  );
  await expect(workspace.read(id, "linked/private.txt")).rejects.toThrow(
    "Linked files",
  );
  await expect(
    workspace.save(id, "linked/new.js", "// blocked", null),
  ).rejects.toThrow("Linked files");
});
it("runs saved JavaScript locally with API credentials excluded", async () => {
  vi.stubEnv("OPENAI_API_KEY", "unit-only-secret");
  vi.stubEnv("OPEN_AI_API", "unit-only-secret");
  await workspace.save(
    id,
    "main.js",
    "console.log('actual result', 6 * 7, process.env.OPENAI_API_KEY === undefined, process.env.OPEN_AI_API === undefined);",
    null,
  );
  const result = await workspace.run(id, "main.js");
  expect(result.exitCode).toBe(0);
  expect(result.output).toContain("actual result 42 true true");
});
it("bounds noisy programs and rejects unsupported local runtimes", async () => {
  await workspace.save(
    id,
    "main.js",
    "for (let i = 0; i < 100000; i++) console.log('x'.repeat(100));",
    null,
  );
  const result = await workspace.run(id, "main.js");
  expect(result.output.length).toBeLessThan(64500);
  expect(result.output).toContain("Output limit");
  await workspace.save(id, "main.cpp", "int main() {}", null);
  await expect(workspace.run(id, "main.cpp")).rejects.toThrow(
    "own local toolchain",
  );
});
it.skipIf(
  spawnSync("python", ["--version"], { windowsHide: true }).status !== 0,
)("runs a saved Python lesson using the local interpreter", async () => {
  await workspace.save(
    id,
    "main.py",
    "import sys\nprint('Python studio result', 6 * 7)\nprint(sys.prefix)\n",
    null,
  );
  const environment = path.join(root, ".venv");
  expect(
    spawnSync("python", ["-m", "venv", "--without-pip", environment], {
      windowsHide: true,
    }).status,
  ).toBe(0);
  const result = await workspace.run(id, "main.py");
  expect(result.exitCode).toBe(0);
  expect(result.output).toContain("Python studio result 42");
  expect(result.output.toLowerCase()).toContain(environment.toLowerCase());
});
it("stops its tracked program before the runtime timeout", async () => {
  await workspace.save(
    id,
    "wait.js",
    "console.log('Started'); setInterval(() => {}, 1000);",
    null,
  );
  const running = workspace.run(id, "wait.js");
  await new Promise((resolve) => setTimeout(resolve, 500));
  workspace.stop(id);
  const result = await running;
  expect(result.output).toContain("Started");
  expect(result.timedOut).toBe(false);
});
it("generates only an explicit bounded HTML preview", async () => {
  await workspace.save(
    id,
    "index.html",
    "<h1>My lesson</h1><script>document.querySelector('h1').textContent='Preview runs';</script>",
    null,
  );
  const preview = await workspace.preview(id, "index.html");
  expect(workspace.previewDocument(preview.url.split("/").pop()!)).toContain(
    "Preview runs",
  );
  expect(() => workspace.previewDocument("unknown")).toThrow("expired");
});
