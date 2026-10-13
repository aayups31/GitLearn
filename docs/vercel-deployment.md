# OutClass on Vercel

The landing page and optional included AI service share https://git-learn-black.vercel.app/. Project `git-learn` is connected to https://github.com/aayups31/OutClass and deploys `main`. The desktop editor, terminal, courses and retrieval continue to run on the learner's computer.

Committed `vercel.json` builds the static site with `node scripts/build-site.mjs` into `dist/site`, and installs server dependencies with `npm ci --include=dev --ignore-scripts`. Node 24 runs `api/ai.ts`; rewrites forward `/v1/*`, `/health`, `/ready` and `/billing/*` to that function. Express owns JSON parsing and the untouched Stripe webhook bytes. Static assets keep the existing restrictive CSP.

Only server environment settings hold the OpenAI service key, restricted database URI/CA, Supabase publishable key and Stripe key/price/portal/webhook secret. They are never injected into site JavaScript or downloads. `.vercelignore` excludes local credentials, generated output and development state. Do not deploy an administrative database credential or Supabase service-role key.

Use `scripts/upload-ai-environment.mjs` after linking the intended project and preparing ignored `.local/ai-service.env` and `.local/service-deployment.json`. The helper validates the project/team/public origin and uploads an allowlist through CLI stdin. It never prints values. Schema migrations and restricted-login provisioning are separate administrative steps; function startup only verifies tables.

Verify the public `/ready` endpoint, unauthenticated `/v1/usage` rejection, billing pages/CSS and original webhook signature bytes with `scripts/verify-ai-runtime.ts`. The stable public origin must accept Stripe requests without a Vercel login. Preview deployment protection can stay enabled. A Stripe test endpoint, Resend test SMTP and a capped AI budget support owner testing; they do not activate public sales or sign-in for arbitrary addresses.

The marketing site contains product information, setup steps, privacy and real GitHub download links. It does not sign learners in or load desktop APIs. GSAP assets are local. Published downloads are tracked in `src/site/assets/release.json`; deploying account-service code does not replace an existing desktop release. Chrome review remains separate.

Before public activation: verify a sender domain, configure authentication abuse protection and host-level limits, test real email sign-in and completed Stripe test Checkout, publish account retention/support/billing terms, then provision a separate live Stripe catalog and provider budget. See [service setup](../services/ai/README.md) and [billing plan](stripe-integration.md).
