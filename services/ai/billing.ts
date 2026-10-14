import { createHash, randomUUID } from "node:crypto";
import type { Pool } from "pg";
import Stripe from "stripe";

export class InvalidBillingSignature extends Error {}
export type BillingAccount = {
  user: string;
  customer: string | null;
  subscription: string | null;
  paidUntil: Date | null;
  checkoutKey: string | null;
  checkoutExpires: Date | null;
  checkoutSession: string | null;
};
export interface BillingSession {
  account: BillingAccount;
  save(change: Partial<BillingAccount>): Promise<void>;
  seen(event: string): Promise<boolean>;
  apply(
    event: string,
    subscription: string | null,
    paidUntil: Date | null,
  ): Promise<void>;
}
export interface BillingStore {
  userForCustomer(customer: string): Promise<string | undefined>;
  withAccount<T>(
    user: string,
    action: (session: BillingSession) => Promise<T>,
  ): Promise<T>;
}

export class PostgresBillingStore implements BillingStore {
  constructor(private readonly pool: Pool) {}
  async userForCustomer(customer: string) {
    const { rows } = await this.pool.query(
      "SELECT user_id FROM outclass_service.accounts WHERE customer=$1",
      [customer],
    );
    return rows[0]?.user_id as string | undefined;
  }
  async withAccount<T>(
    user: string,
    action: (session: BillingSession) => Promise<T>,
  ) {
    const db = await this.pool.connect();
    let locked = false,
      discard = false;
    try {
      // Session lock spans durable writes and Stripe calls, across service replicas.
      await db.query("SELECT pg_advisory_lock(hashtextextended($1,0))", [
        `outclass-billing:${user}`,
      ]);
      locked = true;
      await db.query(
        "INSERT INTO outclass_service.accounts(user_id) VALUES($1) ON CONFLICT DO NOTHING",
        [user],
      );
      const { rows } = await db.query(
        "SELECT * FROM outclass_service.accounts WHERE user_id=$1",
        [user],
      );
      const row = rows[0];
      const account: BillingAccount = {
        user,
        customer: row.customer,
        subscription: row.subscription,
        paidUntil: row.paid_until,
        checkoutKey: row.checkout_key,
        checkoutExpires: row.checkout_expires_at,
        checkoutSession: row.checkout_session,
      };
      const session: BillingSession = {
        account,
        save: async (change) => {
          const next = { ...account, ...change, user };
          await db.query(
            `UPDATE outclass_service.accounts SET customer=$2,subscription=$3,paid_until=$4,checkout_key=$5,checkout_expires_at=$6,checkout_session=$7 WHERE user_id=$1`,
            [
              user,
              next.customer,
              next.subscription,
              next.paidUntil,
              next.checkoutKey,
              next.checkoutExpires,
              next.checkoutSession,
            ],
          );
          Object.assign(account, next);
        },
        seen: async (id) =>
          Boolean(
            (
              await db.query(
                "SELECT 1 FROM outclass_service.webhooks WHERE id=$1",
                [id],
              )
            ).rowCount,
          ),
        apply: async (id, subscription, paidUntil) => {
          await db.query("BEGIN");
          try {
            const added = await db.query(
              "INSERT INTO outclass_service.webhooks(id) VALUES($1) ON CONFLICT DO NOTHING RETURNING id",
              [id],
            );
            if (added.rowCount)
              await db.query(
                "UPDATE outclass_service.accounts SET subscription=$2,paid_until=$3 WHERE user_id=$1",
                [user, subscription, paidUntil],
              );
            await db.query("COMMIT");
            if (added.rowCount)
              Object.assign(account, { subscription, paidUntil });
          } catch (error) {
            await db.query("ROLLBACK").catch(() => {
              discard = true;
            });
            throw error;
          }
        },
      };
      return await action(session);
    } finally {
      if (locked) {
        try {
          await db.query("SELECT pg_advisory_unlock(hashtextextended($1,0))", [
            `outclass-billing:${user}`,
          ]);
        } catch {
          discard = true;
        }
      }
      db.release(discard);
    }
  }
}

export const billingEvents = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "invoice.finalization_failed",
] as const;

export type BillingConfig = {
  price: string;
  webhookSecret: string;
  publicUrl: string;
  live: boolean;
  portalConfiguration?: string;
  automaticTax?: boolean;
};
const idOf = (value: string | { id: string } | null) =>
  typeof value === "string" ? value : value?.id;
const terminal = (s: Stripe.Subscription) =>
  ["canceled", "incomplete_expired"].includes(s.status);

export class StripeBilling {
  private planCache?: {
    until: number;
    value: {
      amount: number;
      currency: string;
      interval: "month";
      mode: "test" | "live";
    };
  };
  private readonly origin: string;
  constructor(
    private readonly stripe: Stripe,
    private readonly store: BillingStore,
    private readonly config: BillingConfig,
  ) {
    const url = new URL(config.publicUrl);
    if (url.username || url.password || url.protocol !== "https:")
      throw Error("Billing return URL must use HTTPS.");
    this.origin = url.origin;
  }
  private async price() {
    const price = await this.stripe.prices.retrieve(this.config.price);
    if (
      !price.active ||
      price.livemode !== this.config.live ||
      price.type !== "recurring" ||
      price.recurring?.interval !== "month" ||
      price.recurring.interval_count !== 1 ||
      price.recurring.usage_type !== "licensed" ||
      !price.unit_amount ||
      price.unit_amount <= 0
    )
      throw Error(
        "Configure an active monthly fixed price in the matching Stripe environment.",
      );
    return price;
  }
  async publicPlan() {
    if (this.planCache && this.planCache.until > Date.now())
      return this.planCache.value;
    const price = await this.price();
    const value = {
      amount: price.unit_amount!,
      currency: price.currency,
      interval: "month" as const,
      mode: price.livemode ? ("live" as const) : ("test" as const),
    };
    this.planCache = { until: Date.now() + 60000, value };
    return value;
  }
  private async subscriptions(customer: string, user: string) {
    const found: Stripe.Subscription[] = [];
    for await (const s of this.stripe.subscriptions.list({
      customer,
      status: "all",
      limit: 100,
      expand: ["data.latest_invoice"],
    })) {
      if (
        idOf(s.customer) === customer &&
        s.livemode === this.config.live &&
        s.metadata.outclass_user === user &&
        s.items.data.some((i) => i.price.id === this.config.price)
      )
        found.push(s);
    }
    return found;
  }
  private async portal(customer: string) {
    return (
      await this.stripe.billingPortal.sessions.create({
        customer,
        configuration: this.config.portalConfiguration,
        return_url: `${this.origin}/billing/return`,
      })
    ).url;
  }
  async checkout(user: string) {
    await this.price();
    return this.store.withAccount(user, async (session) => {
      const a = session.account;
      if (!a.customer) {
        const c = await this.stripe.customers.create(
          { metadata: { outclass_user: user, outclass_app: "OutClass" } },
          { idempotencyKey: `outclass-customer-${user}` },
        );
        await session.save({ customer: c.id });
      }
      const customer = a.customer!;
      // Past-due and incomplete subscriptions need recovery, rather than a second purchase.
      if ((await this.subscriptions(customer, user)).some((s) => !terminal(s)))
        return this.portal(customer);
      for await (const open of this.stripe.checkout.sessions.list({
        customer,
        status: "open",
        limit: 100,
      })) {
        if (
          open.client_reference_id !== user ||
          open.metadata?.outclass_app !== "OutClass"
        )
          continue;
        if (open.metadata.outclass_price !== this.config.price) {
          await this.stripe.checkout.sessions.expire(open.id);
          continue;
        }
        if (open.url && open.expires_at > Date.now() / 1000) {
          await session.save({ checkoutSession: open.id });
          return open.url;
        }
      }
      // Persist the attempt BEFORE the API call. Timeouts/restarts reuse identical parameters.
      if (
        !a.checkoutKey ||
        !a.checkoutExpires ||
        a.checkoutExpires.getTime() < Date.now() + 30 * 60 * 1000
      ) {
        await session.save({
          checkoutKey: randomUUID(),
          checkoutExpires: new Date(
            Math.floor(Date.now() / 1000) * 1000 + 60 * 60 * 1000,
          ),
          checkoutSession: null,
        });
      }
      const parameters: Stripe.Checkout.SessionCreateParams = {
        mode: "subscription",
        customer,
        client_reference_id: user,
        metadata: {
          outclass_app: "OutClass",
          outclass_price: this.config.price,
        },
        line_items: [{ price: this.config.price, quantity: 1 }],
        subscription_data: {
          metadata: { outclass_user: user, outclass_app: "OutClass" },
          billing_mode: { type: "flexible" },
        },
        expires_at: Math.floor(a.checkoutExpires!.getTime() / 1000),
        automatic_tax: { enabled: this.config.automaticTax ?? false },
        ...(this.config.automaticTax
          ? {
              billing_address_collection: "required" as const,
              customer_update: { address: "auto" as const },
            }
          : {}),
        success_url: `${this.origin}/billing/success`,
        cancel_url: `${this.origin}/billing/cancel`,
      };
      const fingerprint = createHash("sha256")
        .update(JSON.stringify(parameters))
        .digest("hex");
      const checkout = await this.stripe.checkout.sessions.create(parameters, {
        idempotencyKey: `outclass-checkout-${a.checkoutKey}-${fingerprint}`,
      });
      if (!checkout.url)
        throw Error("Stripe did not return a hosted checkout.");
      await session.save({ checkoutSession: checkout.id });
      return checkout.url;
    });
  }
  async webhook(body: Buffer, signature: string) {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        this.config.webhookSecret,
      );
    } catch {
      throw new InvalidBillingSignature("Invalid Stripe signature.");
    }
    if (
      event.livemode !== this.config.live ||
      !billingEvents.some((type) => type === event.type)
    )
      return;
    const customer = idOf(
      (event.data.object as { customer: string | { id: string } | null })
        .customer,
    );
    if (!customer) return;
    const user = await this.store.userForCustomer(customer);
    if (!user) return; // Other products/customers in this Stripe account are outside OutClass.
    await this.store.withAccount(user, async (session) => {
      if (
        session.account.customer !== customer ||
        (await session.seen(event.id))
      )
        return;
      // Read Stripe NOW under the account lock. Old events and old subscriptions cannot revoke a newer purchase.
      const current = await this.subscriptions(customer, user);
      let paidUntil: Date | null = null,
        subscription: string | null = null;
      for (const s of current) {
        const invoice =
          typeof s.latest_invoice === "object" ? s.latest_invoice : null;
        if (
          s.status !== "active" ||
          s.pause_collection ||
          invoice?.status !== "paid"
        )
          continue;
        const end = s.items.data.find(
          (i) => i.price.id === this.config.price,
        )?.current_period_end;
        if (
          end &&
          Number.isFinite(end) &&
          end * 1000 > Date.now() &&
          (!paidUntil || end * 1000 > paidUntil.getTime())
        ) {
          paidUntil = new Date(end * 1000);
          subscription = s.id;
        }
      }
      subscription ||=
        current
          .filter((s) => !terminal(s))
          .sort((a, b) => b.created - a.created)[0]?.id ?? null;
      await session.apply(event.id, subscription, paidUntil);
    });
  }
}
