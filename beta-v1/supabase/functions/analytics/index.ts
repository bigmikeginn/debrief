import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { startDate, endDate } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_ANON_KEY") || ""
    );

    // Overview query
    const { data: debriefs, error: debriefError } = await supabase
      .from("debriefs")
      .select("created_at, parse_status, parse_confidence, user_id")
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    if (debriefError) throw new Error(`Debrief query failed: ${debriefError.message}`);

    const totalDebriefs = debriefs?.length || 0;
    const successfulDebriefs = debriefs?.filter((d) => d.parse_status === "ready").length || 0;
    const parseSuccessRate = totalDebriefs > 0 ? Math.round((100 * successfulDebriefs) / totalDebriefs) : 0;

    const confidences = debriefs
      ?.map((d) => d.parse_confidence)
      .filter((c) => c !== null && c !== undefined)
      .map((c) => typeof c === "string" ? parseFloat(c) : c) || [];
    const avgParseConfidence = confidences.length > 0 ? confidences.reduce((a, b) => a + b) / confidences.length : 0;

    // Total users (all profiles)
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });

    // Active users (last 7 days)
    const sevenDaysAgo = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: activeUserData } = await supabase
      .from("debriefs")
      .select("user_id")
      .gte("created_at", sevenDaysAgo);

    const activeUsers7d = new Set(activeUserData?.map((d) => d.user_id) || []).size;

    const overview = {
      total_users: totalUsers || 0,
      active_users_7d: activeUsers7d,
      total_debriefs: totalDebriefs,
      parse_success_rate: parseSuccessRate,
      avg_parse_confidence: avgParseConfidence,
    };

    // User metrics
    const { data: newProfileData } = await supabase
      .from("profiles")
      .select("id")
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    const newUsers = newProfileData?.length || 0;
    const avgDebriefs = overview.total_users > 0 ? totalDebriefs / overview.total_users : 0;

    const { data: planData } = await supabase
      .from("user_plan_entitlements")
      .select("entitlement_type")
      .gte("updated_at", startDate)
      .lte("updated_at", endDate);

    const userMetrics = {
      new_users: newUsers,
      free_count: planData?.filter((p) => p.entitlement_type === "free").length || 0,
      pro_count: planData?.filter((p) => p.entitlement_type === "pro").length || 0,
      avg_debriefs: avgDebriefs,
    };

    // Sharing adoption
    const { data: shareData } = await supabase
      .from("debrief_shares")
      .select("user_id")
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    const uniqueSharers = new Set(shareData?.map((s) => s.user_id) || []).size;
    const sharing = {
      sharing_users: uniqueSharers,
      avg_shares_per_sharer: shareData && uniqueSharers > 0 ? shareData.length / uniqueSharers : 0,
    };

    // Favorites adoption
    const { data: favData } = await supabase
      .from("debrief_favourites")
      .select("user_id")
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    const uniqueFavUsers = new Set(favData?.map((f) => f.user_id) || []).size;
    const favorites = {
      users_with_favorites: uniqueFavUsers,
      avg_favorites_per_user: favData && uniqueFavUsers > 0 ? favData.length / uniqueFavUsers : 0,
    };

    // Engagement (repeat users, median debriefs)
    const userDebriefCounts = new Map();
    debriefs?.forEach((d) => {
      const count = userDebriefCounts.get(d.user_id) || 0;
      userDebriefCounts.set(d.user_id, count + 1);
    });

    const repeatUsers = Array.from(userDebriefCounts.values()).filter((count) => count >= 2).length;
    const counts = Array.from(userDebriefCounts.values()).sort((a, b) => a - b);
    const medianDebriefs = counts.length > 0 ? counts[Math.floor(counts.length / 2)] : 0;

    const engagement = {
      repeat_users: repeatUsers,
      daily_active: activeUsers7d,
      median_debriefs: medianDebriefs,
    };

    // Conversion funnel
    const signups = overview.total_users;
    const firstDebriefs = new Set(debriefs?.map((d) => d.user_id) || []).size;
    const shared = uniqueSharers;

    const { data: proUsers } = await supabase
      .from("user_plan_entitlements")
      .select("user_id")
      .eq("entitlement_type", "pro")
      .gte("updated_at", startDate)
      .lte("updated_at", endDate);

    const upgradedPro = new Set(proUsers?.map((p) => p.user_id) || []).size;

    const funnel = {
      signups,
      first_debrief: firstDebriefs,
      shared,
      upgraded_pro: upgradedPro,
    };

    // Quality metrics
    const failedCount = debriefs?.filter((d) => d.parse_status === "failed").length || 0;
    const needsReviewCount = debriefs?.filter((d) => d.parse_status === "needs_review").length || 0;

    const quality = {
      parse_failures: failedCount,
      needs_review: needsReviewCount,
    };

    // LLM cost metrics
    const { data: costData } = await supabase
      .from("ai_runs")
      .select("input_tokens, output_tokens, cost")
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    const totalTokens = costData?.reduce((sum, c) => {
      const input = typeof c.input_tokens === "string" ? parseInt(c.input_tokens, 10) : c.input_tokens || 0;
      const output = typeof c.output_tokens === "string" ? parseInt(c.output_tokens, 10) : c.output_tokens || 0;
      return sum + input + output;
    }, 0) || 0;

    const totalCost = costData?.reduce((sum, c) => {
      const cost = typeof c.cost === "string" ? parseFloat(c.cost) : c.cost || 0;
      return sum + cost;
    }, 0) || 0;

    const cost = {
      total_tokens: totalTokens,
      total_cost: totalCost,
    };

    return new Response(
      JSON.stringify({
        overview,
        userMetrics,
        sharing,
        favorites,
        engagement,
        funnel,
        quality,
        cost,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Analytics error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
