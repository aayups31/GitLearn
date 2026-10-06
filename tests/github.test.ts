import { beforeEach, expect, it, vi } from "vitest";
vi.mock("../src/server/git", () => ({
  available: vi.fn(),
  run: vi.fn(),
  githubExecutable: () => "gh",
}));
import { available, run } from "../src/server/git";
import { githubStatus, prepareGithub } from "../src/server/github";

beforeEach(() => {
  vi.resetAllMocks();
});
it("reports a missing CLI without requesting an account or credentials", async () => {
  vi.mocked(available).mockResolvedValue(false);
  expect(await githubStatus()).toEqual({
    installed: false,
    authenticated: false,
    login: "",
  });
  expect(run).not.toHaveBeenCalled();
  await expect(prepareGithub()).rejects.toThrow("Install GitHub CLI");
});
it("does not mark expired authentication or a network failure as signed in", async () => {
  vi.mocked(available).mockResolvedValue(true);
  vi.mocked(run).mockRejectedValue(new Error("private diagnostic"));
  expect(await githubStatus()).toEqual({
    installed: true,
    authenticated: false,
    login: "",
  });
  await expect(prepareGithub()).rejects.toThrow("Sign in to GitHub");
  expect(run).not.toHaveBeenCalledWith("gh", [
    "auth",
    "setup-git",
    "--hostname",
    "github.com",
  ]);
});
it("only returns a validated account name and never diagnostic or token output", async () => {
  vi.mocked(available).mockResolvedValue(true);
  vi.mocked(run).mockResolvedValue("unexpected secret diagnostic\n");
  expect(await githubStatus()).toEqual({
    installed: true,
    authenticated: false,
    login: "",
  });
});
it("configures Git credentials only after verifying the signed-in account", async () => {
  vi.mocked(available).mockResolvedValue(true);
  vi.mocked(run)
    .mockResolvedValueOnce("learner-123\n")
    .mockResolvedValueOnce("");
  expect(await prepareGithub()).toBe("learner-123");
  expect(run).toHaveBeenNthCalledWith(1, "gh", [
    "api",
    "user",
    "--hostname",
    "github.com",
    "--jq",
    ".login",
  ]);
  expect(run).toHaveBeenNthCalledWith(2, "gh", [
    "auth",
    "setup-git",
    "--hostname",
    "github.com",
  ]);
});
