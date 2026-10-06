import { test, expect } from "@playwright/test";

test("landing guide explains the complete workflow and opens workspace settings", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/welcome");
  await expect(page).toHaveTitle("GitLearn · Make learning yours");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Make learningpart of your craft.",
  );
  await expect(page.locator(".guide-step")).toHaveCount(7);
  await page.screenshot({
    path: "test-results/landing-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1120 });
  await page.screenshot({ path: "test-results/landing-hero.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "How to use it" })
    .click();
  await expect(page).toHaveURL(/#guide$/);
  await page
    .getByRole("button", { name: "Copy Chrome extensions address" })
    .click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "chrome://extensions",
  );
  await page
    .locator("summary")
    .filter({ hasText: "Do I need a GitHub repository to start?" })
    .click();
  await expect(page.locator(".faq-list details[open]")).toContainText(
    "One repository holds multiple courses",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/welcome");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/landing-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Set up GitLearn", exact: true })
    .click();
  await expect(page).toHaveURL(/\?view=setup$/);
  await expect(
    page.getByRole("heading", { name: "Workspace settings" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Product & guide" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Product & guide" }).click();
  await expect(page).toHaveURL(/\/welcome$/);
  expect(errors).toEqual([]);
});

test("GitHub setup gates repository actions until an account is verified", async ({
  page,
}) => {
  let signedIn = false;
  await page.route("**/api/state", (route) =>
    route.fulfill({
      json: {
        settings: {
          configured: true,
          repoPath: "C:\\Learning\\history",
          aiEnabled: false,
          remote: "",
        },
        courses: [],
        session: null,
        checkpoints: [],
        hasApiKey: false,
        gitAvailable: true,
        ghAvailable: true,
        extensionConnected: false,
        sourceFiles: 0,
      },
    }),
  );
  await page.route("**/api/github-status", (route) =>
    route.fulfill({
      json: {
        installed: true,
        authenticated: signedIn,
        login: signedIn ? "example-learner" : "",
      },
    }),
  );
  await page.goto("/?view=setup");
  await expect(
    page.getByRole("heading", { name: "One repository. Every course." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create private repo" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Sign in to GitHub" }),
  ).toBeVisible();
  signedIn = true;
  await page
    .getByRole("button", { name: "Check connection", exact: true })
    .click();
  await expect(
    page.getByText("Signed in as @example-learner.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign in again" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create private repo" }),
  ).toBeEnabled();
  // No account login or repository mutation is performed by this test.
});
