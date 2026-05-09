# Gordhamer Family Hub — One-Time Setup

This is the ~30 minutes of clicking-around you need to do once, before I can scaffold the Next.js app. You're creating accounts and copying credentials. None of this writes any code.

**What you'll end up with:** a Supabase project (database + auth + file storage), Google OAuth credentials so the family can sign in with their Google accounts, magic-link email enabled (for anyone without Google), a Vercel account for hosting, and a GitHub repo for the code. At the end you'll have a `.env.local` file with five values that I'll wire into the Next.js app.

**Total time:** ~30 minutes. Each section is independent — if you get stuck, paste the error to me and I'll help.

---

## Part 1 — Supabase project (10 min)

### 1.1 Create the project

1. Go to **https://supabase.com** and sign in with your Google account.
2. Click **New project**. You'll be asked to create an organization first if you don't have one — name it "Gordhamer Family" (or just "Personal").
3. Project settings:
   - **Name:** `gordhamer-hub`
   - **Database password:** click *Generate*, then copy it somewhere safe (1Password, Apple Keychain). You won't need it day-to-day, but you'll want it if anything ever breaks.
   - **Region:** pick the one closest to most of the family — `East US (North Virginia)` is the standard choice for the eastern US.
   - **Pricing plan:** Free. The free tier covers everything we need (500 MB database, 1 GB storage, 50 K monthly active users — way more than 8 family members will use).
4. Click **Create new project**. It takes 2-3 minutes to provision.

### 1.2 Run the schema

1. Once the project is ready, in the left sidebar click **SQL Editor**.
2. Click **+ New query**.
3. Open the file `gordhamer-hub-web/supabase/schema.sql` from this project folder, copy the entire contents, paste it into the SQL editor.
4. Click **Run** (or press ⌘+Enter).
5. You should see "Success. No rows returned." If you see an error, copy it and paste it to me.

This creates every table, security policy, and trigger the app needs — and seeds it with the eight Gordhamer family members and a default scripture reading plan.

### 1.3 Copy the API keys

1. In the left sidebar click **Project Settings** (gear icon at the bottom) → **API**.
2. Copy these three values into a scratch file (you'll put them in `.env.local` later):
   - **Project URL** — looks like `https://abcd1234.supabase.co`
   - **anon public** key — long string starting with `eyJ...`
   - **service_role** key — also starts with `eyJ...`. This one is sensitive — used only on the server, never exposed to the browser.

✅ Supabase is done. Move on.

---

## Part 2 — Google OAuth credentials (10 min)

This lets family members sign in with "Continue with Google."

### 2.1 Create a Google Cloud project

1. Go to **https://console.cloud.google.com**. Sign in with your Google account.
2. At the top, click the project dropdown → **New Project**.
   - **Project name:** `gordhamer-hub`
   - **Organization:** No organization.
3. Click **Create**, then select the new project from the dropdown.

### 2.2 Configure the OAuth consent screen

1. Left sidebar → **APIs & Services** → **OAuth consent screen**.
2. **User Type:** External. Click **Create**.
3. Fill in:
   - **App name:** `Gordhamer Family Hub`
   - **User support email:** your email
   - **Developer contact email:** your email
   - Leave everything else blank for now.
4. Click **Save and Continue**.
5. **Scopes:** click **Add or Remove Scopes**, check `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`. Click **Update**, then **Save and Continue**.
6. **Test users:** click **+ Add users** and add your email plus the kids' Google addresses (so they can test before we publish). You can add up to 100 test users — way more than the family. We can publish to all Google users later if you want.
7. **Save and Continue** through the summary.

### 2.3 Create the OAuth client

1. Left sidebar → **APIs & Services** → **Credentials**.
2. Click **+ Create Credentials** → **OAuth client ID**.
3. **Application type:** Web application.
4. **Name:** `Gordhamer Hub Web`.
5. **Authorized redirect URIs:** click **+ Add URI**. The URI you need is your Supabase auth callback. Get it from Supabase: **Authentication** → **Providers** → click **Google** → copy the **Callback URL** (looks like `https://abcd1234.supabase.co/auth/v1/callback`). Paste into the redirect URIs field here.
6. Click **Create**.
7. A popup shows your **Client ID** and **Client Secret**. Copy both into your scratch file.

### 2.4 Plug Google into Supabase

1. Back in Supabase: **Authentication** → **Providers** → **Google**.
2. Toggle **Enable Sign in with Google** to ON.
3. Paste in the **Client ID** and **Client Secret** you just created.
4. Click **Save**.

### 2.5 Enable magic-link sign-in (for anyone without Google)

1. Still in Supabase: **Authentication** → **Providers** → **Email**.
2. Toggle **Enable Email provider** to ON if it isn't already.
3. Make sure **Confirm email** is OFF (otherwise magic links require a separate confirmation flow). Magic links are already a confirmation step on their own.
4. Click **Save**.

That's it — anyone whose email is on the allowlist can now sign in either via Google or by emailing themselves a sign-in link.

✅ Sign-in is set up. Move on.

---

## Part 3 — GitHub + Vercel (10 min)

### 3.1 GitHub repo

1. Go to **https://github.com**. Sign in (or sign up if you don't have an account).
2. Top-right **+** → **New repository**.
3. Settings:
   - **Repository name:** `gordhamer-hub`
   - **Visibility:** Private — this is family stuff.
   - **Initialize:** leave the README/gitignore boxes unchecked — I'll initialize when I scaffold.
4. Click **Create repository**. Copy the SSH or HTTPS clone URL from the next page.

### 3.2 Vercel account

1. Go to **https://vercel.com/signup**. Sign up with your GitHub account (so Vercel can deploy from your repo).
2. Pick the **Hobby** plan (free).
3. When prompted, **install the Vercel GitHub app** and grant it access to the `gordhamer-hub` repo (or all your repos if that's easier).

We don't need to deploy anything yet — that happens after I scaffold the Next.js app.

✅ GitHub + Vercel ready.

---

## Part 4 — Hand the credentials back to me

Once everything above is done, create a file at `gordhamer-hub-web/.env.local` (this file should NEVER be committed to git — `.gitignore` already excludes it). Put these five values in it:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
GITHUB_REPO_URL=git@github.com:YOUR_USERNAME/gordhamer-hub.git
```

Where to find each:

| Variable | Where |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role (sensitive — used only on the server) |
| `NEXT_PUBLIC_SITE_URL` | leave as `http://localhost:3000` for now |
| `GITHUB_REPO_URL` | from the GitHub repo page you just created |

Once that's in place, tell me **"ready"** and I'll start scaffolding the Next.js app.

---

## How the allowlist works

The schema seeds the allowlist with `josephgordhamer@gmail.com`, so you'll be able to sign in immediately and become the first admin automatically. Once you're signed in, you can add the other family members from the admin UI (or directly via the SQL editor — the table is `public.allowlist`, columns `email` and `preferred_name`).

Anyone who tries to sign in with an email NOT on the allowlist will be bounced back to the login page — Supabase will create their auth user, but our trigger won't create a profile row, and the middleware uses "no profile" as the deny signal.

---

## Troubleshooting

**"Permission denied" running the schema in Supabase SQL editor.** You're signed in as the wrong account. Make sure you're the owner of the project.

**Google OAuth "redirect_uri_mismatch" later when testing.** The redirect URI in Google Cloud Console must exactly match the one Supabase shows you, including https. No trailing slash.

**Magic link emails go to spam.** During free-tier development, Supabase sends from a generic noreply address — Gmail sometimes spams it. After we deploy, we can configure a custom SMTP (SendGrid, Resend) to fix this. Not urgent for testing.

**Vercel says it can't see your repo.** During Vercel signup, the GitHub app installation step might have only granted access to "selected repositories" — go to GitHub → Settings → Applications → Vercel → Configure, and add the `gordhamer-hub` repo to its allowed list.

**Schema run partially failed.** The schema uses `IF NOT EXISTS` and `DROP/CREATE` patterns so it's safe to re-run. If a single statement fails, fix the cause and re-run the whole file.
