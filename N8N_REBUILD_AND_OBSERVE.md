# Debrief Recovery: Rebuild n8n + Observe Results

Date: 2026-04-25  
Timezone: America/Toronto

## Important first decision (choose one)

You currently have a live Supabase Telegram ingestion pipeline.

- If Telegram webhook points to Supabase, n8n Telegram Trigger will NOT receive messages.
- If Telegram webhook points to n8n, Supabase webhook pipeline will stop receiving messages.

Pick one source of truth first.

## Option A (Recommended): Keep Supabase Live, Observe in Debrief Viewer

Use this if you want the current "fast ack + background refine" behavior.

1. Open `debrief-viewer.html` in your local web server (not file://).
2. Log in with your Debrief account.
3. Check **My Debriefs** list.
4. Use filters:
   - Domain
   - Topic search
   - Tags
5. Open a debrief and confirm:
   - Title/domain/topic/tags
   - Parse status + confidence
   - Raw notes + summary
6. For admin-level checks, open Supabase Table Editor:
   - `debriefs` table for saved notes
   - `parse_jobs` table for queued/retry jobs

Quick SQL to verify latest intake:

```sql
select id, created_at, note_title, domain, topic_primary, parse_status
from public.debriefs
order by created_at desc
limit 20;
```

## Option B: Rebuild old n8n -> Google Sheets pipeline

Use this if you want Telegram messages appended to Google Sheets directly.

### Files

- Rebuild import file: `n8n-debrief-rebuild.json`
- Previous export backup: `bjj workflow codex.txt`

### Rebuild steps in n8n

1. Open `https://n8n.jitsudo.ca`.
2. Create new workflow.
3. Import from file: `n8n-debrief-rebuild.json`.
4. Open node **Parse with Claude**:
   - Replace `PASTE_NEW_CLAUDE_KEY_HERE` with your Claude API key.
5. Open node **Append to Sheet**:
   - Confirm Google credential is connected.
   - Confirm Spreadsheet ID is correct.
   - Confirm tab name is correct (default `Sheet1`).
6. Open node **Telegram Trigger**:
   - Connect Telegram bot credential/token.
7. Save workflow.
8. Toggle workflow **Active**.
9. Send Telegram test:
   - `#debrief worked on side control frames and timing`
10. In n8n:
   - Check Executions tab for success.
11. In Google Sheet:
   - Confirm a new row appears.

## Why messages may look "missing"

1. Message did not start with `#debrief`.
2. Workflow not active.
3. Telegram webhook currently points to Supabase instead of n8n.
4. Google Sheets credential disconnected.
5. Claude/API node failed before append.

## Recommended operating model

To avoid split-brain:

- Keep Supabase as primary system.
- Use Debrief Viewer + Supabase table checks for truth.
- Add a separate n8n workflow later that syncs from Supabase to Sheets (reporting/export).
