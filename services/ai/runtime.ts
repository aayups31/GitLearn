import { Pool } from "pg";
import { serviceConfig } from "./config.js";
import { verifySchema } from "./schema.js";
import {
  PostgresAllowances,
  createGateway,
  productionDependencies,
} from "./gateway.js";

export async function createRuntime(
  source: Record<string, string | undefined> = process.env,
) {
  const { config, pool: options, globalLimit } = serviceConfig(source);
  const pool = new Pool(options);
  pool.on("error", () =>
    console.error("OutClass database pool connection failed."),
  );
  try {
    await verifySchema(pool);
    const allowance = new PostgresAllowances(
      pool,
      config.freeLimit,
      config.paidLimit,
      globalLimit,
    );
    const app = createGateway(productionDependencies(config, allowance));
    app.get("/ready", async (_req, res) => {
      try {
        await pool.query("SELECT 1");
        res.json({ ok: true, name: "OutClass included AI" });
      } catch {
        res.status(503).json({
          ok: false,
          error: "Account service is temporarily unavailable.",
        });
      }
    });
    app.get("/billing/:result", (req, res, next) => {
      const state = req.params.result;
      if (state === "style.css") {
        next();
        return;
      }
      if (!["return", "cancel", "success"].includes(state)) {
        res.status(404).end();
        return;
      }
      const title =
        state === "success"
          ? "Your next chapter is right here."
          : state === "cancel"
            ? "Back to building."
            : "Your account, in one place.";
      const description =
        state === "success"
          ? "Stripe has returned you to OutClass. Your allowance updates after the signed payment confirmation arrives."
          : state === "cancel"
            ? "You left checkout. Review your current plan whenever you’re ready, or keep learning with your existing connection."
            : "Review your subscription and included AI allowance in your account.";
      res
        .type("html")
        .send(
          `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>OutClass · Account</title><link rel="icon" href="/assets/orbital-logo.webp"><link rel="stylesheet" href="/billing/style.css"><script src="/assets/billing-return.js" defer></script></head><body><main class="billing-result wrap" data-billing-result="${state}"><a class="wordmark" href="/"><img class="brand-orbit" src="/assets/orbital-logo.webp" width="54" height="36" alt="">OutClass</a><div class="billing-result-mark" aria-hidden="true">↗</div><h1>${title}</h1><p>${description}</p><p class="billing-result-status" role="status" id="billing-result-status">Open your account to see the latest subscription state.</p><div class="hero-actions"><a class="button primary" href="/account">Open your account <span aria-hidden="true">↗</span></a><a class="text-link" href="/download">Back to the desktop app <span aria-hidden="true">↗</span></a></div><p class="account-fineprint">In the app, choose <strong>Refresh allowance</strong> in AI settings after payment confirmation. Your browser and desktop sign-ins are separate.</p></main></body></html>`,
        );
    });
    app.get("/billing/style.css", (_req, res) =>
      res
        .type("css")
        .send(
          `@import url("/assets/site.css");@import url("/assets/refinement.css");:root{color-scheme:dark}`,
        ),
    );
    return { app, pool, allowance, config };
  } catch (error) {
    await pool.end();
    throw error;
  }
}
