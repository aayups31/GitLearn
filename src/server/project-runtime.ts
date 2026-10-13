import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { realpath } from "node:fs/promises";
import { projectTemplate } from "./project-templates.js";
import { nativeCompiler, localTool } from "./native-runtime.js";
import type { ProjectKind, PythonProfile } from "../project-types.js";
import path from "node:path";
import type { Application } from "./application.js";
import type { Workspace } from "./workspace.js";
import { runtimeEnvironment } from "./practice.js";
import { assertClean, UserError } from "./safety.js";

export interface CommandRecord {
  id: string;
  sessionId: string;
  courseId: string;
  workspace: string;
  command: string;
  startedAt: string;
  finishedAt?: string;
  state: "running" | "finished" | "stopped" | "interrupted";
  output: string;
  exitCode: number | null;
  truncated: boolean;
  lessonId?: string;
  versions?: Record<string, string>;
  changedDuringRun?: boolean;
  regression?: {
    baselineId: string;
    lessonId?: string;
    changedFiles: string[];
  };
}
export class ProjectRuntime {
  private jobs = new Map<
    string,
    {
      record: CommandRecord;
      child: ChildProcess;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  constructor(
    private app: Application,
    private workspace: Workspace,
  ) {
    // A process from the previous companion cannot be claimed as still alive.
    this.app.store.put(
      "project:commands",
      this.records().map((r) =>
        r.state === "running"
          ? { ...r, state: "interrupted", finishedAt: new Date().toISOString() }
          : r,
      ),
    );
  }
  records() {
    return this.app.store.get<CommandRecord[]>("project:commands") || [];
  }
  context(courseId: string) {
    const session = this.app.store.state().session;
    if (session?.courseId !== courseId) return undefined;
    const record = this.records().find(
      (r) => r.courseId === courseId && r.workspace === session.workspace,
    );
    if (!record) return undefined;
    return {
      command: record.command,
      output: record.output.slice(-6000),
      exitCode: record.exitCode,
      state: record.state,
      truncated: record.truncated || record.output.length > 6000,
      finishedAt: record.finishedAt,
    };
  }
  async scaffold(
    sessionId: string,
    kind: ProjectKind,
    profile: PythonProfile = "minimal",
  ) {
    const session = this.workspace.session(sessionId);
    if (session.contributionId)
      throw new UserError(
        "Keep upstream setup in its contribution folder. Create your own app in a course project.",
      );
    const directory = `apps/${kind}-${randomUUID().slice(0, 8)}`;
    const { files, ...commands } = projectTemplate(kind, directory, profile);
    if (kind === "c" || kind === "cpp") {
      const compiler = await nativeCompiler(kind === "cpp");
      if (compiler && (await localTool("ninja"))) {
        const previous = commands.install;
        commands.install = `cmake -G Ninja -DCMAKE_${kind === "cpp" ? "CXX" : "C"}_COMPILER=${compiler} -S ${directory} -B ${directory}/build`;
        files["README.md"] = files["README.md"].replace(
          previous,
          commands.install,
        );
        commands.note +=
          " Detected Ninja and compiler are selected for CMake setup.";
      }
    }
    for (const [relative, content] of Object.entries(files))
      await this.workspace.save(
        sessionId,
        `${directory}/${relative}`,
        content,
        null,
      );
    await this.workspace.editorAnchor(sessionId, commands.entry, 0);
    return { directory, ...commands };
  }
  private pythonCommandPath(words: string[]) {
    if (words[1] === "-m") {
      const requirements = words.indexOf("-r");
      if (requirements >= 0) return words[requirements + 1];
      if (words[2] === "py_compile") return words[3];
      if (words[2] === "compileall") return `${words.at(-1)}/main.py`;
      return undefined;
    }
    return words
      .slice(1)
      .find((word) => /\.py$/.test(word) && !path.isAbsolute(word));
  }
  private clean(value: string) {
    try {
      assertClean(value, "command history");
      if (this.app.apiKey && value.includes(this.app.apiKey)) throw Error();
      return value;
    } catch {
      return "[Sensitive content excluded from command history]";
    }
  }
  private persist(record: CommandRecord) {
    this.app.store.put(
      "project:commands",
      [
        {
          ...record,
          command: this.clean(record.command),
          output: this.clean(record.output),
        },
        ...this.records().filter((r) => r.id !== record.id),
      ].slice(0, 40),
    );
  }
  status(sessionId: string) {
    const session = this.workspace.session(sessionId);
    return this.records()
      .filter(
        (r) =>
          r.courseId === session.courseId && r.workspace === session.workspace,
      )
      .map((r) => {
        const record = this.jobs.get(r.id)?.record || r;
        return {
          ...record,
          command: this.clean(record.command),
          output: this.clean(record.output),
        };
      });
  }
  async start(sessionId: string, command: string) {
    assertClean(command, "project command");
    if (!command.trim() || command.length > 2000 || /[\x00]/.test(command))
      throw new UserError("Enter a local project command.");
    const session = this.workspace.session(sessionId);
    const root = await realpath(session.workspace).catch(() => "");
    if (root !== session.workspace)
      throw new UserError("Reopen the project's real folder first.");
    this.workspace.session(sessionId);
    if (
      this.workspace.isRunning(sessionId) ||
      [...this.jobs.values()].some((j) => j.record.workspace === root)
    )
      throw new UserError(
        "Stop the current program before running another command.",
        409,
      );
    if (this.jobs.size >= 3)
      throw new UserError("Stop an existing command first.", 409);
    const env = runtimeEnvironment();
    const shell = process.platform === "win32" ? "powershell.exe" : "/bin/sh";
    let executable = shell;
    let args =
      process.platform === "win32"
        ? ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", command]
        : ["-c", command];
    // Built-in profiles use the bundled runtime; arbitrary project tools use the installed PATH.
    if (
      /^(node|python|python3)\s+/.test(command) &&
      !/[;&|<>`$]/.test(command.replace(/"[^"]*"|'[^']*'/g, ""))
    ) {
      const words = [
        ...command.matchAll(/"([^"]*)"|'([^']*)'|([^\s"']+)/g),
      ].map((m) => m[1] ?? m[2] ?? m[3]);
      executable =
        words[0] === "node"
          ? process.execPath
          : await this.workspace.pythonRuntime(
              root,
              this.pythonCommandPath(words),
            );
      args = words.slice(1);
      if (words[0] === "node" && process.versions.electron)
        env.ELECTRON_RUN_AS_NODE = "1";
    }
    if (/^python(?:3)? -m venv [\w./-]+$/.test(command)) {
      executable = await this.workspace.pythonRuntime();
      args = command.split(/\s+/).slice(1);
    }
    this.workspace.session(sessionId);
    if (this.workspace.isRunning(sessionId))
      throw new UserError(
        "A program started while preparing this command.",
        409,
      );
    const versions = await this.workspace.versions(sessionId);
    if (this.workspace.isRunning(sessionId))
      throw new UserError(
        "A program started while preparing this command.",
        409,
      );
    const record: CommandRecord = {
      id: randomUUID(),
      sessionId,
      courseId: session.courseId,
      workspace: root,
      command,
      startedAt: new Date().toISOString(),
      state: "running",
      output: "",
      exitCode: null,
      truncated: false,
      lessonId: session.lessonId,
      versions,
    };
    const child = spawn(executable, args, {
      cwd: root,
      env,
      shell: false,
      windowsHide: true,
      detached: process.platform !== "win32",
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.workspace.track(sessionId, child);
    const timer = setTimeout(() => this.stop(record.id), 4 * 3600000);
    this.jobs.set(record.id, { record, child, timer });
    this.persist(record);
    const append = (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      record.output += text;
      if (record.output.length > 64000) {
        record.output = record.output.slice(-64000);
        record.truncated = true;
      }
    };
    child.stdout!.on("data", append);
    child.stderr!.on("data", append);
    child.stdin!.on("error", () => {});
    child.on("error", () => {
      record.output +=
        "\nThe command could not start. Check your installed tools and project folder.";
    });
    child.on("close", async (code) => {
      clearTimeout(timer);
      this.workspace.untrack(sessionId, child);
      record.exitCode = code;
      record.finishedAt = new Date().toISOString();
      const current = await this.workspace
        .versions(sessionId)
        .catch(() => undefined);
      record.changedDuringRun =
        !current || JSON.stringify(current) !== JSON.stringify(record.versions);
      // Keep the console busy until evidence is captured, so the next command
      // cannot race the previous command's close handler.
      if (record.state === "running") record.state = "finished";
      const baseline = this.records().find(
        (r) =>
          r.command === command &&
          r.workspace === root &&
          r.exitCode === 0 &&
          r.state === "finished" &&
          !r.changedDuringRun &&
          r.lessonId !== session.lessonId,
      );
      if (
        baseline &&
        code !== null &&
        code !== 0 &&
        record.state === "finished" &&
        !record.changedDuringRun
      )
        record.regression = {
          baselineId: baseline.id,
          lessonId: baseline.lessonId,
          changedFiles: Object.keys({
            ...baseline.versions,
            ...record.versions,
          })
            .filter((p) => baseline.versions?.[p] !== record.versions?.[p])
            .slice(0, 40),
        };
      this.persist(record);
      this.jobs.delete(record.id);
    });
    return record;
  }
  input(id: string, text: string) {
    const job = this.jobs.get(id);
    if (!job || job.record.state !== "running" || job.child.stdin?.destroyed)
      throw new UserError("This command is no longer accepting input.", 409);
    if (text.length > 4000 || /[\r\n\x00]/.test(text))
      throw new UserError("Use a short line of input.");
    job.child.stdin!.write(text + "\n");
  }
  stop(id: string) {
    const job = this.jobs.get(id);
    if (!job) return;
    job.record.state = "stopped";
    this.persist(job.record);
    this.workspace.stop(job.record.sessionId);
  }
  stopAll() {
    for (const id of this.jobs.keys()) this.stop(id);
  }
}
