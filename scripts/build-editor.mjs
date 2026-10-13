import { build } from "esbuild";
import { mkdir, readFile, cp } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
const { version } = JSON.parse(await readFile("package.json", "utf8"));
const editor = JSON.parse(
  await readFile("editor-extension/package.json", "utf8"),
);
if (editor.version !== version)
  throw new Error("Align the editor companion version before packaging.");
await mkdir("dist/editor", { recursive: true });
await build({
  entryPoints: ["editor-extension/src/extension.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["vscode"],
  target: "node20",
  outfile: "editor-extension/dist/extension.cjs",
});
const output = path.resolve(`dist/editor/OutClass-Editor-${version}.vsix`);
await new Promise((resolve, reject) => {
  const child = spawn(
    process.execPath,
    [
      path.resolve("node_modules/@vscode/vsce/vsce"),
      "package",
      "--no-dependencies",
      "--out",
      output,
    ],
    {
      cwd: path.resolve("editor-extension"),
      shell: false,
      windowsHide: true,
      stdio: "inherit",
    },
  );
  child.on("error", reject);
  child.on("exit", (code) =>
    code === 0
      ? resolve()
      : reject(new Error("Editor companion packaging failed.")),
  );
});
await mkdir("dist/releases", { recursive: true });
await cp(output, `dist/releases/OutClass-Editor-${version}.vsix`);
