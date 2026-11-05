# Optional leaderboard

The leaderboard reuses the existing Supabase project and Google sign-in.
It needs no extra provider, paid feature, scheduled job, Edge Function, realtime
subscription, or continuously polling browser. The app loads the board when it
opens and on explicit Refresh. This is designed for
the existing Free plan; actual account/event volume still uses that project's
normal database, Auth, and bandwidth quotas.

## Activate the database

1. Run [`supabase/setup.sql`](../supabase/setup.sql) if account progress is not
   already configured.
2. In the same project's [SQL Editor](https://supabase.com/dashboard/project/lyrjoqtvinsridskgsnq/sql/new),
   run the complete [`supabase/leaderboard.sql`](../supabase/leaderboard.sql).
   It is safe to rerun: enrollment and earned targets remain. Existing eligible
   signed-in quiz history is backfilled.
3. Run [`supabase/verify-leaderboard.sql`](../supabase/verify-leaderboard.sql).
   It creates temporary fixture accounts and events, exercises the actual
   `authenticated` and `anon` roles, then rolls everything back. Any failing
   assertion aborts the transaction; run `rollback;` before continuing.
4. Build/deploy the app with the existing public Supabase URL and publishable
   key. No service-role key belongs in frontend configuration.

These files are deployment instructions. Their presence does not mean they
have already been run against the hosted database.

## Scoring

- One point for each **different official 3D target answered correctly in a
  signed-in quiz pass**. At launch there are 720 eligible IDs: 462 muscle,
  238 skeletal, and 20 landmark/side targets.
- Correct answers in later passes count only if that target has never earned
  a point before. Repeating the same target or retrying an upload cannot farm
  extra points. Wrong answers do not subtract points.
- A revealed answer is incorrect and earns nothing. Study self-checks,
  missed-review sessions, meme quizzes, and imported guest history earn no
  leaderboard points. They keep their usual private study-progress behavior.
- Existing eligible signed-in quiz history counts, including answers before
  joining. Timestamp values never decide rank or break ties.
- This is an all-time board. Equal scores share rank; nicknames sort equal-score
  rows alphabetically for a stable display. For example, scores 8, 8, 5 have
  ranks 1, 1, 3. The first 50 rows are returned, plus the caller's own row even
  when it falls outside those 50.

The existing progress API accepts a client's correctness boolean; this is a
casual, honor-system competition, not a secure exam or prize system. The
backend validates recognized question IDs, collections and quiz-pass shape,
and derives/caps points through unique earned targets. It does not independently
verify what a human typed, prevent alternate accounts, or make modified clients
incapable of claiming correct answers. Stronger validation would require a
separate server-authoritative challenge/answer design.

## Public identity and leaving

Joining is optional. Participants choose a public nickname; the app never
copies a Google name or email into the board. Nicknames use 3–24 ASCII letters,
numbers, spaces, underscores or hyphens, include at least one letter/number,
and are unique without regard to case. Leading/trailing spaces are trimmed.
A nickname remains reserved while its account's profile exists, including
when the participant leaves.

Leaving immediately sets the profile to unlisted, removing its public row and
participant count. Private study history and earned points remain, so rejoining
restores the score. Account deletion cascades the profile, awards and score.
Public output contains only nickname, score, rank and a caller-specific
`is_you` flag; raw account IDs, email, event records and earned question lists
are never returned.

## Backend contract

All functions are in `public` for Supabase RPC. Internal tables and the trigger
function live in `leaderboard_private`, which denies schema/table access to
`anon` and `authenticated`; RLS is enabled with no client policies. Every
`SECURITY DEFINER` function has an empty search path and qualified table names.

```ts
// anon or authenticated; no parameters
get_global_leaderboard(): {
  entries: Array<{ nickname: string; score: number; rank: number; is_you: boolean }>;
  self: { nickname: string; score: number; rank: number; is_you: true } | null;
  participants: number;
  total_questions: number;
}

// authenticated only; own profile or null; no parameters
get_leaderboard_profile(): { nickname: string; listed: boolean } | null;

// authenticated only; derives owner from auth.uid(), never a caller-supplied ID
set_leaderboard_profile({ p_nickname: string, p_listed: boolean }): {
  nickname: string; listed: boolean;
}
```

`set_leaderboard_profile` surfaces SQLSTATE `23505` for a nickname collision,
`22023` for invalid input and `42501` for missing authentication. Clients cannot
set numeric scores, edit anyone else's enrollment or read private score rows.

A study-event trigger awards recognized targets once and atomically increments
a one-row-per-account total. A separate **BEFORE INSERT** trigger takes an
account-specific transaction advisory lock for every event, including imports
and retries, before event-ID uniqueness checks. This serializes concurrent
batches for one account before either event rows, earned targets, or totals can
be locked in opposing order. The award trigger stays **AFTER INSERT**, so
`ON CONFLICT DO NOTHING` retries cannot award a duplicate point. Batches from
the app contain only the signed-in account's events; unrelated accounts run
independently except for harmless advisory-key hash collisions.

Board reads rank those totals instead of scanning full answer history.
Additional score storage is bounded by the official target catalog per account.
Offline answers appear after their normal progress upload succeeds and the
board is refreshed.

When shipping new official model questions, regenerate/extend the exact ID
catalog in `leaderboard.sql` from `modelPromptPools` and rerun the migration.
Retain old legitimate IDs/awards; the catalog is deliberately additive.
Update the 720-question expectation in the verification script when the catalog
changes. Do not replace the allowlist with an arbitrary ID prefix match.
