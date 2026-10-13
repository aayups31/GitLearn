// Run: node scripts/upload-ai-environment.mjs
// CLI auth required. Values travel only on child stdin; never command arguments.
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { parse } from "dotenv";
const env = parse(await readFile(".local/ai-service.env"));
const project = JSON.parse(await readFile(".vercel/project.json", "utf8"));
const selected = JSON.parse(
  await readFile(".local/service-deployment.json", "utf8"),
);
if (
  project.projectId !== selected.projectId ||
  project.orgId !== selected.teamId ||
  env.OUTCLASS_PUBLIC_URL !== selected.publicUrl
)
  throw Error("Link the selected OutClass Vercel project first.");
const allowed = [
  "DATABASE_URL",
  "DATABASE_CA_CERT",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "OPENAI_API_KEY",
  "OPENAI_CHAT_MODEL",
  "OUTCLASS_PUBLIC_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_PRICE_ID",
  "STRIPE_PORTAL_CONFIGURATION_ID",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_AUTOMATIC_TAX",
  "OUTCLASS_FREE_ALLOWANCE",
  "OUTCLASS_PAID_ALLOWANCE",
  "OUTCLASS_GLOBAL_ALLOWANCE",
];
const cli = ".local/deploy-tools/node_modules/vercel/dist/vc.js";
for (const name of allowed) {
  if (!env[name]) throw Error(`Configure ${name} before uploading.`);
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        cli,
        "env",
        "add",
        name,
        "production",
        "--force",
        "--yes",
        "--sensitive",
        "--project",
        project.projectId,
        "--scope",
        project.orgId,
      ],
      {
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, VERCEL_TELEMETRY_DISABLED: "1" },
      },
    );
    // Suppress all CLI output; it can contain values in an unexpected error.
    child.stdout.resume();
    child.stderr.resume();
    child.on("error", () => reject(Error(`Could not upload ${name}.`)));
    child.on("close", (code) =>
      code === 0
        ? resolve(undefined)
        : reject(Error(`Could not upload ${name}.`)),
    );
    child.stdin.end(env[name]);
  });
  console.log(`Configured ${name} in production.`);
}
console.log("OutClass environment configured; no values printed.");
