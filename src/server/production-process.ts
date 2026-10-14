import { spawn, type ChildProcess } from "node:child_process";
import { runtimeEnvironment } from "./practice.js";
import { UserError } from "./safety.js";
export function stopProduction(child: ChildProcess) {
  if (!child.pid) return;
  if (process.platform === "win32") {
    const stop = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
      shell: false,
      env: runtimeEnvironment(),
    });
    stop.on("error", () => child.kill());
  } else {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      child.kill("SIGKILL");
    }
  }
}
export function productionProcess(
  command: string,
  args: string[],
  cwd: string,
  timeout = 15000,
  onChild?: (child: ChildProcess) => void,
) {
  return new Promise<{
    code: number | null;
    output: string;
    stdout: string;
    stderr: string;
  }>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: runtimeEnvironment(),
      shell: false,
      windowsHide: true,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    onChild?.(child);
    let output = "",
      stdout = "",
      stderr = "",
      settled = false;
    const timer = setTimeout(() => {
      stopProduction(child);
      finish(
        new UserError(
          "The bounded production job timed out. Retry with a shorter input.",
          408,
        ),
      );
    }, timeout);
    function finish(error?: Error, code?: number | null) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      error
        ? reject(error)
        : resolve({ code: code ?? null, output, stdout, stderr });
    }
    const read = (data: Buffer) => {
      output += data.toString();
      if (output.length > 100000) {
        stopProduction(child);
        finish(new UserError("Production output exceeded its limit."));
      }
    };
    child.stdout.on("data", (data) => {
      stdout += data.toString();
      read(data);
    });
    child.stderr.on("data", (data) => {
      stderr += data.toString();
      read(data);
    });
    child.on("error", () =>
      finish(
        new UserError(
          `${command} is unavailable. Install the required production runtime and restart OutClass.`,
          503,
        ),
      ),
    );
    child.on("close", (code) => finish(undefined, code));
  });
}
