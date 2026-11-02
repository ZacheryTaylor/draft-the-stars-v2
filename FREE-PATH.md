# Free path vs. paid (status)

No recurring paid infrastructure is used or required for anything below.

## Works today at $0
- Multi-league flow (create/join, fees roster, draft gate, scoring, themes) on the in-memory **MockAdapter** (`DATA_ADAPTER=mock`, default) via `npm run dev`.
- Shareable static demo on GitHub Pages (localStorage): https://zacherytaylor.github.io/draft-the-stars-v2/ (deploys from `main` only).
- SQL schema/migrations verified locally with **PGlite** in tests (`npm test`) — no hosted DB.
- Stripe Checkout **test mode** (branch `stripe-checkout`): checkout route, signed webhook, idempotent paid marking. With no keys set, routes return 503 and the app stays on the mock provider.
- Terms (platform-use fee wording), Privacy, Refunds, Fees disclosure pages.

## Blocked until Zach approves paid/hosted services
- Hosted Postgres + auth + realtime (Supabase; Pro needed for commercial use/no pausing) — `DATA_ADAPTER=supabase`.
- Commercial hosting for the Next.js server routes (Vercel Pro, or another host) — needed for live Stripe webhooks.
- Transactional email (Resend), error tracking (Sentry) — free tiers possible, not yet connected.
- Stripe **live** mode.

## Secrets needed later (names only; never commit)
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL,
STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID,
RESEND_API_KEY, EMAIL_FROM, NEXT_PUBLIC_SENTRY_DSN, SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT.
