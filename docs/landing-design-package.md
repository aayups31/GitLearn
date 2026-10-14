# OutClass web and account design — October 14, 2026

The public website presents a local learning workspace with two specialized guides. The Windows app owns courses, files, execution, learning history, and its separate AI connection.

## Website

- The opening hero contains the supplied orbital identity and one glass-tile scene. The scene has no rocky floor or mountains and is not repeated elsewhere.
- The software showcase stays large. Its three panes communicate courses, code, and OffCourse without relying on long marketing copy.
- Native horizontal journey cards show practice, an evolving project, and a contribution brief. The assistant example remains keyboard accessible and explicitly illustrative.
- Decorative chapter labels, micro headlines, repeated slogans, the old giant footer wordmark, and image captions naming courses/code/contributions have been removed. Useful release, example, and privacy information remains.
- Product, Agents, Setup, Download, Account, and Privacy each have their own page. Navigation includes a functional mobile menu with Escape dismissal and focus return.
- The Agents page gives OffCourse and Architect separate introductions and concrete examples. Its spheres and architecture graph are built in HTML/CSS, not a repeated image or a live Blender render.

## Art

The supplied `Glossy Futuristic Orbital Emblem.png` is used as the website mark, resized and encoded as `src/site/assets/orbital-logo.webp` without changing the silhouette.

The one hero asset is `src/site/assets/hero-tiles.webp` (271,008 bytes). It was edited using the built-in image-generation tool from the previously generated orbital scene. A real GitHub SVG is positioned on its blank tile. The final asset has an alpha channel, no floor, and no terrain. It is used once in visible page content. Original generation files remain in the user's Codex generated-images directory.

Final edit prompt:

> Edit target: attached OutClass orbital scene. Remove ALL mountains, rocky ground, crystalline floor, terrain, ground haze, star dust and background. Keep ONLY the five existing floating beveled glass tiles, their exact embossed blue orbital brand symbol / code brackets / ascending bars / graduation cap, and the thin luminous blue orbital light trails, on a genuinely transparent background. The top-left tile stays blank for an actual GitHub SVG overlay. Preserve original tile arrangement, positions, perspective, proportions and recognizable brand silhouette exactly; do not add anything, no labels. Refine the lighting to premium ice-blue and cobalt polished glass, tasteful violet underside highlights. Trim the ground entirely without cutting or covering the bottom-right graduation-cap tile. Landscape composition same 3:2 dimensions, keep safe transparent margins. This is a premium AI learning company's hero asset, refined and photorealistic 3D studio-render quality. No floor, no horizon, no mountain, no rocks, no atmospheric environment, no text.

## Motion

GSAP introduces the hero with controlled stagger, gives the artwork pointer depth, and adds scroll-driven depth as the following surface wipes upward over the opening. The software frame unfolds from a shallow perspective. Journey visuals, agent spheres, and the architecture graph have restrained staged movement.

All motion reverses or restores ordinary styles when reduced motion is enabled. Mobile uses normal document flow. Browser scrolling, anchors, touch, and carousel keyboard controls remain native. There is no wheel interception, autoplay carousel, or dependence on animation scripts for downloads and documentation.

## Account and billing

The public Account page has email and verification steps, cooldown for resend, invalid-code feedback, loading/error states, allowance progress, refresh, sign-out, and Stripe checkout/portal handoff. The page never receives provider access or refresh tokens in JavaScript. The server sets host-only `__Host-` cookies with Secure, HttpOnly, SameSite=Strict, and no Domain attribute. All account responses use private/no-store cache headers. Mutation requests must originate at the configured HTTPS public origin and contain JSON.

Session identity is verified with Supabase. Expired sessions refresh on the server; provider outages retain cookies. Sign-out clears browser cookies and attempts to revoke only the current provider session, including a refresh-only session. Billing always uses the verified user ID, never an account identifier supplied by the page. Hosted checkout URLs must belong to Stripe. Price, currency, and test/live mode come from the validated configured Stripe price.

Payment-return pages use the same design and check actual allowance state. A success URL cannot grant access or prove payment; signed Stripe notifications remain authoritative. Browser and desktop sessions are separate. The desktop AI settings now use focused email-code forms, resend cooldown, allowance progress, and clear billing controls while preserving its Windows-encrypted account persistence.

Included AI remains restricted to the connected email test account. Billing is in Stripe test mode. A verified sending domain and commercial activation are still required for public learner accounts and live subscriptions. No new email, payment, provider key, database migration, or public account activation was performed by this UI pass.

## Validation

The public-site suite covers seven pages at 1440, 768, 375, and 320 pixels, internal asset paths, keyboard tabs, carousel completion, backward scroll restoration, changing reduced-motion preferences, blocked GSAP, no JavaScript, mobile navigation, and an account/Stripe handoff using fixtures. Screenshots are retained in `.local/test-results/site/`.

Gateway, browser-account, Stripe-billing, and provider tests use isolated fixtures and cover secure cookies, origin checks, token non-exposure, expired-session refresh, outage recovery, sign-out, allowance controls, invalid codes, and rejected billing hosts. The application build and focused local learning-loop regression cover the desktop connection forms and bundled guide navigation. Actual provider email delivery was verified in the preceding infrastructure task; this pass sends no new owner email and submits no payment.

The source and docs stay in the existing Git repository. Public deployment uses the existing Vercel project and `main` integration. The Windows installer links continue to point to the published v0.7.1 preview; the updated desktop account styling is in source and local builds until a new installer is packaged.

Implementation references: [Supabase server session guidance](https://supabase.com/docs/guides/auth/server-side/advanced-guide) and [local sign-out scope](https://supabase.com/docs/reference/javascript/auth-signout).
