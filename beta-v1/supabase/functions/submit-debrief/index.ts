// Supabase Edge Function: submit-debrief
//
// Purpose:
// - Accept native in-app debrief submissions.
// - Create a debrief row with source = "app".
// - Enqueue parse job for the refiner.
//
// Required secrets:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - SUBMIT_DEBRIEF_SECRET (optional, recommended for authenticated trigger)
//
// Request body:
// {
//   "user_id": "uuid",
//   "club_id": "uuid",
//   "text": "raw debrief text"
// }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUBMIT_DEBRIEF_SECRET = Deno.env.get("SUBMIT_DEBRIEF_SECRET") ?? "";
const REFINER_URL = Deno.env.get("PARSE_REFINER_URL") ?? "";
const REFINER_SECRET = Deno.env.get("PARSE_REFINER_SECRET") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type, x-submit-debrief-secret, apikey",
  "access-control-allow-methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return json({ ok: false, error: "Method not allowed" }, 405);
    }

    const headerSecret = req.headers.get("x-submit-debrief-secret");
    const authHeader = req.headers.get("authorization") ?? "";
    const hasValidSecret = SUBMIT_DEBRIEF_SECRET && headerSecret === SUBMIT_DEBRIEF_SECRET;
    const hasValidJwt = authHeader.startsWith("Bearer ") && authHeader.length > 20;
    if (SUBMIT_DEBRIEF_SECRET && !hasValidSecret && !hasValidJwt) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    const body = await req.json() as Record<string, unknown>;
    const userId = String(body.user_id ?? "").trim();
    const clubId = String(body.club_id ?? "").trim();
    const text = String(body.text ?? "").trim();

    if (!userId || !clubId || !text) {
      return json({ ok: false, error: "Missing user_id, club_id, or text." }, 400);
    }

    if (text.length > 3000) {
      return json({ ok: false, error: "Text exceeds 3000 characters." }, 400);
    }

    // Check daily rate limit
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const { count: dailyCount, error: countError } = await supabase
      .from("debriefs")
      .select("id", { count: "exact", head: true })
      .eq("author_user_id", userId)
      .eq("is_debrief", true)
      .gte("created_at", startOfDay.toISOString());

    if (countError) throw countError;
    if ((dailyCount ?? 0) >= 20) {
      return json({ ok: false, error: "Daily debrief limit reached." }, 429);
    }

    const today = new Date().toISOString().slice(0, 10);
    const localInsight = buildLocalInsight(text);

    // Insert debrief with source = "app"
    const { data: debrief, error: insertError } = await supabase
      .from("debriefs")
      .insert({
        club_id: clubId,
        author_user_id: userId,
        source: "app",
        raw_input: text,
        cleaned_text: text,
        raw_notes: text,
        is_debrief: true,
        visibility: "private",
        debrief_date: today,
        note_title: localInsight.title,
        note_summary: localInsight.summary,
        domain: localInsight.domain,
        topic_primary: localInsight.topicPrimary,
        topic_secondary: localInsight.topicSecondary,
        topic_tags: localInsight.topicTags,
        action_items: localInsight.actionItems,
        parse_status: "refining",
        parse_stage: 0,
        parse_confidence: 0,
        parse_attempts: 0,
        needs_review: false,
        parser_version: "v2-native-submit",
        last_parsed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError) throw insertError;
    const debriefId = debrief.id as string;

    // Enqueue parse job stage 1
    const { data: parseJob, error: enqueueError } = await supabase
      .from("parse_jobs")
      .insert({
        debrief_id: debriefId,
        stage: 1,
        status: "queued",
        attempts: 0,
        run_after: new Date().toISOString(),
      })
      .select("id")
      .single();

    let parseJobId = null;
    if (enqueueError) {
      console.error("Failed to enqueue parse job", enqueueError);
    } else {
      parseJobId = parseJob?.id;
    }

    // Trigger the refiner in the background (fire-and-forget)
    if (REFINER_URL) {
      try {
        const refinerUrl = new URL(REFINER_URL);
        refinerUrl.searchParams.set("limit", "5");
        const headers: Record<string, string> = { "content-type": "application/json" };
        if (REFINER_SECRET) {
          headers["x-parse-refiner-secret"] = REFINER_SECRET;
        }
        fetch(refinerUrl.toString(), {
          method: "POST",
          headers,
        }).catch(() => {
          // Fire-and-forget; errors are logged by the refiner
        });
      } catch (_error) {
        // Fire-and-forget
      }
    }

    return json({
      ok: true,
      debrief_id: debriefId,
      parse_job_id: parseJobId,
      parse_status: "refining",
      message: "Debrief saved. Analysis will appear in your timeline shortly.",
    });
  } catch (error) {
    console.error("submit-debrief error", error);
    return json({ ok: false, error: String(error) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders },
  });
}

function buildLocalInsight(text: string) {
  const domain = classifyLocalDomain(text);
  const detailSentences = extractDetailSentences(text);
  const titleSeed = buildLocalTitle(detailSentences[0] || firstSentence(text), domain);
  const topicPrimary = classifyLocalTopicPrimary(text, domain);
  const topicSecondary = classifyLocalTopicSecondary(text, topicPrimary);
  const topicTags = buildTopicTags(domain, topicPrimary, topicSecondary);

  return {
    title: truncateText(cleanupSentence(titleSeed), 80),
    summary: truncateText(cleanupSentence(detailSentences.join(" ")), 280),
    domain,
    topicPrimary,
    topicSecondary,
    topicTags,
    actionItems: [],
  };
}

function extractDetailSentences(text: string): string[] {
  const normalized = cleanupSentence(text);
  const sentences = normalized
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => cleanupSentence(sentence))
    .filter((sentence) => sentence.length > 0);

  if (sentences.length === 0 && normalized) return [normalized];
  return sentences.slice(0, 2);
}

function buildLocalTitle(seed: string, domain: string): string {
  const cleanSeed = cleanupSentence(seed);
  if (!cleanSeed) return "Debrief note";

  const lower = cleanSeed.toLowerCase();
  if (domain === "martial_arts") {
    if (/\bbow and arrow\b/.test(lower)) return "Bow and arrow defense";
    if (/\brear naked choke|rnc\b/.test(lower)) return "Rear naked choke defense";
    if (/\bback\b/.test(lower) && /\battack|attacking\b/.test(lower)) return "Back attack control";
    if (/\bchoke\b/.test(lower) && /\bdefend|defending|defense\b/.test(lower)) return "Choke defense detail";
  }

  return cleanSeed.split(/\s+/).slice(0, 8).join(" ");
}

function classifyLocalDomain(text: string) {
  const lower = String(text ?? "").toLowerCase();
  if (/\b(choke|armbar|guard|sweep|bjj|jiu[- ]?jitsu|wrist lock|frame|grip|pass|takedown|side control|mount)\b/.test(lower)) return "martial_arts";
  if (/\b(client|sale|invoice|lead|deal|marketing)\b/.test(lower)) return "business";
  if (/\b(workout|run|lift|cardio|mobility)\b/.test(lower)) return "fitness";
  if (/\b(wood|joinery|table|cabinet|sanding|finish)\b/.test(lower)) return "woodworking";
  if (/\b(study|lesson|class|course|teach)\b/.test(lower)) return "education";
  return "general";
}

function classifyLocalTopicPrimary(text: string, domain: string) {
  const lower = String(text ?? "").toLowerCase();
  if (domain === "martial_arts") {
    if (/\b(grip|frame|frames|connection|connect|hook|hooks)\b/.test(lower)) return "connection";
    if (/\b(guard|closed guard|half guard|open guard)\b/.test(lower)) return "guard";
    if (/\b(pass|passing|pressure)\b/.test(lower)) return "passing";
    if (/\b(escape|stand|stand-up|takedown)\b/.test(lower)) return "movement";
    if (/\b(sweep|reversal)\b/.test(lower)) return "sweeps";
    return "training";
  }
  if (domain === "business") return "process";
  if (domain === "fitness") return "training";
  if (domain === "woodworking") return "build";
  if (domain === "education") return "learning";
  return "note";
}

function classifyLocalTopicSecondary(text: string, topicPrimary: string) {
  const lower = String(text ?? "").toLowerCase();
  if (topicPrimary === "connection") {
    if (/\b(frame|frames)\b/.test(lower)) return "frames";
    if (/\b(grip|grips)\b/.test(lower)) return "grips";
    if (/\b(break|breaks|broken)\b/.test(lower)) return "breaks";
    return "connection_drills";
  }
  if (topicPrimary === "guard") return "guard_drills";
  if (topicPrimary === "passing") return "pressure_passing";
  if (topicPrimary === "movement") return "timing";
  if (topicPrimary === "sweeps") return "reversals";
  return "takeaway";
}

function buildTopicTags(domain: string, topicPrimary: string, topicSecondary: string) {
  return Array.from(new Set([domain, topicPrimary, topicSecondary].map((item) => normalizeTag(item)).filter(Boolean))).slice(0, 6);
}

function buildLocalActionItems(keyPoints: string[]) {
  if (!Array.isArray(keyPoints) || keyPoints.length === 0) {
    return ["Review the takeaway before the next round", "Test one cue in live training"];
  }

  return [
    `Review: ${keyPoints[0]}`,
    keyPoints[1] ? `Practice: ${keyPoints[1]}` : "Try the takeaway in live rolling",
  ].slice(0, 3);
}

function normalizeTag(value: string) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_\- ]+/g, "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function firstSentence(text: string) {
  const sentence = String(text ?? "").split(/[.!?]/)[0] ?? "";
  return cleanupSentence(sentence);
}

function cleanupSentence(value: string) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/^[,;:\-.\s]+/, "")
    .replace(/[,;:\-.\s]+$/, "")
    .trim();
}

function truncateText(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3).trim()}...`;
}
