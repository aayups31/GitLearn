import type { IncomingMessage, ServerResponse } from "node:http";
import { attachDatabasePool } from "@vercel/functions";
import { createRuntime } from "../services/ai/runtime.js";

// Express owns body parsing, including the untouched Stripe webhook bytes.
export const config = { api: { bodyParser: false } };
let runtime: ReturnType<typeof createRuntime> | undefined;
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  try {
    runtime ||= createRuntime()
      .then((r) => {
        attachDatabasePool(r.pool);
        return r;
      })
      .catch((error) => {
        runtime = undefined;
        throw error;
      });
    (await runtime).app(req, res);
  } catch (error) {
    // Diagnostic identifiers only: database errors can contain connection credentials.
    const code = (error as { code?: unknown })?.code;
    const hostname = (error as { hostname?: unknown })?.hostname;
    console.error("OutClass service initialization failed", {
      code: typeof code === "string" && /^[A-Z0-9_]{1,60}$/.test(code) ? code : "INITIALIZATION",
      settings: error instanceof Error && error.message.startsWith("Configure AI service settings:")
        ? error.message.replace("Configure AI service settings: ", "").split(", ")
        : undefined,
      databaseHost: typeof hostname === "string" && /^[a-z0-9.-]+\.supabase\.(com|co)$/.test(hostname)
        ? hostname : undefined,
    });
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(
      JSON.stringify({
        error: "OutClass account service is not ready. Please retry shortly.",
      }),
    );
  }
}
