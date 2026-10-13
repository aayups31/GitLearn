import express from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { Pool } from "pg";
import Stripe from "stripe";
import {
  hostedRequest,
  teacherAnswer,
  architectAnswer,
  checkpointAnswer,
  teacherInstructions,
  architectInstructions,
  checkpointInstructions,
  type AIUsage,
} from "../../src/ai-contract.js";

export interface Allowances {
  reserve(user: string, requestId: string): Promise<boolean>;
  refund(user: string, requestId: string): Promise<void>;
  usage(user: string): Promise<AIUsage>;
}
export class PostgresAllowances implements Allowances {
  constructor(
    readonly pool: Pool,
    readonly freeLimit = 20,
    readonly paidLimit = 600,
    readonly globalLimit = 10000,
  ) {}
  async migrate() {
    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS outclass_service;
      CREATE TABLE IF NOT EXISTS outclass_service.accounts(user_id uuid PRIMARY KEY, customer text UNIQUE, subscription text, paid_until timestamptz);
      CREATE TABLE IF NOT EXISTS outclass_service.usage(user_id uuid NOT NULL, period text NOT NULL, used integer NOT NULL DEFAULT 0 CHECK(used>=0), PRIMARY KEY(user_id,period));
      CREATE TABLE IF NOT EXISTS outclass_service.requests(id uuid PRIMARY KEY, user_id uuid NOT NULL, period text NOT NULL, refunded boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS outclass_service.webhooks(id text PRIMARY KEY, received_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS outclass_service.budget(period text PRIMARY KEY,used integer NOT NULL DEFAULT 0 CHECK(used>=0));
      REVOKE ALL ON SCHEMA outclass_service FROM PUBLIC;`);
  }
  private period() {
    return new Date().toISOString().slice(0, 7);
  }
  async usage(user: string): Promise<AIUsage> {
    const period = this.period();
    const { rows } = await this.pool.query(
      `SELECT COALESCE(u.used,0) AS used, COALESCE(a.paid_until>now(),false) AS paid FROM (SELECT $1::uuid AS id) x LEFT JOIN outclass_service.accounts a ON a.user_id=x.id LEFT JOIN outclass_service.usage u ON u.user_id=x.id AND u.period=$2`,
      [user, period],
    );
    const limit = rows[0].paid ? this.paidLimit : this.freeLimit;
    return {
      used: rows[0].used,
      limit,
      remaining: Math.max(0, limit - rows[0].used),
      period,
      plan: rows[0].paid ? "paid" : "free",
    };
  }
  async reserve(user: string, requestId: string) {
    const connection = await this.pool.connect();
    try {
      await connection.query("BEGIN");
      const period = this.period();
      const budget = await connection.query(
        `INSERT INTO outclass_service.budget(period,used) SELECT $1,1 WHERE $2>0 ON CONFLICT(period) DO UPDATE SET used=outclass_service.budget.used+1 WHERE outclass_service.budget.used<$2 RETURNING used`,
        [period, this.globalLimit],
      );
      if (!budget.rowCount) {
        await connection.query("ROLLBACK");
        return false;
      }
      const { rows } = await connection.query(
        `SELECT COALESCE(paid_until>now(),false) AS paid FROM outclass_service.accounts WHERE user_id=$1`,
        [user],
      );
      const limit = rows[0]?.paid ? this.paidLimit : this.freeLimit;
      // INSERT/UPDATE locks one account-month row. Concurrent requests cannot overspend.
      const result = await connection.query(
        `INSERT INTO outclass_service.usage(user_id,period,used) SELECT $1,$2,1 WHERE $3>0 ON CONFLICT(user_id,period) DO UPDATE SET used=outclass_service.usage.used+1 WHERE outclass_service.usage.used<$3 RETURNING used`,
        [user, period, limit],
      );
      if (!result.rowCount) {
        await connection.query("ROLLBACK");
        return false;
      }
      await connection.query(
        "INSERT INTO outclass_service.requests(id,user_id,period) VALUES($1,$2,$3)",
        [requestId, user, period],
      );
      await connection.query("COMMIT");
      return true;
    } catch (e) {
      await connection.query("ROLLBACK");
      throw e;
    } finally {
      connection.release();
    }
  }
  async refund(user: string, id: string) {
    await this.pool.query(
      `WITH refunded AS (UPDATE outclass_service.requests SET refunded=true WHERE id=$1 AND user_id=$2 AND NOT refunded RETURNING user_id,period) UPDATE outclass_service.usage u SET used=GREATEST(0,used-1) FROM refunded r WHERE u.user_id=r.user_id AND u.period=r.period`,
      [id, user],
    );
  }
}
export type GatewayConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  openaiKey: string;
  model: string;
  stripeKey?: string;
  stripeWebhookSecret?: string;
  stripePrice?: string;
  publicUrl: string;
  freeLimit: number;
  paidLimit: number;
  port: number;
};
export type GatewayDependencies = {
  allowance: Allowances;
  authenticate: (token: string) => Promise<string>;
  answer: (request: z.infer<typeof hostedRequest>) => Promise<unknown>;
  auth: (route: string, body: unknown) => Promise<unknown>;
  checkout?: (user: string) => Promise<string>;
  webhook?: (body: Buffer, signature: string) => Promise<void>;
};
export function createGateway(deps: GatewayDependencies) {
  const app = express();
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });
  if (deps.webhook)
    app.post(
      "/v1/stripe/webhook",
      express.raw({ type: "application/json", limit: "256kb" }),
      async (req, res) => {
        try {
          await deps.webhook!(
            req.body,
            String(req.headers["stripe-signature"] || ""),
          );
          res.json({ ok: true });
        } catch {
          res.status(400).json({ error: "Webhook was not accepted." });
        }
      },
    );
  app.use(express.json({ limit: "128kb" }));
  const limits = new Map<string, { count: number; at: number }>(),
    active = new Set<string>();
  function limited(key: string, max: number) {
    const now = Date.now();
    if (limits.size > 10000)
      for (const [k, v] of limits) if (now - v.at > 60000) limits.delete(k);
    const old = limits.get(key),
      entry = old && now - old.at < 60000 ? old : { count: 0, at: now };
    entry.count++;
    limits.set(key, entry);
    return entry.count > max;
  }
  app.get("/health", (_req, res) =>
    res.json({ ok: true, name: "OutClass included AI" }),
  );
  app.post("/v1/auth/:action", async (req, res) => {
    if (limited(`auth:${req.ip}`, 6)) {
      res.status(429).json({
        error: "Wait a minute before requesting another sign-in code.",
      });
      return;
    }
    try {
      let route: string, body: unknown;
      if (req.params.action === "email") {
        const { email } = z
          .object({ email: z.string().email().max(254) })
          .parse(req.body);
        route = "otp";
        body = { email, create_user: true };
      } else if (req.params.action === "verify") {
        const { email, code } = z
          .object({
            email: z.string().email().max(254),
            code: z.string().regex(/^\d{6,8}$/),
          })
          .parse(req.body);
        route = "verify";
        body = { email, token: code, type: "email" };
      } else if (req.params.action === "refresh") {
        const { refreshToken } = z
          .object({ refreshToken: z.string().min(1).max(12000) })
          .parse(req.body);
        route = "token?grant_type=refresh_token";
        body = { refresh_token: refreshToken };
      } else {
        res.status(404).json({ error: "Unknown account operation." });
        return;
      }
      res.json(await deps.auth(route, body));
    } catch {
      res.status(400).json({
        error:
          "Sign-in could not be completed. Check the code or request another email.",
      });
    }
  });
  app.use("/v1", async (req, res, next) => {
    try {
      const token = /^Bearer (\S+)$/.exec(req.headers.authorization || "")?.[1];
      if (!token || token.length > 12000) throw new Error();
      const user = z
        .string()
        .uuid()
        .parse(await deps.authenticate(token));
      res.locals.user = user;
      if (limited(`user:${user}`, 12)) {
        res
          .status(429)
          .json({ error: "Please wait before sending another AI request." });
        return;
      }
      next();
    } catch {
      res.status(401).json({ error: "Sign in again to use included AI." });
    }
  });
  app.get("/v1/usage", async (_req, res, next) => {
    try {
      res.json(await deps.allowance.usage(res.locals.user));
    } catch (e) {
      next(e);
    }
  });
  app.post("/v1/checkout", async (_req, res, next) => {
    try {
      if (!deps.checkout) {
        res
          .status(503)
          .json({ error: "Subscriptions have not been configured yet." });
        return;
      }
      res.json({ url: await deps.checkout(res.locals.user) });
    } catch (e) {
      next(e);
    }
  });
  app.post("/v1/answer", async (req, res, next) => {
    const user = res.locals.user as string,
      id = randomUUID();
    let reserved = false;
    try {
      const input = hostedRequest.parse(req.body);
      if (active.has(user) || active.size >= 50) {
        res
          .status(429)
          .json({ error: "Another answer is in progress. Please wait." });
        return;
      }
      active.add(user);
      try {
        reserved = await deps.allowance.reserve(user, id);
        if (!reserved) {
          const available = await deps.allowance.usage(user);
          if (available.remaining > 0) {
            res
              .status(503)
              .json({
                error:
                  "Included AI is at service capacity right now. Your allowance was not charged. Retry later or use a personal key/local model.",
              });
            return;
          }
          res.status(402).json({
            error:
              "Your included AI allowance is used up. Upgrade, wait for its monthly reset, or use a personal key/local model.",
          });
          return;
        }
        const answer = (
          input.task === "teacher"
            ? teacherAnswer
            : input.task === "checkpoint"
              ? checkpointAnswer
              : architectAnswer
        ).parse(await deps.answer(input));
        res.json({ answer, usage: await deps.allowance.usage(user) });
      } finally {
        active.delete(user);
      }
    } catch (e) {
      if (reserved) await deps.allowance.refund(user, id).catch(() => {});
      if (e instanceof z.ZodError)
        res.status(400).json({ error: "This learning request was not valid." });
      else next(e);
    }
  });
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res
        .status(
          (error as { type?: string })?.type === "entity.too.large" ? 413 : 503,
        )
        .json({
          error:
            "The AI service is unavailable. Please retry shortly. Your local work is safe.",
        });
    },
  );
  return app;
}
export function productionDependencies(
  config: GatewayConfig,
  allowance: PostgresAllowances,
): GatewayDependencies {
  const supabase = new URL(config.supabaseUrl);
  if (supabase.protocol !== "https:" || supabase.username || supabase.password)
    throw new Error("SUPABASE_URL must use HTTPS.");
  const authFetch = async (route: string, body?: unknown, token?: string) => {
    const response = await fetch(`${supabase.origin}/auth/v1/${route}`, {
      method: body === undefined ? "GET" : "POST",
      redirect: "error",
      headers: {
        apikey: config.supabaseAnonKey,
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error("Account request failed.");
    return response.json();
  };
  const client = new OpenAI({
    apiKey: config.openaiKey,
    timeout: 30000,
    maxRetries: 0,
  });
  const stripe = config.stripeKey ? new Stripe(config.stripeKey) : undefined;
  return {
    allowance,
    authenticate: async (token) =>
      (await authFetch("user", undefined, token)).id,
    auth: async (route, body) => {
      const result = await authFetch(route, body);
      if (route === "otp") return { sent: true };
      return {
        access_token: result.access_token,
        refresh_token: result.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + result.expires_in,
        email: result.user.email,
      };
    },
    answer: async ({ task, context, history }) => {
      const schema =
        task === "teacher"
          ? teacherAnswer
          : task === "checkpoint"
            ? checkpointAnswer
            : architectAnswer;
      const response = await client.responses.parse({
        model: config.model,
        store: false,
        max_output_tokens: task === "checkpoint" ? 250 : 1800,
        instructions:
          task === "teacher"
            ? teacherInstructions
            : task === "checkpoint"
              ? checkpointInstructions
              : architectInstructions,
        input: [...history, { role: "user", content: context }],
        text: { format: zodTextFormat(schema, "outclass_answer") },
      });
      return response.output_parsed;
    },
    checkout:
      stripe && config.stripePrice
        ? async (user) => {
            const saved = await allowance.pool.query(
              "SELECT customer,paid_until>now() AS paid FROM outclass_service.accounts WHERE user_id=$1",
              [user],
            );
            const customer =
              saved.rows[0]?.customer ||
              (
                await stripe.customers.create(
                  { metadata: { outclass_user: user } },
                  { idempotencyKey: `outclass-customer-${user}` },
                )
              ).id;
            await allowance.pool.query(
              "INSERT INTO outclass_service.accounts(user_id,customer) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET customer=excluded.customer",
              [user, customer],
            );
            if (saved.rows[0]?.paid)
              return (
                await stripe.billingPortal.sessions.create({
                  customer,
                  return_url: `${config.publicUrl}/billing/return`,
                })
              ).url;
            const s = await stripe.checkout.sessions.create({
              mode: "subscription",
              customer,
              line_items: [{ price: config.stripePrice!, quantity: 1 }],
              subscription_data: { metadata: { outclass_user: user } },
              success_url: `${config.publicUrl}/billing/success`,
              cancel_url: `${config.publicUrl}/billing/cancel`,
            });
            return s.url!;
          }
        : undefined,
    webhook:
      stripe && config.stripeWebhookSecret
        ? async (body, signature) => {
            const event = stripe.webhooks.constructEvent(
              body,
              signature,
              config.stripeWebhookSecret!,
            );
            if (
              ![
                "customer.subscription.created",
                "customer.subscription.updated",
                "customer.subscription.deleted",
              ].includes(event.type)
            )
              return;
            const exists = await allowance.pool.query(
              "SELECT 1 FROM outclass_service.webhooks WHERE id=$1",
              [event.id],
            );
            if (exists.rowCount) return;
            // Fetch current subscription rather than trusting out-of-order event payloads.
            const current = await stripe.subscriptions.retrieve(
              (event.data.object as Stripe.Subscription).id,
            );
            const user = z
              .string()
              .uuid()
              .parse(current.metadata.outclass_user);
            const item = current.items.data.find(
              (i) => i.price.id === config.stripePrice,
            );
            const paidUntil =
              item && ["active", "trialing"].includes(current.status)
                ? new Date(item.current_period_end * 1000)
                : null;
            const customer =
              typeof current.customer === "string"
                ? current.customer
                : current.customer.id;
            await allowance.pool.query(
              "INSERT INTO outclass_service.accounts(user_id,customer,subscription,paid_until) VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET customer=excluded.customer,subscription=excluded.subscription,paid_until=excluded.paid_until",
              [user, customer, current.id, paidUntil],
            );
            await allowance.pool.query(
              "INSERT INTO outclass_service.webhooks(id) VALUES($1) ON CONFLICT DO NOTHING",
              [event.id],
            );
          }
        : undefined,
  };
}
