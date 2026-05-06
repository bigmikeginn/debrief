# Debrief App Setup & Architecture

**Version:** 1.0 (beta-v1)  
**Last Updated:** 2026-05-05  
**Status:** Production (reliable model configuration in place)

---

## System Overview

Debrief is a Telegram-to-web app for martial artists (BJJ focus) to save and review training notes with AI-powered parsing. Users send training notes via Telegram bot, the system parses them into structured data, and they view/manage debriefs in a web interface.

**Stack:**
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Frontend:** Vercel (vanilla JS, static HTML)
- **Parsing Pipeline:** Two-stage AI refinement via OpenRouter API
- **Communication:** Telegram bot → webhook → Supabase

---

## Model Configuration (Current - May 2026)

### Initial Parse (`MODEL_PRIMARY` / `MODEL_FALLBACK`)
- **Primary:** `google/gemini-2.0-flash-001`
- **Fallback:** `meta-llama/llama-3.1-8b-instruct`
- **Cost:** ~$0.0001–0.0002 per parse at 1200 char max
- **Location:** `telegram-webhook` edge function (pass0)
- **Why Gemini 2.0 Flash:** Fast, reliable, avoids timeout issues. Replaces `openrouter/free` which was causing permanent parse job hangs.
- **Why Llama 3.1 8B fallback:** Different provider (hedge against outages), cheap (~$0.05/M tokens), proven for structured extraction.

### Refinement Pass (`MODEL_REFINER`)
- **Model:** `google/gemini-2.0-flash-001`
- **Cost:** ~$0.05 per 1000 debriefs
- **Location:** `parse-refiner` edge function (stages 1 & 2)
- **Why Gemini 2.0 Flash:** Already proven, fast enough to avoid edge function timeouts, reliable quality for parsing complex training notes.

### Embeddings (`EMBEDDING_MODEL`)
- **Model:** `openai/text-embedding-3-small`
- **Used in:** Stage 2 of parse-refiner (optional, skipped if disabled)

---

## Key File Locations

```
I:\My Drive\AI\Projects\Internal\BJJ Debrief\
├── beta-v1/
│   ├── supabase/functions/
│   │   ├── telegram-webhook/index.ts       [Pass 0: Initial parse from user input]
│   │   ├── parse-refiner/index.ts          [Stages 1-2: Refinement & embeddings]
│   │   └── submit-debrief/index.ts         [User submissions to Supabase]
│   ├── .env.beta.example                   [Model & secret config template]
│   └── [other deployment files]
├── landing.js                              [Landing page logic]
├── debrief-chat-widget.js                  [Web UI main script]
├── api/chat.js                             [Chat API endpoints]
└── [archive, tests, etc.]
```

---

## Recent Changes & Rationale

### Commit: "Switch parse-refiner model from free to Gemini 2.0 Flash" (2026-05-05)

**Problem:** `openrouter/free` model was causing edge function timeouts during parse-refiner execution, leaving parse jobs permanently stuck in `running` state. Users saw "Processing..." indefinitely.

**Solution:**
- Changed `MODEL_REFINER` from `openrouter/free` → `google/gemini-2.0-flash-001`
- Added `unstick_running_parse_jobs` cron job to auto-reset jobs stuck in running state for >5 minutes
- Cost increase: negligible (~$0.05 per 1000 debriefs)
- Result: Reliable, fast parsing with zero timeout risk

### Commit: "Switch primary & fallback models to reliable paid tiers" (2026-05-05)

**Problem:** Free-tier models in telegram-webhook pass0 parse had unpredictable quality and latency, though less critical than refiner since output gets overwritten.

**Solution:**
- `MODEL_PRIMARY`: `openrouter/free` → `google/gemini-2.0-flash-001` (same as refiner for consistency)
- `MODEL_FALLBACK`: `meta-llama/llama-3.3-70b-instruct:free` → `meta-llama/llama-3.1-8b-instruct` (cheaper, different provider for redundancy)
- Cleared `MODEL_CHAIN` (simpler fallback pattern, no need for chain of free models)
- Cost increase: ~$0.0001–0.0002 per user message
- Result: Consistent, reliable initial parse; fast fallback if primary fails

---

## Parsing Pipeline

### Stage 0: Telegram Webhook (Initial Parse)
**Function:** `telegram-webhook`  
**Trigger:** User sends `#debrief <note>` via Telegram  
**Output:** Initial structured parse (title, summary, domain, tags, action items)  
**Quality Gate:** Quick baseline; output always overwritten by refiner  
**Models:** PRIMARY (Gemini 2.0 Flash) → FALLBACK (Llama 3.1 8B)

### Stage 1: Parse Refiner (Refinement)
**Function:** `parse-refiner`  
**Trigger:** Async cron job processes queued parse_jobs  
**Output:** High-quality structured data, confidence score, needs_review flag  
**Quality Gate:** Confidence ≥ 0.72 → `ready`, otherwise → `needs_review`  
**Models:** REFINER (Gemini 2.0 Flash)

### Stage 2: Parse Refiner (Embeddings, Optional)
**Function:** `parse-refiner` (continuation)  
**Trigger:** Automatic after stage 1 if confidence ≥ 0.72  
**Output:** Vector embedding for semantic search  
**Models:** EMBEDDING_MODEL (OpenAI text-embedding-3-small) [if enabled]

---

## Configuration Values

| Env Var | Current Value | Purpose |
|---------|---------------|---------|
| `MODEL_PRIMARY` | `google/gemini-2.0-flash-001` | Initial parse, fast path |
| `MODEL_FALLBACK` | `meta-llama/llama-3.1-8b-instruct` | Backup if primary fails |
| `MODEL_CHAIN` | (empty) | Deprecated; no longer used |
| `MODEL_REFINER` | `google/gemini-2.0-flash-001` | Refinement pass (stages 1–2) |
| `EMBEDDING_MODEL` | `openai/text-embedding-3-small` | Embeddings (stage 2, optional) |
| `PARSE_REFINER_BATCH_SIZE` | 10 | Jobs per cron invocation |
| `PARSE_REFINER_MAX_ATTEMPTS` | 3 | Retry limit before marking failed |
| `MAX_DEBRIEFS_PER_USER_PER_DAY` | 10 | Rate limit |
| `MAX_INPUT_CHARS` | 1200 | User input size cap |
| `DEBRIEF_COMMAND` | `#debrief` | Telegram trigger keyword |

---

## Cost Estimate (Monthly)

At ~100 debriefs/month:

| Stage | Model | Cost/1K | Calls | Est. Monthly |
|-------|-------|---------|-------|--------------|
| Pass 0 | Gemini 2.0 Flash | $0.075/M input | 100 | ~$0.02 |
| Fallback (rare) | Llama 3.1 8B | $0.05/M | ~5 | ~$0.001 |
| Refiner Stage 1 | Gemini 2.0 Flash | $0.075/M input | 100 | ~$0.01 |
| Embeddings | OpenAI text-3-small | $0.02/M | ~100 | ~$0.002 |
| **Total** | | | | **~$0.033/month** |

At 1000 debriefs/month: **~$0.30/month**

---

## Deployment & Testing

### Local Testing
```bash
# Check parse-refiner endpoint (adjust URL/secret as needed)
curl -X POST https://[PROJECT_REF].functions.supabase.co/parse-refiner \
  -H "Content-Type: application/json" \
  -H "x-parse-refiner-secret: [SECRET]" \
  -d '{"limit": 5}'
```

### Deploy Edge Functions
```bash
# Requires Supabase CLI
supabase functions deploy telegram-webhook --project-ref [REF]
supabase functions deploy parse-refiner --project-ref [REF]
supabase functions deploy submit-debrief --project-ref [REF]
```

### Monitoring
- **Parse Jobs:** Check `parse_jobs` table for stuck/failed jobs
- **Debriefs:** Check `debriefs.parse_status`, `parse_confidence`, `needs_review` flags
- **Errors:** Check Supabase Edge Function logs → Logs tab

---

## Troubleshooting

**Problem:** Debriefs stuck in "Processing..."  
**Cause:** Parse job stuck in `running` state (timeout or crash)  
**Fix:** `unstick_running_parse_jobs` cron auto-resets them after 5 minutes. Manual reset: update `parse_jobs.status='queued'` in DB.

**Problem:** "Parsing your training note..." takes >30 seconds  
**Cause:** Model inference latency (rare with Gemini 2.0 Flash)  
**Fix:** Check OpenRouter API status; fallback model should kick in if primary times out.

**Problem:** Low parse confidence (`needs_review` flag set)  
**Cause:** Ambiguous or poorly formatted input  
**Fix:** User reviews & edits manually in web UI, or refiner improves with better prompting.

---

## Improvements & Roadmap

### **Phase 1: Foundation (Prioritized for May 2026)**

#### 1. Drop Telegram Entirely ⭐ HIGH PRIORITY
**Status:** Planned  
**Rationale:** Telegram is a bridge to mobile. Once iOS/Android apps with native voice recording are ready, Telegram becomes dead weight. Removing it now simplifies:
- Onboarding (no Telegram account linking)
- Auth flow (straight to app, no "setup card")
- Codebase (remove ~500 lines)
- Ops (no bot token management, webhook validation)

**Changes needed:**
- Delete `telegram_links` table via migration
- Remove `source` column from `debriefs` (all are "app" post-Telegram)
- Delete `telegram-webhook` edge function
- Remove Telegram secrets: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `DEBRIEF_COMMAND`
- Remove Telegram UI: `telegram-connect.html`, `telegram-check.html`, `telegram-confirmed.html`, telegram linking card from viewer.html
- Remove technique extraction library from remaining code if not used elsewhere
- Update signup flow: remove Telegram setup instructions

**Files affected:**
- `beta-v1/supabase/functions/telegram-webhook/` → DELETE
- `beta-v1/sql/` → Add migration to drop table & column
- `viewer.html`, `signup.html` → Remove Telegram references
- Edge function secrets in Supabase dashboard

---

#### 2. Fix Bundle Versioning ⭐ HIGH PRIORITY
**Status:** Planned  
**Rationale:** Currently shipping 5 versions of `debrief-viewer.*.js` (c–g). This causes:
- Cache confusion (browsers may load wrong version)
- Difficulty knowing which is deployed
- Hotfix smell (frequent updates suggest instability)

**Solution:** Use content-hash versioning + automated cleanup

**Implementation:**
- Replace date-based names (`20260430g`) with hash-based names (`debrief-viewer.abc123d.js`)
- Add build script to auto-generate hash: `HASH=$(echo -n "$(cat debrief-viewer.js)" | md5sum | cut -c1-8)`
- Create `deploy-manifest.json` with latest filename (single source of truth)
- Reference manifest in `viewer.html` via script tag or fetch
- Add cleanup step: delete old versioned files after deploy
- Document deploy process in README

**Files affected:**
- `viewer.html` → update script src references
- Add `build.sh` or npm script
- Add `deploy-manifest.json`
- `.gitignore` → ignore versioned bundles (keep source only)

---

#### 3. Improve Parsing Feedback ⭐ HIGH PRIORITY
**Status:** Planned  
**Rationale:** "Processing..." items feel stuck. Users don't know if they'll wait 5 seconds or 5 minutes.

**UI Changes:**
- Replace "Processing..." with progress indicator:
  ```
  ⏳ Parsing your training note...
  Stage 1 of 2 • Est. 30 seconds remaining
  ```
- Show **toast notification** when parsing completes (green checkmark)
- Add **"Check Status" refresh button** next to processing item
- For failed parses, show error: `❌ Parsing failed (check your note format) [Retry]`
- Show **confidence score** after parse completes:
  ```
  ✅ High confidence (94%)
  or
  ⚠️ Needs review (67% confidence) — title or tags may be wrong
  ```

**Backend changes needed:**
- Expose parse job status via new endpoint: `GET /api/parse-job/:debriefId` (returns stage, status, est. time remaining)
- Add `estimated_seconds` to parse_jobs table (based on stage + model latency history)

**Files affected:**
- `debrief-viewer.*.js` → Add polling for parse status, toast notifications
- `submit-debrief` edge function → Return job ID immediately, add `/api/parse-job` endpoint
- `viewer.html` → Add toast container
- `debrief-viewer.*.css` → Add toast & progress indicator styles

---

### **Phase 2: UX & Mobile Prep (June–July 2026)**

#### 4. Simplify Auth & Onboarding
**Status:** Planned after Phase 1  
- Remove Telegram setup card (depends on item 1)
- Streamline signup copy: focus on in-app notes, hint at future voice recording
- Add first-launch tooltip: "Three ways to save: 1) Type here 2) Soon: voice 3) Soon: API"
- Skip intermediate pages; go straight to archive on first login

---

#### 5. Improve Detail Panel UX
**Status:** Planned after Phase 1  
- Add action buttons to detail header: [❤️ Favorite] [✎ Edit] [⇧ Share] [⋯ More]
- Make "needs review" warnings visually prominent (yellow box with icon)
- Add inline editing toggle (avoid modal for each field)
- Improve mobile stacking (full-screen modal on small screens vs. side panel on desktop)

---

#### 6. Enhance Search & Filtering
**Status:** Planned after Phase 1  
- Expand "More filters" by default (show date range, domain, tags)
- Highlight search matches in results (bold matched text)
- Show active filter tags above results with clear button
- Add quick filter buttons: [Recent] [Favourites] [Needs Review] [Shared With Me]

---

#### 7. Mobile Home Dashboard
**Status:** Planned for iOS/Android app (depends on Phase 1 cleanup)  
- Add mobile-specific home view (not just timeline):
  ```
  📊 This Week: 5 notes
  🎯 Technique Focus: Guard Pass (from AI analysis)
  👥 Shared: 2 notes with teammates
  [+ New Debrief] [Record Audio] [+ Import]
  ```
- Improve mobile responsiveness: collapsible timeline, full-screen detail view

---

#### 8. Voice Recording API Ready
**Status:** Planned when iOS/Android development starts  
- Extend `submit-debrief` to accept multipart/form-data (text + audio)
- Add `audio_url` column to `debriefs` table (store in Supabase Storage)
- Server-side transcription (Whisper API) instead of client-side
- Add `transcription_model` env var
- RLS: Only author can view/download audio files
- Web app needs no changes (same endpoint interface)

---

### **Phase 3: Data & Performance (July–August 2026)**

#### 9. Enable Embeddings by Default
**Status:** Planned after stable parsing  
- Set `EMBEDDING_MODEL=openai/text-embedding-3-small` in production
- Cost: ~$0.00003 per debrief (negligible)
- Benefit: Semantic search ("find guard pass defense" → returns heel hook, knee bar notes)
- Future: Enables AI coach features ("Based on your notes, focus on...")

---

#### 10. Add Soft Delete & Audit Trail
**Status:** Planned for team collaboration features  
- Add `deleted_at` column to `debriefs` (soft delete)
- Implement 30-day trash (admins see deleted items, auto-purge after 30 days)
- Add "Undo delete" UI (10-second window)
- Benefit: Accident recovery + audit trail for team notes

---

#### 11. Deprecate Telegram Schema Fully
**Status:** Post-Telegram removal (Phase 1)  
- Remove technique extraction library if unused elsewhere
- Simplify `debriefs` schema (remove `source` column)
- Update migrations & RLS policies
- Clean up documentation

---

#### 12. Bundle Optimization
**Status:** After Phase 1 (versioning fix in place)  
- Code-split: `main.js` (always), `detail.js` (lazy), `share.js` (lazy)
- Use bundler (esbuild/Rollup) for minification
- Target: 30% smaller initial load
- Add performance monitoring (Lighthouse CI or similar)

---

#### 13. Add Error Tracking & Logging
**Status:** Ongoing  
- Wrap major Supabase calls in try-catch with user-friendly fallback UI
- Integrate Sentry or LogRocket for error tracking
- Add detailed logs for parse jobs (debugging failed parses)
- Benefit: Faster issue detection & resolution

---

#### 14. Offline-First for Mobile
**Status:** When iOS/Android app ships  
- Add Service Worker (Workbox)
- Cache debriefs list locally (IndexedDB)
- Queue submissions while offline, sync on reconnect
- Not critical for web version (users have internet at home)

---

## Implementation Notes for Future AI

**Context for next AI assistant:**
- Telegram removal is the foundation for mobile app voice recording
- Versioning fix unblocks reliable deployments
- Parsing feedback improves perceived app stability
- All three items should be committed as separate PRs for clear versioning

**Key files to modify:**
- Backend: `beta-v1/supabase/functions/*`, SQL migrations, edge function secrets
- Frontend: `viewer.html`, `debrief-viewer.*.js`, `signup.html`, `*.css`
- Infrastructure: Build process, deploy manifest, .gitignore

**Testing checklist after changes:**
- Telegram removal: Verify no broken links/UI references, test signup flow
- Versioning: Deploy test build, verify manifest loads, old files cleaned up
- Parsing feedback: Test all parse states (queued, processing, complete, failed), verify toast notifications

**Cost impact:**
- Telegram removal: Saves ~$0 (no token cost, just code reduction)
- Versioning: No cost change (cleaner build process)
- Parsing feedback: Adds ~1 API call per debrief (negligible cost)

