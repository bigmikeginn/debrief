// Supabase Edge Function: telegram-webhook
//
// Required secrets:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - TELEGRAM_BOT_TOKEN
// - TELEGRAM_WEBHOOK_SECRET
// - OPENROUTER_API_KEY
// - MODEL_PRIMARY (example: openrouter/free)
// - MODEL_FALLBACK (example: openrouter/free)
// - MODEL_CHAIN (optional, comma-separated model list)
//
// Optional secrets:
// - MAX_DEBRIEFS_PER_USER_PER_DAY (default: 10)
// - MAX_INPUT_CHARS (default: 1200)
//
// Notes:
// - Users never manage API keys.
// - This function is the server-side gatekeeper for cost controls.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type TelegramUpdate = {
  update_id?: number;
  message?: {
    message_id?: number;
    date?: number;
    text?: string;
    chat?: { id?: number };
    from?: { id?: number; first_name?: string };
  };
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const TELEGRAM_WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") ?? "";
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") ?? "";
const MODEL_PRIMARY = Deno.env.get("MODEL_PRIMARY") ?? "openrouter/free";
const MODEL_FALLBACK = Deno.env.get("MODEL_FALLBACK") ?? "openrouter/free";
const MODEL_CHAIN = Deno.env.get("MODEL_CHAIN") ?? "";
const MAX_DEBRIEFS_PER_USER_PER_DAY = Number(Deno.env.get("MAX_DEBRIEFS_PER_USER_PER_DAY") ?? "10");
const MAX_INPUT_CHARS = Number(Deno.env.get("MAX_INPUT_CHARS") ?? "1200");
const DEBRIEF_COMMAND = (Deno.env.get("DEBRIEF_COMMAND") ?? "#debrief").trim();
const MODEL_CANDIDATES = buildModelCandidates(MODEL_CHAIN, MODEL_PRIMARY, MODEL_FALLBACK);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const ALLOWED_TECHNIQUE_TYPES = new Set([
  "choke",
  "arm_attack",
  "leg_attack",
  "sweep",
  "escape",
  "guard_pass",
  "guard_retention",
  "takedown",
  "back_control",
  "mount",
  "side_control",
  "other",
]);

const TECHNIQUE_LIBRARY: Array<{ pattern: RegExp; label: string; type: string }> = [
  { pattern: /\brear naked choke\b|\brnc\b/i, label: "rear naked choke", type: "choke" },
  { pattern: /\bguillotine\b/i, label: "guillotine choke", type: "choke" },
  { pattern: /\btriangle\b/i, label: "triangle choke", type: "choke" },
  { pattern: /\bdarce\b/i, label: "darce choke", type: "choke" },
  { pattern: /\banaconda\b/i, label: "anaconda choke", type: "choke" },
  { pattern: /\barmbar\b/i, label: "armbar", type: "arm_attack" },
  { pattern: /\bkimura\b/i, label: "kimura", type: "arm_attack" },
  { pattern: /\bamericana\b/i, label: "americana", type: "arm_attack" },
  { pattern: /\bstraight ankle\b|\bankle lock\b/i, label: "ankle lock", type: "leg_attack" },
  { pattern: /\bheel hook\b/i, label: "heel hook", type: "leg_attack" },
  { pattern: /\bkneebar\b/i, label: "kneebar", type: "leg_attack" },
  { pattern: /\bbutterfly sweep\b/i, label: "butterfly sweep", type: "sweep" },
  { pattern: /\bscissor sweep\b/i, label: "scissor sweep", type: "sweep" },
  { pattern: /\bhip bump sweep\b/i, label: "hip bump sweep", type: "sweep" },
  { pattern: /\btechnical standup\b|\btechnical stand-up\b/i, label: "technical standup", type: "escape" },
  { pattern: /\bbridge and roll\b|\bupa\b/i, label: "upa escape", type: "escape" },
  { pattern: /\bguard retention\b/i, label: "guard retention", type: "guard_retention" },
  { pattern: /\bknee cut\b/i, label: "knee cut pass", type: "guard_pass" },
  { pattern: /\btorreando\b/i, label: "torreando pass", type: "guard_pass" },
  { pattern: /\bsingle leg\b/i, label: "single leg takedown", type: "takedown" },
  { pattern: /\bdouble leg\b/i, label: "double leg takedown", type: "takedown" },
  { pattern: /\bback take\b|\bback control\b/i, label: "back control", type: "back_control" },
  { pattern: /\bmount\b/i, label: "mount control", type: "mount" },
  { pattern: /\bside control\b|\bcross side\b/i, label: "side control", type: "side_control" },
];

Deno.serve(async (req) => {
  let aiRunId: string | null = null;
  let replyChatId: number | null = null;
  let debriefId: string | null = null;
  let ackSent = false;

  try {
    if (req.method !== "POST") {
      return json({ ok: false, error: "Method not allowed" }, 405);
    }

    const headerSecret = req.headers.get("x-telegram-bot-api-secret-token");
    if (!headerSecret || headerSecret !== TELEGRAM_WEBHOOK_SECRET) {
      return json({ ok: false, error: "Unauthorized webhook source" }, 401);
    }

    const update = (await req.json()) as TelegramUpdate;
    const text = (update.message?.text ?? "").trim();
    const telegramUserId = update.message?.from?.id;
    const chatId = update.message?.chat?.id;
    replyChatId = chatId ?? null;
    const updateId = update.update_id ?? null;
    const isDebrief = text.toLowerCase().startsWith(DEBRIEF_COMMAND.toLowerCase());
    const cleanedText = isDebrief
      ? text.replace(new RegExp(`^${escapeRegex(DEBRIEF_COMMAND)}\\s*`, "i"), "").trim()
      : text;

    if (!telegramUserId || !chatId || !text) {
      return json({ ok: true, ignored: true });
    }

    const command = text.toLowerCase();
    if (command === "/status") {
      const status = await getTelegramStatus(telegramUserId);
      const clubText = status.clubName ? ` Active club: ${status.clubName}.` : "";
      await sendTelegramMessage(
        chatId,
        status.email
          ? `Your Telegram currently saves #debrief notes to ${status.email}.${clubText}`
          : "Your Telegram is not linked to a Debrief account yet. Log in to Debrief and use Connect Telegram.",
      );
      return json({ ok: true, status: "sent" });
    }

    if (command === "/unlink") {
      const status = await unlinkTelegramAccount(telegramUserId);
      await sendTelegramMessage(
        chatId,
        status.email
          ? `Telegram was unlinked from ${status.email}. Log in to Debrief and connect again to choose a destination account.`
          : "Your Telegram was not linked to a Debrief account.",
      );
      return json({ ok: true, unlinked: Boolean(status.email) });
    }

    const saveToEmail = extractSaveToEmail(text);
    if (saveToEmail) {
      const result = await linkTelegramAccountByEmail(saveToEmail, telegramUserId, chatId);
      await sendTelegramMessage(
        chatId,
        result.linked
          ? `Telegram now saves #debrief notes to ${result.email}.`
          : `I could not find a Debrief account for ${saveToEmail}. Log in or sign up with that email first, then try again.`,
      );
      return json({ ok: true, linked: result.linked });
    }

    const linkCode = extractLinkCode(text);
    if (linkCode) {
      const linkResult = await linkTelegramAccount(linkCode, telegramUserId, chatId);
      await sendTelegramMessage(
        chatId,
        linkResult.linked
          ? `Telegram is linked to ${linkResult.email || "your Debrief account"}. Send notes with ${DEBRIEF_COMMAND} and I will save them there.`
          : "That link code is expired or invalid. Open Debrief, log in, and create a new Telegram code.",
      );
      return json({ ok: true, linked: linkResult.linked });
    }

    if (!isDebrief) {
      await sendTelegramMessage(chatId, `Please start your note with ${DEBRIEF_COMMAND} so I can save it as a debrief. Send /status to see which Debrief account this Telegram saves to, or /unlink to disconnect it.`);
      return json({ ok: true, ignored: true, reason: "not_debrief" });
    }

    if (!cleanedText) {
      await sendTelegramMessage(chatId, `Please add your training note after ${DEBRIEF_COMMAND}.`);
      return json({ ok: true, ignored: true, reason: "empty_debrief" });
    }

    if (text.length > MAX_INPUT_CHARS) {
      await sendTelegramMessage(chatId, `Your message is too long. Please keep it under ${MAX_INPUT_CHARS} characters.`);
      return json({ ok: true, ignored: true, reason: "input_too_long" });
    }

    // Find linked user account
    const { data: link, error: linkError } = await supabase
      .from("telegram_links")
      .select("user_id, is_active")
      .eq("telegram_user_id", telegramUserId)
      .maybeSingle();

    if (linkError) throw linkError;
    if (!link || !link.is_active) {
      await sendTelegramMessage(chatId, "Your Telegram is not linked yet. Please link your account in the app first.");
      return json({ ok: true, ignored: true, reason: "not_linked" });
    }

    const userId = link.user_id as string;

    // Route Telegram notes to the user's active club, with a first-membership fallback for old deployments.
    const activeClub = await getActiveClubForUser(userId);

    if (!activeClub) {
      await sendTelegramMessage(chatId, "You do not have an active club membership.");
      return json({ ok: true, ignored: true, reason: "no_active_membership" });
    }

    const clubId = activeClub.clubId;

    // Rate limit: max debriefs per day per user
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const { count: dailyCount, error: countError } = await supabase
      .from("debriefs")
      .select("id", { count: "exact", head: true })
      .eq("author_user_id", userId)
      .eq("is_debrief", true)
      .gte("created_at", startOfDay.toISOString());

    if (countError) throw countError;
    if ((dailyCount ?? 0) >= MAX_DEBRIEFS_PER_USER_PER_DAY) {
      await sendTelegramMessage(chatId, "Daily debrief limit reached. Please try again tomorrow.");
      return json({ ok: true, ignored: true, reason: "daily_limit_reached" });
    }

    aiRunId = crypto.randomUUID();

    // Create AI run record (queued)
    await supabase.from("ai_runs").insert({
      id: aiRunId,
      model: MODEL_CANDIDATES[0] ?? MODEL_PRIMARY,
      status: "queued",
    });

    // Save a provisional row immediately so we can acknowledge fast.
    const messageDateIso = update.message?.date ? new Date(update.message.date * 1000).toISOString() : null;
    const provisionalDate = isoDateOnly(messageDateIso ?? new Date().toISOString());
    const provisionalTechnique = inferTechnique(cleanedText);
    const provisionalTechniqueType = normalizeTechniqueType(inferTechniqueType(cleanedText, provisionalTechnique));
    const provisionalKeyPoints = buildKeyPointsFromText(cleanedText);
    const provisionalReflections = normalizeReflections("", cleanedText);
    const provisionalSummary = buildFallbackSummary(provisionalTechnique, provisionalKeyPoints, provisionalReflections);
    const provisionalTopicPrimary = provisionalTechniqueType === "other" ? "general" : provisionalTechniqueType;
    const provisionalTopicSecondary = provisionalTechnique || "note";
    const provisionalDomain = inferDomainFromTechniqueType(provisionalTechniqueType);
    const provisionalTags = normalizeTopicTags([provisionalTechniqueType, provisionalTechnique]);
    const provisionalStructured = {
      date: provisionalDate,
      technique: provisionalTechnique,
      technique_type: provisionalTechniqueType,
      key_points: provisionalKeyPoints,
      reflections: provisionalReflections,
      raw_notes: cleanedText,
      summary: provisionalSummary,
      parse_mode: "provisional",
    };

    const { data: provisionalDebrief, error: provisionalDebriefError } = await supabase
      .from("debriefs")
      .insert({
        club_id: clubId,
        author_user_id: userId,
        source: "telegram",
        raw_input: text,
        structured_json: provisionalStructured,
        summary_text: provisionalSummary,
        debrief_date: provisionalDate,
        technique: provisionalTechnique,
        technique_type: provisionalTechniqueType,
        key_points: provisionalKeyPoints,
        reflections: provisionalReflections,
        raw_notes: cleanedText,
        telegram_message: update,
        telegram_update_id: updateId,
        telegram_text: text,
        cleaned_text: cleanedText,
        is_debrief: true,
        telegram_chat_id: chatId,
        visibility: "private",
        note_title: provisionalTechnique || "Debrief note",
        note_summary: provisionalSummary,
        domain: provisionalDomain,
        topic_primary: provisionalTopicPrimary,
        topic_secondary: provisionalTopicSecondary,
        topic_tags: provisionalTags,
        action_items: [],
        parse_status: "refining",
        parse_stage: 0,
        parse_confidence: 0.5,
        parse_attempts: 1,
        needs_review: false,
        parser_version: "v2-universal-pass0",
        last_parsed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (provisionalDebriefError) throw provisionalDebriefError;
    debriefId = provisionalDebrief.id as string;

    await supabase
      .from("ai_runs")
      .update({ debrief_id: debriefId })
      .eq("id", aiRunId);

    // Immediate acknowledgment to reduce perceived latency.
    await sendTelegramMessage(chatId, formatTelegramReply());
    ackSent = true;

    // Build final parse with model fallback
    const modelResult = await buildDebriefWithFallback(cleanedText, messageDateIso);
    const normalizedTechniqueType = normalizeTechniqueType(modelResult.techniqueType);
    const parseConfidence = normalizeConfidence(modelResult.parseConfidence);
    const parseStatus = parseConfidence >= 0.78 && modelResult.modelUsed !== "local_fallback" ? "ready" : "refining";
    const domain = inferDomainFromTechniqueType(normalizedTechniqueType);
    const noteTitle = modelResult.technique || "Debrief note";
    const noteSummary = modelResult.summaryText;
    const topicPrimary = normalizedTechniqueType === "other" ? "general" : normalizedTechniqueType;
    const topicSecondary = modelResult.technique || "note";
    const topicTags = normalizeTopicTags([normalizedTechniqueType, modelResult.technique]);

    // Update debrief with final parse.
    const { error: debriefUpdateError } = await supabase
      .from("debriefs")
      .update({
        structured_json: modelResult.structuredJson,
        summary_text: modelResult.summaryText,
        debrief_date: modelResult.debriefDate,
        technique: modelResult.technique,
        technique_type: normalizedTechniqueType,
        key_points: modelResult.keyPoints,
        reflections: modelResult.reflections,
        raw_notes: cleanedText,
        telegram_message: update,
        telegram_update_id: updateId,
        telegram_text: text,
        cleaned_text: cleanedText,
        is_debrief: true,
        telegram_chat_id: chatId,
        visibility: "private",
        note_title: noteTitle,
        note_summary: noteSummary,
        domain,
        topic_primary: topicPrimary,
        topic_secondary: topicSecondary,
        topic_tags: topicTags,
        action_items: [],
        parse_status: parseStatus,
        parse_stage: 0,
        parse_confidence: parseConfidence,
        parse_attempts: 1,
        needs_review: false,
        parser_version: "v2-universal-pass0",
        last_parsed_at: new Date().toISOString(),
      })
      .eq("id", debriefId);

    if (debriefUpdateError) throw debriefUpdateError;

    // Update AI run result
    const fallbackReason = (modelResult.structuredJson as Record<string, unknown>)?.local_fallback_reason;
    await supabase
      .from("ai_runs")
      .update({
        debrief_id: debriefId,
        model: modelResult.modelUsed,
        input_tokens: modelResult.inputTokens,
        output_tokens: modelResult.outputTokens,
        cost_estimate: modelResult.costEstimate,
        status: "success",
        error_message: fallbackReason ? JSON.stringify(fallbackReason) : null,
      })
      .eq("id", aiRunId);

    if (parseStatus === "refining") {
      await enqueueParseJob(debriefId, 1);
    }

    return json({ ok: true, debrief_id: debriefId });
  } catch (error) {
    console.error("telegram-webhook error", error);
    if (aiRunId) {
      await supabase.from("ai_runs").update({
        status: "failed",
        error_message: String(error),
      }).eq("id", aiRunId);
    }
    if (debriefId) {
      await supabase
        .from("debriefs")
        .update({
          parse_status: "failed",
          needs_review: true,
          parser_version: "v2-universal-pass0",
          last_parsed_at: new Date().toISOString(),
        })
        .eq("id", debriefId);
    }
    if (replyChatId && !ackSent) {
      await sendTelegramMessage(
        replyChatId,
        "I could not process that debrief right now due to a system error. Please try again in a minute.",
      );
    }
    return json({ ok: false, error: String(error) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function formatTelegramReply() {
  return "Debrief received. Thanks.";
}

function extractLinkCode(text: string): string | null {
  const trimmed = text.trim();
  const startMatch = trimmed.match(/^\/start\s+link_([A-Za-z0-9-]{4,24})$/i);
  if (startMatch?.[1]) return startMatch[1].toUpperCase();

  const linkMatch = trimmed.match(/^\/link\s+([A-Za-z0-9-]{4,24})$/i);
  if (linkMatch?.[1]) return linkMatch[1].toUpperCase();

  if (/^\d{6}$/.test(trimmed)) return trimmed;
  return null;
}

function extractSaveToEmail(text: string): string | null {
  const match = text.trim().match(/^\/save_to\s+([^\s@]+@[^\s@]+\.[^\s@]+)$/i);
  return match?.[1]?.toLowerCase() ?? null;
}

async function linkTelegramAccountByEmail(
  email: string,
  telegramUserId: number,
  chatId: number,
): Promise<{ linked: boolean; email?: string }> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email")
    .ilike("email", email)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile?.id) return { linked: false };

  const { error: linkError } = await supabase
    .from("telegram_links")
    .upsert(
      {
        user_id: profile.id,
        telegram_user_id: telegramUserId,
        telegram_chat_id: chatId,
        linked_at: new Date().toISOString(),
        is_active: true,
      },
      { onConflict: "telegram_user_id" },
    );

  if (linkError) throw linkError;
  return { linked: true, email: profile.email || email };
}

async function linkTelegramAccount(
  code: string,
  telegramUserId: number,
  chatId: number,
): Promise<{ linked: boolean; email?: string }> {
  const { data: linkCode, error: codeError } = await supabase
    .from("telegram_link_codes")
    .select("id, user_id, expires_at, used_at")
    .eq("code", code)
    .is("used_at", null)
    .maybeSingle();

  if (codeError) throw codeError;
  if (!linkCode) return { linked: false };
  if (new Date(linkCode.expires_at as string).getTime() < Date.now()) return { linked: false };

  const { error: linkError } = await supabase
    .from("telegram_links")
    .upsert(
      {
        user_id: linkCode.user_id,
        telegram_user_id: telegramUserId,
        telegram_chat_id: chatId,
        linked_at: new Date().toISOString(),
        is_active: true,
      },
      { onConflict: "telegram_user_id" },
    );

  if (linkError) throw linkError;

  const { error: updateError } = await supabase
    .from("telegram_link_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", linkCode.id);

  if (updateError) throw updateError;

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", linkCode.user_id)
    .maybeSingle();

  return { linked: true, email: profile?.email };
}

async function getTelegramStatus(telegramUserId: number): Promise<{ email?: string; clubName?: string }> {
  const { data: link, error } = await supabase
    .from("telegram_links")
    .select("user_id, is_active")
    .eq("telegram_user_id", telegramUserId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  if (!link) return {};

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", link.user_id)
    .maybeSingle();

  const activeClub = await getActiveClubForUser(link.user_id as string);
  return { email: profile?.email, clubName: activeClub?.clubName };
}

async function getActiveClubForUser(userId: string): Promise<{ clubId: string; clubName?: string } | null> {
  const { data: activeClubId, error: activeClubError } = await supabase
    .rpc("get_user_active_club_id", { target_user_id: userId });

  if (activeClubError) {
    console.error("get_user_active_club_id failed; falling back to first active membership", activeClubError);
  }

  if (activeClubId) {
    const { data: activeMembership, error: activeMembershipError } = await supabase
      .from("club_memberships")
      .select("club_id, status, clubs(name)")
      .eq("user_id", userId)
      .eq("club_id", activeClubId as string)
      .eq("status", "active")
      .maybeSingle();

    if (activeMembershipError) throw activeMembershipError;
    if (activeMembership) {
      return {
        clubId: activeMembership.club_id as string,
        clubName: getJoinedClubName(activeMembership),
      };
    }
  }

  const { data: fallbackMembership, error: fallbackMembershipError } = await supabase
    .from("club_memberships")
    .select("club_id, status, clubs(name)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fallbackMembershipError) throw fallbackMembershipError;
  if (!fallbackMembership) return null;

  return {
    clubId: fallbackMembership.club_id as string,
    clubName: getJoinedClubName(fallbackMembership),
  };
}

function getJoinedClubName(row: Record<string, unknown>): string | undefined {
  const clubs = row.clubs;
  if (Array.isArray(clubs)) {
    const first = clubs[0] as Record<string, unknown> | undefined;
    return typeof first?.name === "string" ? first.name : undefined;
  }
  if (clubs && typeof clubs === "object") {
    const joinedClub = clubs as Record<string, unknown>;
    return typeof joinedClub.name === "string" ? joinedClub.name : undefined;
  }
  return undefined;
}

async function unlinkTelegramAccount(telegramUserId: number): Promise<{ email?: string }> {
  const status = await getTelegramStatus(telegramUserId);
  const { error } = await supabase
    .from("telegram_links")
    .update({ is_active: false })
    .eq("telegram_user_id", telegramUserId);

  if (error) throw error;
  return status;
}

async function sendTelegramMessage(chatId: number, text: string) {
  if (!TELEGRAM_BOT_TOKEN) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("telegram sendMessage HTTP error", res.status, err);
      return;
    }

    const payload = await res.json() as Record<string, unknown>;
    if (payload.ok !== true) {
      console.error("telegram sendMessage API error", JSON.stringify(payload));
    }
  } catch (error) {
    // Reply delivery must never fail the webhook processing path.
    console.error("telegram sendMessage network error", error);
  }
}

async function buildDebriefWithFallback(rawInput: string, messageDateIso: string | null): Promise<{
  summaryText: string;
  structuredJson: Record<string, unknown>;
  debriefDate: string;
  technique: string;
  techniqueType: string;
  keyPoints: string[];
  reflections: string;
  modelUsed: string;
  parseConfidence: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costEstimate: number | null;
}> {
  const fallbackDate = isoDateOnly(messageDateIso ?? new Date().toISOString());
  const modelErrors: Record<string, string> = {};

  for (const model of MODEL_CANDIDATES) {
    try {
      return await callModel(rawInput, model, messageDateIso);
    } catch (modelError) {
      modelErrors[model] = String(modelError);
    }
  }

  const technique = inferTechnique(rawInput);
  const inferredType = inferTechniqueType(rawInput, technique);
  const keyPoints = buildKeyPointsFromText(rawInput);
  const reflections = rawInput;
  const summaryText = buildFallbackSummary(technique, keyPoints, reflections);
  const structuredJson = {
    date: fallbackDate,
    technique,
    technique_type: inferredType,
    key_points: keyPoints,
    reflections,
    raw_notes: rawInput,
    summary: summaryText,
    local_fallback_reason: {
      model_errors: modelErrors,
    },
  };

  return {
    summaryText,
    structuredJson,
    debriefDate: fallbackDate,
    technique,
    techniqueType: inferredType,
    keyPoints,
    reflections,
    modelUsed: "local_fallback",
    parseConfidence: 0.35,
    inputTokens: null,
    outputTokens: null,
    costEstimate: 0,
  };
}

async function callModel(rawInput: string, model: string, messageDateIso: string | null) {
  if (!OPENROUTER_API_KEY) {
    throw new Error("Missing OPENROUTER_API_KEY secret");
  }

  const fallbackDate = isoDateOnly(messageDateIso ?? new Date().toISOString());

  // OpenRouter Chat Completions (OpenAI-compatible schema)
  const prompt = [
    "You are a Debrief parser.",
    "Extract this message into strict JSON with exactly these keys:",
    "date (YYYY-MM-DD)",
    "technique (short label, max 6 words, e.g. 'rear naked choke' not a full sentence)",
    "technique_type (one of: choke, arm_attack, leg_attack, sweep, escape, guard_pass, guard_retention, takedown, back_control, mount, side_control, other)",
    "key_points (array with 2-4 concise coaching takeaways, each under 12 words; do not copy full input sentences)",
    "reflections (1-2 short sentences)",
    "summary (1-2 concise sentences, under 220 chars)",
    "Key points must not be identical to the summary, reflections, or raw notes.",
    `If date missing, use ${fallbackDate}.`,
    "Return valid JSON only. No markdown.",
    `Debrief input: ${rawInput}`,
  ].join("\n");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://debrief.local",
      "X-Title": "Debrief Beta",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 450,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Model call failed (${model}): ${errText}`);
  }

  const data = await res.json() as Record<string, unknown>;
  const outputText = extractChatCompletionText(data);

  const parsed = extractJsonObject(outputText);

  const technique = normalizeTechniqueLabel(asString(parsed.technique), rawInput);
  const detectedFromRaw = detectTechnique(`${rawInput} ${technique}`);
  const techniqueType = normalizeTechniqueType(
    asString(parsed.technique_type) || detectedFromRaw?.type || inferTechniqueType(rawInput, technique),
  );
  const keyPoints = normalizeKeyPoints(parsed.key_points, rawInput);
  const reflections = normalizeReflections(asString(parsed.reflections), rawInput);
  const summaryText = normalizeSummary(asString(parsed.summary), technique, keyPoints, reflections);
  const debriefDate = normalizeDate(asString(parsed.date), fallbackDate);

  const structuredJson = {
    date: debriefDate,
    technique,
    technique_type: techniqueType,
    key_points: keyPoints,
    reflections,
    raw_notes: rawInput,
    summary: summaryText,
  };
  const parseConfidence = normalizeConfidence(asNumber(parsed.confidence)) ??
    (techniqueType === "other" ? 0.62 : 0.82);

  return {
    summaryText,
    structuredJson,
    debriefDate,
    technique,
    techniqueType: techniqueType,
    keyPoints,
    reflections,
    modelUsed: model,
    parseConfidence,
    inputTokens: null,
    outputTokens: null,
    costEstimate: null,
  };
}

function extractText(responseJson: Record<string, unknown>): string {
  // Keep this simple for beta; adjust parsing if provider format changes.
  const output = responseJson.output as Array<Record<string, unknown>> | undefined;
  if (!output?.length) return "Debrief processed.";

  for (const item of output) {
    const content = item.content as Array<Record<string, unknown>> | undefined;
    if (!content?.length) continue;
    for (const part of content) {
      const text = part.text;
      if (typeof text === "string" && text.trim()) return text;
    }
  }
  return "Debrief processed.";
}

function extractChatCompletionText(responseJson: Record<string, unknown>): string {
  const choices = responseJson.choices as Array<Record<string, unknown>> | undefined;
  if (!choices?.length) return "";
  const first = choices[0];
  const message = first?.message as Record<string, unknown> | undefined;
  const content = message?.content;
  if (typeof content === "string") return content.trim();
  return "";
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
    // Continue to substring extraction.
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
      // Fall through.
    }
  }

  return {};
}

function buildModelCandidates(chainRaw: string, primary: string, fallback: string): string[] {
  const values = [
    ...chainRaw.split(",").map((item) => item.trim()),
    primary.trim(),
    fallback.trim(),
  ].filter((item) => item.length > 0);

  const unique = new Set<string>();
  for (const value of values) unique.add(value);

  if (unique.size === 0) {
    unique.add("openrouter/free");
  }

  return Array.from(unique).slice(0, 6);
}

function normalizeTechniqueType(value: string): string {
  const normalized = value.trim().toLowerCase();
  return ALLOWED_TECHNIQUE_TYPES.has(normalized) ? normalized : "other";
}

function normalizeDate(value: string, fallback: string): string {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return isoDateOnly(parsed.toISOString());
}

function isoDateOnly(value: string): string {
  return value.slice(0, 10);
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

function normalizeConfidence(value: number | null): number {
  if (value === null) return 0.5;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return Math.round(value * 1000) / 1000;
}

function inferDomainFromTechniqueType(techniqueType: string): string {
  return techniqueType === "other" ? "general" : "martial_arts";
}

function normalizeTopicTags(values: Array<string | null | undefined>): string[] {
  const unique = new Set<string>();
  for (const raw of values) {
    const value = (raw ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_\- ]+/g, "")
      .replace(/\s+/g, "_");
    if (!value) continue;
    unique.add(value);
  }
  return Array.from(unique).slice(0, 8);
}

async function enqueueParseJob(debriefId: string, stage: number) {
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

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0)
    .slice(0, 8);
}

function normalizeKeyPoints(value: unknown, rawInput: string): string[] {
  let points = normalizeStringArray(value)
    .flatMap((item) => item.split(/[;\n]/).map((part) => part.trim()))
    .filter((item) => item.length > 0)
    .map((item) => cleanupSentence(item))
    .filter((item) => item.length > 0)
    .slice(0, 4);

  if (points.length === 0) {
    points = buildKeyPointsFromText(rawInput);
  }

  return points.map((item) => truncate(item, 120)).slice(0, 4);
}

function normalizeReflections(parsedReflections: string, rawInput: string): string {
  const reflection = parsedReflections.trim();
  if (reflection.length >= 20) {
    return truncate(reflection, 360);
  }
  const sentences = rawInput
    .split(/[.!?]/)
    .map((item) => cleanupSentence(item))
    .filter((item) => item.length > 0);
  if (sentences.length <= 1) {
    return truncate(sentences[0] || rawInput, 360);
  }
  return truncate(`${sentences[sentences.length - 2]}. ${sentences[sentences.length - 1]}.`, 360);
}

function normalizeSummary(parsedSummary: string, technique: string, keyPoints: string[], reflections: string): string {
  const summary = cleanupSentence(parsedSummary);
  if (summary && summary.length <= 220 && !summary.toLowerCase().startsWith("technique focus:")) {
    return summary;
  }
  const first = keyPoints[0] || cleanupSentence(reflections.split(/[.!?]/)[0] || "");
  const second = keyPoints[1] ? ` Next focus: ${keyPoints[1]}.` : "";
  return truncate(`${technique}: ${first}.${second}`.trim(), 220);
}

function normalizeTechniqueLabel(parsedTechnique: string, rawInput: string): string {
  const parsedClean = cleanupSentence(parsedTechnique);
  const detected = detectTechnique(`${parsedClean} ${rawInput}`);
  if (detected) return detected.label;

  if (parsedClean) {
    const trimmed = parsedClean
      .replace(/^(when|while|if)\s+doing\s+/i, "")
      .replace(/^doing\s+/i, "")
      .replace(/\byou\s+(must|should|need to)\b.*$/i, "")
      .trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length > 0 && words.length <= 6) {
      return trimmed.toLowerCase();
    }
  }

  return inferTechnique(rawInput);
}

function inferTechnique(rawInput: string): string {
  const detected = detectTechnique(rawInput);
  if (detected) return detected.label;

  const trimmed = rawInput.trim();
  if (!trimmed) return "general training";

  const directPhrase = trimmed.match(
    /\b(?:working on|worked on|practicing|drilling|doing|trained)\s+(?:a|an|the)?\s*([a-z][a-z\s-]{2,40})/i,
  );
  if (directPhrase?.[1]) {
    return truncate(cleanupSentence(directPhrase[1]).toLowerCase(), 48);
  }

  const firstSentence = cleanupSentence(trimmed.split(/[.!?]/)[0] ?? "");
  const words = firstSentence.split(/\s+/).slice(0, 5).join(" ");
  return words || "general training";
}

function inferTechniqueType(rawInput: string, technique: string): string {
  const detected = detectTechnique(`${rawInput} ${technique}`);
  if (detected) return detected.type;

  const text = `${rawInput} ${technique}`.toLowerCase();
  if (/\b(choke|rear naked|guillotine|triangle|darce|anaconda)\b/.test(text)) return "choke";
  if (/\b(armbar|kimura|americana|arm lock)\b/.test(text)) return "arm_attack";
  if (/\b(heel hook|ankle lock|kneebar|toe hold|straight ankle)\b/.test(text)) return "leg_attack";
  if (/\b(sweep|butterfly sweep|scissor sweep|pendulum)\b/.test(text)) return "sweep";
  if (/\b(escape|escape from|frame and hip escape|shrimp)\b/.test(text)) return "escape";
  if (/\b(pass|guard pass|knee cut|torreando)\b/.test(text)) return "guard_pass";
  if (/\b(guard retention|retain guard|recover guard)\b/.test(text)) return "guard_retention";
  if (/\b(takedown|single leg|double leg|osoto|uchimata)\b/.test(text)) return "takedown";
  if (/\b(back control|seatbelt|back take)\b/.test(text)) return "back_control";
  if (/\b(mount|mounted)\b/.test(text)) return "mount";
  if (/\b(side control|cross side)\b/.test(text)) return "side_control";
  return "other";
}

function buildKeyPointsFromText(rawInput: string): string[] {
  return rawInput
    .split(/[.!?]/)
    .map((part) => cleanupSentence(part))
    .filter((part) => part.length > 0)
    .map((part) => part.replace(/^(when|while|if)\s+doing\s+/i, ""))
    .slice(0, 3)
    .map((part) => truncate(part, 120));
}

function buildFallbackSummary(technique: string, keyPoints: string[], reflections: string): string {
  return normalizeSummary("", technique, keyPoints, reflections);
}

function detectTechnique(text: string): { label: string; type: string } | null {
  for (const item of TECHNIQUE_LIBRARY) {
    if (item.pattern.test(text)) {
      return { label: item.label, type: item.type };
    }
  }
  return null;
}

function cleanupSentence(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/^[,;:\-.\s]+/, "")
    .replace(/[,;:\-.\s]+$/, "")
    .trim();
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3).trim()}...`;
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

