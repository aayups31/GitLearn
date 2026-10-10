import {
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  writeFile,
} from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import ignore from "ignore";
import type { Application } from "./application.js";
import { child, excluded, inside, UserError } from "./safety.js";

const hash = (value: Buffer | string) =>
  createHash("sha256").update(value).digest("hex");
export class Workspace {
  private jobs = new Map<string, ChildProcess>();
  private previews = new Map<string, { html: string; expires: number }>();
  constructor(private app: Application) {}
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
  stopAll() {
    for (const id of this.jobs.keys()) this.stop(id);
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
    await this.read(id, relative);
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
    let runtime = extension === ".py" ? "python" : process.execPath;
    if (extension === ".py") {
      for (const folder of [".venv", "venv"]) {
        const candidate = path.join(
          session.workspace,
          folder,
          process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
        );
        if ((await lstat(candidate).catch(() => null))?.isFile()) {
          runtime = candidate;
          break;
        }
      }
    }
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
        limited = false;
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
      job.on("close", (code) => {
        clearTimeout(timer);
        this.jobs.delete(id);
        resolve({
          output: output + (timedOut ? "\n[Stopped after 10 seconds]" : ""),
          exitCode: code,
          timedOut,
        });
      });
    });
  }
}
