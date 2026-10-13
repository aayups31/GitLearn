import { randomUUID } from "node:crypto";
import path from "node:path";
import { realpath, stat } from "node:fs/promises";
import type { IPty } from "node-pty";
import type { TerminalInfo, TerminalEvent } from "./bridge";

type Session = TerminalInfo & {
  pty: IPty;
  output: string;
  sequence: number;
  pending: string;
  truncated: boolean;
  timer?: ReturnType<typeof setTimeout>;
};
export class LocalTerminals {
  private sessions = new Map<string, Session>();
  constructor(private emit: (event: TerminalEvent) => void) {}
  list(): TerminalInfo[] {
    return [...this.sessions.values()].map(
      ({ pty, output, sequence, pending, truncated, timer, ...info }) => info,
    );
  }
  async create(sessionId: string, workspace: string, courseTitle: string) {
    if (this.sessions.size >= 6)
      throw new Error(
        "Close a terminal before opening another (six sessions maximum).",
      );
    const cwd = await realpath(workspace);
    if (
      !(await stat(cwd)).isDirectory() ||
      cwd.toLowerCase() !== path.resolve(workspace).toLowerCase()
    )
      throw new Error(
        "Reopen your approved course workspace before starting a terminal.",
      );
    const { spawn } = await import("node-pty");
    const env = Object.fromEntries(
      Object.entries(process.env).filter(
        ([name, value]) =>
          value !== undefined &&
          !/^(OPENAI|OPEN_AI|GITLEARN|OUTCLASS|SUPABASE|STRIPE|DATABASE_URL|ELECTRON|NODE_OPTIONS)/i.test(
            name,
          ),
      ),
    ) as Record<string, string>;
    const shell =
      process.platform === "win32"
        ? path.join(
            process.env.SystemRoot || "C:\\Windows",
            "System32",
            "WindowsPowerShell",
            "v1.0",
            "powershell.exe",
          )
        : "/bin/bash";
    const pty = spawn(
      shell,
      process.platform === "win32"
        ? ["-NoLogo", "-NoProfile"]
        : ["--noprofile", "--norc"],
      {
        name: "xterm-256color",
        cols: 90,
        rows: 18,
        cwd,
        env,
        useConpty: true,
      },
    );
    const info: Session = {
      id: randomUUID(),
      sessionId,
      title: courseTitle,
      cwd,
      shell: process.platform === "win32" ? "PowerShell" : "Bash",
      running: true,
      pty,
      output: "",
      sequence: 0,
      pending: "",
      truncated: false,
    };
    this.sessions.set(info.id, info);
    pty.onData((data) => {
      info.pending += data;
      if (info.pending.length > 64000) {
        info.pending = info.pending.slice(-64000);
        info.truncated = true;
      }
      if (!info.timer) info.timer = setTimeout(() => this.flush(info), 24);
      if (info.pending.length > 32000) pty.pause();
    });
    pty.onExit(({ exitCode }) => {
      info.running = false;
      this.flush(info);
      this.emit({ id: info.id, type: "exit", exitCode });
    });
    return this.list().find((s) => s.id === info.id)!;
  }
  snapshot(id: string) {
    const s = this.get(id);
    return { output: s.output, sequence: s.sequence };
  }
  private flush(info: Session) {
    if (info.timer) clearTimeout(info.timer);
    info.timer = undefined;
    if (info.pending) {
      const data =
        (info.truncated
          ? "\x1b[0m\r\n[High-volume output truncated in the display]\r\n"
          : "") + info.pending;
      info.pending = "";
      info.truncated = false;
      info.output = (info.output + data).slice(-256000);
      this.emit({ id: info.id, type: "data", data, sequence: ++info.sequence });
    }
    if (info.running) info.pty.resume();
  }
  private get(id: string) {
    const session = this.sessions.get(id);
    if (!session) throw new Error("This terminal has closed.");
    return session;
  }
  input(id: string, data: unknown) {
    if (typeof data !== "string" || data.length > 16384)
      throw new Error("Terminal input is too large.");
    const s = this.get(id);
    if (!s.running) throw new Error("Open a new terminal; this shell exited.");
    s.pty.write(data);
  }
  resize(id: string, cols: number, rows: number) {
    if (
      !Number.isInteger(cols) ||
      !Number.isInteger(rows) ||
      cols < 2 ||
      cols > 500 ||
      rows < 2 ||
      rows > 300
    )
      throw new Error("Invalid terminal size.");
    const s = this.get(id);
    if (s.running) s.pty.resize(cols, rows);
  }
  close(id: string) {
    const s = this.get(id);
    this.sessions.delete(id);
    if (s.timer) clearTimeout(s.timer);
    s.pending = "";
    if (s.running) s.pty.kill();
  }
  closeAll() {
    for (const id of [...this.sessions.keys()]) this.close(id);
  }
}
