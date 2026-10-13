import { z } from "zod";
import type { PoolConfig } from "pg";
import type { GatewayConfig } from "./gateway.js";

const optional = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.string().min(1).optional(),
);
const settings = z
  .object({
    SUPABASE_URL: z.url(),
    SUPABASE_PUBLISHABLE_KEY: optional,
    SUPABASE_ANON_KEY: optional,
    DATABASE_URL: z.string().min(1),
    DATABASE_CA_CERT: optional,
    OPENAI_API_KEY: z.string().min(1),
    OPENAI_CHAT_MODEL: z.string().default("gpt-4o-mini"),
    OUTCLASS_PUBLIC_URL: z.url(),
    STRIPE_SECRET_KEY: optional,
    STRIPE_PRICE_ID: optional,
    STRIPE_WEBHOOK_SECRET: optional,
    STRIPE_PORTAL_CONFIGURATION_ID: optional,
    STRIPE_AUTOMATIC_TAX: z.enum(["true", "false"]).default("false"),
    OUTCLASS_FREE_ALLOWANCE: z.coerce.number().int().min(0).default(20),
    OUTCLASS_PAID_ALLOWANCE: z.coerce.number().int().positive().default(600),
    OUTCLASS_GLOBAL_ALLOWANCE: z.coerce.number().int().min(0).default(10000),
    PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  })
  .refine((e) => Boolean(e.SUPABASE_PUBLISHABLE_KEY || e.SUPABASE_ANON_KEY), {
    path: ["SUPABASE_PUBLISHABLE_KEY"],
  });

export function serviceConfig(source: Record<string, string | undefined>) {
  const parsed = settings.safeParse(source);
  if (!parsed.success)
    throw Error(
      `Configure AI service settings: ${[...new Set(parsed.error.issues.map((i) => i.path.join(".")))].join(", ")}`,
    );
  const e = parsed.data;
  const config: GatewayConfig = {
    supabaseUrl: e.SUPABASE_URL,
    supabaseAnonKey: (e.SUPABASE_PUBLISHABLE_KEY || e.SUPABASE_ANON_KEY)!,
    openaiKey: e.OPENAI_API_KEY,
    model: e.OPENAI_CHAT_MODEL,
    publicUrl: e.OUTCLASS_PUBLIC_URL,
    stripeKey: e.STRIPE_SECRET_KEY,
    stripePrice: e.STRIPE_PRICE_ID,
    stripeWebhookSecret: e.STRIPE_WEBHOOK_SECRET,
    stripePortalConfiguration: e.STRIPE_PORTAL_CONFIGURATION_ID,
    stripeAutomaticTax: e.STRIPE_AUTOMATIC_TAX === "true",
    freeLimit: e.OUTCLASS_FREE_ALLOWANCE,
    paidLimit: e.OUTCLASS_PAID_ALLOWANCE,
    port: e.PORT,
  };
  const url = new URL(e.DATABASE_URL);
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw Error("DATABASE_URL must be PostgreSQL.");
  if (url.hostname.endsWith("pooler.supabase.com") && url.port === "6543")
    throw Error("Use a direct or session-pooled DATABASE_URL for billing.");
  // Preserve TLS verification, including when a connection URI contains sslmode=require.
  for (const key of ["sslmode", "sslrootcert", "sslcert", "sslkey"])
    url.searchParams.delete(key);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const pool: PoolConfig = {
    connectionString: url.href,
    max: 3,
    min: 0,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 10000,
    ssl: local
      ? false
      : {
          rejectUnauthorized: true,
          ...(e.DATABASE_CA_CERT
            ? { ca: e.DATABASE_CA_CERT.replace(/\\n/g, "\n") }
            : {}),
        },
  };
  return { config, pool, globalLimit: e.OUTCLASS_GLOBAL_ALLOWANCE };
}
