// Run: node --env-file=.local/stripe.env scripts/setup-stripe-test.mjs
// Test catalog only. Does not alter account branding, other products, or live data.
import Stripe from "stripe";
import { writeFile, mkdir } from "node:fs/promises";
const key = process.env.STRIPE_SECRET_KEY;
if (!key?.startsWith("sk_test_"))
  throw Error("A Stripe TEST secret key is required.");
const stripe = new Stripe(key, { timeout: 20000, maxNetworkRetries: 2 });
try {
  const productId = "outclass_plus_test";
  let product;
  try {
    product = await stripe.products.retrieve(productId);
  } catch (e) {
    if (e.statusCode !== 404) throw e;
    product = await stripe.products.create({
      id: productId,
      name: "OutClass Plus",
      description:
        "600 included AI responses per UTC calendar month. No automatic overage charges. Your local learning workspace stays free.",
      metadata: { outclass_app: "OutClass", environment: "test" },
    });
  }
  if (product.livemode || product.metadata.outclass_app !== "OutClass")
    throw Error("Unexpected product; no changes made.");
  const prices = await stripe.prices.list({
    lookup_keys: ["outclass_plus_cad_monthly_v1"],
    limit: 10,
  });
  const price =
    prices.data[0] ||
    (await stripe.prices.create({
      product: product.id,
      currency: "cad",
      unit_amount: 1200,
      recurring: { interval: "month" },
      lookup_key: "outclass_plus_cad_monthly_v1",
      tax_behavior: "exclusive",
      metadata: { outclass_app: "OutClass" },
    }));
  if (
    price.livemode ||
    !price.active ||
    price.currency !== "cad" ||
    price.unit_amount !== 1200 ||
    price.recurring?.interval !== "month" ||
    price.product !== product.id
  )
    throw Error("Unexpected test price; no changes made.");
  const portals = await stripe.billingPortal.configurations.list({
    limit: 100,
  });
  const portal =
    portals.data.find(
      (p) => !p.livemode && p.active && p.metadata?.outclass_app === "OutClass",
    ) ||
    (await stripe.billingPortal.configurations.create(
      {
        business_profile: {
          headline: "Manage your OutClass Plus subscription",
        },
        features: {
          invoice_history: { enabled: true },
          payment_method_update: { enabled: true },
          subscription_cancel: { enabled: true, mode: "at_period_end" },
          customer_update: {
            enabled: true,
            allowed_updates: ["email", "address"],
          },
        },
        metadata: { outclass_app: "OutClass" },
      },
      { idempotencyKey: "outclass-portal-test-v1" },
    ));
  await mkdir(".local", { recursive: true });
  await writeFile(
    ".local/stripe-catalog.json",
    JSON.stringify(
      {
        mode: "test",
        product: product.id,
        price: price.id,
        portal: portal.id,
        currency: price.currency,
        amount: price.unit_amount,
        interval: price.recurring.interval,
      },
      null,
      2,
    ),
  );
  await writeFile(
    ".local/stripe-catalog.env",
    `STRIPE_PRICE_ID=${price.id}\nSTRIPE_PORTAL_CONFIGURATION_ID=${portal.id}\nSTRIPE_AUTOMATIC_TAX=false\n`,
  );
  console.log(
    JSON.stringify(
      {
        mode: "test",
        product: product.id,
        price: price.id,
        portal: portal.id,
        amount: "CAD 12 / month",
        keysPrinted: false,
      },
      null,
      2,
    ),
  );
} catch (error) {
  // Stripe errors can include request details. Output only category and status.
  console.error(
    JSON.stringify({
      error: "Stripe test setup failed",
      type: error.type || "configuration",
      status: error.statusCode || null,
    }),
  );
  process.exitCode = 1;
}
