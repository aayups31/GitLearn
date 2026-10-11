import { afterEach, beforeEach, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Store } from "../src/server/store";
import { Application } from "../src/server/application";
import { Workspace } from "../src/server/workspace";
import { ProjectRuntime } from "../src/server/project-runtime";
let folder: string,
  store: Store,
  workspace: Workspace,
  runtime: ProjectRuntime,
  id: string;
beforeEach(async () => {
  folder = await mkdtemp(path.join(tmpdir(), "gitlearn-runtime-"));
  store = new Store(path.join(folder, "data"));
  const app = new Application(store, "synthetic-secret-placeholder");
  workspace = new Workspace(app);
  runtime = new ProjectRuntime(app, workspace);
  await app.setup(path.join(folder, "history"), false);
  app.observe({
    eventId: "js",
    courseId: "js",
    title: "JS",
    url: "https://www.udemy.com/course/js/learn/lecture/1",
    lessons: [{ id: "1", title: "Functions", section: "Basics", order: 0 }],
  });
  await app.start("js", "1");
  id = store.state().session!.id;
});
afterEach(async () => {
  runtime.stopAll();
  await workspace.stopAll();
  await new Promise((r) => setTimeout(r, 700));
  store.close();
  await rm(folder, { recursive: true, force: true });
});
const waitFor = async (predicate: () => boolean) => {
  for (let i = 0; i < 80; i++) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("Command did not finish");
};
it("runs actual project tests, reports exit status, and excludes companion credentials", async () => {
  const root = store.state().session!.workspace;
  await writeFile(
    path.join(root, "test.mjs"),
    "import {test} from 'node:test'; import assert from 'node:assert/strict'; test('environment',()=>assert.equal(process.env.OPENAI_API_KEY,undefined));",
  );
  const record = await runtime.start(id, "node --test test.mjs");
  await waitFor(() => runtime.status(id)[0].state !== "running");
  expect(runtime.status(id)[0].exitCode).toBe(0);
  expect(runtime.status(id)[0].output).toContain("environment");
  expect(record.courseId).toBe("js");
  await runtime.start(id, 'node -e "console.log(1); console.log(2)"');
  await waitFor(() => runtime.status(id)[0].state !== "running");
  expect(runtime.status(id)[0].exitCode).toBe(0);
  expect(runtime.status(id)[0].output.replace(/\r/g, "")).toBe("1\n2\n");
});
it("accepts interactive line input and stops a long-running process", async () => {
  await writeFile(
    path.join(store.state().session!.workspace, "prompt.py"),
    "name=input('Name: '); print('Hi '+name,flush=True); import time; time.sleep(120)",
  );
  const record = await runtime.start(id, "python -u prompt.py");
  await waitFor(() => runtime.status(id)[0].output.includes("Name:"));
  runtime.input(record.id, "Learner");
  await waitFor(() => runtime.status(id)[0].output.includes("Hi Learner"));
  await expect(runtime.start(id, "echo another")).rejects.toThrow("Stop");
  runtime.stop(record.id);
  await waitFor(
    () => runtime.status(id)[0].state === "stopped" && !workspace.isRunning(id),
  );
});
it.runIf(process.platform === "win32")("launches an installed native tool through PowerShell and preserves its exit code", async () => {
  const executable = process.execPath.replaceAll("'", "''");
  await runtime.start(id, `& '${executable}' --version; exit 23`);
  await waitFor(() => runtime.status(id)[0].state !== "running");
  expect(runtime.status(id)[0].output).toContain(process.version);
  expect(runtime.status(id)[0].exitCode).toBe(23);
});
it("marks an old running record interrupted rather than pretending a process restarted", () => {
  store.put("project:commands", [
    { id: "old", state: "running", output: "saved output" },
  ]);
  new ProjectRuntime(new Application(store), workspace);
  expect(runtime.records()[0].state).toBe("interrupted");
  expect(runtime.records()[0].output).toBe("saved output");
});
it("creates independent project scaffolding without overwriting existing learner code", async () => {
  const before = await workspace.save(
    id,
    "my-work.js",
    "console.log('mine');",
    null,
  );
  const first = await runtime.scaffold(id, "react"),
    second = await runtime.scaffold(id, "python");
  expect(first.directory).not.toBe(second.directory);
  expect(first.install).toContain("npm --prefix");
  expect((await workspace.read(id, before.path)).content).toBe(before.content);
  expect((await workspace.read(id, first.entry)).content).toContain(
    "Your brief",
  );
  expect((await workspace.read(id, second.entry)).content).toContain(
    "your project brief",
  );
});
