import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="#151c2d"/><path d="M23 17v30M23 35c0-10 18-8 18-18" fill="none" stroke="#8eaaff" stroke-width="3" stroke-linecap="round"/><g fill="#8eaaff"><circle cx="23" cy="17" r="4"/><circle cx="23" cy="47" r="4"/><circle cx="41" cy="17" r="4"/></g></svg>`;
await mkdir("extension/static/icons", { recursive: true });
await mkdir("src/site/assets", { recursive: true });
await writeFile("src/site/assets/mark.svg", mark);
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const size of [16, 32, 48, 128, 256]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;width:100%;height:100%}svg{width:100%;height:100%}</style>${mark}`,
  );
  await page.screenshot({
    path: `extension/static/icons/icon-${size}.png`,
    omitBackground: true,
  });
}
await browser.close();
