# Draft the Stars v2

Fantasy drafts for any reality competition: draft the cast, score every episode, watch the standings move. v2 of [Draft the Stars](https://zacherytaylor.github.io/dwts-draft/) (single league, static site) rebuilt as a multi-league product.

**Status: early build, no outside services connected.** The app runs entirely on an in-memory mock data layer, placeholder auth and a mock payment provider. Supabase, Stripe, Resend and Sentry are stubs with env-var placeholders (see [Placeholders](#placeholders)).

- **Stack:** Next.js 16 (App Router, TypeScript) to be hosted on Vercel later · Supabase (Postgres, Auth, Realtime, row-level security) · Resend (email) · Sentry (errors) · Stripe (payments).
- **Show-agnostic:** no show logos or photos (monogram avatars only), "fan-made, not affiliated" footer, generic schema (a *unit* is whatever scores together: a DWTS couple, or a single contestant).
- **Look:** carried over from the live redesign (script headings, podium, gold border on #1, Alive meter fill, week names), now driven by per-user theme tokens.

## Live demo (GitHub Pages)

**https://zacherytaylor.github.io/draft-the-stars-v2/** · a static, browser-only demo: test data, no real payments, nothing leaves your browser.

- Log in: **Log in** → username `zach` (no password) → My leagues. Other demo accounts: `foxtrot_fran` (fee covered by Zach), `waltz_wren` (unpaid), `tango_tess`.
- Leagues: *Sunday Night Ballroom* (drafted, mid-season), *Office Watch Party* (draft not started: mixed paid / covered / unpaid / open slots), and a read-only **girls' league sample** (the v1 league migrated, fee-waived).
- Theme: the **Theme** menu in the header switches between all 8 presets on any page (also Settings).
- **Reset demo** (top banner) restores the seed data.

How it works: `npm run build:demo` (scripts/build-demo.mjs) swaps `src/demo-app` in as the app and runs a Next.js static export with `basePath=/draft-the-stars-v2`. Pages and the server app share the same views (`src/views`), and the demo runs the same `MockAdapter` in the browser, persisted to localStorage (`src/demo`). Deployed by `.github/workflows/pages.yml`. League pages use `?slug=` (`/league/fees/?slug=office-party`) so leagues created in the browser work without prebuilt pages.


## Legal pages

Final legal documents (effective October 4, 2026), operated by ZT, LLC (Florida): `/terms` (includes Acceptable Use and DMCA), `/privacy` (includes the Cookie Notice and data deletion), `/refunds`, `/fees-disclosure`, `/contact`. Linked from the footer on every page, the sign-up form, and the league fees checkout.

- Text lives in one place: `src/lib/legal/documents.ts` (company details and contact email in `src/lib/legal/company.ts`). Both the server app and the GitHub Pages demo render it with `src/views/LegalView.tsx`.
- `npm run legal:export` writes the same documents as Markdown to `./legal-export/` for the Google Docs copies.
- `tests/legal.test.ts` checks there are no placeholders, the key facts are present, and every internal link/anchor resolves.

## What's built

| Area | Where |
| --- | --- |
| Scoring engine: typed, pure port of the live `js/scoring.js`, **bit-for-bit identical** | `src/lib/scoring/` · `tests/scoring.test.ts` |
| League size and roster logic (copies, per-team roster, leftovers by team count) | `src/lib/league/sizing.ts` · `tests/league-sizing.test.ts` |
| Draft rules (snake order, roster slots per role, copies, no dancer twice per team) | `src/lib/league/draft.ts` |
| Fees placeholder: free league creation, $5 platform fee per member slot, commissioner can cover any slots in one mock checkout, draft gated on filled + paid | `src/lib/billing/` · `tests/billing.test.ts` |
| Draft order: seeded randomize (re-roll, audit log) or manual drag/keyboard reorder, locks at draft start | `src/lib/league/draft-order.ts` · `tests/draft-order.test.ts` |
| Per-league commissioner score fixes (never touch shared scores) | `league_score_overrides` · `tests/draft-order.test.ts`, `tests/sql.test.ts` |
| Theme presets as CSS-variable design tokens, WCAG AA check for every preset | `src/lib/themes/` · `tests/themes.test.ts` |
| Supabase migrations (schema, billing, future tables, RLS, join-by-code RPC) + DWTS S35 seed | `supabase/` · `tests/sql.test.ts` (runs in PGlite) |
| Mock data layer behind a `DataAdapter` interface | `src/lib/data/` |
| Girls' league migration stub + 0-difference verification | `src/lib/migration/` · `scripts/migrate-legacy-league.ts` · `tests/migration.test.ts` |
| Pages: landing, sign up, log in, dashboard, create league, join by code, league standings + weekly scores, draft room, commissioner tools (invite, draft order, score fixes), league fees / payment roster, settings (username + theme picker) | `src/app/` |
| CI: lint, typecheck, tests, migration dry-run, build, demo export; Pages deploy | `.github/workflows/ci.yml` · `.github/workflows/pages.yml` |

## Local setup

Requires Node 20.9+ (CI uses Node 22).

```bash
npm ci
cp .env.example .env.local   # optional: every value can stay empty
npm run dev                  # http://localhost:3000
```

Log in with any demo username (no password check yet): **`zach`** (commissioner of both demo leagues), `tango_tess`, `waltz_wren`, ... Demo leagues: `/leagues/demo-ballroom` (paid, drafted, mid-season) and `/leagues/office-party` (pending payment). Mock data resets when the server restarts.

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` | ESLint (next core-web-vitals + TypeScript) |
| `npm run typecheck` | `next typegen && tsc --noEmit` |
| `npm test` | Vitest: scoring parity, sizing, draft, billing, themes, SQL/RLS (PGlite), migration |
| `npm run migrate:dry-run` | Maps the girls' league JSON to v2 rows and runs the 0-difference gate (writes `.migration-dry-run/`) |
| `npm run seed:generate` | Regenerates `src/data/seasons/dwts-s35.json` and `supabase/seed.sql` from the live data copies |

## Environment variables

All optional today; see `.env.example`.

| Variable | Service | Used for |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | app | Absolute URLs (checkout return, emails) |
| `DATA_ADAPTER` | app | `mock` (default). `supabase` is a TODO |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Browser/server client (RLS applies) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Server only: score ingestion, payment webhooks, league activation |
| `SUPABASE_DB_URL` | Supabase | Migrations and the league import |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_LEAGUE_MEMBER` | Stripe | Member-fee checkout (quantity = slots) + webhook |
| `RESEND_API_KEY`, `EMAIL_FROM` | Resend | Verification, reset, invites, reminders (also Supabase Auth SMTP) |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Sentry | Error reporting + source maps |

## Placeholders

Nothing below has an account, key or connection. Each is a stub you can swap for the real thing later.

| Service | Stub today | To go live, sign up for | Env vars | Code to fill in |
| --- | --- | --- | --- | --- |
| **Supabase** | In-memory `MockAdapter`; cookie-based placeholder auth (no passwords); Realtime = 8-second page refresh in the draft room | Supabase project (staging + prod; Pro plan for leaked-password protection) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` | `src/lib/services/supabase.ts`, a `SupabaseAdapter` for `src/lib/data/adapter.ts`, `src/lib/auth/session.ts`, `src/components/LivePoll.tsx`; apply `supabase/migrations` + `seed.sql` |
| **Stripe** | `MockPaymentProvider` (settles instantly, no money moves); `StripePaymentProvider` returns "not connected" | Stripe account (activated for payments) + webhook endpoint | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_LEAGUE_MEMBER` | `src/lib/billing/stripe-provider.ts`, `get-provider.ts`, an `/api/webhooks/stripe` route |
| **Resend** | `sendEmail()` logs and returns `sent: false` | Resend account + verified sending domain | `RESEND_API_KEY`, `EMAIL_FROM` | `src/lib/services/email.ts`; set Resend as Supabase Auth custom SMTP |
| **Sentry** | `captureException()` logs to the server console | Sentry project (Developer plan is free) | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | `src/lib/services/monitoring.ts` (`npx @sentry/wizard -i nextjs`) |
| **Vercel** | Not deployed | Vercel Pro (Hobby is non-commercial only) | set all of the above in project settings | none |
| **Domain** | none | A .com (plan suggests buying before Nov 1) | `NEXT_PUBLIC_SITE_URL`, `EMAIL_FROM` | none |

## Fees model (placeholder)

- **Free accounts. Creating a league is free** (leagues start `active`). The commissioner picks 3 to 12 member slots and invites members.
- **Each member pays only their own one-time $5 platform fee** (`pricePerMemberCents = 500`), the commissioner included. Copy everywhere: it is a platform fee only; **no prizes or payouts** are paid from fees.
- **The commissioner can cover any number of other slots, or all of them, in ONE mock checkout (quantity × $5)** from the payment roster: multi-select + **Pay for selected**, or **Pay for all unpaid**. Covered slots count as paid. Covering works on **open, unfilled slots** too: they stay paid for whoever claims them. Any collecting back from members happens **off-platform**.
- One `payments` row per **team slot**: `member_id` (who holds it, null while open) is recorded separately from `payer_id` (who paid), so the roster shows **"Covered by <commissioner>"**. A partial unique index (`payments_one_active_per_slot`) plus `mark_slots_paid()` (all-or-nothing, only `unpaid` rows) make **double payment impossible**; the app mirrors it in `planCheckout()` and the mock adapter. Already-paid checkboxes are disabled in the UI.
- **Draft gate (single setting `billing.draftGate`):** the draft can't start until **every slot is filled AND paid/covered (or waived)**. Enforced in the UI (Start disabled + reasons), the server (`draftReadiness()` in `setDraftStatus`), and the DB (`league_draft_ready()` + trigger on `leagues.draft_status`).
- Placeholders: **Remind** (email stub) for unpaid members; **Refund** (back to **whoever paid**: `refund_to_id = payer_id`, status `refund_pending`, slot becomes unpaid again); **Remove member** before the draft (self-paid → refund to them and the slot reopens unpaid; covered → the slot stays covered for the next member). League cancellation would refund every paid slot to its payer (TODO(refunds)).
- Only the server can mark a slot paid: the mock checkout today, a verified Stripe webhook later (`mark_slots_paid` is not executable by `authenticated`; there is no update policy on `payments`). Each paid slot grants a `league_membership` entitlement.
- The migrated girls' league is **fee-waived** (`league_billing.fee_waived`, slots created as `waived`).

## League size and roster logic

Pure function `leagueSizing(castUnits, teams)` in `src/lib/league/sizing.ts`, driven by cast size:

- copies = 1 for 3 to 4 teams, 2 for 5 to 8, 3 for 9 to 12
- totalDancers = castCouples × 2 × copies (celebrity and pro are separate draftable dancers)
- perTeam = largest even number ≤ floor(totalDancers / teams), half celebrities and half pros (roster slots enforced in the draft)
- leftover dancers stay undrafted (TODO: future free-agent pool)

| Teams (16 couples) | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Copies | 1 | 1 | 2 | 2 | 2 | 2 | 3 | 3 | 3 | 3 |
| Per team (celebs/pros) | 10 (5/5) | 8 (4/4) | 12 (6/6) | 10 (5/5) | 8 (4/4) | 8 (4/4) | 10 (5/5) | 8 (4/4) | 8 (4/4) | 8 (4/4) |
| Left over | 2 | 0 | 4 | 4 | 8 | 0 | 6 | 16 | 8 | 0 |
| Fees if all covered ($5 each) | $15 | $20 | $25 | $30 | $35 | $40 | $45 | $50 | $55 | $60 |

The girls' league (8 teams, 2 copies, 8 per team, 4 pros + 4 celebrities) matches this exactly (tested).

## Scoring

Template `dwts-couple-score-x-round-value`: each drafted celebrity **and** each drafted pro earns the full couple score ÷ 30 × round value (10, 12, 14, 16, 18, 20, 23, 26, 29, 32, 36). Max Possible = points + best case for the remaining weeks, capped by how many couples are still competing each week (elimination schedule). `tests/scoring.test.ts` proves, for every week cut-off, that points, Alive, Max Possible, legacy Max Possible, per-couple points and all six sort orders are `Object.is`-identical to the live `js/scoring.js`, and that the rendered standings equal what the live site shows.

## Theme presets

Per-user presets: **Pink (default, the live palette)**, Blue, Green, Red, White, Purple, Gold, Dark. Tokens are CSS variables under `[data-theme]`, generated from `src/lib/themes/presets.ts`. The choice is saved to `profiles.theme_preset`; before login it's kept in `localStorage` (`dts-theme`) and applied before first paint. Settings has a picker with live preview.

Every preset passes WCAG AA for 14 text pairs (4.5:1) and 3 large-text/UI pairs (3:1) (`tests/themes.test.ts`):

| Preset | body text / page | hint / page | pill text | button text | pro chip | heading | gold border |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Pink | 5.26 | 5.82 | 4.90 | 4.93 | 5.35 | 5.26 | 3.20 |
| Blue | 7.60 | 6.18 | 5.84 | 5.24 | 7.09 | 5.41 | 3.66 |
| Green | 6.68 | 6.35 | 6.13 | 5.32 | 6.50 | 5.98 | 3.77 |
| Red | 6.71 | 7.02 | 6.00 | 6.16 | 6.54 | 6.71 | 3.66 |
| White | 14.73 | 5.96 | 12.57 | 10.05 | 14.65 | 14.73 | 4.03 |
| Purple | 8.26 | 6.27 | 7.48 | 7.36 | 7.56 | 8.26 | 3.77 |
| Gold | 7.50 | 6.79 | 6.75 | 6.09 | 6.92 | 6.53 | 4.03 |
| Dark | 15.77 | 8.74 | 7.39 | 9.95 | 6.64 | 9.74 | 8.48 |

**Pink and accessibility:** Pink uses the live hex values (`#ee5d92`, `#b72f66`, `#ffe5ef`, `#ff9fbe`, `#FFF0F2`, `#fff9fc`, `#f3bad0`, `#f4d3e0`, `#bc8618`, `#7c5268`). The live site's text colours `#fd7185` (body/headings, 2.4:1 on the page) and `#fe637f` (pro chips with white text, 2.9:1) fail AA, so in v2 text uses the live dark pink `#b72f66`, and two shades were added for AA: pro chips `#c2306a` and button top `#c63a74`. Mapping: `PINK_LIVE_SOURCE` in `presets.ts`.

## Data model

`supabase/migrations`:

1. `…000100_core_schema.sql`: `profiles` (unique lowercase username, 13+ trigger, `theme_preset`, email stays in `auth.users`), `shows`, `scoring_templates`, `seasons`, `contestant_units`, `contestants` (monogram, no photos), `episodes` (round value, units competing), `scores` + `score_audit_log`, `leagues` (unique slug, `settings` JSON, `status` active/cancelled/archived), `league_members` (commissioner / co_commissioner / player), `teams` (deferrable unique draft position), `picks`, `draft_order_log` (seed + input + order per roll), `league_score_overrides` (per-league score fixes), `draft_sessions`, `invites` (codes), `standings_cache`.
2. `…000200_billing_and_future.sql`: `league_billing` (price, fee waiver), `payments` (one per slot: member_id, payer_id, status, checkout_id, refund_to_id), `entitlements`, plus empty future tables `cosmetics`, `user_cosmetics`, `badges`, `user_badges`, `side_contests`, `sponsors`; triggers for league/team bootstrap, slot-member sync, the draft gate, draft-order lock and team-field protection; `mark_slots_paid()` and `league_draft_ready()`.
3. `…000300_rls.sql`: RLS on every table, `is_league_member` / `is_league_commissioner` helpers, `join_league_by_code()` RPC.

`supabase/seed.sql` (generated) seeds DWTS Season 35 (16 couples, 32 contestants, 11 episodes, weeks 1 to 3 scores) and the scoring template. `tests/sql.test.ts` applies everything to PGlite (Postgres in WASM, with a small Supabase shim in `supabase/tests/`) and checks constraints and RLS.

## Girls' league migration

`npm run migrate:dry-run` maps the v1 `league.json` + season/scores/schedule to v2 rows (league, 8 teams, 64 picks, 8 one-use claim invites, billing), writes reviewable `plan.json` / `plan.sql`, and recomputes standings from the v2 rows. Gate: **0 differences** vs the v1 scoring (bit-for-bit) and vs the rendered live baseline. `--apply` is deliberately not implemented. Fixtures in `tests/fixtures/live-data/` are copies of the live data, used only for tests and this dry run (see `SOURCE.md`).

## Open TODOs

`TODO(supabase)`, `TODO(supabase-auth)`, `TODO(realtime)`, `TODO(stripe)`, `TODO(resend)`, `TODO(sentry)`, `TODO(billing-enforcement)`, `TODO(refunds)`, `TODO(cleanup)`, `TODO(free-agents)`, `TODO(migration)`: grep the code for each. `TODO(cleanup)`: a scheduled job to archive leagues that never filled/paid their slots. Also: the standings_cache rebuild job (applying `league_score_overrides`), and score ingestion (port `scripts/auto-score.mjs` from v1).
