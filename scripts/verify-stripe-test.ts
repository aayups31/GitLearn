// Explicit test-mode API exercise. Local auth/database fixtures; real Stripe SDK/API.
// Run: node --env-file=.local/stripe.env --import tsx scripts/verify-stripe-test.ts
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import Stripe from "stripe";
import { StripeBilling } from "../services/ai/billing";
import { createGateway } from "../services/ai/gateway";
import { MemoryBillingStore } from "../tests/helpers/billing-store";

const key = process.env.STRIPE_SECRET_KEY;
if (!key?.startsWith("sk_test_")) throw Error("A Stripe TEST key is required.");
const catalog = JSON.parse(
  await readFile(".local/stripe-catalog.json", "utf8"),
);
assert.equal(catalog.mode, "test");
const stripe = new Stripe(key, { timeout: 20000, maxNetworkRetries: 2 });
const store = new MemoryBillingStore(),
  user = randomUUID(),
  token = randomUUID(),
  signing = `whsec_${randomUUID()}`;
const billing = new StripeBilling(stripe, store, {
  price: catalog.price,
  portalConfiguration: catalog.portal,
  publicUrl: "https://outclass-test.invalid",
  live: false,
  webhookSecret: signing,
});
const app = createGateway({
  allowance: {
    reserve: async () => false,
    refund: async () => {},
    usage: async () => {
      const paid =
        (store.accounts.get(user)?.paidUntil?.getTime() ?? 0) > Date.now();
      const limit = paid ? 600 : 20;
      return {
        used: 0,
        limit,
        remaining: limit,
        period: new Date().toISOString().slice(0, 7),
        plan: paid ? "paid" : "free",
      };
    },
  },
  authenticate: async (t) => {
    assert.equal(t, token);
    return user;
  },
  auth: async () => {
    throw Error("Auth is a local fixture in this test");
  },
  answer: async () => {
    throw Error("No AI requests in billing test");
  },
  checkout: (u) => billing.checkout(u),
  webhook: (body, signature) => billing.webhook(body, signature),
});
const server = app.listen(0, "127.0.0.1");
await new Promise<void>((r) => server.once("listening", r));
const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
const checks: string[] = [],
  subscriptions: string[] = [];
async function get(route: string) {
  const r = await fetch(base + route, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(r.status, 200);
  return r.json();
}
async function checkout() {
  const r = await fetch(base + "/v1/checkout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  assert.equal(r.status, 200);
  return (await r.json()).url as string;
}
async function notify(type: string, id = `evt_${randomUUID()}`) {
  // Locally signed snapshots exercise production signature verification and remote state reconciliation.
  const body = JSON.stringify({
    id,
    type,
    livemode: false,
    data: { object: { customer: store.accounts.get(user)!.customer } },
  });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload: body,
    secret: signing,
  });
  const r = await fetch(base + "/v1/stripe/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": signature,
    },
    body,
  });
  assert.equal(r.status, 200);
}
let cleanupOK = true;
try {
  const first = await checkout(),
    second = await checkout();
  assert.equal(first, second);
  const session = await stripe.checkout.sessions.retrieve(
    store.accounts.get(user)!.checkoutSession!,
    { expand: ["line_items.data.price"] },
  );
  assert.equal(session.livemode, false);
  assert.equal(session.currency, "cad");
  assert.equal(session.amount_total, 1200);
  assert.equal(session.mode, "subscription");
  assert.equal((await get("/v1/usage")).plan, "free");
  checks.push(
    "CAD12 hosted Checkout; repeated upgrade reuses session; redirect alone grants no access",
  );
  const customer = store.accounts.get(user)!.customer!;
  const visa = await stripe.paymentMethods.attach("pm_card_visa", { customer });
  const subscription = await stripe.subscriptions.create({
    customer,
    items: [{ price: catalog.price }],
    default_payment_method: visa.id,
    payment_behavior: "error_if_incomplete",
    metadata: { outclass_user: user, outclass_app: "OutClass" },
    billing_mode: { type: "flexible" },
  });
  subscriptions.push(subscription.id);
  assert.equal(subscription.status, "active");
  await notify("invoice.paid", "evt_paid_fixture");
  await notify("invoice.paid", "evt_paid_fixture");
  assert.equal((await get("/v1/usage")).limit, 600);
  checks.push(
    "Real test-card payment grants 600 responses; duplicate webhook is harmless",
  );
  const portal = await checkout();
  assert.equal(new URL(portal).hostname, "billing.stripe.com");
  checks.push("Existing subscription opens dedicated Customer Portal");
  await stripe.subscriptions.update(subscription.id, {
    cancel_at_period_end: true,
  });
  await notify("customer.subscription.updated");
  assert.equal((await get("/v1/usage")).plan, "paid");
  checks.push("Cancel at period end retains paid access");
  await stripe.subscriptions.cancel(subscription.id);
  await notify("customer.subscription.deleted");
  assert.equal((await get("/v1/usage")).limit, 20);
  await notify("invoice.paid", "evt_old_paid_replayed");
  assert.equal((await get("/v1/usage")).plan, "free");
  checks.push(
    "Immediate cancellation revokes paid allowance; old paid event cannot restore it",
  );
  const declined = await stripe.paymentMethods.attach(
    "pm_card_chargeCustomerFail",
    { customer },
  );
  const failed = await stripe.subscriptions.create({
    customer,
    items: [{ price: catalog.price }],
    default_payment_method: declined.id,
    payment_behavior: "default_incomplete",
    metadata: { outclass_user: user, outclass_app: "OutClass" },
    billing_mode: { type: "flexible" },
  });
  subscriptions.push(failed.id);
  assert.equal(failed.status, "incomplete");
  await notify("invoice.payment_failed");
  assert.equal((await get("/v1/usage")).plan, "free");
  assert.equal(new URL(await checkout()).hostname, "billing.stripe.com");
  checks.push(
    "Declined test-card payment stays free and opens recovery portal",
  );
  const invoice =
    typeof failed.latest_invoice === "string"
      ? failed.latest_invoice
      : failed.latest_invoice!.id;
  await stripe.invoices.pay(invoice, { payment_method: visa.id });
  await notify("invoice.paid");
  assert.equal((await get("/v1/usage")).plan, "paid");
  checks.push("Successful invoice recovery restores paid allowance");
} catch (error) {
  console.error(
    JSON.stringify({
      error: "Stripe test validation failed",
      category: (error as { type?: string }).type || "assertion",
      completed: checks.length,
    }),
  );
  process.exitCode = 1;
} finally {
  // Clean up only the synthetic customer/subscriptions created by this execution.
  for (const id of subscriptions)
    try {
      const s = await stripe.subscriptions.retrieve(id);
      if (!["canceled", "incomplete_expired"].includes(s.status))
        await stripe.subscriptions.cancel(id);
    } catch {
      cleanupOK = false;
    }
  const customer = store.accounts.get(user)?.customer;
  if (customer) {
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
    } catch {
      cleanupOK = false;
    }
  }
  await new Promise<void>((r) => server.close(() => r()));
  const report = {
    at: new Date().toISOString(),
    mode: "test",
    realStripeAPI: true,
    auth: "local fixture",
    database: "in-memory fixture; production PostgreSQL staging pending",
    webhooks: "locally signed snapshots; public delivery pending",
    checks,
    cleanupOK,
    passed: !process.exitCode && cleanupOK,
  };
  await writeFile(
    ".local/stripe-validation.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  if (!cleanupOK) process.exitCode = 1;
}
