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
    .getByRole("button", {
      name: "Add Learn experience to lesson 1",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Acceptance criteria · one per line 1", { exact: true })
    .fill("Handle repeated students\nReturn zero for empty input");
  await page
    .getByLabel("Progressive hints · one per line 1", { exact: true })
    .fill("Predict one student’s running total first.");
  await page
    .getByRole("button", { name: "Add starter file", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save course draft", exact: true })
    .click();
  await expect(page.locator(".product-message[role=status]")).toContainText(
    "Draft saved",
  );
  await page
    .getByRole("button", { name: "Validate structure", exact: true })
    .click();
  await expect(page.locator(".product-message[role=status]")).toContainText(
    "not been executed",
  );
  page.on("dialog", (d) => d.accept());
  await page
    .getByRole("button", {
      name: "Compile & validate Python project",
      exact: true,
    })
    .click();
  await expect(page.locator(".product-ci-report")).toContainText("18/18", {
    timeout: 20000,
  });
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
  await expect(page.locator(".learn-assignment")).toContainText(
    "Handle repeated students",
  );
  await page.getByLabel("Handle repeated students", { exact: true }).check();
  await page.getByLabel("Return zero for empty input", { exact: true }).check();
  await page
    .getByLabel("Assignment reflection", { exact: true })
    .fill(
      "I compared repeated students and empty input using my own examples.",
    );
  await page
    .getByRole("button", { name: "Complete self-review", exact: true })
    .click();
  await expect(page.locator(".learn-assignment")).toContainText(
    "learner-reported progress",
  );
  expect(
    store.db
      .prepare(
        "SELECT count(*) AS total FROM rag_documents WHERE course_id=? AND kind='academy'",
      )
      .get(store.state().session!.courseId),
  ).toMatchObject({ total: 1 });
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
  await expect(page.locator(".product-message[role=status]")).toContainText(
    "Creative draft saved",
  );
  await page.getByRole("button", { name: "Approve copy", exact: true }).click();
  await expect(page.locator(".product-message[role=status]")).toContainText(
    "Copy approved",
  );
  await page
    .getByRole("button", { name: "Compose design preview", exact: true })
    .click();
  await expect(page.locator(".creator-design-preview")).toBeVisible();
  await page
    .getByLabel("Source video · up to 80 MB")
    .setInputFiles("src/site/assets/agents-film.mp4");
  await page
    .getByLabel("I have permission to edit and use this footage.")
    .check();
  await page
    .getByRole("button", { name: "Import & inspect video", exact: true })
    .click();
  await expect(page.getByLabel("Source library")).not.toHaveValue("", {
    timeout: 15000,
  });
  await page
    .getByRole("button", { name: "Preview source footage", exact: true })
    .click();
  const footage = page.getByLabel("Source footage preview");
  await expect
    .poll(() => footage.evaluate((v: HTMLVideoElement) => v.duration))
    .toBeGreaterThan(19);
  await footage.evaluate((v: HTMLVideoElement) => {
    v.currentTime = 0.5;
  });
  await page
    .getByRole("button", { name: "Mark start from video", exact: true })
    .click();
  await expect(page.getByLabel("Start seconds 1")).toHaveValue("0.5");
  await page.getByLabel("End seconds 1").fill("2");
  await page.getByLabel("Caption 1").fill("Practice the actual concept");
  await page
    .getByRole("button", { name: "Save editable timeline", exact: true })
    .click();
  await expect(page.locator(".creator-media-panel")).toContainText(
    "Saved timeline v1",
  );
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
  await expect(page.locator(".product-message[role=status]")).toContainText(
    "Nothing has been published or spent",
  );
  await expect(page.locator(".product-source").first()).toContainText(
    "utm_source=linkedin",
  );
  await page
    .getByLabel("Report source", { exact: true })
    .fill("LinkedIn supplied report");
  await page.getByLabel("Reported impressions", { exact: true }).fill("100");
  await page.getByLabel("Reported clicks", { exact: true }).fill("5");
  await page
    .getByRole("button", { name: "Record supplied report", exact: true })
    .click();
  await expect(page.locator(".gtm-report-grid")).toContainText("5.00%");
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
