import { test, expect } from "@playwright/test";
import express from "express";
import type { Server } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Store } from "../../src/server/store";
import { Application } from "../../src/server/application";
import { Workspace } from "../../src/server/workspace";
import { createApp } from "../../src/server/http";
import { createGateway } from "../../services/ai/gateway";

const base = "http://127.0.0.1:47842";
let folder: string,
  store: Store,
  server: Server,
  gateway: Server,
  web: ReturnType<typeof createApp>;
let used = 0,
  failNext = false;
const questions: any[] = [];
test.beforeAll(async () => {
  folder = await mkdtemp(path.join(tmpdir(), "outclass-learning-loop-"));
  store = new Store(path.join(folder, "data"));
  const app = new Application(store);
  await app.setup(path.join(folder, "Learning", "history"), false);
  app.observe({
    eventId: "loop",
    courseId: "js",
    title: "JavaScript functions and validation",
    url: "https://www.udemy.com/course/js/learn/lecture/1",
    currentLessonId: "1",
    lessons: [
      {
        id: "1",
        title: "Functions and validation",
        section: "Foundations",
        order: 0,
      },
    ],
  });
  await app.bindProject("js", "project");
  await app.start("js", "1");
  store.put("direction:js", {
    goal: "Build a reliable shop price calculator",
    experience: "new",
    minutes: 25,
    updatedAt: new Date().toISOString(),
  });
  const workspace = new Workspace(app),
    id = store.state().session!.id;
  await workspace.save(
    id,
    "main.js",
    "console.log('Ready to practice');",
    null,
  );
  await workspace.run(id, "main.js");
  gateway = createGateway({
    allowance: {
      reserve: async () => {
        if (used >= 5) return false;
        used++;
        return true;
      },
      refund: async () => {
        used--;
      },
      usage: async () => ({
        used,
        limit: 5,
        remaining: 5 - used,
        period: "2026-10",
        plan: "free",
      }),
    },
    authenticate: async (token) => {
      if (token !== "test-account") throw Error();
      return "b8a66e7b-50e0-4f9b-8e5b-24614926e490";
    },
    auth: async (route, body: any) => {
      if (route === "otp") return {};
      if (route === "verify" && body.token !== "123456") throw Error();
      return {
        access_token: "test-account",
        refresh_token: "test-refresh",
        expires_at: Math.floor(Date.now() / 1000) + 600,
        email: "learner@example.com",
      };
    },
    answer: async (input) => {
      questions.push(input);
      if (failNext) {
        failNext = false;
        throw Error("synthetic outage");
      }
      return {
        answer:
          "Your recorded check failed. What should a negative price do before any calculation? Predict that result, then run just that input.",
        citations: [],
      };
    },
    checkout: async () => "https://checkout.stripe.com/c/pay/test-outclass",
  }).listen(0, "127.0.0.1");
  await new Promise<void>((r) => gateway.once("listening", r));
  app.ai.configure({
    ...app.ai.config(),
    mode: "included",
    service: `http://127.0.0.1:${(gateway.address() as any).port}`,
  });
  web = createApp(app, 47842);
  web.use(express.static(path.resolve("dist/web")));
  server = web.listen(47842, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
});
test.afterAll(async () => {
  await web.locals.stopPrograms();
  await Promise.all([
    new Promise<void>((r) => server.close(() => r())),
    new Promise<void>((r) => gateway.close(() => r())),
  ]);
  store.close();
  await rm(folder, { recursive: true, force: true });
});

test("included sign-in, lesson practice, actual failure, teacher, stale guard, reflection and transfer form one usable loop", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(base + "/?view=setup");
  const access = page.locator(".ai-access");
  await access.getByLabel("Email", { exact: true }).fill("learner@example.com");
  await access.getByRole("button", { name: "Email a sign-in code" }).click();
  await access.getByLabel("Email verification code").fill("000000");
  await access
    .getByRole("button", { name: "Sign in & enable AI guides" })
    .click();
  await expect(access).toContainText("Check the code");
  await access.getByLabel("Email verification code").fill("123456");
  await access
    .getByRole("button", { name: "Sign in & enable AI guides" })
    .click();
  await expect(access.locator(".ai-connection-state")).toContainText(
    "AI guides are on",
  );
  await expect(access).toContainText("5 of 5 answers remaining");
  expect(store.state().settings.assistantEnabled).toBe(true);
  await page
    .getByRole("button", { name: "Code & learn", exact: true })
    .click();
  await expect(page.getByLabel("Your learning direction")).toContainText(
    "shop price calculator",
  );
  await page.getByRole("button", { name: "Try it here", exact: true }).click();
  const editor = page.getByRole("textbox", { name: "Code editor" });
  await expect(editor).toContainText("discountedPrice");
  await page
    .getByRole("button", { name: "Check my work", exact: true })
    .click();
  await expect(page.locator(".inline-checks")).toContainText(
    "No discount preserves",
  );
  await page
    .getByRole("button", { name: "Ask my teacher", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Send question", exact: true })
    .click();
  await expect(page.locator(".chat-message.assistant").last()).toContainText(
    "negative price",
  );
  const context = JSON.parse(questions[0].context.split("\nQuestion:")[0]);
  expect(context.guidance.stage).toBe("concept");
  expect(context.learningContext.practice.latestAttempt.passed).toBe(false);
  expect(context.learningContext.direction.goal).toContain("shop");
  await editor.fill("export function discountedPrice(p,d){ return p; }\n");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByLabel("Ask learning assistant").fill("Another hint please");
  await page
    .getByRole("button", { name: "Send question", exact: true })
    .click();
  await expect(page.locator(".assistant-alert")).toContainText(
    "Test your changes first",
  );
  expect(questions).toHaveLength(1);
  await page
    .getByRole("button", { name: "Check my work", exact: true })
    .click();
  failNext = true;
  await page
    .getByRole("button", { name: "Send question", exact: true })
    .click();
  await expect(page.locator(".assistant-recovery").last()).toContainText(
    "Try this question again",
  );
  expect(used).toBe(1);
  await page.getByRole("button", { name: "Try this question again" }).click();
  await page
    .getByRole("button", { name: "Send question", exact: true })
    .click();
  await expect(page.locator(".chat-message.assistant").last()).toContainText(
    "negative price",
  );
  expect(used).toBe(2);
  expect(
    JSON.parse(questions.at(-1).context.split("\nQuestion:")[0]).guidance.stage,
  ).toBe("experiment");
  await editor.fill(
    "export function discountedPrice(p,d){if(p<0||d<0||d>100)throw Error('Invalid');return Math.round(p*(1-d/100)*100)/100;}\n",
  );
  await page
    .getByRole("button", { name: "Check my work", exact: true })
    .click();
  await expect(page.locator(".task-completion")).toContainText(
    "recorded checks passed",
  );
  await page
    .getByLabel("Task reflection")
    .fill(
      "I reject invalid inputs before computing the remaining percentage. My next check will reject strings too.",
    );
  await page.getByRole("button", { name: "Save task reflection" }).click();
  await expect(page.locator(".learning-loop li[aria-current]")).toContainText(
    "Transfer",
  );
  await page.screenshot({
    path: ".local/design/outclass-connected-learning-dark.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Try a changed requirement" }).click();
  await expect(editor).toContainText("discountedPrice");
  expect(store.get<any[]>("practice:tasks")![0].transferOf).toBeTruthy();
  expect(store.get<any[]>("practice:tasks")![1].reflection).toContain(
    "remaining percentage",
  );
  await page.getByRole("button", { name: "My project path" }).click();
  await expect(
    page.getByRole("tab", { name: "My direction", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page
    .getByRole("button", { name: "Code & learn", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".local/design/outclass-connected-learning-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
