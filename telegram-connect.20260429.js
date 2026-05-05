import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://wtmzcwsfetqhfrdlygyr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bLuHb3b4yECOGg5IG9evag_rTZbzioA";
const TELEGRAM_BOT_USERNAME = "BJJ_debrief_bot";

let command = "";
let supabase = null;

const copy = document.querySelector("#telegramConnectCopy");
const code = document.querySelector("#telegramConnectCode");
const commandButton = document.querySelector("#telegramConnectCommand");
const status = document.querySelector("#telegramConnectStatus");
const openBot = document.querySelector("#telegramConnectOpenBot");
const account = document.querySelector("#telegramConnectAccount");

if (commandButton) commandButton.addEventListener("click", copyCommand);

boot();

async function boot() {
  supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
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

  const linkStatus = await getMyTelegramLinkStatus();
  if (linkStatus?.is_linked) {
    redirectTo("/telegram-confirmed");
    return;
  }

  command = `/save_to ${session.user.email}`;
  if (code) code.textContent = command;
  if (copy) copy.textContent = `Copy this command, send it to the Debrief bot, and future #debrief notes will save to ${session.user.email}.`;
  if (account) account.textContent = `You are connecting Telegram to ${session.user.email}.`;
  if (openBot) openBot.href = `https://t.me/${TELEGRAM_BOT_USERNAME}`;
  setStatus("After Telegram replies, tap I Sent It.", false);
}

async function getMyTelegramLinkStatus() {
  const result = await withTimeout(
    supabase.rpc("get_my_telegram_link_status"),
    6000,
    "Telegram link check took too long.",
  ).catch((error) => ({ error }));
  if (result.error) return null;
  return result.data || null;
}

async function copyCommand() {
  if (!command) {
    setStatus("The command is still being prepared.", true);
    return;
  }

  try {
    await navigator.clipboard.writeText(command);
    setStatus("Command copied. Paste it into the Debrief bot in Telegram.", false);
  } catch (_error) {
    setStatus(`Copy this command: ${command}`, false);
  }
}

function redirectTo(path) {
  const destination = new URL(path, window.location.origin);
  destination.searchParams.set("t", Date.now().toString());
  window.location.replace(destination.toString());
}

function setStatus(message, isError) {
  if (!status) return;
  status.textContent = message;
  status.style.color = isError ? "#ff9e9e" : "#cfe7ff";
}

function withTimeout(promise, timeoutMs, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}
