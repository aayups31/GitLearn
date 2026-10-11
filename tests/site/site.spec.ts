import { test, expect } from "@playwright/test";
test("public site explains the desktop product, adapts to phones, and has honest release links", async ({
  page,
}) => {
  const errors: string[] = [];
  const requests: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/");
  await expect(page).toHaveTitle("OutClass · Break free from tutorial hell");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /OutClass\s*the lesson\./,
  );
  await expect(page.locator("#windows-download")).toHaveAttribute(
    "href",
    /\/releases\/download\/v[\d.]+\/(?:GitLearn|OutClass)-Setup-[\d.]+\.exe$/,
  );
  await expect(page.locator("#extension-download")).toHaveAttribute(
    "href",
    /\/releases\/download\/v[\d.]+\/(?:GitLearn|OutClass)-Chrome-[\d.]+\.zip$/,
  );
  await page.getByRole("tab", { name: "Ask the course", exact: true }).click();
  await expect(page.getByRole("tabpanel")).toContainText("Imported transcript");
  await page
    .getByRole("tab", { name: "Ask the course", exact: true })
    .press("ArrowLeft");
  await expect(page.getByRole("tabpanel")).toContainText("Your working code");
  await page.getByRole("link", { name: "How it works", exact: true }).click();
  await expect(page).toHaveURL(/#guide$/);
  await expect(page.locator(".guide-list li")).toHaveCount(8);
  await page
    .getByText("Do I need a GitHub repository?", { exact: true })
    .click();
  await expect(page.locator("details[open]")).toContainText(
    "one private repository for all your courses",
  );
  await page.goto("/");
  await page.screenshot({
    path: "test-results/public-site-desktop.png",
    fullPage: true,
  });
  for (const size of [
    { width: 1280, height: 800 },
    { width: 375, height: 812 },
    { width: 375, height: 667 },
  ]) {
    await page.setViewportSize(size);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.screenshot({
      path: `test-results/public-site-${size.width}-${size.height}.png`,
      fullPage: true,
    });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .locator("body")
      .evaluate((el) => el.classList.contains("motion-ready")),
  ).toBe(false);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect(
    await page
      .locator("body")
      .evaluate((el) => el.classList.contains("motion-ready")),
  ).toBe(true);
  await page.getByRole("link", { name: "Privacy", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Your learning stays yours.",
  );
  expect(requests.some((url) => url.includes("/api/"))).toBe(false);
  expect(errors).toEqual([]);
});
test("public landing is complete without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 375, height: 812 },
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:47832/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("#windows-download")).toHaveAttribute(
    "href",
    /github.com\/aayups31\/GitLearn\/releases\/download\/v[\d.]+\/(?:GitLearn|OutClass)-Setup-[\d.]+\.exe$/,
  );
  await page.locator("#windows-download").scrollIntoViewIfNeeded();
  await expect(page.locator("#windows-download")).toBeVisible();
  await context.close();
});

test("scroll motion reverses, responds to live reduced motion, and survives a blocked animation library", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("body")).toHaveClass(/motion-ready/);
  const orbit = page.locator(".orbit-shell");
  await page.evaluate(() => scrollTo(0, 450));
  await expect
    .poll(() => orbit.evaluate((el) => getComputedStyle(el).transform))
    .not.toBe("matrix(1, 0, 0, 1, 0, 0)");
  await page.evaluate(() => scrollTo(0, 0));
  await expect
    .poll(() => orbit.evaluate((el) => getComputedStyle(el).transform))
    .toBe("matrix(1, 0, 0, 1, 0, 0)");
  await page.locator('.escape-step[data-step="2"]').scrollIntoViewIfNeeded();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("body")).not.toHaveClass(/motion-ready/);
  await expect
    .poll(() => orbit.evaluate((el) => getComputedStyle(el).transform))
    .toBe("none");
  expect(
    await page
      .locator(".path-fill")
      .evaluate((el) => getComputedStyle(el).transform),
  ).toBe("matrix(1, 0, 0, 1, 0, 0)");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("body")).toHaveClass(/motion-ready/);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/assets/vendor/**", (route) => route.abort());
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.locator("#windows-download").scrollIntoViewIfNeeded();
  await expect(page.locator("#windows-download")).toBeVisible();
  expect(errors).toEqual([]);
});
