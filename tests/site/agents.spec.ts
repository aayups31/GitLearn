import { test, expect } from "@playwright/test";
test("agent previews switch, replay, and respect reduced motion", async ({
  page,
}) => {
  for (const route of ["/"]) {
    await page.goto(route);
    const film = page.locator("[data-agent-film]");
    await film.scrollIntoViewIfNeeded();
    await expect(film.locator('[data-scene-panel="teacher"]')).toBeVisible();
    await film.getByRole("button", { name: /Architect/ }).click();
    await expect(film.locator('[data-scene-panel="architect"]')).toBeVisible();
    await expect(film.locator('[data-scene-panel="teacher"]')).toBeHidden();
    await film.getByRole("button", { name: /Replay animation/ }).click();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(
      film.getByRole("button", { name: "Reduced motion enabled" }),
    ).toBeDisabled();
    await film.getByRole("button", { name: /OffCourse/ }).click();
    await expect(film.locator('[data-scene-panel="teacher"]')).toBeVisible();
    await page.emulateMedia({ reducedMotion: "no-preference" });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1440, 768, 375, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/agents.html");
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await page.screenshot({
      path: ".local/landing-refresh/agents-" + width + ".png",
      fullPage: true,
    });
  }
});

test("agent video is playable, seekable, and has a readable walkthrough", async ({
  page,
}) => {
  await page.goto("/agents.html");
  const video = page.locator(".agent-video-showcase video");
  await expect(video).toHaveAttribute("controls", "");
  await expect(video).not.toHaveAttribute("autoplay");
  await video.evaluate(async (element: HTMLVideoElement) => {
    await element.play();
  });
  await expect
    .poll(() =>
      video.evaluate((element: HTMLVideoElement) => element.currentTime),
    )
    .toBeGreaterThan(0);
  await video.evaluate((element: HTMLVideoElement) => {
    element.pause();
    element.currentTime = 16;
  });
  await expect
    .poll(() =>
      video.evaluate((element: HTMLVideoElement) => element.readyState),
    )
    .toBeGreaterThanOrEqual(2);
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.duration))
    .toBe(20);
  await page.getByText("Read the video walkthrough").click();
  await expect(page.locator(".agent-video-transcript")).toContainText(
    "talking to three students",
  );
  await page.screenshot({
    path: ".local/landing-refresh/agents-video.png",
    fullPage: true,
  });
});
