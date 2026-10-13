import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
test("real desktop terminal supports interactive input, resize, persistent sessions and shutdown", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "outclass-terminal-"));
  const env: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        (e): e is [string, string] => e[1] !== undefined,
      ),
    ),
    GITLEARN_PORT: "47844",
    GITLEARN_DATA_DIR: path.join(directory, "data"),
    GITLEARN_DESKTOP_USER_DATA: path.join(directory, "profile"),
    GITLEARN_DISABLE_DEV_KEY: "1",
    GITLEARN_HEADLESS_TEST: "1",
  };
  delete env.ELECTRON_RUN_AS_NODE;
  const desktop = await electron.launch({
    args: process.env.GITLEARN_PACKAGED_TEST ? [] : ["."],
    executablePath: process.env.GITLEARN_PACKAGED_TEST,
    env,
  });
  try {
    const page = await desktop.firstWindow();
    await page.waitForLoadState();
    await page.evaluate(
      async (root) => {
        const { token } = await (
          await fetch("/api/bootstrap", { method: "POST" })
        ).json();
        const post = async (route: string, body: any) => {
          const r = await fetch(`/api/${route}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
          });
          const d = await r.json();
          if (!r.ok) throw new Error(d.error);
          return d;
        };
        await post("setup", { repoPath: root, aiEnabled: false });
        await post("observations", {
          eventId: "terminal",
          courseId: "terminal",
          title: "Terminal course",
          url: "https://www.udemy.com/course/terminal/learn/lecture/1",
          lessons: [
            {
              id: "1",
              title: "Interactive programs",
              section: "Tools",
              order: 0,
            },
          ],
        });
        await post("start", { courseId: "terminal", lessonId: "1" });
      },
      path.join(directory, "learning"),
    );
    await page.goto("http://127.0.0.1:47844/?view=studio");
    await page.getByRole("button", { name: "Terminal", exact: true }).click();
    await page
      .getByRole("button", { name: "Enable my local terminal" })
      .click();
    await expect
      .poll(() => page.evaluate(() => window.gitLearnDesktop!.terminals.list()))
      .toHaveLength(1);
    const sessions = await page.evaluate(() =>
        window.gitLearnDesktop!.terminals.list(),
      ),
      id = sessions[0].id;
    const workspace = await page.evaluate(async () => {
      const { token } = await (
        await fetch("/api/bootstrap", { method: "POST" })
      ).json();
      return (
        await (
          await fetch("/api/state", {
            headers: { Authorization: `Bearer ${token}` },
          })
        ).json()
      ).session.workspace;
    });
    expect(sessions[0].cwd).toBe(workspace);
    await page.evaluate(
      async ({ id }) => {
        await window.gitLearnDesktop!.terminals.resize(id, 100, 20);
        await window.gitLearnDesktop!.terminals.input(
          id,
          "$value = Read-Host 'Your number'; Write-Output ('ANSWER:' + $value)\r",
        );
      },
      { id },
    );
    await expect
      .poll(() =>
        page.evaluate(
          (id) =>
            window
              .gitLearnDesktop!.terminals.snapshot(id)
              .then((s) => s.output),
          id,
        ),
      )
      .toContain("Your number");
    await page.evaluate(
      (id) => window.gitLearnDesktop!.terminals.input(id, "42\r"),
      id,
    );
    await expect
      .poll(() =>
        page.evaluate(
          (id) =>
            window
              .gitLearnDesktop!.terminals.snapshot(id)
              .then((s) => s.output),
          id,
        ),
      )
      .toContain("ANSWER:42");
    const marker = `LONG_JOB_${Date.now()}`,
      encoded = Buffer.from(marker).toString("base64"),
      started = Date.now();
    await page.evaluate(
      ({ id, encoded }) =>
        window.gitLearnDesktop!.terminals.input(
          id,
          `Start-Sleep -Seconds 12; Write-Output ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encoded}')))\r`,
        ),
      { id, encoded },
    );
    await expect
      .poll(
        () =>
          page.evaluate(
            (id) =>
              window
                .gitLearnDesktop!.terminals.snapshot(id)
                .then((s) => s.output),
            id,
          ),
        { timeout: 20000 },
      )
      .toContain(marker);
    expect(Date.now() - started).toBeGreaterThanOrEqual(11000);
    await page.getByRole("button", { name: "Terminal", exact: true }).click();
    expect(
      await page.evaluate(() => window.gitLearnDesktop!.terminals.list()),
    ).toHaveLength(1);
    await page.getByRole("button", { name: "Terminal", exact: true }).click();
    await page.getByRole("separator", { name: "Terminal height" }).focus();
    await page
      .getByRole("separator", { name: "Terminal height" })
      .press("ArrowUp");
    await expect(
      page.getByRole("separator", { name: "Terminal height" }),
    ).toHaveAttribute("aria-valuenow", "256");
    await page
      .getByRole("button", { name: "New terminal", exact: true })
      .click();
    await expect
      .poll(() => page.evaluate(() => window.gitLearnDesktop!.terminals.list()))
      .toHaveLength(2);
    const job = path.join(workspace, "terminal-job.cjs"),
      pidFile = path.join(workspace, "terminal-job.pid");
    await writeFile(
      job,
      "require('node:fs').writeFileSync('terminal-job.pid', String(process.pid)); setInterval(() => {}, 1000);\n",
    );
    await page.evaluate(
      ({ id, job }) =>
        window.gitLearnDesktop!.terminals.input(id, `node "${job}"\r`),
      { id, job },
    );
    await expect
      .poll(() => readFile(pidFile, "utf8").catch(() => ""))
      .toMatch(/^\d+$/);
    const childPid = Number(await readFile(pidFile, "utf8"));
    await page.screenshot({ path: ".local/design/outclass-07-terminal.png" });
    await desktop.close();
    await expect
      .poll(() => {
        try {
          process.kill(childPid, 0);
          return true;
        } catch {
          return false;
        }
      })
      .toBe(false);
    await expect
      .poll(() =>
        fetch("http://127.0.0.1:47844/api/health").then(
          () => true,
          () => false,
        ),
      )
      .toBe(false);
  } finally {
    await desktop.close().catch(() => {});
    await rm(directory, { recursive: true, force: true });
  }
});
