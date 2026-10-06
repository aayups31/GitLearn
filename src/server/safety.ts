import { lstat, readdir, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import ignore from "ignore";
import { createHash } from "node:crypto";
import type { Finding, FrozenFile } from "../shared.js";

export class UserError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function slug(value: string) {
  let result =
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "lesson";
  if (/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(result))
    result = `item-${result}`;
  return result;
}
export function shortId(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}
export function child(root: string, relative: string) {
  if (
    !relative ||
    relative.includes("\\") ||
    relative.includes("\0") ||
    path.isAbsolute(relative) ||
    relative.split("/").some((p) => p === ".." || p === "." || !p)
  )
    throw new UserError("That file path is not allowed.");
  const resolved = path.resolve(root, relative);
  if (!inside(root, resolved))
    throw new UserError("That file is outside your selected folder.");
  return resolved;
}
export function inside(root: string, target: string) {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}
const ignored = new Set([
  ".git",
  "node_modules",
  "venv",
  ".venv",
  "dist",
  "build",
  "__pycache__",
  ".next",
  ".cache",
  "coverage",
  ".local",
  ".idea",
  ".vscode",
]);
export function excluded(relative: string) {
  return relative
    .split(/[\\/]/)
    .some(
      (part) =>
        ignored.has(part.toLowerCase()) ||
        /^\.env(?:\.|$)/i.test(part) ||
        /\.(pem|key|p12|pfx|cer|sqlite|db|log)$/i.test(part) ||
        /^(id_rsa|id_ed25519|credentials|\.ds_store)$/i.test(part),
    );
}
export function scan(text: string, filename: string): Finding[] {
  const checks: [RegExp, string][] = [
    [/\bsk-(?:proj-|svcacct-)?[a-zA-Z0-9_-]{20,}/, "API key"],
    [/\b(?:ghp_|github_pat_|gho_|ghs_)[a-zA-Z0-9_]{20,}/, "GitHub token"],
    [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, "private key"],
    [/\bAKIA[0-9A-Z]{16}\b/, "cloud credential"],
    [
      /(?:api[_-]?key|access[_-]?token|secret[_-]?key|password|client[_-]?secret)\s*[=:]\s*["']?([^\s"'<>]{12,})/i,
      "possible credential",
    ],
    [/https?:\/\/[^\s/@:]+:[^\s/@]+@/i, "credential in URL"],
    [
      /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/,
      "authentication token",
    ],
  ];
  return checks
    .filter(([pattern]) => pattern.test(text))
    .map(([, kind]) => ({ path: filename, kind }));
}
export function assertClean(text: string, filename: string) {
  const findings = scan(text, filename);
  if (findings.length)
    throw new UserError(
      `Save paused: ${findings[0].kind} detected in ${filename}. Remove it or exclude the file, then try again.`,
      422,
    );
}
export async function collect(
  root: string,
): Promise<{ files: FrozenFile[]; skipped: number }> {
  const actualRoot = await realpath(root).catch(() => {
    throw new UserError("That coding folder does not exist.");
  });
  const rules = ignore();
  for (const file of [".gitignore", ".gitlearnignore"]) {
    try {
      rules.add(await readFile(path.join(actualRoot, file), "utf8"));
    } catch {
      /* optional */
    }
  }
  const files: FrozenFile[] = [];
  let total = 0;
  let skipped = 0;
  async function walk(relative: string) {
    for (const entry of await readdir(path.join(actualRoot, relative), {
      withFileTypes: true,
    })) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      if (
        excluded(name) ||
        rules.ignores(`${name}${entry.isDirectory() ? "/" : ""}`)
      ) {
        skipped++;
        continue;
      }
      const location = child(actualRoot, name);
      const stat = await lstat(location);
      if (
        stat.isSymbolicLink() ||
        !inside(actualRoot, await realpath(location))
      ) {
        skipped++;
        continue;
      }
      if (stat.isDirectory()) {
        await walk(name);
        continue;
      }
      if (!stat.isFile() || stat.size > 2 * 1024 * 1024) {
        skipped++;
        continue;
      }
      const content = await readFile(location);
      if (content.includes(0)) {
        skipped++;
        continue;
      }
      total += content.length;
      if (total > 10 * 1024 * 1024 || files.length >= 500)
        throw new UserError(
          "Choose a smaller coding folder (up to 500 text files / 10 MB per checkpoint).",
        );
      assertClean(content.toString("utf8"), name);
      files.push({ path: name, content: content.toString("base64") });
    }
  }
  await walk("");
  return { files: files.sort((a, b) => a.path.localeCompare(b.path)), skipped };
}
export function sanitizeUdemyUrl(raw: string) {
  const url = new URL(raw);
  if (
    url.protocol !== "https:" ||
    !(url.hostname === "udemy.com" || url.hostname.endsWith(".udemy.com")) ||
    url.username ||
    url.password ||
    !url.pathname.startsWith("/course/")
  )
    throw new UserError(
      "Use a Udemy course link, such as https://www.udemy.com/course/your-course/.",
    );
  return `${url.origin}${url.pathname}`;
}
export function fingerprint(files: FrozenFile[]) {
  return createHash("sha256").update(JSON.stringify(files)).digest("hex");
}
