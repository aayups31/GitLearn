// Test-mode endpoint for the selected OutClass service. Secret stays local.
import { readFile, writeFile } from "node:fs/promises";
import { parse } from "dotenv";
import Stripe from "stripe";
import { billingEvents } from "../services/ai/billing";
const file = ".local/ai-service.env",
  env = parse(await readFile(file));
if (!env.STRIPE_SECRET_KEY?.startsWith("sk_test_"))
  throw Error("Test Stripe key required.");
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  timeout: 20000,
  maxNetworkRetries: 2,
});
try {
  const url = new URL("/v1/stripe/webhook", env.OUTCLASS_PUBLIC_URL).href;
  const known = JSON.parse(
    await readFile(".local/stripe-webhook.json", "utf8").catch(() => "null"),
  );
  let endpoint = known?.id
    ? await stripe.webhookEndpoints.retrieve(known.id)
    : undefined;
  if (
    endpoint &&
    (endpoint.url !== url ||
      endpoint.livemode ||
      endpoint.metadata.outclass_app !== "OutClass")
  )
    throw Error("Unexpected webhook configuration.");
  if (!endpoint) {
    const existing = await stripe.webhookEndpoints.list({ limit: 100 });
    if (
      existing.data.some(
        (e) => e.url === url && e.metadata.outclass_app === "OutClass",
      )
    )
      throw Error("Existing signing secret must be recovered before setup.");
    endpoint = await stripe.webhookEndpoints.create(
      {
        url,
        enabled_events: [...billingEvents],
        api_version: Stripe.API_VERSION,
        description: "OutClass included AI · test",
        metadata: { outclass_app: "OutClass" },
      },
      { idempotencyKey: "outclass-service-webhook-test-v1" },
    );
    await writeFile(
      ".local/stripe-webhook.json",
      JSON.stringify(
        { id: endpoint.id, url, secret: endpoint.secret },
        null,
        2,
      ),
    );
  }
  const secret = endpoint.secret || known?.secret;
  if (!secret?.startsWith("whsec_")) throw Error("Signing secret is missing.");
  env.STRIPE_WEBHOOK_SECRET = secret;
  await writeFile(
    file,
    Object.entries(env)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join("\n") + "\n",
  );
  console.log(
    JSON.stringify({
      testEndpointConfigured: true,
      endpointID: endpoint.id,
      events: billingEvents.length,
      secretsPrinted: false,
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      error: "Stripe webhook setup failed",
      category: (error as { type?: string }).type || "configuration",
    }),
  );
  process.exitCode = 1;
}
