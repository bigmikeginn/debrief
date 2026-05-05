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

Deno.serve(async (req) => {
  try {
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
        note_title: text.slice(0, 80),
        note_summary: text.slice(0, 220),
        domain: "general",
        topic_primary: "general",
        topic_secondary: "note",
        topic_tags: [],
        action_items: [],
        parse_status: "refining",
        parse_stage: 0,
        parse_confidence: 0.5,
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
    const { error: enqueueError } = await supabase
      .from("parse_jobs")
      .insert({
        debrief_id: debriefId,
        stage: 1,
        status: "queued",
        attempts: 0,
        run_after: new Date().toISOString(),
      });

    if (enqueueError) {
      console.error("Failed to enqueue parse job", enqueueError);
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
    headers: { "content-type": "application/json" },
  });
}