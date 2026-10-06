import { available, githubExecutable, run } from "./git.js";
import { UserError } from "./safety.js";

export async function githubStatus() {
  const installed = await available("gh");
  if (!installed) return { installed: false, authenticated: false, login: "" };
  try {
    // Request only the account name. Tokens and CLI diagnostics never reach the UI.
    const login = (
      await run("gh", [
        "api",
        "user",
        "--hostname",
        "github.com",
        "--jq",
        ".login",
      ])
    ).trim();
    if (!/^[a-zA-Z0-9-]+$/.test(login)) throw new Error("Invalid account");
    return { installed: true, authenticated: true, login };
  } catch {
    return { installed: true, authenticated: false, login: "" };
  }
}

export async function prepareGithub() {
  const account = await githubStatus();
  if (!account.installed)
    throw new UserError(
      "Install GitHub CLI, then check your connection in Settings.",
    );
  if (!account.authenticated)
    throw new UserError(
      "Sign in to GitHub in Settings and check your connection. If you are already signed in, check your internet connection.",
    );
  await run("gh", ["auth", "setup-git", "--hostname", "github.com"]);
  return account.login;
}

export async function signInGithub() {
  if (!(await available("gh")))
    throw new UserError(
      "Install GitHub CLI first, then check your connection.",
    );
  if (process.platform !== "win32")
    throw new UserError(
      "Run gh auth login --hostname github.com --web --git-protocol https in your terminal.",
    );
  const executable = githubExecutable().replace(/'/g, "''");
  await run("powershell.exe", [
    "-NoProfile",
    "-Command",
    `Start-Process -FilePath '${executable}' -ArgumentList @('auth','login','--hostname','github.com','--web','--git-protocol','https') -WindowStyle Normal`,
  ]);
}
