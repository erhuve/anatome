# Account and progress setup

Anatome uses Supabase Auth for Google sign-in and an append-only Postgres event
table for private study history. The 3D models remain static website assets.
Guest practice remains available without an account. An explicit import brings
this browser's existing guest history into the signed-in account; signing in
alone does not claim a shared device's history.

Project: [lyrjoqtvinsridskgsnq](https://supabase.com/dashboard/project/lyrjoqtvinsridskgsnq).
Use the **Free** plan; this setup does not require a paid Supabase feature.

## 1. Create the database table and ownership rules

Open the project's [SQL Editor](https://supabase.com/dashboard/project/lyrjoqtvinsridskgsnq/sql/new),
paste the complete contents of [`supabase/setup.sql`](../supabase/setup.sql),
and run it. Re-running the script retains existing events.

This creates `public.study_events`, enables Row Level Security, denies anonymous
access, and grants signed-in users only `SELECT` and `INSERT` on their own rows.
Clients cannot update or delete past events. Retried inserts use a stable event
ID, so reconnecting does not duplicate an answer. User deletion cascades to that
user's events.

Then run [`supabase/verify-rls.sql`](../supabase/verify-rls.sql) in the SQL Editor.
It temporarily creates two fixture users, checks ownership and anonymous access
using the actual Postgres roles, and rolls everything back. A failure raises an
error; success reports that the permission checks passed. If it fails, run
`rollback;` before continuing. This script is a manual verification step, not a
claim that the hosted database has already been configured or tested.

## 2. Enable Google sign-in

Use [Supabase's Google sign-in guide](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
alongside these project-specific values:

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create or
   select a project. In **Google Auth Platform**, configure the app's branding,
   audience, and consent screen. For public consumer accounts choose an external
   audience. While the Google app is in testing, add the Google accounts that
   will test sign-in as test users.
2. Configure only the basic `openid`, email, and profile scopes. Create an OAuth client with application type **Web application**.
3. Add this authorized JavaScript origin for local development:
   `http://127.0.0.1:5173`. If using `http://localhost:5173`, add that origin too.
4. Add this exact authorized redirect URI:

   ```text
   https://lyrjoqtvinsridskgsnq.supabase.co/auth/v1/callback
   ```

5. Copy the Google client ID and client secret into the project's Google
   provider settings under **Authentication → Sign In / Providers → Google**,
   enable the provider, and save. Enter the secret directly in Supabase; never
   put it in a `VITE_` variable, the source code, or a chat message.
6. Under **Authentication → URL Configuration**, use this local Site URL:
   `http://127.0.0.1:5173`. Allow these exact redirect URLs:

   ```text
   http://127.0.0.1:5173/**
   http://localhost:5173/**
   ```

The Google callback URL above belongs to Supabase. The redirect allow-list
belongs to the app. They are separate settings.

Before public deployment, set the Site URL to the app's HTTPS address and add
that HTTPS origin in Google plus its exact return URL in Supabase. Publish the
Google consent screen when accounts beyond the test-user list need access.
The local wildcards also allow collection query strings such as `?atlas=muscles`. For production, add only the exact application URLs you intend to use. The production address is now `https://anato.meme`; see [deployment status](deployment.md) for the configured URLs and remaining Google publishing step.

## 3. App configuration

Create `site/.env.local` (or `.env.local` when already inside `site/`):

```dotenv
VITE_SUPABASE_URL=https://lyrjoqtvinsridskgsnq.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

The publishable key comes from the project's **Connect** dialog and is designed
for browser use. The database password, Google client secret, Supabase secret
key, and legacy service-role key must never be shipped to the browser. See
[Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).

Restart Vite after changing environment variables. Set the same two variables
on the static host before its production build. Keep `.env.local` out of Git.

## 4. Verify the app

1. Run `npm run build` and `npm test` from `site/`.
2. Run `npm run dev`, then open `http://127.0.0.1:5173/` in a normal browser tab.
   Google OAuth can be blocked inside embedded previews or cross-site frames.
3. Practice as a guest and confirm it survives refresh.
4. Sign in with Google. Import device history only if it belongs to this account.
5. Complete sign-in in the same browser and exact origin that started it (for example, keep using `127.0.0.1`, rather than switching to `localhost`, during the redirect). Answer a question, refresh, and check the same account in another browser after signing in there separately.
6. Sign out and use a second Google account. Its history must remain separate.
7. Temporarily go offline, answer a question, reconnect, and verify the pending
   answer syncs once without being duplicated.

Answers upload immediately and pending uploads retry every 30 seconds. Other-device history refreshes on app focus/reconnect (throttled to once a minute) or via Refresh in My progress; the app does not repeatedly poll full history.

The Free plan has usage limits and can pause after a week of low activity; see
[current pricing](https://supabase.com/pricing). Account data uses Supabase;
guest data and account caches depend on this browser's available storage.

## Setup status

The supplied Project URL and publishable key are configured in `.env.local`, and the public auth settings endpoint accepts them.

The hosted database setup completed successfully in the [Supabase SQL Editor](https://supabase.com/dashboard/project/lyrjoqtvinsridskgsnq/sql/68600668-5468-459a-8b95-7d61aad68782). The hosted [permission verification](https://supabase.com/dashboard/project/lyrjoqtvinsridskgsnq/sql/f57aa64e-bb70-4bf8-bbdf-a480946288d8) passed: own reads/inserts work, duplicate retries are idempotent, cross-user reads/inserts are denied, and authenticated updates/deletes plus anonymous reads/inserts are denied. The verification rolled back, with **0 remaining fixture users and 0 remaining fixture events**. An independent REST request confirmed anonymous reads return permission denied.

Google sign-in is enabled and the complete Google consent and PKCE callback succeeded in Chrome at `http://127.0.0.1:5173/?atlas=muscles`. After explicit user approval, the browser’s 26 genuine guest answers were imported into the intended account. My progress showed All progress synced, 26 answers, 46% overall accuracy, and the original 15 muscle / 11 bone pass coverage. Reloading the app retained the signed-in session, the same history, and completed sync; the import prompt was absent. No fabricated quiz answers were added.

The production build and all 60 unit tests passed, along with the anatomy integration checks. The live guest progress panel and unfinished Google provider handling were checked in Chrome. The build also passes after adding explicit feedback for failed PKCE session initialization. The Google callback and authenticated cloud history read are verified. The [hosted account-count query](https://supabase.com/dashboard/project/lyrjoqtvinsridskgsnq/sql/fc8d6f3f-7393-45c1-a6f4-6a529aea4016) confirmed the account changed from 0 events to exactly 1 import event containing all 26 answers. This verifies the real authenticated browser insert and history-read path independently of local cache. The subsequent page refresh preserved the imported history. The ordinary answer branch is covered by the progress tests; no extra quiz answer or second device was separately exercised during this live check. The existing hosted ownership/insert tests remain passed. The public HTTPS address is now `https://anato.meme`; production sign-in and history reads were verified there on November 2, 2026. See [deployment status](deployment.md) for the pending general-audience Google publishing step.
