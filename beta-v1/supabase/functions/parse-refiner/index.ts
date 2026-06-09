// Supabase Edge Function: parse-refiner
//
// Purpose:
// - Process queued parse_jobs created by telegram-webhook pass0.
// - Refine low-confidence notes (stage 1).
// - Optionally generate embeddings (stage 2).
//
// Required secrets:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - OPENROUTER_API_KEY
//
// Optional secrets:
// - MODEL_REFINER (default: openrouter/free)
// - EMBEDDING_MODEL (default: "")
// - PARSE_REFINER_SECRET (recommended for authenticated trigger)
// - PARSE_REFINER_BATCH_SIZE (default: 10)
// - PARSE_REFINER_MAX_ATTEMPTS (default: 3)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ParseJobRow = {
  id: string;
  debrief_id: string;
  stage: number;
  status: string;
  attempts: number;
  run_after?: string;
};

type DebriefRow = {
  id: string;
  debrief_date: string | null;
  raw_input: string | null;
  cleaned_text: string | null;
  raw_notes: string | null;
  note_title: string | null;
  note_summary: string | null;
  domain: string | null;
  topic_primary: string | null;
  topic_secondary: string | null;
  topic_tags: string[] | null;
  action_items: string[] | null;
  parse_attempts: number | null;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") ?? "";
const MODEL_REFINER = Deno.env.get("MODEL_REFINER") ?? "openrouter/free";
const EMBEDDING_MODEL = Deno.env.get("EMBEDDING_MODEL") ?? "";
const PARSE_REFINER_SECRET = Deno.env.get("PARSE_REFINER_SECRET") ?? "";
const PARSE_REFINER_BATCH_SIZE = Number(Deno.env.get("PARSE_REFINER_BATCH_SIZE") ?? "10");
const PARSE_REFINER_MAX_ATTEMPTS = Number(Deno.env.get("PARSE_REFINER_MAX_ATTEMPTS") ?? "3");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return json({ ok: false, error: "Method not allowed" }, 405);
    }

    if (PARSE_REFINER_SECRET) {
      const headerSecret = req.headers.get("x-parse-refiner-secret");
      if (headerSecret !== PARSE_REFINER_SECRET) {
        return json({ ok: false, error: "Unauthorized" }, 401);
      }
    }

    const url = new URL(req.url);
    const limitParam = Number(url.searchParams.get("limit") ?? "");
    const limit = Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(Math.floor(limitParam), 50)
      : Math.min(Math.max(PARSE_REFINER_BATCH_SIZE, 1), 50);

    const jobs = await fetchPendingJobs(limit);
    if (jobs.length === 0) {
      return json({ ok: true, scanned: 0, processed: 0, message: "No pending parse jobs." });
    }

    const summary = {
      scanned: jobs.length,
      processed: 0,
      done: 0,
      retried: 0,
      failed: 0,
      stage1: 0,
      stage2: 0,
    };

    for (const job of jobs) {
      summary.processed += 1;
      if (job.stage === 1) summary.stage1 += 1;
      if (job.stage === 2) summary.stage2 += 1;

      const outcome = await processJob(job);
      if (outcome === "done") summary.done += 1;
      if (outcome === "retry") summary.retried += 1;
      if (outcome === "failed") summary.failed += 1;
    }

    return json({ ok: true, ...summary });
  } catch (error) {
    console.error("parse-refiner error", error);
    return json({ ok: false, error: String(error) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function fetchPendingJobs(limit: number): Promise<ParseJobRow[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("parse_jobs")
    .select("id,debrief_id,stage,status,attempts,run_after")
    .or("status.eq.queued,status.eq.retry")
    .lte("run_after", nowIso)
    .order("run_after", { ascending: true })
    .limit(limit);

  if (error) throw error;

  const rows = (data ?? []) as ParseJobRow[];
  if (rows.length > 0) return rows;

  // Fallback path: some PostgREST filters on timestamptz can be finicky across runtimes.
  const { data: fallbackRows, error: fallbackError } = await supabase
    .from("parse_jobs")
    .select("id,debrief_id,stage,status,attempts,run_after")
    .or("status.eq.queued,status.eq.retry")
    .order("run_after", { ascending: true })
    .limit(limit * 3);

  if (fallbackError) throw fallbackError;

  const nowMs = Date.now();
  return ((fallbackRows ?? []) as ParseJobRow[])
    .filter((row) => {
      if (!row.run_after) return true;
      const t = new Date(row.run_after).getTime();
      return Number.isFinite(t) && t <= nowMs;
    })
    .slice(0, limit);
}

async function processJob(job: ParseJobRow): Promise<"done" | "retry" | "failed"> {
  await markJobRunning(job.id);

  try {
    const debrief = await fetchDebrief(job.debrief_id);
    if (!debrief) {
      await markJobFinal(job.id, "failed", "Debrief not found.");
      return "failed";
    }

    if (job.stage === 1) {
      await runStage1(job, debrief);
      await markJobFinal(job.id, "done", null);
      return "done";
    }

    if (job.stage === 2) {
      await runStage2(job, debrief);
      await markJobFinal(job.id, "done", null);
      return "done";
    }

    await markJobFinal(job.id, "failed", `Unsupported stage ${job.stage}.`);
    return "failed";
  } catch (error) {
    const attempt = (job.attempts ?? 0) + 1;
    const message = String(error);
    if (attempt >= PARSE_REFINER_MAX_ATTEMPTS) {
      await markJobFinal(job.id, "failed", message);
      await supabase
        .from("debriefs")
        .update({
          parse_status: "failed",
          needs_review: true,
          parse_attempts: attempt,
          parser_version: "v2-universal-refiner",
          last_parsed_at: new Date().toISOString(),
        })
        .eq("id", job.debrief_id);
      return "failed";
    }

    await markJobRetry(job.id, attempt, message);
    return "retry";
  }
}

async function markJobRunning(jobId: string) {
  const { error } = await supabase
    .from("parse_jobs")
    .update({
      status: "running",
      locked_at: new Date().toISOString(),
      locked_by: "parse-refiner",
    })
    .eq("id", jobId);
  if (error) throw error;
}

async function markJobFinal(jobId: string, status: "done" | "failed", lastError: string | null) {
  const { error } = await supabase
    .from("parse_jobs")
    .update({
      status,
      last_error: lastError,
      locked_at: null,
      locked_by: null,
    })
    .eq("id", jobId);
  if (error) throw error;
}

async function markJobRetry(jobId: string, attempt: number, lastError: string) {
  const runAfter = new Date(Date.now() + retryDelayMs(attempt)).toISOString();
  const { error } = await supabase
    .from("parse_jobs")
    .update({
      status: "retry",
      attempts: attempt,
      run_after: runAfter,
      last_error: lastError,
      locked_at: null,
      locked_by: null,
    })
    .eq("id", jobId);
  if (error) throw error;
}

function retryDelayMs(attempt: number): number {
  const mins = Math.min(2 ** attempt, 15);
  return mins * 60 * 1000;
}

async function fetchDebrief(debriefId: string): Promise<DebriefRow | null> {
  const { data, error } = await supabase
    .from("debriefs")
    .select("id,debrief_date,raw_input,cleaned_text,raw_notes,note_title,note_summary,domain,topic_primary,topic_secondary,topic_tags,action_items,parse_attempts")
    .eq("id", debriefId)
    .maybeSingle();
  if (error) throw error;
  return (data as DebriefRow | null) ?? null;
}

async function runStage1(job: ParseJobRow, debrief: DebriefRow) {
  const rawText = (debrief.cleaned_text ?? debrief.raw_notes ?? debrief.raw_input ?? "").trim();
  if (!rawText) {
    throw new Error("Debrief has empty text content.");
  }

  const fallbackDate = debrief.debrief_date ?? new Date().toISOString().slice(0, 10);
  const parsed = await refineUniversalParse(rawText, fallbackDate);
  const confidence = normalizeConfidence(parsed.confidence);
  const parseStatus = confidence >= 0.72 ? "ready" : "needs_review";

  const updatePayload: Record<string, unknown> = {
    note_title: parsed.title,
    note_summary: parsed.summary,
    domain: parsed.domain,
    topic_primary: parsed.topicPrimary,
    topic_secondary: parsed.topicSecondary,
    topic_tags: parsed.tags,
    action_items: parsed.actionItems,
    key_points: parsed.keyPoints,
    technique: parsed.technique,
    technique_type: parsed.techniqueType,
    parse_confidence: confidence,
    parse_status: parseStatus,
    parse_stage: 1,
    parse_attempts: (debrief.parse_attempts ?? 0) + 1,
    needs_review: parseStatus === "needs_review",
    parser_version: "v2-universal-refiner",
    last_parsed_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("debriefs")
    .update(updatePayload)
    .eq("id", debrief.id);
  if (error) throw error;

  if (parseStatus === "ready") {
    await enqueueStageJob(debrief.id, 2);
  }
}

async function runStage2(debriefJob: ParseJobRow, debrief: DebriefRow) {
  const textForEmbedding = [
    debrief.note_title ?? "",
    debrief.note_summary ?? "",
    debrief.cleaned_text ?? debrief.raw_notes ?? debrief.raw_input ?? "",
  ].join("\n").trim();

  const embeddingVector = await generateEmbedding(textForEmbedding);
  const payload: Record<string, unknown> = {
    parse_stage: 2,
    parse_status: "ready",
    needs_review: false,
    parser_version: "v2-universal-refiner",
    parse_attempts: (debrief.parse_attempts ?? 0) + 1,
    last_parsed_at: new Date().toISOString(),
  };

  if (embeddingVector) {
    payload.embedding = embeddingVector;
  }

  const { error } = await supabase
    .from("debriefs")
    .update(payload)
    .eq("id", debriefJob.debrief_id);
  if (error) throw error;
}

async function enqueueStageJob(debriefId: string, stage: number) {
  const { data: existing, error: existingError } = await supabase
    .from("parse_jobs")
    .select("id")
    .eq("debrief_id", debriefId)
    .eq("stage", stage)
    .in("status", ["queued", "running", "retry"])
    .limit(1);

  if (existingError) throw existingError;
  if (existing && existing.length > 0) return;

  const { error: insertError } = await supabase
    .from("parse_jobs")
    .insert({
      debrief_id: debriefId,
      stage,
      status: "queued",
      attempts: 0,
      run_after: new Date().toISOString(),
    });
  if (insertError) throw insertError;
}

async function refineUniversalParse(rawText: string, fallbackDate: string): Promise<{
  title: string;
  summary: string;
  domain: string;
  topicPrimary: string;
  topicSecondary: string;
  tags: string[];
  actionItems: string[];
  keyPoints: string[];
  technique: string | null;
  techniqueType: string | null;
  confidence: number | null;
}> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("Missing OPENROUTER_API_KEY secret");
  }

  const prompt = [
    "You are a universal debrief parser.",
    "Return valid JSON only with exactly these keys:",
    "title, summary, domain, topic_primary, topic_secondary, tags, action_items, key_points, technique, technique_type, confidence",
    "Rules:",
    "- title: concise 3-8 words",
    "- summary: 1-2 sentences under 220 chars",
    "- domain: one of martial_arts, business, fitness, woodworking, education, general, other",
    "- topic_primary: short category",
    "- topic_secondary: specific subtopic, not a full sentence",
    "- tags: 2-6 short tags, 1-3 words each; do not copy full input sentences",
    "- action_items: 0-5 concrete next actions",
    "- key_points: 2-4 short bullet takeaways distilled from the note, each under 80 chars",
    "- technique: name of the specific technique discussed, or null if not applicable",
    "- technique_type: one of choke, arm_attack, leg_attack, sweep, escape, guard_pass, guard_retention, takedown, back_control, mount, side_control, other; or null if not a martial arts technique",
    "- confidence: number from 0 to 1",
    `If date context needed, assume ${fallbackDate}.`,
    `Input: ${rawText}`,
  ].join("\n");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://debrief.local",
      "X-Title": "Debrief Refiner",
    },
    body: JSON.stringify({
      model: MODEL_REFINER,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 650,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Refiner model call failed (${MODEL_REFINER}): ${errText}`);
  }

  const data = await res.json() as Record<string, unknown>;
  const output = extractChatCompletionText(data);
  const parsed = extractJsonObject(output);

  const title = normalizeTitle(asString(parsed.title), rawText);
  const summary = normalizeSummary(asString(parsed.summary), rawText);
  const domain = normalizeDomain(asString(parsed.domain), rawText);
  const topicPrimary = normalizeTopic(asString(parsed.topic_primary), domain);
  const topicSecondary = normalizeTopic(asString(parsed.topic_secondary), title || "note");
  const tags = normalizeStringArray(parsed.tags)
    .map((tag) => normalizeTag(tag, rawText))
    .filter(Boolean)
    .slice(0, 8);
  const actionItems = normalizeStringArray(parsed.action_items).map((v) => truncate(v, 120)).slice(0, 6);
  const keyPoints = normalizeStringArray(parsed.key_points).map((v) => truncate(v, 80)).slice(0, 4);
  const technique = normalizeTechniqueField(parsed.technique);
  const techniqueType = normalizeTechniqueType(parsed.technique_type);
  const confidence = asNumber(parsed.confidence);

  return {
    title,
    summary,
    domain,
    topicPrimary,
    topicSecondary,
    tags: tags.length > 0 ? tags : normalizeFallbackTags(domain, topicPrimary, topicSecondary),
    actionItems,
    keyPoints,
    technique,
    techniqueType,
    confidence,
  };
}

async function generateEmbedding(text: string): Promise<string | null> {
  if (!OPENROUTER_API_KEY || !EMBEDDING_MODEL || !text) return null;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://debrief.local",
        "X-Title": "Debrief Refiner",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
      }),
    });
    if (!res.ok) return null;

    const data = await res.json() as Record<string, unknown>;
    const rows = data.data as Array<Record<string, unknown>> | undefined;
    const first = rows?.[0];
    const embedding = first?.embedding as number[] | undefined;
    if (!embedding || embedding.length !== 1536) return null;
    if (!embedding.every((n) => typeof n === "number" && Number.isFinite(n))) return null;
    return `[${embedding.join(",")}]`;
  } catch {
    return null;
  }
}

function extractChatCompletionText(responseJson: Record<string, unknown>): string {
  const choices = responseJson.choices as Array<Record<string, unknown>> | undefined;
  if (!choices?.length) return "";
  const first = choices[0];
  const message = first?.message as Record<string, unknown> | undefined;
  const content = message?.content;
  return typeof content === "string" ? content.trim() : "";
}

function extractJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  if (!trimmed) return {};

  const deFenced = trimmed
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(deFenced);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // continue
  }

  const start = deFenced.indexOf("{");
  const end = deFenced.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const candidate = deFenced.slice(start, end + 1);
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // fallthrough
    }
  }

  return {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function normalizeTitle(title: string, raw: string): string {
  const clean = cleanupSentence(title);
  if (clean.length >= 3) return truncate(clean, 80);
  return truncate(cleanupSentence(raw.split(/[.!?]/)[0] ?? "Debrief note"), 80);
}

function normalizeSummary(summary: string, raw: string): string {
  const clean = cleanupSentence(summary);
  if (clean.length >= 20) return truncate(clean, 220);
  return truncate(cleanupSentence(raw), 220);
}

function normalizeDomain(domain: string, raw: string): string {
  const normalized = domain.toLowerCase();
  const allowed = new Set(["martial_arts", "business", "fitness", "woodworking", "education", "general", "other"]);
  if (allowed.has(normalized)) return normalized;

  const text = raw.toLowerCase();
  if (/\b(choke|armbar|guard|sweep|bjj|jiu[- ]?jitsu|wrist lock)\b/.test(text)) return "martial_arts";
  if (/\b(client|sale|invoice|lead|deal|marketing)\b/.test(text)) return "business";
  if (/\b(workout|run|lift|cardio|mobility)\b/.test(text)) return "fitness";
  if (/\b(wood|joinery|table|cabinet|sanding|finish)\b/.test(text)) return "woodworking";
  if (/\b(study|lesson|class|course|teach)\b/.test(text)) return "education";
  return "general";
}

function normalizeTopic(value: string, fallback: string): string {
  const clean = cleanupSentence(value).toLowerCase();
  if (clean) return truncate(clean.split(/\s+/).slice(0, 5).join("_"), 48);
  return truncate(cleanupSentence(fallback).toLowerCase().replace(/\s+/g, "_"), 48);
}

function normalizeTag(value: string, raw = ""): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9_\- ]+/g, "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
  const rawSentences = raw
    .split(/[.!?]/)
    .map((item) => normalizeForComparison(item))
    .filter(Boolean);
  const comparable = normalizeForComparison(cleaned);
  if (rawSentences.some((sentence) => comparable === sentence || sentence.includes(comparable) && comparable.split(" ").length >= 5)) {
    return "";
  }
  return cleaned.split(" ").slice(0, 3).join("_");
}

function normalizeFallbackTags(domain: string, topicPrimary: string, topicSecondary: string): string[] {
  const tags = [domain, topicPrimary, topicSecondary]
    .map((tag) => normalizeTag(tag))
    .filter((item) => item.length > 0);
  return Array.from(new Set(tags)).slice(0, 6);
}

function normalizeConfidence(value: number | null): number {
  if (value === null) return 0.5;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return Math.round(value * 1000) / 1000;
}

function cleanupSentence(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/^[,;:\-.\s]+/, "")
    .replace(/[,;:\-.\s]+$/, "")
    .trim();
}

function normalizeForComparison(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3).trim()}...`;
}

function normalizeTechniqueField(value: unknown): string | null {
  const s = asString(value as string).trim();
  if (!s || s.toLowerCase() === "null" || s.toLowerCase() === "none") return null;
  return truncate(s, 120);
}

function normalizeTechniqueType(value: unknown): string | null {
  const allowed = new Set([
    "choke", "arm_attack", "leg_attack", "sweep", "escape",
    "guard_pass", "guard_retention", "takedown", "back_control",
    "mount", "side_control", "other",
  ]);
  const s = asString(value as string).toLowerCase().trim().replace(/\s+/g, "_");
  if (allowed.has(s)) return s;
  return null;
}
