import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://wtmzcwsfetqhfrdlygyr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bLuHb3b4yECOGg5IG9evag_rTZbzioA";
const CHECK_LIMIT = 8;
const CHECK_DELAY_MS = 2200;
const MIN_CONNECTED_SCREEN_MS = 5000;

let checkCount = 0;
let supabase = null;
let checkStartedAt = Date.now();

const title = document.querySelector("#telegramCheckTitle");
const copy = document.querySelector("#telegramCheckCopy");
const status = document.querySelector("#telegramCheckStatus");
const progress = document.querySelector("#telegramProgress");
const checkAgainButton = document.querySelector("#telegramCheckAgain");
const backLink = document.querySelector("#telegramCheckBack");

if (checkAgainButton) checkAgainButton.addEventListener("click", () => runChecks({ reset: true }));

boot();

async function boot() {
  const params = new URLSearchParams(window.location.search);
  const from = params.get("from") === "signup" ? "signup" : "telegram-connect";
  if (backLink) backLink.href = `/${from}`;

  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  } catch (_error) {
    showStillWaiting("Debrief could not start the connection check. Go back to setup and try again.");
    return;
  }

  await runChecks({ reset: true });
}

async function runChecks({ reset = false } = {}) {
  if (reset) {
    checkCount = 0;
    checkStartedAt = Date.now();
    setBusy(true);
    setStatus("Checking now...", false);
    if (title) title.textContent = "Checking Telegram.";
    if (copy) copy.textContent = "Give me a moment while I confirm where your Telegram notes are saving.";
  }

  const sessionResult = await withTimeout(
    supabase.auth.getSession(),
    8000,
    "Could not confirm your login session.",
  ).catch((error) => ({ error }));

  const session = sessionResult?.data?.session;
  if (!session) {
    showLoggedOut();
    return;
  }

  while (checkCount < CHECK_LIMIT) {
    checkCount += 1;
    setStatus(`Checking Telegram connection... attempt ${checkCount} of ${CHECK_LIMIT}`, false);
    const result = await checkTelegramLink();
    if (result?.is_linked) {
      showConnected(result.linked_at);
      return;
    }
    await wait(CHECK_DELAY_MS);
  }

  showStillWaiting("I could not confirm the link yet. If Telegram already replied that it saved the destination, try Check Again.");
}

async function checkTelegramLink() {
  const result = await withTimeout(
    supabase.rpc("get_my_telegram_link_status"),
    6000,
    "Telegram link check took too long.",
  ).catch((error) => ({ error }));

  if (result.error) {
    return null;
  }

  return result.data || null;
}

function showConnected(linkedAt) {
  const connectedText = linkedAt ? `Connected ${new Date(linkedAt).toLocaleDateString()}.` : "Connected.";
  setBusy(false);
  if (title) title.textContent = "Telegram is connected.";
  if (copy) copy.textContent = `${connectedText} Opening your Debrief history now.`;
  setStatus("Opening your notes...", false);
  const elapsed = Date.now() - checkStartedAt;
  const redirectDelay = Math.max(MIN_CONNECTED_SCREEN_MS - elapsed, 1200);
  window.setTimeout(() => {
    window.location.replace(`/telegram-confirmed?telegram=connected&t=${Date.now()}`);
  }, redirectDelay);
}

function showStillWaiting(message) {
  setBusy(false);
  if (title) title.textContent = "Still waiting for Telegram.";
  if (copy) copy.textContent = message;
  setStatus("Open Telegram, make sure the command went to the Debrief bot, send /status, then come back and check again.", false);
}

function showLoggedOut() {
  setBusy(false);
  if (title) title.textContent = "Log in again.";
  if (copy) copy.textContent = "Your Debrief session is not active in this browser, so I cannot check Telegram yet.";
  setStatus("Go back to setup, log in, then use Check Status again.", true);
}

function setBusy(isBusy) {
  if (progress) progress.classList.toggle("hidden", !isBusy);
  if (checkAgainButton) checkAgainButton.disabled = isBusy;
}

function setStatus(message, isError) {
  if (!status) return;
  status.textContent = message;
  status.style.color = isError ? "#ff9e9e" : "#cfe7ff";
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function withTimeout(promise, timeoutMs, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}
