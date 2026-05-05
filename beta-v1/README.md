# Debrief Beta v1 Build Pack

This pack is designed for a fast pilot launch with:

- No user API key management
- Telegram intake
- Account-based history in app
- Private-by-default notes
- Explicit sharing only
- Shared feed is opt-in for readers
- OpenRouter free routing by default (`openrouter/free`) with model-chain retries

## What is included

1. `sql/001_schema.sql`
   - Core tables and enums
   - Helper triggers for new users
2. `sql/002_rls.sql`
   - Row Level Security policies
   - Club and role-aware data access
3. `sql/003_debrief_parsing_and_search.sql`
   - Parsed debrief columns
   - Technique type taxonomy + search indexes
4. `sql/004_parse_pipeline.sql`
   - Universal parse pipeline columns
   - Async parse job queue (`parse_jobs`)
5. `supabase/functions/telegram-webhook/index.ts`
   - Edge Function starter for Telegram webhook ingestion
   - Budget/rate guardrails and model fallback structure
   - Writes parsed fields for search (date, technique, technique type, key points, reflections)
6. `supabase/functions/parse-refiner/index.ts`
   - Background refinement worker for `parse_jobs`
   - Stage 1 parse refinement + stage 2 optional embeddings
7. `LAUNCH_CHECKLIST.md`
   - Step-by-step launch sequence for your 2-week student pilot

## Assumptions

- One user belongs to one primary club in beta.
- Notes are private unless explicitly shared.
- Shared notes are visible only if the reader toggles `show_shared_notes = true`.
- App users sign in through Supabase Auth.
- Telegram bot writes via server-side secret keys only.

## How to apply in Supabase

1. Open your Supabase project.
2. Go to SQL Editor.
3. Run `sql/001_schema.sql`.
4. Run `sql/002_rls.sql`.
5. Run `sql/003_debrief_parsing_and_search.sql`.
6. Run `sql/004_parse_pipeline.sql`.
7. Deploy `supabase/functions/telegram-webhook/index.ts` as an Edge Function.
8. Deploy `supabase/functions/parse-refiner/index.ts` as an Edge Function.
9. Set environment secrets listed at top of the function file.
10. Configure Telegram webhook URL to the telegram-webhook endpoint.
11. Configure a `parse-refiner` schedule (every 2 minutes) to process `parse_jobs`.

## Suggested free-first guardrails

- Max debriefs per user per day: `2`
- Max message length: `1200`
- Primary model first, then fallback and model-chain retries
- Refiner schedule: every 2 minutes
- Embeddings model (low-cost): `openai/text-embedding-3-small`
- Hard daily budget limit (in code or config)

