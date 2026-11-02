# PostHog analytics

Project: [anatome, 705228](https://us.posthog.com/project/705228).
The integration follows the [React SDK setup](https://posthog.com/docs/libraries/react).

## Configuration

Set these in `.env.local` for local development and in Cloudflare Pages build
environment variables for production (and Preview, if wanted):

```dotenv
VITE_POSTHOG_PROJECT_TOKEN=<project token from PostHog project settings>
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

The actual project values are configured in the ignored local env file. The
project token is intended for the browser; never use a personal API key here.
Vite embeds these values at build time, so rebuild after changing them. Restart
the Vite dev server after editing `.env.local`.

With either value missing, analytics stays inactive. Set
`VITE_POSTHOG_ENABLED=false` to disable it explicitly. Events include
`app=anatomeme` and `environment=development|production`; filter development
events out of production reports.

## Events

| Event | When | Main properties |
| --- | --- | --- |
| `$pageview` | Initial workspace and mode/collection/lesson navigation | mode, collection, meme_id, activity, sanitized URL |
| `$pageleave` | Leaving the page | SDK page/session context |
| `quiz_set_started` | A model set or meme quiz opens, including retries | collection, question_count, session_mode |
| `quiz_answered` | A quiz or study self-check answer is submitted/revealed | question_id, collection, correct, revealed, answer_mode, activity |
| `quiz_set_completed` | The learner continues from the final answer to results | collection, question_count, correct_count, answered_count, skipped_count, session_mode |
| `study_target_viewed` | A structure opens in study or review | question_id, collection, source |
| `study_selection_saved` | Study settings are applied | collection, target_count, custom_selection |
| `sign_in_started` | Google OAuth begins | provider |

Quiz answers do not include submitted text or selected answer strings. Reveals
count as answered and incorrect, matching the progress store. Model load failures
skipped by the learner count separately. An exhausted saved pass does not emit
a new start/completion event merely because its results screen renders.

Supabase session changes identify by stable account UUID, including restored
sessions. Logout or account switching resets the analytics identity. Names,
emails, notes, and historical progress imports are not sent. Events remain
anonymous until sign-in; PostHog can associate the preceding anonymous activity
with that account. Analytics never reads or writes the study progress database.

Autocapture, session replay, surveys, automatic exceptions, heatmaps, and automatic
performance capture are disabled. Pageviews are explicit because app navigation
uses query parameters and `replaceState`. A send-time URL filter also removes
OAuth codes, fragments, arbitrary query parameters, and referrer query data
except recognized navigation parameters, including nested initial person fields.
The [privacy page](../public/privacy.html) describes this collection.

## Verify

Run `npm run build` and `npm test`. Start `npm run dev`, open the app, switch
collections/modes, and view a meme lesson. In browser Network, check requests to
the configured PostHog ingestion host. In the project's Activity feed, confirm
the pageviews and study events arrive with `environment=development`.

Submit one quiz answer in a disposable guest browser profile to verify
`quiz_answered`; continue to results to verify `quiz_set_completed`. Do not use
an owner's account to generate synthetic study history. Check that signing out
changes the distinct ID and that callback URLs never include `code` or tokens
in event properties. Blocking PostHog should leave practice usable.
