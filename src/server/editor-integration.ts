import path from "node:path";
import { access, realpath } from "node:fs/promises";
import { spawn } from "node:child_process";
import { UserError } from "./safety.js";
export type Editor = {
  id: "vscode" | "codium";
  title: string;
  executable: string;
  cli?: string;
};
export async function editors(): Promise<Editor[]> {
  const roots = [
    process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, "Programs")
      : "",
    process.env.ProgramFiles || "C:\\Program Files",
  ].filter(Boolean);
  const candidates: Editor[] =
    process.platform === "win32"
      ? roots.flatMap((root) => [
          {
            id: "vscode" as const,
            title: "Visual Studio Code",
            executable: path.join(root, "Microsoft VS Code", "Code.exe"),
            cli: path.join(
              root,
              "Microsoft VS Code",
              "resources",
              "app",
              "out",
              "cli.js",
            ),
          },
          {
            id: "codium" as const,
            title: "VSCodium · Code OSS",
            executable: path.join(root, "VSCodium", "VSCodium.exe"),
            cli: path.join(
              root,
              "VSCodium",
              "resources",
              "app",
              "out",
              "cli.js",
            ),
          },
        ])
      : (process.env.PATH || "").split(path.delimiter).flatMap((root) => [
          {
            id: "vscode" as const,
            title: "Visual Studio Code",
            executable: path.join(root, "code"),
          },
          {
            id: "codium" as const,
            title: "VSCodium · Code OSS",
            executable: path.join(root, "codium"),
          },
        ]);
  const result: Editor[] = [];
  for (const c of candidates) {
    if (result.some((x) => x.id === c.id)) continue;
    try {
      await access(c.executable);
      if (c.cli) await access(c.cli);
      result.push(c);
    } catch {}
  }
  return result;
}
async function execute(editor: Editor, args: string[]) {
  return new Promise<string>((resolve, reject) => {
    const env = { ...process.env };
    for (const key of Object.keys(env))
      if (
        /^(?:OPENAI|OPEN_AI|GITLEARN|OUTCLASS|STRIPE|SUPABASE|DATABASE_URL)/i.test(
          key,
        )
      )
        delete env[key];
    if (editor.cli) env.ELECTRON_RUN_AS_NODE = "1";
    const child = spawn(
      editor.executable,
      [...(editor.cli ? [editor.cli] : []), ...args],
      { shell: false, windowsHide: true, env },
    );
    let output = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(
        new UserError(
          "Your editor took too long. Try the action directly in its Extensions panel.",
        ),
      );
    }, 45000);
    child.stdout.on("data", (d) => {
      output = (output + d).slice(-32000);
    });
    child.stderr.on("data", () => {});
    child.on("error", () => {
      clearTimeout(timer);
      reject(new UserError("Could not start the installed editor."));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      code === 0
        ? resolve(output)
        : reject(
            new UserError(
              "The editor could not complete this action. Check its Extensions panel.",
            ),
          );
    });
  });
}
export class EditorIntegration {
  constructor(private vsix: string) {}
  async status() {
    const installed = await editors();
    return {
      editors: installed.map(({ id, title }) => ({ id, title })),
      companionAvailable: await access(this.vsix).then(
        () => true,
        () => false,
      ),
    };
  }
  private async select(id: string) {
    const e = (await editors()).find((e) => e.id === id);
    if (!e)
      throw new UserError(
        "Install VS Code or VSCodium first, then refresh editor detection.",
      );
    return e;
  }
  async open(id: string, workspace: string) {
    const canonical = await realpath(workspace);
    if (canonical.toLowerCase() !== path.resolve(workspace).toLowerCase())
      throw new UserError("Reopen the approved workspace first.");
    await execute(await this.select(id), ["--new-window", canonical]);
    return { opened: true };
  }
  async install(id: string) {
    await access(this.vsix).catch(() => {
      throw new UserError(
        "The OutClass editor companion package is unavailable. Rebuild or reinstall OutClass.",
      );
    });
    await execute(await this.select(id), ["--install-extension", this.vsix]);
    return { installed: true };
  }
  async extensions(id: string) {
    const output = await execute(await this.select(id), [
      "--list-extensions",
      "--show-versions",
    ]);
    return {
      extensions: output
        .split(/\r?\n/)
        .filter((s) => /^[a-z0-9-]+\.[a-z0-9.-]+@\S+$/i.test(s))
        .slice(0, 500),
    };
  }
}
