import { test, expect } from "@playwright/test";
test("the four products have distinct honest responsive pages", async ({
  page,
}) => {
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const product of ["learn", "academy", "creator-studio", "gtm"]) {
      await page.goto("/" + product + ".html");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(
        page.getByRole("navigation", { name: "OutClass products" }).first(),
      ).toBeVisible();
      if (product !== "learn")
        await expect(page.locator(".suite-status").first()).toContainText(
          "In development",
        );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (width === 1440)
        await page.screenshot({
          path: ".local/landing-refresh/" + product + "-page.png",
          fullPage: true,
        });
    }
  }
  await page.goto("/");
  await expect(page.locator(".suite-product-grid>a")).toHaveCount(4);
});
