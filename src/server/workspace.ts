import {
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  writeFile,
  access,
} from "node:fs/promises";
import { constants } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import ignore from "ignore";
import type { Application } from "./application.js";
import { assertClean, child, excluded, inside, UserError } from "./safety.js";
import type {
  Diagnostics,
  ResumeAnchor,
  RunContext,
  RunEvidence,
} from "../shared.js";
import * as git from "./git.js";

const hash = (value: Buffer | string) =>
  createHash("sha256").update(value).digest("hex");
export class Workspace {
  private jobs = new Map<string, ChildProcess>();
  private stopped = new Set<string>();
  private previews = new Map<string, { html: string; expires: number }>();
  constructor(private app: Application) {}
  isRunning(id: string) {
    return this.jobs.has(id);
  }
  track(id: string, job: ChildProcess) {
    if (this.jobs.has(id)) {
      job.kill();
      throw new UserError("A program is already running.", 409);
    }
    this.stopped.delete(id);
    this.jobs.set(id, job);
  }
  untrack(id: string, job: ChildProcess) {
    if (this.jobs.get(id) === job) this.jobs.delete(id);
    this.stopped.delete(id);
  }
  session(id: string) {
    const session = this.app.configured().session;
    if (!session || session.id !== id)
      throw new UserError(
        "This lesson session has changed. Reopen the coding workspace.",
        409,
      );
    return session;
  }
  async location(id: string, relative: string, creating = false) {
    const session = this.session(id);
    if (
      excluded(relative) ||
      relative.length > 300 ||
      relative
        .split("/")
        .some(
          (part) =>
            /[<>:"|?*\x00-\x1f]/.test(part) ||
            /[. ]$/.test(part) ||
            /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part),
        )
    )
      throw new UserError(
        "Use a regular source file inside the lesson folder. Secret and system files are excluded.",
      );
    const target = child(session.workspace, relative);
    let parent = session.workspace;
    for (const part of relative.split("/")) {
      parent = path.join(parent, part);
      const info = await lstat(parent).catch(() => null);
      if (!info) {
        if (creating) continue;
        throw new UserError("That file no longer exists.", 404);
      }
      if (
        info.isSymbolicLink() ||
        !inside(session.workspace, await realpath(parent))
      )
        throw new UserError(
          "Linked files outside the coding folder cannot be opened.",
        );
    }
    const root = await realpath(session.workspace);
    if (root.toLowerCase() !== session.workspace.toLowerCase())
      throw new UserError(
        "The coding folder changed. Select its real location again.",
      );
    return { session, target };
  }
  async list(id: string) {
    const session = this.session(id);
    const rules = ignore();
    for (const name of [".gitignore", ".gitlearnignore"])
      rules.add(
        await readFile(path.join(session.workspace, name), "utf8").catch(
          () => "",
        ),
      );
    const files: { path: string; size: number }[] = [];
    let skipped = 0;
    const walk = async (relative: string, depth: number) => {
      if (depth > 12) return;
      for (const entry of await readdir(
        path.join(session.workspace, relative),
        { withFileTypes: true },
      )) {
        if (files.length >= 400) {
          skipped++;
          continue;
        }
        const name = relative ? `${relative}/${entry.name}` : entry.name;
        if (
          excluded(name) ||
          rules.ignores(name + (entry.isDirectory() ? "/" : ""))
        ) {
          skipped++;
          continue;
        }
        try {
          const { target } = await this.location(id, name);
          const info = await lstat(target);
          if (info.isDirectory()) await walk(name, depth + 1);
          else if (
            info.isFile() &&
            info.size <= 512000 &&
            !(await readFile(target)).includes(0)
          )
            files.push({ path: name, size: info.size });
          else skipped++;
        } catch {
          skipped++;
        }
      }
    };
    await walk("", 0);
    return {
      sessionId: id,
      workspace: session.workspace,
      files: files.sort((a, b) => a.path.localeCompare(b.path)),
      skipped,
      anchor: this.app.store.get<ResumeAnchor>(`resume:${session.courseId}`),
      lastRun: (await this.runs(id))[0],
    };
  }
  async editorAnchor(id: string, relative: string, cursor: number) {
    const session = this.session(id);
    const file = await this.read(id, relative);
    this.app.remember(session, "saved");
    const anchor = this.app.store.get<ResumeAnchor>(
      `resume:${session.courseId}`,
    )!;
    anchor.file = relative;
    anchor.cursor = Math.min(cursor, file.content.length);
    this.app.store.put(`resume:${session.courseId}`, anchor);
    return anchor;
  }
  async runContext(id: string, runId: string): Promise<RunContext> {
    const session = this.session(id);
    const runs =
      this.app.store.get<RunEvidence[]>(`runs:${session.courseId}`) || [];
    const record = runs.find(
      (run) => run.id === runId && run.workspace === session.workspace,
    );
    if (!record)
      throw new UserError(
        "That run does not belong to this course workspace.",
        404,
      );
    const current = await this.read(id, record.path).catch(() => null);
    return {
      ...record,
      stale: record.changedDuringRun || current?.version !== record.fileVersion,
    };
  }
  async runs(id: string) {
    const session = this.session(id);
    const records =
      this.app.store.get<RunEvidence[]>(`runs:${session.courseId}`) || [];
    return Promise.all(
      records
        .filter((run) => run.workspace === session.workspace)
        .slice(0, 10)
        .map((run) => this.runContext(id, run.id)),
    );
  }
  async pythonRuntime(workspace?: string) {
    if (workspace)
      for (const folder of [".venv", "venv"]) {
        const candidate = path.join(
          workspace,
          folder,
          process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
        );
        if ((await lstat(candidate).catch(() => null))?.isFile())
          return candidate;
      }
    return "python";
  }
  async diagnostics(): Promise<Diagnostics> {
    const state = this.app.store.state();
    const writable = (root: string) =>
      access(root, constants.W_OK).then(
        () => true,
        () => false,
      );
    const pythonRuntime = await this.pythonRuntime(state.session?.workspace);
    const [pythonAvailable, gitAvailable, historyWritable, workspaceWritable] =
      await Promise.all([
        git.available(pythonRuntime),
        git.available("git"),
        state.settings.configured
          ? writable(state.settings.repoPath)
          : Promise.resolve(false),
        state.session
          ? writable(state.session.workspace)
          : Promise.resolve(null),
      ]);
    return {
      nodeVersion: process.versions.node,
      webToolchainAvailable: await git.available("node"),
      pythonAvailable,
      pythonRuntime,
      gitAvailable,
      historyWritable,
      workspaceWritable,
      hasApiKey: !!this.app.apiKey,
      assistantEnabled: !!state.settings.assistantEnabled,
      extensionConnected: !!this.app.store.get("extensionToken"),
    };
  }
  async read(id: string, relative: string) {
    const { target } = await this.location(id, relative);
    const info = await lstat(target);
    if (!info.isFile() || info.size > 512000)
      throw new UserError("The editor supports text files up to 512 KB.");
    const bytes = await readFile(target);
    if (bytes.includes(0))
      throw new UserError("Open this binary file in its own application.");
    return {
      path: relative,
      content: bytes.toString("utf8"),
      version: hash(bytes),
    };
  }
  async save(
    id: string,
    relative: string,
    content: string,
    version: string | null,
  ) {
    if (Buffer.byteLength(content) > 512000)
      throw new UserError("The editor supports files up to 512 KB.");
    const { target } = await this.location(id, relative, version === null);
    const previous = await readFile(target).catch(() => null);
    if (version === null && previous !== null)
      throw new UserError("That file already exists. Open it from Files.", 409);
    if (version !== null && (!previous || hash(previous) !== version))
      throw new UserError(
        "This file changed on disk. Reload it before saving so those edits are preserved.",
        409,
      );
    if (version === null)
      await mkdir(path.dirname(target), { recursive: true });
    await this.location(id, relative, true);
    await writeFile(target, content, { flag: version === null ? "wx" : "w" });
    return { path: relative, content, version: hash(content) };
  }
  stop(id: string) {
    const process = this.jobs.get(id);
    if (process && process.exitCode === null && process.pid) {
      this.stopped.add(id);
      if (globalThis.process.platform === "win32")
        spawn("taskkill.exe", ["/PID", String(process.pid), "/T", "/F"], {
          windowsHide: true,
          stdio: "ignore",
        });
      else {
        try {
          globalThis.process.kill(-process.pid, "SIGKILL");
        } catch {
          process.kill("SIGKILL");
        }
      }
    }
  }
  async stopAll() {
    for (const id of this.jobs.keys()) this.stop(id);
    for (let i = 0; this.jobs.size && i < 80; i++)
      await new Promise((resolve) => setTimeout(resolve, 25));
  }
  async preview(id: string, relative: string) {
    if (!/\.html?$/i.test(relative))
      throw new UserError(
        "Preview supports a single HTML file with inline CSS and JavaScript.",
      );
    const file = await this.read(id, relative);
    for (const [key, value] of this.previews)
      if (value.expires < Date.now()) this.previews.delete(key);
    if (this.previews.size >= 10)
      this.previews.delete(this.previews.keys().next().value!);
    const token = randomUUID();
    this.previews.set(token, {
      html: file.content,
      expires: Date.now() + 600000,
    });
    return { url: `/preview/${token}` };
  }
  previewDocument(token: string) {
    const doc = this.previews.get(token);
    if (!doc || doc.expires < Date.now())
      throw new UserError("This preview expired. Choose Preview again.", 404);
    return doc.html;
  }
  async run(id: string, relative: string) {
    const { session, target } = await this.location(id, relative);
    const file = await this.read(id, relative);
    if (this.jobs.has(id))
      throw new UserError(
        "A program is already running. Stop it before starting another.",
        409,
      );
    const extension = path.extname(relative).toLowerCase();
    if (![".js", ".mjs", ".cjs", ".py"].includes(extension))
      throw new UserError(
        "Run supports JavaScript and Python. Use Preview for HTML; other languages need their own local toolchain.",
      );
    const runtime =
      extension === ".py"
        ? await this.pythonRuntime(session.workspace)
        : process.execPath;
    const startedAt = new Date().toISOString();
    this.session(id);
    // Runtime lookup awaits disk access; recheck before spawning to prevent two overlapping runs.
    if (this.jobs.has(id))
      throw new UserError(
        "A program is already running. Stop it before starting another.",
        409,
      );
    this.stopped.delete(id);
    const env: NodeJS.ProcessEnv = {};
    for (const key of [
      "PATH",
      "Path",
      "SYSTEMROOT",
      "SystemRoot",
      "WINDIR",
      "TEMP",
      "TMP",
      "USERPROFILE",
      "HOME",
    ])
      if (process.env[key]) env[key] = process.env[key];
    env.PYTHONIOENCODING = "utf-8";
    if (extension !== ".py" && process.versions.electron)
      env.ELECTRON_RUN_AS_NODE = "1";
    return new Promise<{
      output: string;
      exitCode: number | null;
      timedOut: boolean;
      run: RunContext;
    }>((resolve, reject) => {
      const job = spawn(
        runtime,
        extension === ".py" ? ["-u", target] : [target],
        {
          cwd: session.workspace,
          env,
          windowsHide: true,
          shell: false,
          detached: process.platform !== "win32",
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      this.jobs.set(id, job);
      let output = "",
        timedOut = false,
        limited = false,
        failed = false;
      const append = (chunk: Buffer) => {
        if (limited) return;
        output += chunk.toString();
        if (output.length > 64000) {
          limited = true;
          output = output.slice(0, 64000) + "\n[Output limit reached]";
          this.stop(id);
        }
      };
      job.stdout?.on("data", append);
      job.stderr?.on("data", append);
      const timer = setTimeout(() => {
        timedOut = true;
        this.stop(id);
      }, 10000);
      job.on("error", () => {
        failed = true;
        clearTimeout(timer);
        this.jobs.delete(id);
        reject(
          new UserError(
            extension === ".py"
              ? "Python was not found. Install Python and restart GitLearn, or run a JavaScript file."
              : "The local runtime could not start.",
            503,
          ),
        );
      });
      job.on("close", async (code) => {
        clearTimeout(timer);
        this.jobs.delete(id);
        if (failed) return;
        const completeOutput =
          output + (timedOut ? "\n[Stopped after 10 seconds]" : "");
        const safeText = (value: string, name: string, limit: number) => {
          try {
            assertClean(value, name);
            if (this.app.apiKey && value.includes(this.app.apiKey))
              throw new Error("Credential");
            return value.slice(0, limit);
          } catch {
            return "[Sensitive content excluded from run history and AI context]";
          }
        };
        try {
          const current = await readFile(target).catch(() => null);
          const record: RunEvidence = {
            id: randomUUID(),
            sessionId: id,
            courseId: session.courseId,
            lessonId: session.lessonId,
            workspace: session.workspace,
            path: relative,
            fileVersion: file.version,
            source: safeText(file.content, "run source", 16000),
            sourceTruncated: file.content.length > 16000,
            output: safeText(completeOutput, "run output", 16000),
            outputTruncated: completeOutput.length > 16000 || limited,
            exitCode: code,
            timedOut,
            stopped: this.stopped.delete(id),
            startedAt,
            finishedAt: new Date().toISOString(),
            changedDuringRun: !current || hash(current) !== file.version,
          };
          const records =
            this.app.store.get<RunEvidence[]>(`runs:${session.courseId}`) || [];
          this.app.store.put(
            `runs:${session.courseId}`,
            [record, ...records].slice(0, 20),
          );
          if (this.app.store.state().session?.id === id)
            this.app.remember(this.session(id), "saved");
          resolve({
            output: completeOutput,
            exitCode: code,
            timedOut,
            run: { ...record, stale: record.changedDuringRun },
          });
        } catch {
          reject(
            new UserError(
              "The program finished, but its run history could not be saved. Run again when the workspace is available.",
              503,
            ),
          );
        }
      });
    });
  }
}
