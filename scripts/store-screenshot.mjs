import { chromium } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
const browser = await chromium.launch();
const popupPage = await browser.newPage({
  viewport: { width: 360, height: 640 },
  deviceScaleFactor: 1,
  colorScheme: "dark",
});
const css = await readFile("dist/extension/popup.css", "utf8");
const popupHtml = (await readFile("dist/extension/popup.html", "utf8"))
  .replace(/<link[^>]+stylesheet[^>]*>/, `<style>${css}</style>`)
  .replace(/<script[^>]*>[\s\S]*?<\/script>/g, "");
await popupPage.setContent(popupHtml);
// Exercise the shipped popup using illustrative course metadata, without private learner data.
await popupPage.evaluate(() => {
  window.chrome = {
    runtime: {
      sendMessage: async () => ({
        companion: true,
        latest: {
          title: "JavaScript: from lessons to projects",
          lessons: [{ id: "example", title: "Working with asynchronous code" }],
          currentLessonId: "example",
        },
        outbox: [],
      }),
    },
  };
});
await popupPage.addScriptTag({
  content: await readFile("dist/extension/popup.js", "utf8"),
});
await popupPage.getByText("Companion connected", { exact: true }).waitFor();
const popup = (await popupPage.screenshot({ fullPage: true })).toString(
  "base64",
);
const mark = (await readFile("src/site/assets/mark.svg")).toString("base64");
await mkdir("docs/store-assets", { recursive: true });
const page = await browser.newPage({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
});
await page.setContent(
  `<style>*{box-sizing:border-box}body{margin:0;background:#131821;color:#f3f5fa;font-family:system-ui,sans-serif}main{height:800px;display:grid;grid-template-columns:1fr 440px;align-items:center;padding:64px 95px;gap:70px}header{display:flex;align-items:center;gap:12px;font-size:23px;font-weight:600}header img{width:37px}h1{font-size:51px;line-height:1.12;letter-spacing:-2.5px;max-width:15ch;font-weight:500;margin:43px 0 25px}h1 span{color:#92b0ff}p{font-size:17px;line-height:1.9;max-width:34ch;color:#a8b3c8}.detail{margin-top:45px;font-size:12px;letter-spacing:.3px}.popup{width:360px;height:auto;max-height:660px;border:1px solid #384156;border-radius:12px;box-shadow:0 20px 70px #0004;justify-self:center}</style><main><div><header><img src="data:image/svg+xml;base64,${mark}" alt="">OutClass</header><h1>OutClass<br><span>the lesson.</span></h1><p>Connect Udemy to your local code, notes, and learning history.</p><p class="detail">Pair once. Import visible transcripts when you choose.<br>Windows companion required · Example course shown</p></div><img class="popup" src="data:image/png;base64,${popup}" alt="Actual OutClass extension popup"></main>`,
);
await page.screenshot({ path: "docs/store-assets/extension-1280x800.png" });
await browser.close();
