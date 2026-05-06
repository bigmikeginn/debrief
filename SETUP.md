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

## Future Improvements

- [ ] Caching of repeated techniques/domains to speed up stage 1
- [ ] Fine-tuning or prompt engineering for domain-specific BJJ terminology
- [ ] User feedback loop to improve refiner confidence thresholds
- [ ] Migrate embeddings to a faster, cheaper provider if volume scales

