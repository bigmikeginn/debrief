// Supabase Edge Function: get-parse-status
//
// Purpose:
// - Get current parse job status for a debrief
// - Return parse status, stage, confidence, and estimated time remaining
//
// Required secrets:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
//
// URL: /functions/v1/get-parse-status?debrief_id=uuid

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const debriefId = url.searchParams.get("debrief_id");

    if (!debriefId) {
      return json({ ok: false, error: "debrief_id parameter required" }, 400);
    }

    // Fetch the debrief to get current parse status
    const { data: debrief, error: debriefError } = await supabase
      .from("debriefs")
      .select("id, parse_status, parse_stage, parse_confidence")
      .eq("id", debriefId)
      .single();

    if (debriefError || !debrief) {
      return json({ ok: false, error: "Debrief not found" }, 404);
    }

    // Estimate time remaining based on stage
    const timeEstimates = {
      0: 10, // Before parsing starts
      1: 15, // Initial parse (model generation)
      2: 8,  // Refinement
      3: 5,  // Final processing
    };

    const stage = debrief.parse_stage ?? 0;
    const estimatedSecondsRemaining =
      debrief.parse_status === "ready" || debrief.parse_status === "needs_review"
        ? 0
        : debrief.parse_status === "failed"
        ? null
        : timeEstimates[Math.min(stage, 3)];

    return json({
      ok: true,
      debrief_id: debriefId,
      parse_status: debrief.parse_status,
      parse_stage: stage,
      parse_confidence: debrief.parse_confidence ?? 0,
      estimated_seconds_remaining: estimatedSecondsRemaining,
    });
  } catch (error) {
    console.error("get-parse-status error", error);
    return json({ ok: false, error: String(error) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}
