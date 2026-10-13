// Run: node --import tsx scripts/provision-ai-database.ts
// Owner URI stays local. The deployed service receives a restricted runtime URI.
import { readFile, writeFile } from "node:fs/promises";
import { randomBytes, pbkdf2Sync, createHash, createHmac } from "node:crypto";
import { Pool } from "pg";
import { parse } from "dotenv";
import { serviceConfig } from "../services/ai/config";
import { verifySchema } from "../services/ai/schema";

const file = ".local/ai-service.env";
const env = parse(await readFile(file));
const ref = new URL(env.SUPABASE_URL).hostname.split(".")[0];
const uri = new URL(env.DATABASE_URL);
if (!(
  uri.hostname === `db.${ref}.supabase.co` ||
  decodeURIComponent(uri.username).endsWith(`.${ref}`)
))
  throw Error("DATABASE_URL must belong to the selected Supabase project.");
const owner = new Pool(serviceConfig(env).pool);
let runtime: Pool | undefined;
try {
  await verifySchema(owner);
  const current = (await owner.query("SELECT current_user AS name")).rows[0]
    .name;
  if (current === "outclass_runtime") {
    console.log(
      JSON.stringify({ connected: true, restrictedRole: true, reused: true }),
    );
  } else {
    const existing = await owner
      .query(
        "SELECT rolname,rolsuper,rolcreaterole,rolbypassrls,pg_has_role('outclass_runtime','outclass_api','MEMBER') AS managed FROM pg_roles WHERE rolname='outclass_runtime'",
      )
      .catch((error) => {
        if (error.code === "42704") return { rows: [] };
        throw error;
      });
    if (
      existing.rows[0] &&
      (!existing.rows[0].managed ||
        existing.rows[0].rolsuper ||
        existing.rows[0].rolcreaterole ||
        existing.rows[0].rolbypassrls)
    )
      throw Error("Existing runtime role is not managed by OutClass.");
    const password = randomBytes(32).toString("base64url"),
      salt = randomBytes(16),
      iterations = 4096;
    const salted = pbkdf2Sync(password, salt, iterations, 32, "sha256");
    const client = createHmac("sha256", salted).update("Client Key").digest();
    const stored = createHash("sha256").update(client).digest("base64");
    const server = createHmac("sha256", salted)
      .update("Server Key")
      .digest("base64");
    const verifier = `SCRAM-SHA-256$${iterations}:${salt.toString("base64")}$${stored}:${server}`;
    await owner.query("BEGIN");
    try {
      await owner.query(
        `${existing.rows.length ? "ALTER" : "CREATE"} ROLE outclass_runtime LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '${verifier}'`,
      );
      await owner.query("GRANT outclass_api TO outclass_runtime");
      await owner.query("COMMIT");
    } catch (error) {
      await owner.query("ROLLBACK");
      throw error;
    }
    const ownerURI = env.DATABASE_URL;
    uri.username = uri.hostname.endsWith("pooler.supabase.com")
      ? `outclass_runtime.${ref}`
      : "outclass_runtime";
    uri.password = password;
    const next = { ...env, DATABASE_URL: uri.href };
    runtime = new Pool(serviceConfig(next).pool);
    await verifySchema(runtime);
    const privileges = (
      await runtime.query(
        "SELECT current_user AS name, has_schema_privilege(current_user,'public','CREATE') AS can_create_public, (SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user) AS bypass_rls",
      )
    ).rows[0];
    if (
      privileges.name !== "outclass_runtime" ||
      privileges.can_create_public ||
      privileges.bypass_rls
    )
      throw Error("Runtime privileges did not pass verification.");
    await writeFile(
      ".local/ai-service.owner.env",
      `DATABASE_URL=${JSON.stringify(ownerURI)}\n`,
      { flag: "wx" },
    ).catch((error) => {
      if (error.code !== "EEXIST") throw error;
    });
    await writeFile(
      file,
      Object.entries(next)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join("\n") + "\n",
    );
    console.log(
      JSON.stringify({
        connected: true,
        restrictedRole: true,
        schemaVerified: true,
        ownerCredentialDeployed: false,
        secretsPrinted: false,
      }),
    );
  }
} catch (error) {
  console.error(
    JSON.stringify({
      error: "OutClass database setup failed",
      code: (error as { code?: string }).code || "verification",
      secretsPrinted: false,
    }),
  );
  process.exitCode = 1;
} finally {
  await runtime?.end();
  await owner.end();
}
