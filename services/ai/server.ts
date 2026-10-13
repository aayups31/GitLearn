import { Pool } from "pg";
import { z } from "zod";
import {
  PostgresAllowances,
  productionDependencies,
  createGateway,
} from "./gateway.js";
const input = z
  .object({
    SUPABASE_URL: z.string().url(),
    SUPABASE_ANON_KEY: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    OPENAI_API_KEY: z.string().min(1),
    OUTCLASS_PUBLIC_URL: z.string().url(),
    OPENAI_CHAT_MODEL: z.string().default("gpt-4o-mini"),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_PRICE_ID: z.string().optional(),
    OUTCLASS_FREE_ALLOWANCE: z.coerce.number().int().min(0).default(20),
    OUTCLASS_PAID_ALLOWANCE: z.coerce.number().int().min(1).default(600),
    OUTCLASS_GLOBAL_ALLOWANCE: z.coerce.number().int().min(0).default(10000),
    PORT: z.coerce.number().default(8080),
  })
  .safeParse(process.env);
if (!input.success) {
  console.error(
    "Configure the AI service environment before starting. Missing or invalid setting names:",
    input.error.issues.map((i) => i.path.join(".")).join(", "),
  );
  process.exit(1);
}
const env = input.data,
  pool = new Pool({ connectionString: env.DATABASE_URL, max: 10 });
const allowance = new PostgresAllowances(
  pool,
  env.OUTCLASS_FREE_ALLOWANCE,
  env.OUTCLASS_PAID_ALLOWANCE,
  env.OUTCLASS_GLOBAL_ALLOWANCE,
);
await allowance.migrate();
const app = createGateway(
  productionDependencies(
    {
      supabaseUrl: env.SUPABASE_URL,
      supabaseAnonKey: env.SUPABASE_ANON_KEY,
      openaiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_CHAT_MODEL,
      publicUrl: env.OUTCLASS_PUBLIC_URL,
      stripeKey: env.STRIPE_SECRET_KEY,
      stripePrice: env.STRIPE_PRICE_ID,
      stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
      freeLimit: env.OUTCLASS_FREE_ALLOWANCE,
      paidLimit: env.OUTCLASS_PAID_ALLOWANCE,
      port: env.PORT,
    },
    allowance,
  ),
);
app.get("/billing/:result", (_req, res) =>
  res
    .type("html")
    .send(
      "<!doctype html><title>OutClass account</title><p>Return to OutClass and refresh your AI allowance. Subscription access updates after payment confirmation.</p>",
    ),
);
const server = app.listen(env.PORT, "0.0.0.0", () =>
  console.log("OutClass included AI service started."),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    server.close(() => void pool.end());
  });
