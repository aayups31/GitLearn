import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
let credential = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";
function command(binary, args, env, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      env,
      windowsHide: true,
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let output = "",
      error = "";
    child.stdout.on("data", (data) => (output += data));
    child.stderr.on("data", (data) => (error += data));
    child.on("error", () => reject(Error("GitHub command could not start.")));
    child.on("close", (code) =>
      code === 0
        ? resolve(output)
        : reject(
            Error(
              credential
                ? error.replaceAll(credential, "[redacted]")
                : "GitHub credentials are unavailable.",
            ),
          ),
    );
    child.stdin.end(input);
  });
}
if (!credential) {
  const result = await command(
    "git",
    ["credential", "fill"],
    { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" },
    "protocol=https\nhost=github.com\n\n",
  );
  credential =
    result
      .split(/\r?\n/)
      .find((line) => line.startsWith("password="))
      ?.slice(9) || "";
}
if (!credential)
  throw Error("Sign in to GitHub CLI before publishing release assets.");
const env = { ...process.env, GH_TOKEN: credential, GH_PROMPT_DISABLED: "1" };
const args = process.argv.slice(2);
if (args[0] === "status") {
  const repo = await command(
    "gh",
    [
      "repo",
      "view",
      "aayups31/GitLearn",
      "--json",
      "nameWithOwner,visibility,url",
    ],
    env,
  );
  console.log(repo.trim());
} else if (args[0] === "publish") {
  const version = JSON.parse(await readFile("package.json", "utf8")).version;
  const assets = [
    `dist/releases/GitLearn-Setup-${version}.exe`,
    `dist/releases/GitLearn-Chrome-${version}.zip`,
    "dist/releases/SHA256SUMS.txt",
  ];
  await command(
    "gh",
    [
      "release",
      "create",
      `v${version}`,
      ...assets,
      "--repo",
      "aayups31/GitLearn",
      "--target",
      "main",
      "--title",
      `GitLearn ${version} · Windows preview`,
      "--prerelease",
      "--notes-file",
      `docs/releases/${version}.md`,
    ],
    env,
  );
  console.log(
    `Published preview release: https://github.com/aayups31/GitLearn/releases/tag/v${version}`,
  );
} else if (args[0] === "replace-installer") {
  const { version } = JSON.parse(await readFile("package.json", "utf8"));
  await command(
    "gh",
    [
      "release",
      "upload",
      `v${version}`,
      `dist/releases/GitLearn-Setup-${version}.exe`,
      "dist/releases/SHA256SUMS.txt",
      "--repo",
      "aayups31/GitLearn",
      "--clobber",
    ],
    env,
  );
  console.log(`Updated preview installer and checksums for v${version}.`);
} else if (args[0] === "view") {
  const { version } = JSON.parse(await readFile("package.json", "utf8"));
  console.log(
    (
      await command(
        "gh",
        [
          "release",
          "view",
          `v${version}`,
          "--repo",
          "aayups31/GitLearn",
          "--json",
          "url,assets,isPrerelease",
        ],
        env,
      )
    ).trim(),
  );
} else throw Error("Use status, publish, replace-installer, or view.");
