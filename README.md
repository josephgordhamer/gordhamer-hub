# Gordhamer Family Hub

Family hub for the Gordhamer family — Job Board, Events, Calendar, Contacts, personal pages, Scripture Study, Fun & Games, and Resources. Mobile-friendly and accessible from anywhere.

Stack: Next.js 14 (App Router) · Supabase (Postgres + auth + storage + realtime) · Vercel.

## First run

You should already have completed the steps in `SETUP.md` (Supabase project, schema, Google OAuth, magic-link, GitHub repo, Vercel account). If not, do those first.

```bash
# from this directory
npm install
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`. Sign in with your Google account (or request a magic link). Your email must be on the `allowlist` table — Joseph's email is seeded automatically; he can add the rest of the family from the admin UI.

## Project layout

```
src/
  app/
    layout.tsx          root html, fonts, body
    page.tsx            / -> redirects by auth status
    globals.css         classic & elegant theme tokens + base styles
    login/              public sign-in page (Google + magic link)
    auth/callback/      OAuth + magic-link code exchange
    (authed)/           protected route group
      page.tsx          dashboard
      jobs/             Job Board (calendar with rotations, single-day drilldown)
      events/           events with subtasks
      calendar/         monthly calendar view
      contacts/         family directory
      pages/            personal pages + design-request queue
      scripture/        reading plan + discussions
      games/            Fun & Games
      resources/        shared resources
      admin/            allowlist + page-request review
  components/           shared UI primitives
  lib/supabase/
    server.ts           server-side client
    client.ts           browser client
    middleware.ts       middleware client + auth+allowlist redirect helper
  middleware.ts         Next.js middleware entry
supabase/
  schema.sql            full schema, RLS, triggers, realtime publication
SETUP.md                one-time setup runbook
```

## Auth + access flow

1. Unauthed visit to any `(authed)` route → middleware redirects to `/login?next=...`.
2. Login page offers two paths:
   - **Continue with Google** → `supabase.auth.signInWithOAuth({ provider: "google" })`
   - **Email me a sign-in link** → `supabase.auth.signInWithOtp({ email })`
3. Both flows land on `/auth/callback?code=...` which exchanges the code for a session cookie.
4. Middleware then checks: does this user have a row in `public.profiles`? If not → they're not on the allowlist → redirect back to login with a friendly "ask Joseph to add you" message.
5. Authed + allowlisted users get the full app.

## Build phases

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Schema + RLS | ✅ |
| 2 | Setup runbook | ✅ |
| 3 | Next.js scaffold + auth | next |
| 4 | Dashboard, Contacts, Family Pages | |
| 5 | Job Board (calendar + rotations + overrides) | |
| 6 | Events + Calendar + remaining sections | |
| 7 | Deploy to Vercel | |
| 8 | Family onboarding doc | |

## Environment variables

See `.env.example`. Real values live in `.env.local` (gitignored).

## Notes

- Uses `@supabase/ssr` (not the deprecated `auth-helpers-nextjs`).
- Soft-delete via `deleted_at` is preferred over `DELETE`; only admins (`is_admin = true` on profiles) have row-level permission to hard-delete.
- Realtime subscriptions on `jobs`, `job_completions`, `job_overrides`, `events`, `personal_pages`, `page_requests`, etc. — so a checkmark on Mom's phone shows up live on Dad's laptop.
- The classic & elegant visual theme from the prototype carries over: navy + cream + gold, Garamond/Georgia serifs, double-rule borders, `❦` ornaments.
