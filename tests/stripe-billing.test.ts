import { it, expect, vi } from "vitest";
import Stripe from "stripe";
import { StripeBilling, InvalidBillingSignature } from "../services/ai/billing";

const user = "b8a66e7b-50e0-4f9b-8e5b-24614926e490",
  customer = "cus_outclass",
  price = "price_outclass";
const secret = "whsec_test_fixture_not_a_real_secret";
import { MemoryBillingStore } from "./helpers/billing-store";
const list = (items: any[]) =>
  ({
    async *[Symbol.asyncIterator]() {
      yield* items;
    },
  }) as any;
function subscription(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_current",
    customer,
    status: "active",
    created: 1,
    livemode: false,
    metadata: { outclass_user: user },
    items: {
      data: [
        {
          price: { id: price },
          current_period_end: Math.floor(Date.now() / 1000) + 86400,
        },
      ],
    },
    latest_invoice: { status: "paid" },
    ...overrides,
  };
}
async function fixture() {
  const stripe = new Stripe("sk_test_fixture");
  const store = new MemoryBillingStore();
  await store.withAccount(user, async (s) => {
    await s.save({ customer });
  });
  const prices = vi.spyOn(stripe.prices, "retrieve").mockResolvedValue({
    id: price,
    active: true,
    type: "recurring",
    unit_amount: 1200,
    livemode: false,
    recurring: {
      interval: "month",
      interval_count: 1,
      usage_type: "licensed",
    },
  } as any);
  const subscriptions = vi
    .spyOn(stripe.subscriptions, "list")
    .mockImplementation(() => list([]));
  const sessions = vi
    .spyOn(stripe.checkout.sessions, "list")
    .mockImplementation(() => list([]));
  const created = vi
    .spyOn(stripe.checkout.sessions, "create")
    .mockResolvedValue({
      id: "cs_one",
      url: "https://checkout.stripe.com/c/pay/one",
    } as any);
  const portal = vi
    .spyOn(stripe.billingPortal.sessions, "create")
    .mockResolvedValue({
      url: "https://billing.stripe.com/p/session/one",
    } as any);
  const billing = new StripeBilling(stripe, store, {
    price,
    webhookSecret: secret,
    live: false,
    publicUrl: "https://ai.outclass.example",
    portalConfiguration: "bpc_outclass",
  });
  const webhook = (
    type: string,
    id = "evt_one",
    object: Record<string, unknown> = { customer },
    live = false,
  ) => {
    const body = JSON.stringify({ id, type, livemode: live, data: { object } });
    return billing.webhook(
      Buffer.from(body),
      stripe.webhooks.generateTestHeaderString({ payload: body, secret }),
    );
  };
  return {
    stripe,
    store,
    billing,
    prices,
    subscriptions,
    sessions,
    created,
    portal,
    webhook,
  };
}
it("reuses open checkout under concurrent upgrade clicks, with a durable attempt", async () => {
  const f = await fixture();
  let opened: any[] = [];
  f.sessions.mockImplementation(() => list(opened));
  f.created.mockImplementation(async (input: any) => {
    await new Promise((r) => setTimeout(r, 5));
    opened = [
      {
        id: "cs_one",
        client_reference_id: user,
        metadata: input.metadata,
        url: "https://checkout.stripe.com/c/pay/one",
        expires_at: input.expires_at,
      },
    ];
    expect(f.store.accounts.get(user)?.checkoutKey).toBeTruthy();
    return opened[0];
  });
  const urls = await Promise.all([
    f.billing.checkout(user),
    f.billing.checkout(user),
  ]);
  expect(urls[0]).toBe(urls[1]);
  expect(f.created).toHaveBeenCalledTimes(1);
  expect(f.created.mock.calls[0][0]).toMatchObject({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    subscription_data: { billing_mode: { type: "flexible" } },
    client_reference_id: user,
  });
  expect(f.store.accounts.get(user)?.paidUntil).toBeNull();
});
it("retries a lost API response with the same idempotency key and exact parameters", async () => {
  const f = await fixture();
  f.created.mockRejectedValueOnce(
    Error("Timeout after Stripe accepted request"),
  );
  await expect(f.billing.checkout(user)).rejects.toThrow();
  await f.billing.checkout(user);
  expect(f.created.mock.calls[0]).toEqual(f.created.mock.calls[1]);
});
it("replaces a superseded-price checkout without reusing its idempotency key", async () => {
  const f = await fixture();
  await f.billing.checkout(user);
  const expire = vi
    .spyOn(f.stripe.checkout.sessions, "expire")
    .mockResolvedValue({ id: "cs_one" } as any);
  f.sessions.mockImplementation(() =>
    list([
      {
        id: "cs_one",
        client_reference_id: user,
        metadata: { outclass_app: "OutClass", outclass_price: price },
        url: "https://checkout.stripe.com/c/pay/one",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      },
    ]),
  );
  const changed = new StripeBilling(f.stripe, f.store, {
    price: "price_new",
    webhookSecret: secret,
    live: false,
    publicUrl: "https://ai.outclass.example",
  });
  await changed.checkout(user);
  expect(expire).toHaveBeenCalledWith("cs_one");
  expect(f.created.mock.calls[1][0]).toMatchObject({
    line_items: [{ price: "price_new", quantity: 1 }],
  });
  expect(f.created.mock.calls[1][1]?.idempotencyKey).not.toBe(
    f.created.mock.calls[0][1]?.idempotencyKey,
  );
});
it.each(["active", "past_due", "incomplete", "unpaid", "paused"])(
  "opens the dedicated customer portal for an existing %s subscription",
  async (status) => {
    const f = await fixture();
    f.subscriptions.mockImplementation(() => list([subscription({ status })]));
    expect(await f.billing.checkout(user)).toContain("billing.stripe.com");
    expect(f.created).not.toHaveBeenCalled();
    expect(f.portal).toHaveBeenCalledWith(
      expect.objectContaining({ customer, configuration: "bpc_outclass" }),
    );
  },
);
it("rejects inactive, metered and mismatched-mode prices before creating a checkout", async () => {
  for (const change of [
    { active: false },
    { livemode: true },
    {
      recurring: {
        interval: "month",
        interval_count: 1,
        usage_type: "metered",
      },
    },
  ]) {
    const f = await fixture();
    const original = await f.stripe.prices.retrieve(price);
    f.prices.mockResolvedValue({ ...original, ...change } as any);
    await expect(f.billing.checkout(user)).rejects.toThrow();
    expect(f.created).not.toHaveBeenCalled();
  }
});
it("grants only paid current subscriptions and deduplicates signed invoice notifications", async () => {
  const f = await fixture();
  f.subscriptions.mockImplementation(() => list([subscription()]));
  await f.webhook("invoice.paid");
  expect(f.store.accounts.get(user)?.paidUntil?.getTime()).toBeGreaterThan(
    Date.now(),
  );
  await f.webhook("invoice.paid");
  expect(f.subscriptions).toHaveBeenCalledTimes(1);
});
it.each(["past_due", "unpaid", "canceled", "paused", "incomplete", "trialing"])(
  "revokes paid allowance for current %s state even if an old event says paid",
  async (status) => {
    const f = await fixture();
    f.subscriptions.mockImplementation(() => list([subscription()]));
    await f.webhook("invoice.paid");
    f.subscriptions.mockImplementation(() => list([subscription({ status })]));
    await f.webhook("invoice.payment_failed", "evt_later", {
      customer,
      status: "active",
    });
    expect(f.store.accounts.get(user)?.paidUntil).toBeNull();
  },
);
it("retains access for cancel-at-period-end and protects a newer purchase from an old deletion", async () => {
  const f = await fixture();
  const current = subscription({ cancel_at_period_end: true });
  f.subscriptions.mockImplementation(() =>
    list([subscription({ id: "sub_old", status: "canceled" }), current]),
  );
  await f.webhook("customer.subscription.deleted", "evt_old", {
    customer,
    id: "sub_old",
  });
  expect(f.store.accounts.get(user)).toMatchObject({
    subscription: "sub_current",
  });
  expect(f.store.accounts.get(user)?.paidUntil).toEqual(
    new Date(current.items.data[0].current_period_end * 1000),
  );
});
it("does not grant access for unpaid invoices, wrong prices, or metadata pointing at another user", async () => {
  for (const change of [
    { latest_invoice: { status: "open" } },
    { items: { data: [{ price: { id: "price_other" } }] } },
    { metadata: { outclass_user: "another-user" } },
    { pause_collection: { behavior: "void" } },
  ]) {
    const f = await fixture();
    f.subscriptions.mockImplementation(() => list([subscription(change)]));
    await f.webhook("invoice.paid");
    expect(f.store.accounts.get(user)?.paidUntil).toBeNull();
  }
});
it("ignores unrelated customers and live events without creating accounts from metadata", async () => {
  const f = await fixture();
  await f.webhook("invoice.paid", "evt_other", {
    customer: "cus_other",
    metadata: { outclass_user: user },
  });
  await f.webhook("invoice.paid", "evt_live", { customer }, true);
  expect(f.subscriptions).not.toHaveBeenCalled();
  expect(f.store.events.size).toBe(0);
});
it("rejects tampered raw payloads and leaves failed processing retryable", async () => {
  const f = await fixture();
  const original = JSON.stringify({ id: "evt_tamper", type: "invoice.paid" });
  const signature = f.stripe.webhooks.generateTestHeaderString({
    payload: original,
    secret,
  });
  await expect(
    f.billing.webhook(Buffer.from(original + " "), signature),
  ).rejects.toBeInstanceOf(InvalidBillingSignature);
  f.subscriptions.mockImplementationOnce(() => {
    throw Error("API temporarily unavailable");
  });
  await expect(f.webhook("invoice.paid")).rejects.toThrow();
  expect(f.store.events.size).toBe(0);
  f.subscriptions.mockImplementation(() => list([subscription()]));
  await f.webhook("invoice.paid");
  expect(f.store.events.size).toBe(1);
});
