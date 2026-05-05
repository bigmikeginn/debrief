# Beta v1 Launch Checklist (20 Students, 2 Weeks)

Use this exactly in order.

## Phase 1: Supabase setup

1. Create a Supabase project (Free plan).
2. In SQL Editor, run:
   - `beta-v1/sql/001_schema.sql`
   - `beta-v1/sql/002_rls.sql`
   - `beta-v1/sql/003_debrief_parsing_and_search.sql`
3. In Table Editor, create your first club row in `clubs`.
4. Create your own user account in Auth (email/password or magic link).
5. Add your user to `club_memberships` with role `admin` and status `active`.

## Phase 2: Telegram bot setup

1. In Telegram, create a bot with BotFather.
2. Copy the bot token.
3. Generate a long random webhook secret value.
4. Deploy Edge Function `telegram-webhook` with JWT verification disabled:
   - `supabase functions deploy telegram-webhook --no-verify-jwt`
5. Add function secrets:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_WEBHOOK_SECRET`
   - `OPENROUTER_API_KEY`
   - `MODEL_PRIMARY=openrouter/free`
   - `MODEL_FALLBACK=openrouter/free`
   - `MAX_DEBRIEFS_PER_USER_PER_DAY=2`
   - `MAX_INPUT_CHARS=1200`
   - `DEBRIEF_COMMAND=#debrief`
6. Set Telegram webhook to:
   - `https://<your-project-ref>.functions.supabase.co/telegram-webhook`
   - Include secret token header value when setting webhook.

## Phase 3: App-side minimum UI

1. Login/signup screen.
2. "Link Telegram" screen:
   - Ask user to send a one-time code to the bot.
   - Save `telegram_links` once validated.
3. "My Debriefs" list:
   - Show only the user's own rows from `debriefs`.
   - Add search/filter by:
     - date (`debrief_date`)
     - technique (`technique` contains search)
     - technique type (`technique_type`)
4. Debrief detail:
   - Show summary + structured sections.
   - Share toggle:
     - ON: set `debriefs.visibility='shared'` and add row to `debrief_shares`.
     - OFF: set `visibility='private'` and set `debrief_shares.revoked_at=now()`.
5. Shared feed page:
   - Add a user toggle bound to `user_feed_preferences.show_shared_notes`.
   - Show shared notes only when toggle is true.

## Phase 4: Student onboarding

1. Invite first 5 students (soft launch).
2. Confirm each student can:
   - log in
   - link Telegram
   - submit a debrief
   - view own history
3. Expand to 20 students.

## Phase 5: Budget and safety controls

1. Check `ai_runs` daily:
   - rows/day
   - failed runs
2. Keep strict input and daily message limits in function config.
3. If costs rise too quickly:
   - Lower daily max from 2 to 1
   - Shorten max input length
   - Use only fallback model temporarily

## Success criteria for 2-week beta

1. 70%+ of invited students submit at least 3 debriefs.
2. At least 30% voluntarily use share toggle.
3. No privacy incidents (private notes never leaked).
4. Stable webhook processing with low failure rate.
