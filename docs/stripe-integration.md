# OutClass included AI billing

October 13, 2026. The Stripe plugin is installed and its MCP authenticated. Stripe's `stripe_implementation_planner` selected hosted subscription Checkout, flat pricing, freemium access and the Customer Portal. All account setup and API validation performed in this pass use **test mode**.

## First plan

| Plan          | Price                             | Included AI                                     |
| ------------- | --------------------------------- | ----------------------------------------------- |
| Free          | C$0                               | 20 successful responses per UTC calendar month  |
| OutClass Plus | C$12/month, before applicable tax | 600 successful responses per UTC calendar month |

This is the owner-authorized starting price, not a publicly launched offer. Review measured inference cost and student feedback before making a live price. There are no automatic overage charges, annual commitments or paid trials. The local workspace, personal provider keys and local models remain available independently of subscriptions. Teacher, architect and checkpoint requests share the response allowance. Failed inference or malformed answers refund the learner's allowance; the global attempted-request budget still counts the attempt. Responses do not roll over. Upgrading increases the current calendar-month limit to 600; it does not reset used responses. Billing anniversaries and calendar-month response resets are separate and must be explained when launching.

## Architecture

```mermaid
sequenceDiagram
    participant Learner as OutClass desktop
    participant Service as HTTPS AI service
    participant Auth as Supabase Auth
    participant DB as Private PostgreSQL
    participant Stripe
    Learner->>Service: Email code / verified bearer session
    Service->>Auth: Validate identity
    Learner->>Service: POST /v1/checkout
    Service->>DB: Lock account; map Stripe customer; persist checkout attempt
    Service->>Stripe: Reuse Checkout or open Customer Portal
    Service-->>Learner: Hosted Stripe URL
    Learner->>Stripe: Enter payment details in browser
    Stripe->>Service: Signed webhook with raw payload
    Service->>DB: Lock mapped account
    Service->>Stripe: Read current subscriptions and latest invoices
    Service->>DB: Atomically update paid access and record event
    Learner->>Service: Refresh allowance / request hint
    Service->>DB: Reserve allowance before inference
```

The public website advertises the product and downloads. Card collection happens on Stripe's hosted page. The desktop needs no Stripe publishable key or secret. The supplied publishable key is retained only in ignored local configuration; it is unused by this redirect flow.

The separate AI service owns the Stripe secret, price and portal configuration IDs, webhook signing secret, Supabase settings, PostgreSQL connection and OpenAI service key. It stores identity/customer mapping and response counts, not learner prompts or local code. See [AI service setup](../services/ai/README.md).

## Payment and access rules

- Checkout and payment processing become available together when the Stripe key, price and signing secret are present. A success redirect grants no access.
- A per-account PostgreSQL advisory lock spans Stripe calls and durable writes. Multiple service processes serialize checkouts and payment updates for the same learner. Persistent checkout attempts supply idempotency keys; an open OutClass Checkout is reused after clicks, timeouts or service restarts.
- An existing active, incomplete, past-due, unpaid or paused OutClass subscription opens the dedicated portal. It does not start a second subscription. Canceled and expired incomplete subscriptions can be replaced.
- Customer identity comes from the private database mapping created during authenticated checkout. A webhook cannot create an account or assign a customer using metadata. Current subscription metadata must also match the mapped user and configured price.
- Every accepted event re-reads current Stripe state under that account's lock. Only active subscriptions with a paid latest invoice and a future configured-item period end grant Plus access. Trials are not enabled. Payment collection pauses and unpaid/incomplete/past-due states do not grant Plus. Cancel-at-period-end retains access until the paid period ends; immediate cancellation removes it.
- Reconciliation considers all current OutClass subscriptions for the customer. A delayed deletion for an old subscription cannot revoke a newer valid purchase.
- Event recording and entitlement writes share a transaction. Duplicates are harmless. Bad signatures receive 400; temporary Stripe/database failures receive 503 for retry. No secret or provider failure details enter HTTP responses.
- Prices are server-selected, active, fixed monthly recurring Prices in the same test/live environment. The server never accepts a price, customer ID or user ID from the desktop request body.

## Required event destination

Configure `/v1/stripe/webhook` using snapshot events compatible with the installed SDK's API version, currently `2026-09-30.endive` / stripe-node 23.0.0:

```text
checkout.session.completed
checkout.session.async_payment_succeeded
checkout.session.async_payment_failed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
customer.subscription.paused
customer.subscription.resumed
invoice.paid
invoice.payment_failed
invoice.payment_action_required
invoice.finalization_failed
```

Enable Smart Retries and Stripe's failed-payment/customer-authentication emails in production billing settings when launching. Account-wide settings were not changed in this pass.

Refunds, disputes and fraud alerts require an owner policy before live sales. This implementation does not silently issue refunds or automatically suspend access for a partial refund. Configure operational alerts for `charge.refunded`, `charge.dispute.created` and `radar.early_fraud_warning.created`, with a documented support review and subscription-cancellation process. Implement automated access decisions after that policy is chosen.

## Local test setup

Provided keys are stored in gitignored `.local/stripe.env`; catalog IDs are in `.local/stripe-catalog.env` and `.local/stripe-catalog.json`. No key is committed or bundled. The dedicated OutClass test portal permits payment-method changes, invoice viewing and cancellation at period end. Other products, account branding and live settings are untouched.

```powershell
# Creates or reuses only the OutClass test catalog and portal.
node --env-file=.local/stripe.env scripts/setup-stripe-test.mjs

# Performs real test-mode API operations; cleans up its synthetic customer.
node --env-file=.local/stripe.env --import tsx scripts/verify-stripe-test.ts

# Runs signature, state, concurrency and retry coverage without account keys.
node node_modules/vitest/vitest.mjs run tests/stripe-billing.test.ts tests/ai-gateway.test.ts
```

The API exercise uses test cards, a local auth/database fixture and locally signed snapshots. It validates real Stripe price, Checkout, portal and subscription operations. It does **not** claim production PostgreSQL persistence, Supabase email delivery, public webhook delivery or completed browser Checkout verification. Its sanitized report is saved in ignored `.local/stripe-validation.json`.

For an actual local service, supply Supabase, PostgreSQL, the OpenAI server key and service URL as well as both Stripe env files. Use `stripe listen --forward-to http://127.0.0.1:8080/v1/stripe/webhook`, storing that CLI listener's signing secret privately as `STRIPE_WEBHOOK_SECRET`. A dashboard endpoint secret is different from the CLI listener's secret. The verification script above uses its own ephemeral signing fixture.

## Remaining activation work

The local fixture pass covered seven Stripe sandbox scenarios, including declined payment and recovery. The hosted pass now also verifies real Supabase persistence and Stripe-delivered signed events at the Vercel public endpoint: CAD12 reusable Checkout, paid allowance, dedicated portal, period-end cancellation, immediate cancellation and old paid-event replay. Run `node --import tsx scripts/verify-hosted-billing.ts` to repeat this isolated test; it removes its synthetic customer/account fixtures and writes a sanitized ignored report. Checkout initiation uses a synthetic account fixture and payment uses a Stripe test API method; this does not claim completed browser Checkout or real email sign-in. The test catalog and portal remain available; no live charges are enabled.

1. Finish owner email sign-in and included AI verification. Supabase's private schema, restricted runtime and Vercel service are connected. Use the session pooler on IPv4-only hosts; transaction-mode pooling cannot preserve billing's session advisory locks. Real multi-pool serialization and rollback/retry checks pass.
2. Complete browser Checkout → webhook → paid allowance → portal cancellation using a signed-in learner. The deployed test event destination and API payment/cancellation delivery have passed. Replace Resend's owner-only test sender with a verified domain before public sign-in.
3. Advance a Stripe test clock through renewal, failed payment and recovery. Verify delayed/duplicate delivery and renewal emails. Monitor failed/retried payment notifications.
4. Resolve seller identity, billing terms, refunds/disputes, support contact and tax registrations. `STRIPE_AUTOMATIC_TAX` defaults to false; enable only after registrations and Stripe Tax settings are ready. Do not infer tax obligations from this test setup.
5. Measure AI token cost and abuse patterns. Confirm CAD12/600 is sustainable, tune the global budget, and explain limits before purchase.
6. Create separate **live** catalog, portal and event destination, deploy live keys through host secrets, and publish the service URL to the desktop release. No live payments are enabled by this pass.

References: [Stripe subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks), [Customer Portal integration](https://docs.stripe.com/customer-management/integrate-customer-portal), [flexible billing](https://docs.stripe.com/billing/subscriptions/billing-mode), [SaaS integration](https://docs.stripe.com/saas).
