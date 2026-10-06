import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import {
  mkdtemp,
  rm,
  writeFile,
  readFile,
  mkdir,
  stat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { FrozenFile } from "../shared.js";
import { assertClean, child, excluded, UserError } from "./safety.js";

// A newly installed CLI may not be in the already-running companion's PATH.
export function githubExecutable() {
  if (process.platform === "win32") {
    const installed = path.join(
      process.env.ProgramFiles || "C:\\Program Files",
      "GitHub CLI",
      "gh.exe",
    );
    if (existsSync(installed)) return installed;
  }
  return "gh";
}

export function run(
  command: string,
  args: string[],
  cwd?: string,
  input?: Buffer | string,
  extraEnv: Record<string, string> = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const process = spawn(
      command === "gh" ? githubExecutable() : command,
      args,
      {
        cwd,
        shell: false,
        windowsHide: true,
        env: {
          ...globalThis.process.env,
          GIT_TERMINAL_PROMPT: "0",
          ...(command === "gh" ? { GH_HOST: "github.com" } : {}),
          ...extraEnv,
        },
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    let output = "",
      errors = "";
    const timer = setTimeout(() => {
      process.kill();
      reject(
        new UserError(
          "This operation took too long. Your local work is safe; please try again.",
          503,
        ),
      );
    }, 30000);
    process.stdout.on("data", (chunk) => {
      output += chunk;
      if (output.length > 20_000_000) process.kill();
    });
    process.stderr.on("data", (chunk) => {
      errors += chunk;
    });
    process.on("error", () => {
      clearTimeout(timer);
      reject(
        new UserError(
          `${command} is not available. Install it, then restart GitLearn.`,
          503,
        ),
      );
    });
    process.on("close", (code) => {
      clearTimeout(timer);
      code === 0
        ? resolve(output.trimEnd())
        : reject(
            new UserError(
              errors.includes("index.lock")
                ? "Git is busy. Close other Git operations and try again."
                : `The ${command} operation could not complete. Check authentication, permissions, and repository status.`,
              409,
            ),
          );
    });
    process.stdin.on("error", () => {});
    process.stdin.end(input);
  });
}
export const git = (
  root: string,
  args: string[],
  input?: string | Buffer,
  env?: Record<string, string>,
) =>
  run(
    "git",
    ["-c", "core.hooksPath=", "-c", "core.longpaths=true", ...args],
    root,
    input,
    env,
  );
export async function head(root: string) {
  return git(root, ["rev-parse", "--verify", "HEAD"]).catch(() => "");
}
export async function branch(root: string) {
  return git(root, ["symbolic-ref", "HEAD"]);
}
export async function available(command: string) {
  return run(command, ["--version"]).then(
    () => true,
    () => false,
  );
}
export async function initialize(root: string) {
  const existing = await stat(root).catch(() => null);
  if (existing) {
    const { readdir } = await import("node:fs/promises");
    if ((await readdir(root)).length)
      throw new UserError(
        "Choose an empty folder for your learning history. Your existing coding folder can be linked afterward.",
      );
  }
  // Validate before creating .git so a missing identity leaves setup retryable.
  const name = await run("git", ["config", "--global", "user.name"]).catch(
    () => "",
  );
  const email = await run("git", ["config", "--global", "user.email"]).catch(
    () => "",
  );
  if (!name || !email)
    throw new UserError(
      'Set your Git name and email first: git config --global user.name "Your Name" and git config --global user.email "you@example.com".',
    );
  await mkdir(root, { recursive: true });
  await git(root, ["init", "-b", "main"]);
  await writeFile(
    path.join(root, ".gitignore"),
    ".env\n.env.*\nnode_modules/\n.venv/\n__pycache__/\ndist/\nbuild/\n*.pem\n*.key\n",
  );
  await writeFile(
    path.join(root, "README.md"),
    "# My learning history\n\nCode, notes, and checkpoints from the things I learn.\n\nManaged locally by GitLearn.\n",
  );
}
export async function tree(root: string, base: string, files: FrozenFile[]) {
  const temp = await mkdtemp(path.join(tmpdir(), "gitlearn-index-"));
  const index = path.join(temp, "index");
  const env = { GIT_INDEX_FILE: index };
  try {
    await git(
      root,
      base ? ["read-tree", base] : ["read-tree", "--empty"],
      undefined,
      env,
    );
    for (const file of files) {
      child(root, file.path);
      if (file.content === null) {
        await git(
          root,
          ["update-index", "--force-remove", "--", file.path],
          undefined,
          env,
        );
        continue;
      }
      const content = Buffer.from(file.content, "base64");
      assertClean(content.toString("utf8"), file.path);
      const hash = await git(root, ["hash-object", "-w", "--stdin"], content);
      await git(
        root,
        ["update-index", "--add", "--cacheinfo", `100644,${hash},${file.path}`],
        undefined,
        env,
      );
    }
    const treeId = await git(root, ["write-tree"], undefined, env);
    const args = [
      "diff",
      "--cached",
      "--no-ext-diff",
      "--no-textconv",
      "--no-renames",
      ...(base ? [base] : []),
      "--",
    ];
    const diff = await git(root, args, undefined, env);
    assertClean(diff, "checkpoint diff");
    const names = await git(
      root,
      [
        "diff",
        "--cached",
        "--name-status",
        "--no-renames",
        ...(base ? [base] : []),
        "--",
      ],
      undefined,
      env,
    );
    const changes = names
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [status, ...parts] = line.split("\t");
        return { status, path: parts.join("\t").replace(/^"|"$/g, "") };
      });
    return { treeId, diff, changes };
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
export async function findCheckpoint(root: string, id: string) {
  return git(root, [
    "log",
    "--all",
    "--format=%H",
    "--fixed-strings",
    `--grep=GitLearn-Checkpoint: ${id}`,
    "-1",
  ]).catch(() => "");
}
export async function commitTree(
  root: string,
  expected: string,
  treeId: string,
  message: string,
  id: string,
  expectedBranch?: string,
) {
  assertClean(message, "commit message");
  const sha = await git(
    root,
    ["commit-tree", treeId, ...(expected ? ["-p", expected] : [])],
    `${message}\n\nGitLearn-Checkpoint: ${id}\n`,
  );
  const currentBranch = await branch(root);
  if (expectedBranch && currentBranch !== expectedBranch)
    throw new UserError(
      "The repository branch changed after this preview. Review a fresh checkpoint.",
    );
  await git(root, [
    "update-ref",
    "-m",
    "GitLearn checkpoint",
    currentBranch,
    sha,
    expected || "0".repeat(40),
  ]);
  return sha;
}
export async function reconcile(root: string, files: FrozenFile[]) {
  // This checkout belongs to the companion. Source workspaces are never mutated.
  for (const file of files) {
    const target = child(root, file.path);
    if (file.content === null) {
      await rm(target, { force: true });
      continue;
    }
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, Buffer.from(file.content, "base64"));
  }
  await git(root, ["read-tree", "HEAD"]);
}
export async function ensureCleanTarget(
  root: string,
  generatedPaths: Set<string> = new Set(),
) {
  const status = await git(root, [
    "status",
    "--porcelain",
    "-z",
    "--untracked-files=no",
  ]);
  const changes = status.split("\0").filter(Boolean);
  if (
    changes.some(
      (line) => line[0] !== " " || !generatedPaths.has(line.slice(3)),
    )
  )
    throw new UserError(
      "Your learning repository has changes made outside GitLearn. Commit or restore them before saving here. Your source coding folder is unaffected.",
    );
}
export async function tracked(root: string, directory: string) {
  return (await git(root, ["ls-files", "-z", "--", directory]))
    .split("\0")
    .filter(Boolean);
}
export async function previousContent(
  root: string,
  base: string,
  filename: string,
) {
  return base ? git(root, ["show", `${base}:${filename}`]).catch(() => "") : "";
}
export function parseRemote(raw: string) {
  if (!raw) return "";
  const match = raw
    .trim()
    .match(
      /^https:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git)?\/?$/,
    );
  if (!match)
    throw new UserError(
      "Use an HTTPS GitHub repository URL, without a token or password.",
    );
  return `https://github.com/${match[1]}/${match[2]}.git`;
}
async function verifyPrivate(normalized: string) {
  const repo = normalized
    .slice("https://github.com/".length)
    .replace(/\.git$/, "");
  const visibility = await run("gh", [
    "repo",
    "view",
    repo,
    "--json",
    "isPrivate",
  ]);
  if (!JSON.parse(visibility).isPrivate)
    throw new UserError(
      "Choose a private GitHub repository for your learning history.",
    );
}
export async function connectRemote(root: string, remote: string) {
  const normalized = parseRemote(remote);
  if (!normalized) throw new UserError("Enter your GitHub repository URL.");
  await verifyPrivate(normalized);
  const existing = await git(root, ["remote", "get-url", "origin"]).catch(
    () => "",
  );
  await git(root, [
    "remote",
    existing ? "set-url" : "add",
    "origin",
    normalized,
  ]);
  return normalized;
}
export async function push(root: string, selectedRemote: string) {
  const remote = await git(root, ["remote", "get-url", "origin"]);
  const pushUrls = (
    await git(root, ["remote", "get-url", "--push", "--all", "origin"])
  ).split("\n");
  if (
    parseRemote(remote) !== selectedRemote ||
    pushUrls.length !== 1 ||
    parseRemote(pushUrls[0]) !== selectedRemote
  )
    throw new UserError(
      "Your Git remote changed outside GitLearn. Reconnect the intended private repository before syncing.",
    );
  if (!(await head(root)))
    throw new UserError("Save your first checkpoint before syncing to GitHub.");
  await verifyPrivate(selectedRemote);
  await git(root, ["fetch", "origin"]);
  const branch = await git(root, ["symbolic-ref", "--short", "HEAD"]);
  const remoteHead = await git(root, [
    "rev-parse",
    "--verify",
    `refs/remotes/origin/${branch}`,
  ]).catch(() => "");
  if (remoteHead) {
    try {
      await git(root, ["merge-base", "--is-ancestor", remoteHead, "HEAD"]);
    } catch {
      throw new UserError(
        "GitHub has different changes. Sync is paused; review the histories before merging. Your local checkpoints are safe.",
        409,
      );
    }
  }
  const tip = await head(root);
  const outgoing = (
    await git(root, [
      "rev-list",
      ...(remoteHead ? [`${remoteHead}..${tip}`] : [tip]),
    ])
  )
    .split("\n")
    .filter(Boolean);
  for (const sha of outgoing) {
    assertClean(
      await git(root, [
        "show",
        "--format=full",
        "--no-ext-diff",
        "--no-textconv",
        sha,
      ]),
      "outgoing commit",
    );
    const files = (await git(root, ["ls-tree", "-r", "--name-only", sha]))
      .split("\n")
      .filter(Boolean);
    for (const file of files) {
      if (excluded(file))
        throw new UserError(
          `Sync paused: excluded file ${file} is present in outgoing history.`,
          422,
        );
      assertClean(await git(root, ["show", `${sha}:${file}`]), file);
    }
  }
  await git(root, [
    "push",
    "--set-upstream",
    "origin",
    `${tip}:refs/heads/${branch}`,
  ]);
}
