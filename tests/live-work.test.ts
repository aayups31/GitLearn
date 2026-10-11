import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Store } from "../src/server/store";
import { Application } from "../src/server/application";
import { Workspace } from "../src/server/workspace";
import { ProjectRuntime } from "../src/server/project-runtime";
import { Practice } from "../src/server/practice";
import { LiveWork, repository } from "../src/server/live-work";
let folder: string,
  store: Store,
  app: Application,
  workspace: Workspace,
  runtime: ProjectRuntime,
  live: LiveWork;
const metadata = {
  language: "JavaScript",
  license: { spdx_id: "MIT" },
  default_branch: "main",
  pushed_at: "2026-10-01T00:00:00Z",
  archived: false,
};
let closed = false;
const lookup = vi.fn(async (url: any) => {
  const route = new URL(url).pathname;
  let value: any = metadata;
  if (route.includes("search"))
    value = {
      items: [{ html_url: "https://github.com/example/project/issues/4" }],
    };
  else if (route.includes("issues"))
    value = {
      title: "Validate empty inputs",
      body: "Add a regression test.",
      state: closed ? "closed" : "open",
      assignees: [],
      labels: [{ name: "good first issue" }],
      updated_at: "2026-10-01T00:00:00Z",
    };
  else if (route.includes("contents"))
    value = {
      encoding: "base64",
      size: 50,
      content: Buffer.from(
        "Run tests; discuss your approach. Follow contributor rules.",
      ).toString("base64"),
      sha: "revision-1",
    };
  return new Response(JSON.stringify(value), { status: 200 });
});
beforeEach(async () => {
  closed = false;
  lookup.mockClear();
  folder = await mkdtemp(path.join(tmpdir(), "gitlearn-live-"));
  store = new Store(path.join(folder, "data"));
  app = new Application(store);
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
  live = new LiveWork(
    app,
    workspace,
    runtime,
    new Practice(app, workspace),
    lookup as typeof fetch,
  );
});
afterEach(async () => {
  store.close();
  await rm(folder, { recursive: true, force: true });
});
it("uses only checked public issues, gives sourced prerequisites, and rechecks before selecting", async () => {
  const found = await live.discover("JavaScript");
  expect(found.shortlist[0].repo).toBe("example/project");
  expect(found.shortlist[0].sources[0].revision).toBe("revision-1");
  expect(found.lastSearch!.rationale).toContain("not been established");
  expect(live.records()).toEqual([]);
  const record = await live.select("js", found.shortlist[0].url);
  expect(record.candidate.checkedAt).toBeTruthy();
  expect(record.root).toBeUndefined();
  closed = true;
  await expect(live.select("js", found.shortlist[0].url)).rejects.toThrow(
    "open, unassigned",
  );
  expect(
    lookup.mock.calls.every(([url]) =>
      String(url).startsWith("https://api.github.com/"),
    ),
  ).toBe(true);
});
it("rejects foreign or credential-bearing repository URLs", () => {
  for (const url of [
    "https://github.com.evil.test/a/b/issues/1",
    "https://user:secret@github.com/a/b",
    "../../etc",
  ])
    expect(() => repository(url)).toThrow();
});
it("honors GitHub backoff and preserves the saved list", async () => {
  await live.discover("JavaScript");
  const limited = new LiveWork(
    app,
    workspace,
    runtime,
    new Practice(app, workspace),
    (async () =>
      new Response("", {
        status: 429,
        headers: { "retry-after": "120" },
      })) as typeof fetch,
  );
  await expect(limited.request("/repos/new/repo", true)).rejects.toThrow(
    "rate limit",
  );
  expect(limited.status().shortlist).toHaveLength(1);
  await expect(limited.request("/repos/another/repo", true)).rejects.toThrow(
    "Retry after",
  );
});
