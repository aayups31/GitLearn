import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mkdtemp, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { git, initialize, parseRemote, push } from "../src/server/git";

let root: string;
beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "gitlearn-remote-policy-"));
  await git(root, ["init"]);
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(root, { recursive: true, force: true });
});
it("leaves setup retryable when the Git identity is missing", async () => {
  vi.stubEnv("GIT_CONFIG_GLOBAL", path.join(root, "missing-config"));
  vi.stubEnv("GIT_CONFIG_NOSYSTEM", "1");
  const target = path.join(root, "new-learning");
  await expect(initialize(target)).rejects.toThrow("Set your Git name");
  expect(
    await access(target).then(
      () => true,
      () => false,
    ),
  ).toBe(false);
});

it("accepts only GitHub HTTPS URLs without credentials", () => {
  expect(parseRemote("https://github.com/learner/learning")).toBe(
    "https://github.com/learner/learning.git",
  );
  expect(() =>
    parseRemote("https://token@github.com/learner/learning"),
  ).toThrow();
  expect(() =>
    parseRemote("https://github.com.evil.example/learner/learning"),
  ).toThrow();
});
it("blocks a changed origin before authentication or network operations", async () => {
  await git(root, [
    "remote",
    "add",
    "origin",
    "https://github.com/learner/other.git",
  ]);
  await expect(
    push(root, "https://github.com/learner/learning.git"),
  ).rejects.toThrow("remote changed");
});
it("blocks a hidden alternate push destination", async () => {
  const selected = "https://github.com/learner/learning.git";
  await git(root, ["remote", "add", "origin", selected]);
  await git(root, [
    "remote",
    "set-url",
    "--push",
    "origin",
    "https://github.com/learner/other.git",
  ]);
  await expect(push(root, selected)).rejects.toThrow("remote changed");
});
it("explains that a checkpoint is needed before syncing an empty archive", async () => {
  const selected = "https://github.com/learner/learning.git";
  await git(root, ["remote", "add", "origin", selected]);
  await expect(push(root, selected)).rejects.toThrow(
    "Save your first checkpoint",
  );
});
