import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
const { version } = createRequire(import.meta.url)("../../package.json");
test("desktop first-run, encrypted key persistence, local files, and bundled JavaScript runtime", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "gitlearn-desktop-"));
  const env: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] => entry[1] !== undefined,
      ),
    ),
    GITLEARN_PORT: "47834",
    GITLEARN_DATA_DIR: path.join(directory, "data"),
    GITLEARN_DESKTOP_USER_DATA: path.join(directory, "profile"),
    GITLEARN_DISABLE_DEV_KEY: "1",
    GITLEARN_HEADLESS_TEST: "1",
  };
  delete env.ELECTRON_RUN_AS_NODE;
  const args = process.env.GITLEARN_PACKAGED_TEST ? [] : ["."];
  const executablePath = process.env.GITLEARN_PACKAGED_TEST;
  let desktop = await electron.launch({ args, executablePath, env });
  try {
    const page = await desktop.firstWindow();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await expect(
      page.getByRole("heading", { name: "Make yourself at home." }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => ({
        require: typeof (window as any).require,
        bridge: typeof window.gitLearnDesktop?.chooseFolder,
      })),
    ).toEqual({ require: "undefined", bridge: "function" });
    await desktop.evaluate(({ shell }) => {
      shell.openPath = async () => "";
    });
    await page.evaluate(() => window.gitLearnDesktop!.openExtensionFolder());
    const extensionDirectory = path.join(
      directory,
      "profile",
      "extension",
      version,
    );
    expect(
      JSON.parse(
        await readFile(path.join(extensionDirectory, "manifest.json"), "utf8"),
      ).version,
    ).toBe(version);
    expect(
      (await readFile(path.join(extensionDirectory, "background.js"))).length,
    ).toBeGreaterThan(1000);
    if (!process.env.GITLEARN_PACKAGED_TEST)
      await page.screenshot({ path: ".local/design/desktop-first-run.png" });
    await page.getByRole("button", { name: "Let’s get started" }).click();
    await page
      .getByLabel("Parent learning folder")
      .fill(path.join(directory, "My Learning"));
    await page.getByRole("button", { name: "Create my workspace" }).click();
    await expect(
      page.getByRole("heading", { name: "A little help when you need it." }),
    ).toBeVisible();
    const sampleKey = "sk-localdesktoptest123456789";
    await page.getByLabel("OpenAI API key").fill(sampleKey);
    await page.getByRole("button", { name: "Continue with AI help" }).click();
    await expect(
      page.getByRole("heading", { name: "Bring Udemy into your workspace." }),
    ).toBeVisible();
    const encrypted = await readFile(
      path.join(directory, "profile", "openai-key.encrypted"),
    );
    expect(encrypted.includes(Buffer.from(sampleKey))).toBe(false);
    await page.getByRole("button", { name: "Get connection code" }).click();
    await expect(page.getByLabel("Connection code")).toHaveText(/^\d{6}$/);
    await desktop.close();
    await expect
      .poll(async () =>
        fetch("http://127.0.0.1:47834/api/health")
          .then(() => true)
          .catch(() => false),
      )
      .toBe(false);
    desktop = await electron.launch({ args, executablePath, env });
    let reopened = await desktop.firstWindow();
    await expect(
      reopened.getByRole("heading", {
        name: "Bring Udemy into your workspace.",
      }),
    ).toBeVisible();
    const state = await reopened.evaluate(async () => {
      const { token } = await (
        await fetch("/api/bootstrap", { method: "POST" })
      ).json();
      return (
        await fetch("/api/state", {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).json();
    });
    expect(state.hasApiKey).toBe(true);
    expect(state.settings.assistantEnabled).toBe(true);
    await reopened
      .getByRole("button", { name: "Open my workspace", exact: true })
      .click();
    const result = await reopened.evaluate(async () => {
      const { token } = await (
        await fetch("/api/bootstrap", { method: "POST" })
      ).json();
      const api = async (route: string, body: any) => {
        const response = await fetch("/api/" + route, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) throw Error(data.error);
        return data;
      };
      await api("observations", {
        eventId: "desktop-fixture",
        courseId: "desktop-fixture",
        title: "JavaScript practice",
        url: "https://www.udemy.com/course/desktop-fixture/learn/lecture/1",
        currentLessonId: "1",
        lessons: [
          { id: "1", title: "Local runtime", section: "Basics", order: 0 },
        ],
      });
      await api("mirror", { courseId: "desktop-fixture" });
      await api("course-project", {
        courseId: "desktop-fixture",
        mode: "project",
      });
      const started = await api("start", {
        courseId: "desktop-fixture",
        lessonId: "1",
      });
      const { session } = started;
      await api("workspace-file", {
        sessionId: session.id,
        path: "main.js",
        content:
          "console.log('Bundled desktop runtime',21*2); console.log('API key inherited',!!process.env.OPENAI_API_KEY);",
        version: null,
      });
      await api("editor-anchor", {
        sessionId: session.id,
        path: "main.js",
        cursor: 10,
      });
      await api("note", {
        sessionId: session.id,
        note: "Next: add an input check.",
      });
      return {
        session,
        run: await api("workspace-run", {
          sessionId: session.id,
          path: "main.js",
        }),
      };
    });
    expect(result.run.output).toContain("Bundled desktop runtime 42");
    expect(result.run.output).toContain("API key inherited false");
    expect(result.session.workspace).toContain(
      path.join("My Learning", "projects"),
    );
    await reopened.reload();
    await expect(
      reopened.getByRole("textbox", { name: "Code editor" }),
    ).toBeVisible();
    await expect(reopened.getByLabel("Program output")).toContainText(
      "Bundled desktop runtime 42",
    );
    await desktop.close();
    await expect
      .poll(() =>
        fetch("http://127.0.0.1:47834/api/health").then(
          () => true,
          () => false,
        ),
      )
      .toBe(false);
    desktop = await electron.launch({ args, executablePath, env });
    reopened = await desktop.firstWindow();
    await expect(
      reopened.getByRole("textbox", { name: "Code editor" }),
    ).toContainText("Bundled desktop runtime");
    await expect(reopened.getByLabel("Program output")).toContainText(
      "Bundled desktop runtime 42",
    );
    await reopened.locator(".studio-notes summary").click();
    await expect(reopened.getByLabel("Studio session notes")).toHaveValue(
      "Next: add an input check.",
    );
    await reopened
      .getByRole("button", { name: "Setup & preferences", exact: true })
      .click();
    await expect(
      reopened.getByRole("region", { name: "Device readiness" }),
    ).toContainText("Available and writable");
    await reopened
      .getByRole("button", { name: "Remove key", exact: true })
      .click();
    await expect(
      reopened.getByRole("status").filter({ hasText: "API key removed." }),
    ).toBeVisible();
    expect(
      await readFile(path.join(directory, "profile", "openai-key.encrypted"))
        .then(() => true)
        .catch(() => false),
    ).toBe(false);
    expect(errors).toEqual([]);
  } finally {
    await desktop.close().catch(() => {});
    await rm(directory, { recursive: true, force: true });
  }
});
