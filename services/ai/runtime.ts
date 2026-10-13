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
          ? "Your next step is back in OutClass."
          : state === "cancel"
            ? "Back to learning, whenever you’re ready."
            : "You’re ready to return to OutClass.";
      res
        .type("html")
        .send(
          `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OutClass · Account</title><link rel="stylesheet" href="/billing/style.css"><main><a class="brand" href="/">OutClass<span>↗</span></a><p class="eyebrow">YOUR LEARNING WORKSPACE</p><h1>${title}</h1><p>Return to the OutClass app and choose <strong>Refresh allowance</strong> in AI settings. Payment confirmation may take a few moments.</p><p class="note">Your local code, courses and learning progress stay with you.</p><a class="link" href="/">Explore OutClass <span>↗</span></a></main></html>`,
        );
    });
    app.get("/billing/style.css", (_req, res) =>
      res
        .type("css")
        .send(
          `:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#0b0d12;color:#f2f4fa;font-family:Inter,system-ui,sans-serif;line-height:1.65}main{max-width:800px;margin:0 auto;padding:72px 28px}.brand{color:inherit;font-size:28px;font-weight:650;letter-spacing:-1px;text-decoration:none;display:inline-flex;gap:9px}.brand span{color:#729aff}.eyebrow{color:#729aff;font-size:11px;letter-spacing:.17em;margin:100px 0 20px}h1{font-weight:530;letter-spacing:-.045em;font-size:clamp(34px,6vw,56px);line-height:1.1;max-width:650px;margin:0 0 28px}p{max-width:510px;color:#a7adb9;font-size:16px}strong{font-weight:500;color:#e1e5ee}.note{font-size:13px;margin-top:28px}.link{display:inline-flex;gap:22px;text-decoration:none;color:#a9c0ff;border-bottom:1px solid #303e65;padding:9px 0;margin-top:36px}.link:hover{color:white}.link:focus-visible,.brand:focus-visible{outline:2px solid #729aff;outline-offset:8px}@media(max-width:600px){main{padding-top:40px}.eyebrow{margin-top:72px}}`,
        ),
    );
    return { app, pool, allowance, config };
  } catch (error) {
    await pool.end();
    throw error;
  }
}
