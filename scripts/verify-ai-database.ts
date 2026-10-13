// Real PostgreSQL checks with synthetic accounts; no auth users or AI calls.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { parse } from "dotenv";
import { Pool } from "pg";
import { serviceConfig } from "../services/ai/config";
import { verifySchema } from "../services/ai/schema";
import { PostgresAllowances } from "../services/ai/gateway";
import { PostgresBillingStore } from "../services/ai/billing";
const env = parse(await readFile(".local/ai-service.env"));
const ownerEnv = {
  ...env,
  ...parse(await readFile(".local/ai-service.owner.env")),
};
const runtime = new Pool(serviceConfig(env).pool),
  other = new Pool(serviceConfig(env).pool),
  owner = new Pool(serviceConfig(ownerEnv).pool);
const user = randomUUID(),
  ids = Array.from({ length: 6 }, () => randomUUID()),
  events = [`evt_fixture_${randomUUID()}`, `evt_fixture_${randomUUID()}`],
  period = new Date().toISOString().slice(0, 7);
const checks: string[] = [];
let reserved = 0,
  cleanupOK = true;
try {
  await verifySchema(runtime);
  const allowance = new PostgresAllowances(runtime, 2, 4, 1000);
  assert.equal((await allowance.usage(user)).remaining, 2);
  const result = await Promise.all(
    ids.slice(0, 5).map((id) => allowance.reserve(user, id)),
  );
  reserved = result.filter(Boolean).length;
  assert.equal(reserved, 2);
  assert.equal((await allowance.usage(user)).used, 2);
  checks.push(
    "Concurrent allowance reservations cannot exceed the per-account limit",
  );
  const first = ids[result.indexOf(true)];
  await allowance.refund(user, first);
  await allowance.refund(user, first);
  assert.equal((await allowance.usage(user)).used, 1);
  checks.push("Failed-answer refund is idempotent");
  assert.equal(await allowance.reserve(user, ids[5]), true);
  reserved++;
  assert.equal((await allowance.usage(user)).used, 2);
  assert.equal(
    await new PostgresAllowances(runtime, 2, 4, 0).reserve(user, randomUUID()),
    false,
  );
  checks.push("Global capacity guard rejects without charging learner usage");
  const billing = new PostgresBillingStore(runtime),
    second = new PostgresBillingStore(other),
    attempt = randomUUID();
  await billing.withAccount(user, (s) =>
    s.save({
      customer: `cus_fixture_${user}`,
      checkoutKey: attempt,
      checkoutExpires: new Date(Date.now() + 3600000),
    }),
  );
  await second.withAccount(user, async (s) => {
    assert.equal(s.account.checkoutKey, attempt);
    assert.ok(s.account.checkoutExpires instanceof Date);
  });
  checks.push("Checkout attempt survives a different pool/connection");
  let started!: () => void, finish!: () => void;
  const begun = new Promise<void>((r) => (started = r)),
    release = new Promise<void>((r) => (finish = r));
  const sequence: string[] = [];
  const a = billing.withAccount(user, async () => {
    sequence.push("first");
    started();
    await release;
    sequence.push("first-done");
  });
  await begun;
  const b = second.withAccount(user, async () => {
    sequence.push("second");
  });
  await new Promise((r) => setTimeout(r, 100));
  assert.deepEqual(sequence, ["first"]);
  finish();
  await Promise.all([a, b]);
  assert.deepEqual(sequence, ["first", "first-done", "second"]);
  checks.push(
    "Billing advisory lock serializes across separate connection pools",
  );
  const until = new Date(Date.now() + 86400000);
  await billing.withAccount(user, (s) =>
    s.apply(events[0], "sub_fixture", until),
  );
  assert.equal((await allowance.usage(user)).plan, "paid");
  assert.equal((await allowance.usage(user)).limit, 4);
  await second.withAccount(user, (s) => s.apply(events[0], null, null));
  assert.equal((await allowance.usage(user)).plan, "paid");
  checks.push(
    "Subscription entitlement and event deduplication persist atomically",
  );
  await assert.rejects(
    billing.withAccount(user, (s) => s.apply(events[1], null, new Date(NaN))),
  );
  await second.withAccount(user, async (s) => {
    assert.equal(await s.seen(events[1]), false);
    await s.apply(events[1], null, null);
  });
  assert.equal((await allowance.usage(user)).plan, "free");
  checks.push(
    "Failed entitlement transaction rolls back event receipt and can be retried",
  );
  for (const role of ["anon", "authenticated"]) {
    const db = await owner.connect();
    try {
      await db.query("BEGIN");
      await db.query(`SET LOCAL ROLE ${role}`);
      await assert.rejects(
        db.query("SELECT * FROM outclass_service.accounts LIMIT 0"),
        (error: any) => error.code === "42501",
      );
    } finally {
      await db.query("ROLLBACK");
      db.release();
    }
  }
  checks.push(
    "Public and signed-in Data API roles cannot access the private schema",
  );
  const rights = (
    await runtime.query(
      "SELECT current_user AS role,has_schema_privilege(current_user,'public','CREATE') AS ddl,(SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user) AS bypass",
    )
  ).rows[0];
  assert.equal(rights.role, "outclass_runtime");
  assert.equal(rights.ddl, false);
  assert.equal(rights.bypass, false);
  checks.push("Runtime has no public schema creation or RLS bypass privileges");
} catch (error) {
  console.error(
    JSON.stringify({
      error: "Database validation failed",
      code: (error as { code?: string }).code || "assertion",
      completed: checks.length,
    }),
  );
  process.exitCode = 1;
} finally {
  try {
    const db = await owner.connect();
    try {
      await db.query("BEGIN");
      for (const table of ["requests", "usage", "accounts"])
        await db.query(
          `DELETE FROM outclass_service.${table} WHERE user_id=$1`,
          [user],
        );
      await db.query(
        "DELETE FROM outclass_service.webhooks WHERE id=ANY($1::text[])",
        [events],
      );
      await db.query(
        "UPDATE outclass_service.budget SET used=GREATEST(0,used-$2) WHERE period=$1",
        [period, reserved],
      );
      await db.query("COMMIT");
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    } finally {
      db.release();
    }
  } catch {
    cleanupOK = false;
    process.exitCode = 1;
  }
  await Promise.all([runtime.end(), other.end(), owner.end()]);
  const report = {
    at: new Date().toISOString(),
    database: "real Supabase PostgreSQL",
    checks,
    cleanupOK,
    passed: !process.exitCode,
  };
  await writeFile(
    ".local/ai-database-validation.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
}
