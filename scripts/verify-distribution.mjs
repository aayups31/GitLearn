import { readFile, readdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import dotenv from "dotenv";
const execute = promisify(execFile);
const values = dotenv.parse(
  await readFile(".env").catch(() => Buffer.alloc(0)),
);
const keys = ["OPENAI_API_KEY", "OPEN_AI_API"]
  .map((name) => values[name])
  .filter((key) => key?.length > 12)
  .map((key) => Buffer.from(key));
async function scan(file) {
  const data = await readFile(file);
  if (keys.some((key) => data.includes(key)))
    throw Error("Configured secret found in a distribution file.");
}
async function directory(root) {
  for (const item of await readdir(root, { withFileTypes: true })) {
    const file = path.join(root, item.name);
    if (item.isDirectory()) await directory(file);
    else {
      if (/^\.env/.test(item.name))
        throw Error("Environment file found in distribution.");
      await scan(file);
    }
  }
}
if (!process.argv.includes("--source-only")) {
  for (const root of [
    "dist/site",
    "dist/web",
    "dist/extension",
    "dist/editor",
    "dist/releases/win-unpacked/resources/editor",
    "dist/releases/win-unpacked/resources/extension",
  ])
    await directory(root);
  const archive = "dist/releases/win-unpacked/resources/app.asar";
  await scan(archive);
  const { listPackage } = await import("@electron/asar");
  if (listPackage(archive).some((name) => /[/\\]\.env(?:[/\\.]|$)/.test(name)))
    throw Error("Environment file found in app archive.");
}
if (process.argv.includes("--staged")) {
  const { stdout } = await execute(
    "git",
    ["diff", "--cached", "--name-only", "--diff-filter=ACMRT", "-z"],
    { encoding: "buffer", maxBuffer: 10_000_000 },
  );
  for (const name of stdout.toString().split("\0").filter(Boolean)) {
    if (/^\.env(?:\.|$)/.test(name) && name !== ".env.example")
      throw Error("Environment file staged for Git.");
    const { stdout: data } = await execute("git", ["show", `:${name}`], {
      encoding: "buffer",
      maxBuffer: 20_000_000,
    });
    if (keys.some((key) => data.includes(key)))
      throw Error("Configured secret staged for Git.");
  }
}
console.log(
  "Verified: configured API keys and environment files are absent from website, extension, desktop archive/resources, and requested staged source.",
);
