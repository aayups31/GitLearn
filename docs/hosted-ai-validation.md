# Hosted accounts and included AI validation

October 13, 2026. The service is deployed at https://git-learn-black.vercel.app/. The landing page remains public and the learning workspace runs locally. This environment uses Stripe **test mode**, an owner-only Resend test sender and a capped monthly inference budget. It is not a live paid launch.

## Passed checks

- TypeScript and the production workspace/desktop/extension builds pass. Focused gateway, provider, checkpoint, billing and HTTP regression suites pass.
- Nine checks against real Supabase PostgreSQL cover concurrent allowance limits, idempotent refunds, global-budget rejection, durable Checkout attempts, multi-pool advisory locks, atomic event/entitlement updates, transaction rollback/retry, browser-role isolation and restricted runtime privileges. Synthetic fixtures are cleaned up.
- Nine runtime checks pass against the deployed Vercel origin: liveness, database readiness, unauthenticated account rejection, success/cancel pages, CSS routing, unknown page rejection, invalid email input and untouched/tampered webhook signatures. No account secret appears in HTTP errors.
- Six hosted billing scenarios pass using the real Stripe test API and PostgreSQL. Stripe itself delivers signed payment/cancellation events to Vercel. A test payment grants the 600-response allowance; cancellation removes it; old paid-event replay cannot restore it. Checkout is reused across billing instances and existing subscriptions open the dedicated portal. Disposable customer/account fixtures are removed. Browser payment completion is a separate check.
- Both Supabase sign-up and returning-user templates render numeric OutClass codes. Direct Resend SMTP authentication passes with certificate verification. Supabase accepts the owner sign-in email request after the verified password is saved.
- The owner completed email-code sign-in in the local OutClass workspace. The client had no personal provider key. One synthetic OffCourse teaching response passed its structured schema and hint checks through the deployed service; real allowance usage increased from 0 to 1 on the free plan. No real learner course/code material was sent for this test.

The host uses Supabase's **session pooler on port 5432** because direct connections default to IPv6. Transaction pooling on port 6543 is rejected by configuration: billing requires session advisory locks. Vercel receives a restricted runtime login; the administrative database URI stays local. All private-schema tables have RLS and the browser roles have no schema grants.

## Repeatable verification

From the repository root, use the ignored private service configuration:

```powershell
node --import tsx scripts/verify-ai-database.ts
node --import tsx scripts/verify-ai-runtime.ts
$env:OUTCLASS_VERIFY_URL='https://git-learn-black.vercel.app'
node --import tsx scripts/verify-ai-runtime.ts
node --import tsx scripts/verify-hosted-billing.ts
```

The scripts write sanitized reports under ignored `.local`. Database and billing scripts act only on their synthetic fixtures. Runtime checks send no email or model request. Do not substitute a live Stripe key.

## Activation boundaries

Owner email-code sign-in and authenticated included AI pass. For public sign-in, verify a Resend sender domain and configure authentication/host abuse controls. For sales, finish browser test Checkout, renewal/payment-recovery testing, support/retention/refund/tax policies and a separate live Stripe catalog/key/destination. The existing published desktop download remains 0.7.1; these commits update source and hosted service, not that installer. In that app, choose Included AI and save `https://git-learn-black.vercel.app` under Advanced service connection before signing in.
