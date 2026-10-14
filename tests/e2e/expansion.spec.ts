import { test, expect } from "@playwright/test";
import express from "express";
import type { Server } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Store } from "../../src/server/store";
import { Application } from "../../src/server/application";
import { createApp } from "../../src/server/http";
const base = "http://127.0.0.1:47848";
let dir: string,
  store: Store,
  server: Server,
  web: ReturnType<typeof createApp>;
test.beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "outclass-products-"));
  store = new Store(path.join(dir, "data"));
  const app = new Application(store);
  await app.setup(path.join(dir, "history"), false);
  web = createApp(app, 47848);
  web.use(express.static(path.resolve("dist/web")));
  server = web.listen(47848, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
});
test.afterAll(async () => {
  await web.locals.stopPrograms();
  await new Promise<void>((r) => server.close(() => r()));
  store.close();
  await rm(dir, { recursive: true, force: true });
});
test("author a course, launch Learn, approve grounded copy and prepare a manual campaign", async ({
  page,
  request,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  expect((await request.get(base + "/api/expansion/state")).status()).toBe(401);
  await page.goto(base + "/?view=academy");
  await page
    .getByLabel("Course title", { exact: true })
    .fill("Practical Python activities");
  await page
    .getByLabel("Who is it for?", { exact: true })
    .fill("Beginners who know loops");
  await page
    .getByLabel("What will they build?", { exact: true })
    .fill("A correct activity report");
  await page.getByRole("button", { name: "Add lesson", exact: true }).click();
  await page
    .getByLabel("Lesson title 1", { exact: true })
    .fill("Accumulate totals");
  await page
    .getByLabel("Measurable objective 1", { exact: true })
    .fill("Group minutes by student");
  await page
    .getByLabel("Hands-on practice brief 1", { exact: true })
    .fill("Handle empty input and repeated students");
  await page
    .getByLabel("Lesson content 1", { exact: true })
    .fill("A dictionary can retain each student's running total.");
  await page.getByLabel("I own or have permission").check();
  await page
    .getByRole("button", { name: "Save course draft", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await page
    .getByRole("button", { name: "Validate structure", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("not been executed");
  page.on("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Approve local release", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Enroll locally · Free", exact: true })
    .click();
  await page
    .getByRole("button", { name: /Open Accumulate totals in Learn/ })
    .click();
  await expect(page.locator(".topbar")).toContainText("Code & learn");
  expect(store.state().session?.note).toContain("Handle empty input");
  await page
    .getByRole("button", { name: "Creator Studio", exact: true })
    .click();
  await page
    .getByLabel("Creative title", { exact: true })
    .fill("A lesson worth applying");
  const release = store.get<any>("expansion:v1").releases[0];
  await page
    .getByLabel("Course release", { exact: true })
    .selectOption(release.id);
  await page
    .getByLabel("Creative brief", { exact: true })
    .fill("A plain LinkedIn intro with the real practice outcome");
  await page
    .getByRole("button", {
      name: "Use source objective as a starting draft",
      exact: true,
    })
    .click();
  await page.getByLabel("I have rights to use").check();
  await page
    .getByRole("button", { name: "Save creative draft", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Creative draft saved");
  await page.getByRole("button", { name: "Approve copy", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Copy approved");
  await page.getByRole("button", { name: "GTM", exact: true }).click();
  await page
    .getByLabel("Campaign title", { exact: true })
    .fill("Python launch");
  const creative = store.get<any>("expansion:v1").creatives[0];
  await page
    .getByLabel("Approved creative", { exact: true })
    .selectOption(creative.id);
  await page
    .getByLabel("Goal & hypothesis", { exact: true })
    .fill("Test whether beginners understand the outcome");
  await page
    .getByLabel("Destination URL", { exact: true })
    .fill("https://example.com/python");
  await page
    .getByRole("button", { name: "Save campaign plan", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Nothing has been published or spent",
  );
  await expect(page.locator(".product-source").first()).toContainText(
    "utm_source=linkedin",
  );
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export manual handoff", exact: true })
    .click();
  expect((await download).suggestedFilename()).toContain("outclass-campaign-");
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Python launch/ }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await page.screenshot({
    path: ".local/landing-refresh/gtm-workspace.png",
    fullPage: true,
  });
});
