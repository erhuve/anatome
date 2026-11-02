# Production deployment

Primary URL: https://anato.meme

## Cloudflare Pages

- Project: `anatome`, connected to `erhuve/anatome`.
- Production branch: `main`; pushes trigger automatic builds and deployment.
- Repository root: `/` (the repository contains the app directly at its root).
- Build command: `npm run build`.
- Build output: `dist`.
- Build-time configuration: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_POSTHOG_PROJECT_TOKEN`, and `VITE_POSTHOG_HOST`. See [analytics setup](analytics.md) for the PostHog project and verification steps. PostHog variables must be added to Cloudflare Pages before rebuilding; local `.env.local` is not uploaded by Git.
- Pages hostname: https://anatome.pages.dev.
- Dashboard: https://dash.cloudflare.com/ffd5ae72e2f3a3655317086208a55d0d/pages/view/anatome.

The apex DNS record is a proxied CNAME to `anatome.pages.dev`. The custom domain
is Active with SSL enabled. `www` is a proxied CNAME to `anato.meme`. A Single
Redirect matches `(http.host eq "www.anato.meme")` and redirects permanently to
`concat("https://anato.meme", http.request.uri.path)`, preserving the query string.

The current muscle model is 20.85 MiB, below Pages' 25 MiB individual-file limit.
Check this limit again if replacing anatomy assets. Include all models,
histology images, attribution files, and other public assets in each deployment.

## Authentication

Supabase Site URL is `https://anato.meme`. The exact production redirect URLs are:

```text
https://anato.meme/
https://anato.meme/?atlas=muscles
https://anato.meme/?atlas=skeleton
https://anato.meme/?atlas=landmarks
https://anato.meme/?atlas=bones
```

Google's existing web OAuth client includes `https://anato.meme` as an authorized
JavaScript origin. Its redirect URI remains:

```text
https://lyrjoqtvinsridskgsnq.supabase.co/auth/v1/callback
```

Google's publishing status is **In production**, verified in the Google Auth
Platform console on November 2, 2026. The app name is configured as **Anatomeme**.
The owner-approved privacy policy and terms are published at
https://anato.meme/privacy and https://anato.meme/terms and linked from the app.
Google's branding settings include both public policy URLs and the homepage.
Only basic Google sign-in/profile access is requested. Production publishing does
not itself mean that custom consent-screen branding has passed Google's separate
brand verification process.

## Verified on November 2, 2026

- Cloudflare production build and deployment succeeded.
- `https://anato.meme` loads over HTTPS.
- Muscle and skeletal models render; detailed landmark specimens load.
- Google sign-in returns to the live domain and reads existing account history.
- The signed-in session and account coverage survive a page refresh.
- Privacy and terms pages load with Anatomeme branding.
- Google Auth Platform reports **In production**.
- `https://www.anato.meme/?atlas=landmarks` redirects to the primary domain and
  preserves the collection query.

No synthetic quiz answers were added to the owner's history during deployment
verification. A second account, mobile device, offline upload, and new production
answer write were not separately exercised in this session.

## Ongoing operation

Review builds under the Pages project's Deployments tab. Its deployment controls
provide rollback if a new release fails. Supabase remains on its existing Free
plan; low-activity projects can pause. Account availability, backup arrangements,
and usage limits should be reviewed before relying on this as a continuously
available public service. No paid plan was purchased during this setup.
