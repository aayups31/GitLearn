import { test, expect } from "@playwright/test";
import express from "express";
import type { Server } from "node:http";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Store } from "../../src/server/store";
import { Application } from "../../src/server/application";
import { Workspace } from "../../src/server/workspace";
import { Practice } from "../../src/server/practice";
import { createApp } from "../../src/server/http";
let directory: string,
  store: Store,
  server: Server,
  web: ReturnType<typeof createApp>,
  runId: string;
const base = "http://127.0.0.1:47839";
test.beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "outclass-path-ui-"));
  store = new Store(path.join(directory, "data"));
  const app = new Application(store);
  await app.setup(path.join(directory, "history"), false);
  app.observe({
    eventId: "course",
    courseId: "js",
    title: "JavaScript foundations",
    url: "https://www.udemy.com/course/js/learn/lecture/1",
    currentLessonId: "1",
    videoSeconds: 64,
    lessons: [{ id: "1", title: "Functions", section: "Basics", order: 0 }],
  });
  await app.bindProject("js", "project");
  await app.start("js", "1");
  const workspace = new Workspace(app),
    id = store.state().session!.id;
  await workspace.save(id, "main.js", "console.log('My first feature');", null);
  runId = (await workspace.run(id, "main.js")).run.id;
  const practice = new Practice(app, workspace),
    task = await practice.start("js", "javascript-validation"),
    file = await workspace.read(id, task.path);
  await workspace.save(
    id,
    task.path,
    "export function discountedPrice(p,d){if(p<0||d<0||d>100)throw Error('invalid');return Math.round(p*(1-d/100)*100)/100;}",
    file.version,
  );
  await practice.check(task.id, id);
  await app.saveNote(
    "I verified a price example and the invalid discount case.",
  );
  const preview = await app.preview();
  await app.commit(preview.id, preview.message);
  web = createApp(app, 47839);
  web.use(express.static(path.resolve("dist/web")));
  server = web.listen(47839, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
});
test.afterAll(async () => {
  await web.locals.stopPrograms();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  store.close();
  await rm(directory, { recursive: true, force: true });
});
test("personal direction, evidence milestones, ledger downloads and changed-requirement checks work through the UI", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(base + "/?view=overview");
  await page
    .getByRole("button", { name: "Learn by doing", exact: true })
    .click();
  await page.getByRole("tab", { name: "My direction", exact: true }).click();
  await page
    .getByLabel("Learning goal")
    .fill("Build a command-line budget tracker");
  await page.getByLabel("Session minutes").fill("25");
  await page
    .getByRole("button", { name: "Save direction", exact: false })
    .click();
  await expect(page.getByRole("status")).toContainText("Direction saved");
  await page
    .locator(".path-milestones summary")
    .filter({ hasText: "Build a small working slice" })
    .click();
  await page
    .getByLabel("Evidence for Build a small working slice")
    .selectOption(runId);
  await page
    .getByLabel("Reflection for Build a small working slice")
    .fill(
      "I executed my own example, read its result, and will add failure-case tests next.",
    );
  await page
    .locator(".path-milestones details")
    .filter({ hasText: "Build a small working slice" })
    .getByRole("button", { name: "Record milestone" })
    .click();
  await expect(page.locator(".path-milestones")).toContainText(
    "Recorded with evidence",
  );
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "HTML ledger" }).click();
  const artifact = await download;
  const file = path.join(directory, "ledger.html");
  await artifact.saveAs(file);
  expect(await readFile(file, "utf8")).toContain("not a certification");
  expect(await readFile(file, "utf8")).toContain("I executed my own example");
  await page.screenshot({
    path: ".local/design/learning-direction-dark.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".local/design/learning-direction-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("tab", { name: "Practice", exact: true }).click();
  await page.locator(".task-row").first().click();
  await page
    .getByRole("button", { name: "Try the changed requirement" })
    .click();
  await expect(page.locator(".task-guide")).toContainText(
    "unexpected price inputs",
  );
  await page
    .getByRole("button", { name: "Check my work", exact: true })
    .click();
  await expect(page.locator(".inline-checks")).toContainText("Numeric strings");
  await page.getByRole("button", { name: "Next hint", exact: true }).click();
  await expect(page.locator(".guided-hint")).toContainText("form");
  const editor = page.getByRole("textbox", { name: "Code editor" });
  await editor.fill(
    "export function discountedPrice(p,d){if(typeof p!=='number'||typeof d!=='number'||!Number.isFinite(p)||!Number.isFinite(d)||p<0||d<0||d>100)throw Error('invalid');return Math.round(p*(1-d/100)*100)/100;}",
  );
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByRole("button", { name: "Next hint", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Test your changes first",
  );
  await page
    .getByRole("button", { name: "Check my work", exact: true })
    .click();
  await expect(page.locator(".task-guide summary")).toContainText(
    "Checks passed",
  );
  expect(store.get<any[]>("practice:tasks")![0].transferOf).toBeTruthy();
  await page.getByRole("button", { name: "New file", exact: true }).click();
  await page.getByLabel("New file path").fill("interactive.mjs");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await editor.fill(
    "process.stdout.write('Name? ');process.stdin.once('data',s=>{console.log('Hello '+s.toString().trim());process.exit(0);});",
  );
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByLabel("Program output")).toContainText("Name?");
  await page
    .getByLabel("Program input · one line · 10s run limit")
    .fill("Maya");
  await page.getByRole("button", { name: "Send line", exact: true }).click();
  await expect(page.getByLabel("Program output")).toContainText("Hello Maya");
  await expect(
    page.getByLabel("Program input · one line · 10s run limit"),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});
