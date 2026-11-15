# Soninho 🌙

[![CI](https://github.com/engviniciusbs/soninho/actions/workflows/ci.yml/badge.svg)](https://github.com/engviniciusbs/soninho/actions/workflows/ci.yml)

**English** · [Português](README.md)

Baby sleep and feeding tracker for families. Parents and caregivers log naps, night sleep and feeds from their phones; Soninho computes age-based wake windows, suggests when the next nap and feed should happen, sends push alerts when the wake window is running out, and produces analytics, email reports and AI insights — all in Brazilian Portuguese.

## Key Features

- **Sleep timer** (nap / night sleep) with back-dated start ("started 10 min ago"), synced across caregivers and persisted locally.
- **Wake window** by age (green/yellow/red indicator) and a **deterministic next-nap suggestion** — no LLM, one shared table across the whole app.
- **Post-sleep review**: quality (1–5), how the baby fell asleep, wake reason, room temperature, weather, sleep sack/TOG and clothing — with a **clothing recommendation** based on temperature.
- **Feeding**: per-side breastfeeding timer (left/right), bottle (formula / breast milk / mixed, in ml) and solid food logging with food tags and reaction (including allergic reactions). Next-feed suggestion based on the recent average interval.
- **Shared family**: link invites with roles (`owner`, `caregiver`, `viewer`), family relation (mother, father, grandmother, nanny…), a notes board, an activity feed, and toasts/push when another caregiver starts or stops a sleep/feed.
- **Nanny mode**: reduced interface (Home and Settings only).
- **Analytics**: daily sleep bar chart, quality trend, nap-time heatmap, environment × sleep correlation, sleep debt and a regression radar.
- **AI (OpenAI `gpt-4o-mini`)**: streaming chat with a sleep consultant, insights (today's assessment, patterns, trends, recommendations) and sleep regression analysis.
- **Push notifications (Web Push/VAPID)**: "nap coming up" and "past the wake window", with per-user quiet hours and timezone.
- **Emails (Resend + React Email)**: automatic weekly report (cron) and on-demand 7/14/30-day reports; PDF export (`@react-pdf/renderer`).
- **Public landing page** at `/`; signed-in users go straight to `/app`.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database (Supabase)](#database-supabase)
- [Architecture](#architecture)
- [API Routes](#api-routes)
- [Domain Logic](#domain-logic)
- [Scripts](#scripts)
- [Testing and Quality](#testing-and-quality)
- [Deployment (Vercel)](#deployment-vercel)
- [Troubleshooting](#troubleshooting)

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | **Next.js 16.2** (App Router, Route Handlers, Middleware) |
| UI | **React 19.3**, TypeScript 5 |
| Styling | **Tailwind CSS 4** (`@tailwindcss/postcss`), `tw-animate-css`, `next-themes` |
| Components | **shadcn/ui** (`base-nova` style) on top of **Base UI** (`@base-ui/react`), `lucide-react` icons |
| Animation | `framer-motion` |
| Client state | **Zustand** (with `persist` → `localStorage`) |
| Server data | **TanStack Query 5** |
| Forms | `react-hook-form` + **Zod 4** |
| Dates | `date-fns` + `date-fns-tz` (default `America/Sao_Paulo`) |
| Charts | `recharts` |
| Backend / Auth / DB / Storage | **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`, Postgres + RLS) |
| AI | **OpenAI** SDK (`gpt-4o-mini`) |
| Email | **Resend** + `@react-email/components` |
| PDF | `@react-pdf/renderer` |
| Push | `web-push` + Service Worker (`public/sw.js`) |
| Fonts | Nunito + Fraunces (`next/font/google`) |
| Deployment | **Vercel** (with Vercel Cron) |

> ⚠️ **Next.js 16 has breaking changes** compared to earlier versions. Before changing code, read the guides in `node_modules/next/dist/docs/` (see `AGENTS.md`).

## Prerequisites

- **Node.js 22** (`engines` `22.x`; openai 7 and supabase-js require Node ≥ 22)
- **npm** (the repository uses `package-lock.json`)
- A **Supabase** project (free tier works) — Auth, Postgres and Storage
- Optional, but required for the matching features:
  - An **OpenAI** API key (chat / insights / regression)
  - A **Resend** account with a verified domain (emails)
  - A **VAPID** key pair (push notifications)

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/engviniciusbs/soninho.git
cd soninho
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com/dashboard).
2. Under **Project Settings → API**, copy the URL, the `anon key` and the `service_role key`.
3. Create the schema from the versioned migrations in `supabase/migrations/` (tables, RLS, functions and the public `baby-avatars` storage bucket): locally run `npx supabase start`, `npx supabase db reset` and `npx supabase test db`; for your hosted project run `npx supabase link` and `npx supabase db push --remote` (run with `--dry-run` first). See [Database](#database-supabase).
4. The `baby-avatars` bucket (baby photos, path `<user_id>/<timestamp>.<ext>`) is created by the migrations.
5. Under **Authentication → URL Configuration**, add `http://localhost:3000/auth/callback` (and your production URL) to the *Redirect URLs*.
6. (Optional) Use the template at `src/lib/email/templates/supabase-confirm-signup.html` in **Authentication → Email Templates → Confirm signup**. It uses `{{ .ConfirmationURL }}` (default flow via `/auth/callback`). The `/api/auth/confirm` route is also available if you change the link to `{{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=signup`.

### 3. Environment variables

Copy the `.env.example` template to `.env.local` in the project root (`.env*` files are git-ignored, except `.env.example`) and fill it in:

```bash
cp .env.example .env.local
```

Example contents:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

NEXT_PUBLIC_APP_URL=http://localhost:3000

OPENAI_API_KEY=sk-...
RESEND_API_KEY=re_...

NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_CONTACT_EMAIL=mailto:you@example.com

CRON_SECRET=a-long-random-string
```

Generate the VAPID keys and the cron secret:

```bash
npx web-push generate-vapid-keys
openssl rand -hex 32
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Create an account at `/register`, confirm your email, and add your baby under **Configurações** (Settings).

> Push notifications require a secure context: `localhost` works; to test on a phone use HTTPS (e.g. an `ngrok`/`cloudflared` tunnel).

## Environment Variables

| Variable | Used in | Required | Description |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | client, server, middleware | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client, server, middleware | ✅ | Public key (respects RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | `src/lib/supabase/admin.ts` | ✅ for crons, invites and family push | Admin key — **bypasses RLS, never expose it to the client** |
| `NEXT_PUBLIC_APP_URL` | links in emails | — | Defaults to `https://soninho.baby` |
| `OPENAI_API_KEY` | `/api/ai/chat`, `/api/ai/regression` | for AI | OpenAI API key |
| `RESEND_API_KEY` | `src/lib/email/sleepReport.ts` | for email | Sender is hard-coded as `Soninho <sono@soninho.baby>` — the domain must be verified in Resend |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | client (subscription) and server | for push | VAPID public key |
| `VAPID_PRIVATE_KEY` | server | for push | VAPID private key |
| `VAPID_CONTACT_EMAIL` | server | for push | VAPID contact, in `mailto:...` format |
| `CRON_SECRET` | `/api/email/weekly`, `/api/notifications/dispatch` | for crons | Required as `Authorization: Bearer <CRON_SECRET>`. Vercel sends this header automatically on cron calls when the variable is set |

> `NEXT_PUBLIC_*` variables are inlined at build time — after changing them, **redeploy**.

## Database (Supabase)

Reference types live in `src/types/database.ts`. The notification/email tables are not in that file but are used by the code (columns inferred from the queries).

### Tables

```
babies                     — babies
├── id (uuid, PK) · user_id (→ auth.users) · family_id (→ families, null)
├── name · birth_date (date) · avatar_emoji (default '🍼') · avatar_url
└── created_at

sleep_sessions             — naps and night sleep
├── id · baby_id (→ babies) · type ('NAP' | 'NIGHT_SLEEP')
├── start_time · end_time (null = in progress) · duration_min (trigger)
├── quality (1–5) · notes · location
├── room_temp_celsius · weather_condition · sleep_sack_type · sleep_sack_tog
├── clothing_description · how_fell_asleep · wake_reason
└── created_at · updated_at

families                   — id · name · created_by · created_at
family_members             — family_id · user_id · role ('owner'|'caregiver'|'viewer')
                             display_name · email · family_relation · invited_by · joined_at
family_invites             — family_id · token · role ('caregiver'|'viewer') · family_relation
                             created_by · expires_at · accepted_at · accepted_by · revoked_at
family_notes               — family_id · author_id · author_name · body · created_at

bottle_feedings            — baby_id · start_time · volume_ml · milk_type ('FORMULA'|'BREAST_MILK'|'MIXED') · notes
breastfeeding_sessions     — baby_id · start_time · end_time · side_left_sec · side_right_sec
                             last_side ('LEFT'|'RIGHT') · duration_min · notes
solid_feedings             — baby_id · start_time · food_tags (text[])
                             reaction ('LOVED'|'LIKED'|'NEUTRAL'|'DISLIKED'|'ALLERGIC_REACTION') · notes

sleep_activity_log         — baby_id · family_id · actor_user_id · actor_name · actor_relation
                             action ('started'|'stopped') · sleep_session_id · sleep_type
feeding_activity_log       — … · action ('started'|'stopped'|'logged') · feeding_type ('BOTTLE'|'BREAST'|'SOLID') · reference_id

nap_suggestion_feedback    — baby_id · user_id · suggested_time · window_start · window_end · age_weeks · vote ('up'|'down')
user_profiles              — user_id (PK) · display_name · family_relation · ui_mode ('standard'|'nanny')

notification_preferences   — user_id (unique) · enabled · alert_before_minutes · quiet_hours_start/end ('HH:MM')
                             timezone · weekly_email_enabled · updated_at
push_subscriptions         — user_id · endpoint (unique) · p256dh · auth · user_agent · is_active · last_seen_at
notification_events        — push dedupe (eventType 'NAP_SOON' | 'OVERDUE', key baby:session:type)
email_log                  — user_id · kind · period_start · period_end · dedupe_key · status · sent_at
```

### SQL functions (RLS helpers)

- `get_user_family_ids(uid) → uuid[]`
- `get_user_owned_family_ids(uid) → uuid[]`
- `user_can_write_family(uid, fid) → boolean`

### Security

Every table should have **Row Level Security** enabled. The original pattern (baby owner via `auth.uid()`) is in `supabase/migrations/20260101000000_initial_schema.sql`; with families, policies should allow access to babies in the user's families (`get_user_family_ids`) and writes only for `owner`/`caregiver` (`user_can_write_family`). Cross-user operations (crons, invite acceptance, family push) use the admin client (`service_role`).

The `calculate_sleep_duration` trigger fills `duration_min` and `updated_at` on `sleep_sessions`.

> The full schema is versioned as Supabase CLI migrations in `supabase/migrations/`.

## Architecture

### Directory structure

```
src/
├── middleware.ts              # Supabase session + redirect/authorization rules
├── app/
│   ├── layout.tsx             # Fonts, metadata, theme
│   ├── page.tsx               # Public landing page (/)
│   ├── (auth)/                # /login, /register, /auth/callback (code → session exchange)
│   ├── (dashboard)/           # Signed-in area (layout with Sidebar/BottomNav/providers)
│   │   ├── app/               #   Home: timer, wake window, suggestions, notes
│   │   ├── feeding/           #   Feeding
│   │   ├── history/           #   Log (history)
│   │   ├── analytics/         #   Analytics (charts)
│   │   ├── ai-insights/       #   AI insights and chat
│   │   └── settings/          #   Baby, profile, family, notifications, tools
│   ├── invite/[token]/        # Public invite acceptance page
│   └── api/                   # Route Handlers (see "API Routes")
├── components/
│   ├── ui/                    # shadcn/Base UI primitives
│   ├── sleep/ feeding/ family/ ai/ charts/ settings/ baby/ brand/ landing/
│   ├── layout/                # Sidebar, TopBar, BottomNav, MiniTimerBar, NannyRouteGuard, navLinks
│   └── providers/             # QueryProvider, BabyProvider, UserProfileProvider
├── hooks/                     # useSleepTimer, useBreastfeedingTimer, useWakeWindow, usePushNotifications…
├── store/                     # Zustand: sleepStore ("soninho-timer"), feedingStore ("soninho-feeding-timer")
├── lib/
│   ├── supabase/              # client.ts (browser), server.ts (cookies), admin.ts (service role), queries
│   ├── sleep/                 # Sleep rules (wake windows, suggestion, statistics, regression…)
│   ├── feeding/               # Intervals, suggestion, statistics, food tags
│   ├── family/                # Relations, activity messages and logging
│   ├── ai/                    # OpenAI client, prompts, sleep context
│   ├── notifications/         # Push dispatch, family push, subscription client
│   ├── email/                 # Sleep report, weekly sending, templates
│   └── report/                # Report PDF
├── emails/                    # React Email templates (WeeklyReport)
└── types/                     # database.ts (schema) and index.ts (domain types)
public/
├── sw.js                      # Service Worker: shows push and handles clicks
└── brand/                     # Logo
```

### Authentication and routing (`src/middleware.ts`)

1. On every request (except static files/images), creates a Supabase SSR client and refreshes the session via cookies.
2. Public routes: `/`, `/login`, `/register`, `/auth/*`, `/invite/*`, `/api/family/accept/*`.
3. No user on a private route → redirect to `/login?redirect=<route>`.
4. Signed-in user on `/login`, `/register` or `/` → redirect to `/app`.
5. `/landing` (legacy URL) → `/`.

Sign-up confirmation: `emailRedirectTo` points to `/auth/callback` (PKCE flow with `code`); the `/api/auth/confirm` route (`verifyOtp` with `token_hash`) exists as an alternative for templates that send `token_hash`.

### Data flow

```
Component ──(TanStack Query / fetch)──▶ Route Handler /api/* ──▶ Supabase (RLS, user client)
    │                                            └──▶ admin client (crons, invites, family push)
    └── Zustand persist (active timer in localStorage) ── syncs with in-progress sleep_sessions
```

- **Timer**: timer state lives in `localStorage` so it survives reloads; the in-progress session in the database (`end_time = null`) is the source of truth across devices/caregivers.
- **Family activity**: when a sleep starts/stops or a feed is logged, the client calls `/api/family/sleep-activity` or `/feeding-activity` (fire-and-forget), which writes to the log and sends push to the other members (`src/lib/notifications/familyActivity.ts`). The `useFamilyActivityToasts` hook shows real-time toasts.
- **Push**: `usePushNotifications` registers `public/sw.js`, subscribes with the VAPID key and stores it in `push_subscriptions` (re-syncs on mount).

### Roles and modes

| Role | Can |
| --- | --- |
| `owner` | everything, including inviting, changing roles and removing members |
| `caregiver` | log sleep/feeding and post notes |
| `viewer` | view only |

`ui_mode = 'nanny'` (Nanny mode) restricts navigation to `/app` and `/settings` (`NannyRouteGuard` + `getNavLinks`).

## API Routes

| Route | Methods | Description |
| --- | --- | --- |
| `/api/sleep` | GET, POST | List / create sleep sessions |
| `/api/sleep/[id]` | GET, PUT, DELETE | Read / update (finish, review) / delete a session |
| `/api/ai/suggest` | POST | Next nap/night sleep (**deterministic**, no LLM) |
| `/api/ai/chat` | POST | AI chat (streaming) |
| `/api/ai/regression` | POST | AI sleep regression analysis |
| `/api/feeding/suggest` | POST | Next feed (deterministic) |
| `/api/suggestions/feedback` | POST | 👍/👎 on the nap suggestion |
| `/api/profile` | GET, PATCH | User profile (name, relation, nanny mode) |
| `/api/family/invite` | GET, POST, DELETE | List / create / revoke invites |
| `/api/family/accept/[token]` | GET, POST | View / accept an invite (**public**) |
| `/api/family/members` | GET, PATCH, DELETE | Members, change role, remove (owner) |
| `/api/family/notes` | GET, POST, DELETE | Notes board |
| `/api/family/activity` | GET | Activity feed |
| `/api/family/sleep-activity` | POST | Log sleep start/stop + push to family |
| `/api/family/feeding-activity` | POST | Log feeding + push to family |
| `/api/notifications/subscribe` | POST, DELETE | Subscribe / deactivate push |
| `/api/notifications/test` | POST | Send a test push |
| `/api/notifications/dispatch` | GET | **Cron**: "nap coming up" / "past the wake window" alerts |
| `/api/email/report` | POST | On-demand report (7/14/30 days; limited to 1/hour per period) |
| `/api/email/weekly` | GET | **Cron**: weekly report |
| `/api/auth/confirm` | GET | Email confirmation via `token_hash` |

## Domain Logic

Everything in `src/lib/` is plain, deterministic TypeScript — a good starting point for tests.

- **`sleep/wakeWindows.ts`** — wake-window table by age (e.g. 0–6 weeks: 45–60 min; 9–12 months: 180–240 min) and green/yellow/red status.
- **`sleep/schedules.ts`** — targets for total sleep, number of naps and night sleep per age range.
- **`sleep/computeNapSuggestion.ts` + `inferNextSleepKind.ts`** — suggests the next window and whether it's a nap or night sleep (based on time of day, history — median night-sleep start with ≥ 3 nights — and schedule).
- **`sleep/sessionDayAllocation.ts`** — splits sessions crossing midnight across local calendar days (the basis of all daily statistics).
- **`sleep/statistics.ts`** — daily totals, naps/day, longest night stretch, heatmap, overall and last-24h stats.
- **`sleep/regression.ts`** — sleep debt vs. the age target and known regression windows.
- **`sleep/environmentCorrelation.ts`** — temperature/TOG/weather × quality and duration.
- **`sleep/clothingRecommendation.ts`** — recommended clothing by temperature, sack type and TOG.
- **`feeding/computeFeedingSuggestion.ts`** — next feed from the recent average interval; age-based fallback (`feedingIntervals.ts`).
- **`notifications/dispatch.ts`** — for each user with push enabled, outside quiet hours and with no sleep in progress: sends `NAP_SOON` when `alert_before_minutes` (default 15) remain until the end of the window and `OVERDUE` once it has passed. Deduped via `notification_events`.
- **`ai/analyzeSleep.ts` + `ai/prompts.ts`** — builds the sleep context in the browser's timezone and uses PT-BR prompts.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Development server at `http://localhost:3000` |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (`eslint-config-next`) |
| `npx tsc --noEmit` | Type check |
| `npx shadcn add <component>` | Add a shadcn component to `src/components/ui` |

## Testing and Quality

```bash
npm test            # unit tests (Vitest)
npm run test:db     # database tests (pgTAP; needs Docker and `npx supabase db start`)
```

CI (GitHub Actions) runs lint, `tsc`, tests, build and database tests on every PR. Before opening a PR, run locally:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

For database changes, see [docs/CONTRIBUTING-DB.md](docs/CONTRIBUTING-DB.md).

## Deployment (Vercel)

The project targets **Vercel** (`vercel.json`).

1. Import the repository into Vercel (detected framework: Next.js).
2. Set **all** environment variables from the table above for *Production* (and *Preview*, if you want).
3. Set `NEXT_PUBLIC_APP_URL` to the final domain and add `https://<domain>/auth/callback` to the Supabase Redirect URLs.
4. Deploy: every push to `main` triggers a production deployment.

### Crons

`vercel.json` schedules only the weekly email:

```json
{ "crons": [{ "path": "/api/email/weekly", "schedule": "0 11 * * 1" }] }
```

Every Monday at 11:00 UTC (08:00 Brasília time). With `CRON_SECRET` set, Vercel sends `Authorization: Bearer <CRON_SECRET>`.

**Nap alerts (`/api/notifications/dispatch`) are not scheduled.** They need to run frequently (e.g. every 5 min). Options:

- Add it to `vercel.json` (`"schedule": "*/5 * * * *"`) — requires a Vercel plan that allows frequent crons;
- Or use an external scheduler (GitHub Actions, cron-job.org, Supabase `pg_cron` + `pg_net`, Upstash QStash):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/notifications/dispatch
```

Manually test the weekly email:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/email/weekly
# {"ok":true,"sent":1,"skipped":0,"timestamp":"..."}
```

### Other platforms

Runs on any Node host (`npm run build && npm run start`, port 3000) or in Docker using the standard Next output. In that case, configure the crons externally with the `Authorization` header.

## Troubleshooting

**Infinite redirect to `/login` / session doesn't persist**
Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and make sure the domain is in the Supabase Redirect URLs.

**`/login?error=auth` or `?error=confirmation` after clicking the email link**
The link expired or the Redirect URL isn't registered. Check that the email template and the Redirect URL point to the same domain as the app.

**Data doesn't show up / permission error**
It's almost always RLS: check the policies and the `get_user_family_ids` / `user_can_write_family` functions.

**Photo upload fails ("Erro ao enviar foto")**
Create the `baby-avatars` bucket as public and allow uploads for authenticated users. `next.config.ts` already allows images from `*.supabase.co/storage/v1/object/public/**`.

**Push doesn't arrive**
- Requires HTTPS (or `localhost`) and browser permission. On iOS it only works with the app added to the home screen (iOS 16.4+).
- Check all three VAPID variables — `VAPID_CONTACT_EMAIL` must start with `mailto:`.
- Use **Configurações → Notificações → Testar** (Settings → Notifications → Test, `/api/notifications/test`).
- Remember that dispatch needs a scheduler (see [Crons](#crons)).

**`RESEND_API_KEY not configured` / email not sent**
Set the key and verify the `soninho.baby` domain in Resend (or change `FROM` in `src/lib/email/sleepReport.ts`).

**`401 Unauthorized` on crons**
The header must be exactly `Authorization: Bearer <CRON_SECRET>`, and the variable must exist in the environment.

**AI returns a 500 error**
Check `OPENAI_API_KEY` and your account credits.

**Wrong times**
The app defaults to `America/Sao_Paulo`; the browser timezone is sent with AI/suggestion calls, and the notification timezone is stored in `notification_preferences.timezone`.

## License

[MIT](LICENSE) © 2026 engviniciusbs
