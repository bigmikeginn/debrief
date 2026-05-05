import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://wtmzcwsfetqhfrdlygyr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bLuHb3b4yECOGg5IG9evag_rTZbzioA";
const CONFIRMED_SCREEN_MS = 15000;

const copy = document.querySelector("#telegramConfirmedCopy");
const status = document.querySelector("#telegramConfirmedStatus");
const copyFirstDebrief = document.querySelector("#copyFirstDebrief");
const firstDebriefText = "#debrief Today we drilled guard retention. I need to frame earlier and keep my knees tighter.";

if (copyFirstDebrief) {
  copyFirstDebrief.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(firstDebriefText);
      if (status) status.textContent = "Test note copied. Paste it into the Debrief bot in Telegram.";
    } catch (_error) {
      if (status) status.textContent = firstDebriefText;
    }
  });
}

boot();

async function boot() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  const sessionResult = await withTimeout(
    supabase.auth.getSession(),
    8000,
    "Could not confirm your login session.",
  ).catch((error) => ({ error }));
  const session = sessionResult?.data?.session;

  if (!session) {
    redirectTo("/login");
    return;
  }

  const result = await withTimeout(
    supabase.rpc("get_my_telegram_link_status"),
    6000,
    "Telegram link check took too long.",
  ).catch((error) => ({ error }));

  if (!result.error && result.data?.is_linked === false) {
    redirectTo("/telegram-connect");
    return;
  }

  if (copy) copy.textContent = `Future Telegram notes that start with #debrief will save to ${session.user.email}.`;
  if (status) status.textContent = "Copy the test note if you want one. Your Debrief history will open shortly.";
  window.setTimeout(() => redirectTo("/viewer"), CONFIRMED_SCREEN_MS);
}

function redirectTo(path) {
  const destination = new URL(path, window.location.origin);
  destination.searchParams.set("t", Date.now().toString());
  window.location.replace(destination.toString());
}

function withTimeout(promise, timeoutMs, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}
