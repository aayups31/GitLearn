// Stripe TEST API + real private PostgreSQL + Stripe-delivered public webhooks.
// Checkout initiation uses a synthetic account fixture; no user sign-in or browser payment claim.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import { parse } from "dotenv";
import { Pool } from "pg";
import Stripe from "stripe";
import { serviceConfig } from "../services/ai/config.js";
import { PostgresAllowances } from "../services/ai/gateway.js";
import { PostgresBillingStore, StripeBilling } from "../services/ai/billing.js";

const env = parse(await readFile(".local/ai-service.env", "utf8"));
assert.ok(env.STRIPE_SECRET_KEY.startsWith("sk_test_"), "Test mode required.");
const ownerEnv = parse(await readFile(".local/ai-service.owner.env", "utf8"));
const pool = new Pool(serviceConfig(env).pool);
const owner = new Pool(serviceConfig({ ...env, ...ownerEnv }).pool);
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  timeout: 20000,
  maxNetworkRetries: 2,
});
const user = randomUUID();
const store = new PostgresBillingStore(pool);
const allowance = new PostgresAllowances(pool);
const billing = new StripeBilling(stripe, store, {
  price: env.STRIPE_PRICE_ID,
  portalConfiguration: env.STRIPE_PORTAL_CONFIGURATION_ID,
  publicUrl: env.OUTCLASS_PUBLIC_URL,
  live: false,
  webhookSecret: env.STRIPE_WEBHOOK_SECRET,
});
const checks: string[] = [];
const subscriptions: string[] = [];
let customer: string | undefined;
let cleanupOK = true;
async function waitPlan(expected: "paid" | "free") {
  const end = Date.now() + 45000;
  while (Date.now() < end) {
    if ((await allowance.usage(user)).plan === expected) return;
    await setTimeout(1000);
  }
  throw Error(
    "Public Stripe notification did not reconcile the expected allowance.",
  );
}
try {
  const first = await billing.checkout(user);
  const second = await new StripeBilling(
    stripe,
    new PostgresBillingStore(pool),
    {
      price: env.STRIPE_PRICE_ID,
      portalConfiguration: env.STRIPE_PORTAL_CONFIGURATION_ID,
      publicUrl: env.OUTCLASS_PUBLIC_URL,
      live: false,
      webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    },
  ).checkout(user);
  assert.equal(first, second);
  const row = (
    await pool.query(
      "SELECT customer,checkout_session FROM outclass_service.accounts WHERE user_id=$1",
      [user],
    )
  ).rows[0];
  customer = row.customer;
  const checkout = await stripe.checkout.sessions.retrieve(
    row.checkout_session,
  );
  assert.equal(checkout.currency, "cad");
  assert.equal(checkout.amount_total, 1200);
  assert.equal((await allowance.usage(user)).plan, "free");
  checks.push(
    "Real CAD12 Checkout reused across billing instances; redirect does not grant access",
  );
  const visa = await stripe.paymentMethods.attach("pm_card_visa", {
    customer: customer!,
  });
  const sub = await stripe.subscriptions.create({
    customer: customer!,
    items: [{ price: env.STRIPE_PRICE_ID }],
    default_payment_method: visa.id,
    payment_behavior: "error_if_incomplete",
    metadata: { outclass_user: user, outclass_app: "OutClass" },
    billing_mode: { type: "flexible" },
  });
  subscriptions.push(sub.id);
  assert.equal(sub.status, "active");
  await waitPlan("paid");
  assert.equal((await allowance.usage(user)).limit, 600);
  checks.push(
    "Stripe-delivered signed webhooks grant 600 responses in the real database",
  );
  assert.equal(
    new URL(await billing.checkout(user)).hostname,
    "billing.stripe.com",
  );
  checks.push("Existing subscription opens the dedicated Customer Portal");
  await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true });
  assert.equal((await allowance.usage(user)).plan, "paid");
  checks.push("Cancel-at-period-end retains the paid allowance");
  await stripe.subscriptions.cancel(sub.id);
  await waitPlan("free");
  checks.push("Stripe-delivered cancellation removes the paid allowance");
  // Replay an actual paid event through the deployed raw-body endpoint after cancellation.
  const events = await stripe.events.list({ type: "invoice.paid", limit: 100 });
  const paid = events.data.find(
    (event) => (event.data.object as Stripe.Invoice).customer === customer,
  );
  assert.ok(paid);
  const payload = JSON.stringify(paid);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: env.STRIPE_WEBHOOK_SECRET,
  });
  const response = await fetch(env.OUTCLASS_PUBLIC_URL + "/v1/stripe/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": signature,
    },
    body: payload,
  });
  assert.equal(response.status, 200);
  assert.equal((await allowance.usage(user)).plan, "free");
  checks.push("Duplicate old paid event cannot restore canceled access");
} catch {
  console.error(
    "Hosted billing validation failed; credentials and payment URLs omitted.",
  );
  process.exitCode = 1;
} finally {
  for (const id of subscriptions)
    try {
      const s = await stripe.subscriptions.retrieve(id);
      if (s.status !== "canceled") await stripe.subscriptions.cancel(id);
    } catch {
      cleanupOK = false;
    }
  if (customer)
    try {
      const c = await stripe.customers.retrieve(customer);
      assert.ok(!c.deleted && c.metadata.outclass_user === user);
      for await (const s of stripe.checkout.sessions.list({
        customer,
        status: "open",
        limit: 100,
      }))
        if (s.client_reference_id === user)
          await stripe.checkout.sessions.expire(s.id);
      await stripe.customers.del(customer);
      for await (const e of stripe.events.list({ limit: 100 })) {
        const obj = e.data.object as { customer?: string };
        if (obj.customer === customer)
          await owner.query(
            "DELETE FROM outclass_service.webhooks WHERE id=$1",
            [e.id],
          );
      }
    } catch {
      cleanupOK = false;
    }
  try {
    await owner.query(
      "DELETE FROM outclass_service.accounts WHERE user_id=$1",
      [user],
    );
  } catch {
    cleanupOK = false;
  }
  await pool.end();
  await owner.end();
  const report = {
    at: new Date().toISOString(),
    mode: "test",
    database: "real Supabase PostgreSQL",
    webhooks: "Stripe-delivered to Vercel; replay separately signed",
    auth: "synthetic account fixture",
    checks,
    cleanupOK,
    passed: !process.exitCode && cleanupOK,
  };
  await writeFile(
    ".local/hosted-billing-validation.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  if (!cleanupOK) process.exitCode = 1;
}
