import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://wtmzcwsfetqhfrdlygyr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bLuHb3b4yECOGg5IG9evag_rTZbzioA";
const PAGE_SIZE = 25;
const TELEGRAM_BOT_USERNAME = "BJJ_debrief_bot";

let supabase = null;
let currentUser = null;
let currentAccessToken = "";
let entries = [];
let activeEntryId = null;
let currentView = "mine";
let currentPage = 0;
let hasMore = false;
let sharedOptIn = false;
let favouriteIds = new Set();
let clubMembers = [];
let activeShareEntry = null;
let activeShareRecipientIds = new Set();
let activeShareWholeClub = false;
let inPasswordRecovery = false;
let emailCooldownUntil = 0;
let quickRange = "all";
let currentTelegramLinkCode = "";
let handlingSignedInSession = false;
const authMode = getAuthMode();
const pageKind = getPageKind();

const authStatus = document.querySelector("#authStatus");
const runtimeHint = document.querySelector("#runtimeHint");
const authPageTitle = document.querySelector("#authPageTitle");
const authPageCopy = document.querySelector("#authPageCopy");
const accountCardTitle = document.querySelector("#accountCardTitle");
const accountCard = document.querySelector("#accountCard");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const passwordField = document.querySelector("#passwordField");
const signupConfirmField = document.querySelector("#signupConfirmField");
const signupConfirmPasswordInput = document.querySelector("#signupConfirmPassword");
const loginButton = document.querySelector("#loginButton");
const emailLinkButton = document.querySelector("#emailLinkButton");
const resetPasswordButton = document.querySelector("#resetPasswordButton");
const logoutButton = document.querySelector("#logoutButton");
const logoutButtonCompact = document.querySelector("#logoutButtonCompact");
const sessionBar = document.querySelector("#sessionBar");
const sessionEmail = document.querySelector("#sessionEmail");
const showAuthButton = document.querySelector("#showAuthButton");
const authForm = document.querySelector("#authForm");
const authModeSwitch = document.querySelector("#authModeSwitch");
const signupConfirmation = document.querySelector("#signupConfirmation");
const passwordResetForm = document.querySelector("#passwordResetForm");
const newPasswordInput = document.querySelector("#newPassword");
const confirmPasswordInput = document.querySelector("#confirmPassword");
const savePasswordButton = document.querySelector("#savePasswordButton");

const appCard = document.querySelector("#appCard");
const listStatus = document.querySelector("#listStatus");
const filterForm = document.querySelector("#filterForm");
const refreshButton = document.querySelector("#refreshButton");
const loadMoreButton = document.querySelector("#loadMoreButton");
const entryList = document.querySelector("#entryList");
const entryDetail = document.querySelector("#entryDetail");
const listCountBadge = document.querySelector("#listCountBadge");

const viewMineButton = document.querySelector("#viewMineButton");
const viewSharedButton = document.querySelector("#viewSharedButton");
const viewSharedWithMeButton = document.querySelector("#viewSharedWithMeButton");
const viewFavouritesButton = document.querySelector("#viewFavouritesButton");
const sharedSettings = document.querySelector("#sharedSettings");
const sharedOptInInput = document.querySelector("#sharedOptIn");
const sharedOptInStatus = document.querySelector("#sharedOptInStatus");
const menuButton = document.querySelector("#menuButton");
const menuPanel = document.querySelector("#menuPanel");
const drawerScrim = document.querySelector("#drawerScrim");
const controlDrawer = document.querySelector("#controlDrawer");
const drawerCloseButton = document.querySelector("#drawerCloseButton");
const toggleFiltersButton = document.querySelector("#toggleFiltersButton");
const quickTodayInput = document.querySelector("#quickToday");
const clearSearchButton = document.querySelector("#clearSearchButton");
const quickFilterButtons = document.querySelectorAll(".quick-filter");
const topSession = document.querySelector("#topSession");
const topSessionButton = document.querySelector("#topSessionButton");
const topSessionPanel = document.querySelector("#topSessionPanel");
const topSessionEmail = document.querySelector("#topSessionEmail");
const showAccountPanelButton = document.querySelector("#showAccountPanelButton");
const topLogoutButton = document.querySelector("#topLogoutButton");
const sharePanel = document.querySelector("#sharePanel");
const sharePanelTitle = document.querySelector("#sharePanelTitle");
const shareWholeClubInput = document.querySelector("#shareWholeClub");
const sharePeopleList = document.querySelector("#sharePeopleList");
const sharePanelStatus = document.querySelector("#sharePanelStatus");
const saveShareSettingsButton = document.querySelector("#saveShareSettingsButton");
const stopSharingButton = document.querySelector("#stopSharingButton");
const telegramLinkCard = document.querySelector("#telegramLinkCard");
const telegramLinkTitle = document.querySelector("#telegramLinkTitle");
const telegramLinkCopy = document.querySelector("#telegramLinkCopy");
const telegramLinkCode = document.querySelector("#telegramLinkCode");
const telegramLinkSteps = document.querySelector("#telegramLinkSteps");
const telegramLinkStatus = document.querySelector("#telegramLinkStatus");
const openTelegramBotButton = document.querySelector("#openTelegramBotButton");
const refreshTelegramLinkButton = document.querySelector("#refreshTelegramLinkButton");
const copyTelegramCodeButton = document.querySelector("#copyTelegramCodeButton");

boot();

function boot() {
  configureAuthPage();
  if (loginButton && !authForm) loginButton.addEventListener("click", handleLogin);
  if (emailLinkButton) {
    emailLinkButton.addEventListener("click", (event) => {
      if (authMode === "signup") {
        event.preventDefault();
        handleSignup();
        return;
      }
      handleEmailLink();
    });
  }
  if (resetPasswordButton) resetPasswordButton.addEventListener("click", handleResetPasswordEmail);
  if (logoutButton) logoutButton.addEventListener("click", handleLogout);
  if (logoutButtonCompact) logoutButtonCompact.addEventListener("click", handleLogout);
  if (showAuthButton) {
    showAuthButton.addEventListener("click", () => {
      if (authForm) authForm.classList.toggle("hidden");
    });
  }
  if (savePasswordButton) savePasswordButton.addEventListener("click", handleSaveNewPassword);
  if (refreshButton) refreshButton.addEventListener("click", handleRefreshFeed);
  if (loadMoreButton) loadMoreButton.addEventListener("click", () => loadEntries({ reset: false }));
  if (toggleFiltersButton) toggleFiltersButton.addEventListener("click", toggleFilters);
  if (menuButton) menuButton.addEventListener("click", toggleMenuPanel);
  if (drawerCloseButton) drawerCloseButton.addEventListener("click", closeMenuPanel);
  if (drawerScrim) drawerScrim.addEventListener("click", closeMenuPanel);
  if (refreshTelegramLinkButton) refreshTelegramLinkButton.addEventListener("click", handleTelegramStatusCheck);
  if (copyTelegramCodeButton) copyTelegramCodeButton.addEventListener("click", copyTelegramLinkCode);
  if (quickTodayInput) quickTodayInput.addEventListener("change", handleQuickTodayToggle);
  if (clearSearchButton) clearSearchButton.addEventListener("click", handleClearSearch);
  quickFilterButtons.forEach((button) => {
    button.addEventListener("click", () => applyQuickRange(button.dataset.range || "all"));
  });
  if (topSessionButton) topSessionButton.addEventListener("click", toggleTopSessionPanel);
  if (showAccountPanelButton) {
    showAccountPanelButton.addEventListener("click", () => {
      if (accountCard) accountCard.classList.remove("hidden");
      closeTopSessionPanel();
    });
  }
  if (topLogoutButton) topLogoutButton.addEventListener("click", handleLogout);
  if (authForm) {
    authForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (authMode === "signup") {
        handleSignup();
        return;
      }
      handleLogin();
    });
  }
  if (filterForm) {
    filterForm.addEventListener("submit", (event) => {
      event.preventDefault();
      loadEntries({ reset: true });
    });
  }

  if (viewMineButton) viewMineButton.addEventListener("click", () => switchView("mine"));
  if (viewSharedButton) viewSharedButton.addEventListener("click", () => switchView("shared"));
  if (viewSharedWithMeButton) viewSharedWithMeButton.addEventListener("click", () => switchView("sharedWithMe"));
  if (viewFavouritesButton) viewFavouritesButton.addEventListener("click", () => switchView("favourites"));
  if (sharedOptInInput) sharedOptInInput.addEventListener("change", updateSharedOptIn);
  if (shareWholeClubInput) shareWholeClubInput.addEventListener("change", handleShareWholeClubChange);
  if (saveShareSettingsButton) saveShareSettingsButton.addEventListener("click", saveShareSettings);
  if (stopSharingButton) stopSharingButton.addEventListener("click", stopSharingActiveEntry);
  document.addEventListener("click", handleGlobalClick);
  document.addEventListener("click", handleDelegatedActions);
  window.addEventListener("focus", refreshTelegramStateOnReturn);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshTelegramStateOnReturn();
  });

  renderRuntimeHint();
  renderRecoveryState();
  if (toggleFiltersButton) toggleFiltersButton.textContent = "Search";
  setupSupabase();
}

function getAuthMode() {
  const explicitMode = document.documentElement.dataset.authMode;
  if (explicitMode === "signup" || explicitMode === "login") return explicitMode;
  const path = window.location.pathname.toLowerCase();
  return path.includes("signup") ? "signup" : "login";
}

function getPageKind() {
  const path = window.location.pathname.toLowerCase();
  if (path.includes("signup")) return "signup";
  if (path.includes("viewer") || path.includes("debrief-viewer")) return "viewer";
  return "login";
}

function configureAuthPage() {
  if (pageKind === "viewer") {
    document.title = "Debrief History | Debrief";
    if (authPageTitle) authPageTitle.textContent = "Your Debrief Archive";
    if (authPageCopy) authPageCopy.textContent = "Review your training notes, saved lessons, and shared club insights.";
    if (accountCardTitle) accountCardTitle.textContent = "Account";
    return;
  }

  const isSignup = authMode === "signup";
  document.title = isSignup ? "Sign Up | Debrief" : "Log In | Debrief";
  if (authPageTitle) authPageTitle.textContent = isSignup ? "Sign up for Debrief." : "Log in to Debrief.";
  if (authPageCopy) {
    authPageCopy.textContent = isSignup
      ? "Create your private training archive and start saving notes from class."
      : "Open your training archive, review your latest notes, and pick up where you left off.";
  }
  if (accountCardTitle) accountCardTitle.textContent = isSignup ? "Sign Up" : "Log In";
  if (emailLinkButton) {
    emailLinkButton.textContent = isSignup ? "Sign Up" : "Email Me a Login Link";
    emailLinkButton.classList.toggle("action", isSignup);
    emailLinkButton.classList.toggle("ghost", !isSignup);
  }
  if (loginButton) loginButton.classList.toggle("hidden", isSignup);
  if (passwordField) passwordField.classList.remove("hidden");
  if (signupConfirmField) signupConfirmField.classList.toggle("hidden", !isSignup);
  if (resetPasswordButton) resetPasswordButton.classList.toggle("hidden", isSignup);
  if (authModeSwitch) {
    authModeSwitch.textContent = "";
  }
}

function renderRuntimeHint() {
  if (window.location.protocol === "file:") {
    runtimeHint.textContent = "Tip: open this page via a local web server (http://localhost) for reliable auth redirects.";
    runtimeHint.style.color = "#ffd28f";
    return;
  }
  runtimeHint.textContent = "";
}

function toggleFilters() {
  if (!filterForm || !toggleFiltersButton) return;
  const nextHidden = !filterForm.classList.contains("hidden");
  filterForm.classList.toggle("hidden", nextHidden);
  toggleFiltersButton.textContent = nextHidden ? "Search" : "Hide Search";
  if (!nextHidden) {
    document.querySelector("#topicSearch")?.focus();
  }
}

function toggleMenuPanel() {
  if (!controlDrawer || !drawerScrim || !menuButton) return;
  const willShow = controlDrawer.classList.contains("hidden");
  if (willShow) {
    openMenuPanel();
    return;
  }
  closeMenuPanel();
}

function openMenuPanel() {
  if (!controlDrawer || !drawerScrim || !menuButton) return;
  controlDrawer.classList.remove("hidden");
  drawerScrim.classList.remove("hidden");
  document.body.classList.add("drawer-open");
  menuButton.setAttribute("aria-expanded", "true");
}

function closeMenuPanel() {
  if (!controlDrawer || !drawerScrim || !menuButton) return;
  controlDrawer.classList.add("hidden");
  drawerScrim.classList.add("hidden");
  document.body.classList.remove("drawer-open");
  menuButton.setAttribute("aria-expanded", "false");
}

function handleGlobalClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  if (controlDrawer && menuButton && !controlDrawer.classList.contains("hidden")) {
    if (!(controlDrawer.contains(target) || menuButton.contains(target))) {
      closeMenuPanel();
    }
  }

  if (topSessionPanel && topSessionButton && !topSessionPanel.classList.contains("hidden")) {
    if (!(topSessionPanel.contains(target) || topSessionButton.contains(target))) {
      closeTopSessionPanel();
    }
  }
}

function handleQuickTodayToggle() {
  if (!quickTodayInput || !quickTodayInput.checked) return;
  applyQuickRange("week");
}

function applyQuickRange(range, { load = true } = {}) {
  quickRange = range;
  const dateFrom = document.querySelector("#dateFrom");
  const dateTo = document.querySelector("#dateTo");
  const today = new Date();

  if (range === "today") {
    const todayValue = toDateInputValue(today);
    if (dateFrom) dateFrom.value = todayValue;
    if (dateTo) dateTo.value = todayValue;
    if (quickTodayInput) quickTodayInput.checked = false;
  } else if (range === "week") {
    const monday = getStartOfWeek(today);
    if (dateFrom) dateFrom.value = toDateInputValue(monday);
    if (dateTo) dateTo.value = toDateInputValue(today);
    if (quickTodayInput) quickTodayInput.checked = true;
  } else {
    quickRange = "all";
    if (dateFrom) dateFrom.value = "";
    if (dateTo) dateTo.value = "";
    if (quickTodayInput) quickTodayInput.checked = false;
  }

  renderQuickRange();
  if (load) loadEntries({ reset: true });
}

function renderQuickRange() {
  quickFilterButtons.forEach((button) => {
    button.classList.toggle("active-tab", (button.dataset.range || "all") === quickRange);
  });
}

function getStartOfWeek(date) {
  const monday = new Date(date);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  return monday;
}

function toDateInputValue(date) {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 10);
}

async function handleRefreshFeed() {
  handleClearSearch({ load: false });
  closeMenuPanel();
  setListStatus("Refreshing full feed...", false);
  await loadEntries({ reset: true });
}

function handleClearSearch({ load = true } = {}) {
  const dateFrom = document.querySelector("#dateFrom");
  const dateTo = document.querySelector("#dateTo");
  const domainFilter = document.querySelector("#domainFilter");
  const topicSearch = document.querySelector("#topicSearch");
  const tagSearch = document.querySelector("#tagSearch");
  if (dateFrom) dateFrom.value = "";
  if (dateTo) dateTo.value = "";
  if (domainFilter) domainFilter.value = "";
  if (topicSearch) topicSearch.value = "";
  if (tagSearch) tagSearch.value = "";
  applyQuickRange("all", { load: false });
  if (load) loadEntries({ reset: true });
}

function handleDelegatedActions(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const actionEl = target.closest("button");
  if (!actionEl) return;
  const actionId = actionEl.id;
  if (actionId === "topLogoutButton" || actionId === "logoutButton" || actionId === "logoutButtonCompact") {
    handleLogout();
  } else if (actionId === "refreshButton") {
    handleRefreshFeed();
  }
}

function refreshTelegramStateOnReturn() {
  if (!currentUser || !telegramLinkCard || telegramLinkCard.classList.contains("hidden")) return;
  loadTelegramLinkState({ forceNewCode: false });
}

function handleTelegramStatusCheck() {
  if (!currentUser) {
    setTelegramLinkStatus("Log in first, then check the Telegram connection.", true);
    return;
  }
  const checkUrl = new URL("/telegram-check", window.location.origin);
  checkUrl.searchParams.set("from", authMode === "signup" ? "signup" : "login");
  window.location.href = checkUrl.toString();
}

function toggleTopSessionPanel() {
  if (!topSessionPanel || !topSessionButton) return;
  const willShow = topSessionPanel.classList.contains("hidden");
  topSessionPanel.classList.toggle("hidden", !willShow);
  topSessionButton.setAttribute("aria-expanded", willShow ? "true" : "false");
}

function closeTopSessionPanel() {
  if (!topSessionPanel || !topSessionButton) return;
  topSessionPanel.classList.add("hidden");
  topSessionButton.setAttribute("aria-expanded", "false");
}

function setupSupabase() {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  } catch (_error) {
    setAuthStatus("App configuration is invalid. Please contact support.", true);
    return;
  }

  // Supabase can return from reset links as SIGNED_IN without PASSWORD_RECOVERY.
  if (isRecoveryLink(window.location.hash)) {
    inPasswordRecovery = true;
    renderRecoveryState();
    setAuthStatus("Recovery link detected. Enter and save your new password.", false);
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    if (_event === "PASSWORD_RECOVERY") {
      inPasswordRecovery = true;
      renderRecoveryState();
      setAuthStatus("Recovery verified. Enter your new password below.", false);
    }
    currentUser = session?.user ?? null;
    currentAccessToken = session?.access_token || "";
    renderAuthState();
    if (currentUser) {
      window.setTimeout(() => {
        handleSignedInSession();
      }, 0);
    }
  });

  supabase.auth.getSession().then(async ({ data }) => {
    currentUser = data.session?.user ?? null;
    currentAccessToken = data.session?.access_token || "";
    renderAuthState();
    if (currentUser) await handleSignedInSession();
  });
}

async function handleSignedInSession() {
  if (inPasswordRecovery || handlingSignedInSession) return;
  handlingSignedInSession = true;

  try {
    const linkStatus = await getMyTelegramLinkStatus();
    if (pageKind === "login" || pageKind === "signup") {
      redirectTo(linkStatus?.is_linked ? "/viewer" : "/telegram-connect");
      return;
    }

    if (pageKind === "viewer" && linkStatus?.is_linked === false) {
      redirectTo("/telegram-connect");
      return;
    }

    if (telegramLinkCard) telegramLinkCard.classList.add("hidden");
    renderViewState();
    await loadEntries({ reset: true });
    loadViewerPreferences();
  } finally {
    handlingSignedInSession = false;
  }
}

async function loadViewerPreferences() {
  await loadSharedOptIn();
  await loadFavouriteIds();
  if (currentView === "mine" && entries.length > 0) {
    renderEntryList();
    renderEntryDetail();
  }
}

async function getMyTelegramLinkStatus() {
  if (!supabase || !currentUser) return null;
  try {
    const result = await withTimeout(
      supabase.rpc("get_my_telegram_link_status"),
      6000,
      "Telegram link check took too long.",
    );
    if (!result.error) return result.data || null;
  } catch (_error) {
    // Keep the flow moving to the setup page if the status check is unavailable.
  }
  return null;
}

function redirectTo(path) {
  const destination = new URL(path, window.location.origin);
  destination.searchParams.set("t", Date.now().toString());
  window.location.replace(destination.toString());
}

function renderRecoveryState() {
  if (!passwordResetForm) return;
  passwordResetForm.classList.toggle("hidden", !inPasswordRecovery);
}

async function handleLogin() {
  if (authMode === "signup") return;
  if (!supabase) return;

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) {
    setAuthStatus("Email and password are required for login.", true);
    return;
  }

  setAuthStatus("Logging in...", false);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    setAuthStatus(error.message, true);
    return;
  }
  setAuthStatus("Logged in.", false);
}

async function handleSignup() {
  if (!supabase) {
    setAuthStatus("Sign up is not ready yet. Refresh the page and try again.", true);
    return;
  }
  if (emailLinkButton?.disabled) return;

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = signupConfirmPasswordInput?.value || "";

  if (!email) {
    setAuthStatus("Enter your email first.", true);
    return;
  }

  if (!password || password.length < 8) {
    setAuthStatus("Create a password with at least 8 characters.", true);
    return;
  }

  if (password !== confirmPassword) {
    setAuthStatus("The two passwords do not match.", true);
    return;
  }

  setAuthStatus("Creating your account...", false);
  setAuthBusy(true, "Creating account...");
  try {
    const redirectTo = `${window.location.origin}/login`;
    const { error } = await withTimeout(
      supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
        },
      }),
      15000,
      "Sign up is taking too long. Check your connection and try again.",
    );

    if (error) {
      setAuthStatus(formatSignupError(error.message), true);
      return;
    }

    passwordInput.value = "";
    if (signupConfirmPasswordInput) signupConfirmPasswordInput.value = "";
    if (authForm) authForm.classList.add("hidden");
    if (signupConfirmation) signupConfirmation.classList.remove("hidden");
    setAuthStatus("Account created. You can log in now.", false);
  } catch (error) {
    setAuthStatus(error?.message || "Something went wrong creating your account. Please try again.", true);
  } finally {
    setAuthBusy(false);
  }
}

function setAuthBusy(isBusy, busyLabel = "Working...") {
  if (!emailLinkButton) return;
  if (!emailLinkButton.dataset.idleLabel) {
    emailLinkButton.dataset.idleLabel = emailLinkButton.textContent || "Submit";
  }
  emailLinkButton.disabled = isBusy;
  emailLinkButton.textContent = isBusy ? busyLabel : emailLinkButton.dataset.idleLabel;
}

function withTimeout(promise, milliseconds, timeoutMessage) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(timeoutMessage)), milliseconds);
  });

  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

function fetchWithTimeout(url, options, milliseconds, timeoutMessage) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), milliseconds);
  return fetch(url, { ...options, signal: controller.signal })
    .catch((error) => {
      if (error?.name === "AbortError") throw new Error(timeoutMessage);
      throw error;
    })
    .finally(() => window.clearTimeout(timeoutId));
}

function formatSignupError(message) {
  const text = String(message || "").trim();
  if (!text) return "Unable to create your account. Please try again.";
  if (text.toLowerCase().includes("invalid")) {
    return `${text}. Please check for typos or try a regular email address.`;
  }
  if (text.toLowerCase().includes("already")) {
    return "That email may already have an account. Try logging in instead.";
  }
  return text;
}

async function handleEmailLink() {
  if (!supabase) return;
  if (!canSendAuthEmail()) return;
  const email = emailInput.value.trim();
  if (!email) {
    setAuthStatus("Enter an email first.", true);
    return;
  }

  const isSignup = authMode === "signup";
  setAuthStatus(isSignup ? "Sending sign-up email..." : "Sending login email...", false);
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.href,
      shouldCreateUser: isSignup,
    },
  });
  if (error) {
    handleAuthEmailError(error.message);
    return;
  }
  startEmailCooldown(45);
  setAuthStatus(
    isSignup
      ? "Check your email to finish signing up."
      : "Check your email to log in.",
    false,
  );
}

async function handleResetPasswordEmail() {
  if (!supabase) return;
  if (!canSendAuthEmail()) return;
  const email = emailInput.value.trim();
  if (!email) {
    setAuthStatus("Enter your email first.", true);
    return;
  }

  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  setAuthStatus("Sending password reset email...", false);
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    handleAuthEmailError(error.message);
    return;
  }
  startEmailCooldown(45);
  setAuthStatus("Password reset email sent. Open it and come back here to set a new password.", false);
}

async function handleSaveNewPassword() {
  if (!supabase) return;
  const nextPassword = newPasswordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  const hasRecoverySession = inPasswordRecovery || Boolean(currentUser) || isRecoveryLink(window.location.hash);
  if (!hasRecoverySession) {
    setAuthStatus("Open the newest reset email link first, then save your new password.", true);
    return;
  }

  if (!nextPassword || nextPassword.length < 8) {
    setAuthStatus("Password must be at least 8 characters.", true);
    return;
  }

  if (nextPassword !== confirmPassword) {
    setAuthStatus("Passwords do not match.", true);
    return;
  }

  setAuthStatus("Saving new password...", false);
  const { error } = await supabase.auth.updateUser({ password: nextPassword });
  if (error) {
    setAuthStatus(error.message, true);
    return;
  }

  inPasswordRecovery = false;
  renderRecoveryState();
  newPasswordInput.value = "";
  confirmPasswordInput.value = "";
  if (window.location.hash.includes("access_token")) {
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }
  setAuthStatus("Password updated. You can now log in with your new password.", false);
}

async function handleLogout() {
  forceLocalLogout();
  if (!supabase) return;
  supabase.auth.signOut().catch((error) => {
    setAuthStatus(`Logout warning: ${error.message}. Local session was cleared.`, true);
  });
}

function forceLocalLogout() {
  currentUser = null;
  inPasswordRecovery = false;
  entries = [];
  favouriteIds = new Set();
  activeEntryId = null;
  hasMore = false;
  clearSupabaseLocalAuth();
  renderAuthState();
  renderRecoveryState();
  closeMenuPanel();
  closeTopSessionPanel();
  renderLoadMore();
  setAuthStatus("Logged out.", false);
  setListStatus("", false);
}

function clearSupabaseLocalAuth() {
  try {
    removeSupabaseAuthKeys(localStorage);
    removeSupabaseAuthKeys(sessionStorage);
  } catch (_error) {
    // Private browsing/storage restrictions should not block visible logout.
  }
}

function removeSupabaseAuthKeys(storage) {
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (key && key.startsWith("sb-") && key.includes("auth-token")) {
      storage.removeItem(key);
    }
  }
}

function renderAuthState() {
  if (currentUser) {
    if (topSession) topSession.classList.remove("hidden");
    if (topSessionEmail) topSessionEmail.textContent = currentUser.email;
    if (accountCard) accountCard.classList.add("hidden");
    if (appCard) appCard.classList.toggle("hidden", pageKind !== "viewer");
    if (sessionEmail) sessionEmail.textContent = `Signed in as ${currentUser.email}`;
    if (sessionBar) sessionBar.classList.toggle("hidden", pageKind !== "viewer");
    if (authForm) authForm.classList.add("hidden");
    if (logoutButton) logoutButton.classList.remove("hidden");
    if (telegramLinkCard) telegramLinkCard.classList.add("hidden");
    setAuthStatus(pageKind === "viewer" ? `Logged in as ${currentUser.email}` : "Logged in. Sending you to the next step...", false);
    renderViewState();
  } else {
    if (topSession) topSession.classList.add("hidden");
    closeTopSessionPanel();
    if (accountCard) accountCard.classList.remove("hidden");
    if (appCard) appCard.classList.add("hidden");
    if (sessionBar) sessionBar.classList.add("hidden");
    if (authForm) authForm.classList.remove("hidden");
    if (signupConfirmation) signupConfirmation.classList.add("hidden");
    if (logoutButton) logoutButton.classList.add("hidden");
    if (telegramLinkCard) telegramLinkCard.classList.add("hidden");
    entries = [];
    favouriteIds = new Set();
    activeEntryId = null;
    if (appCard) appCard.classList.remove("detail-open");
    if (entryList) entryList.innerHTML = "";
    if (entryDetail) entryDetail.innerHTML = '<p class="muted">Log in to view your debriefs.</p>';
    if (listCountBadge) listCountBadge.textContent = "0";
    setListStatus("", false);
  }
}

async function loadTelegramLinkState({ forceNewCode = false } = {}) {
  if (!supabase || !currentUser || !telegramLinkCard) return;
  currentTelegramLinkCode = "";
  if (telegramLinkCode) telegramLinkCode.textContent = "Preparing...";
  if (openTelegramBotButton) {
    openTelegramBotButton.href = `https://t.me/${TELEGRAM_BOT_USERNAME}`;
    openTelegramBotButton.textContent = "Open Telegram";
  }
  setTelegramLinkStatus("Checking Telegram link...", false);

  try {
    const statusResult = await withTimeout(
      supabase.rpc("get_my_telegram_link_status"),
      6000,
      "Telegram link check took too long.",
    );

    if (!statusResult.error && statusResult.data?.is_linked) {
      renderTelegramLinked(statusResult.data.linked_at);
      return;
    }

    if (statusResult.error && !isMissingRelationError(statusResult.error)) {
      setTelegramLinkStatus("No Telegram link found for this account yet.", false);
    }
  } catch (_error) {
    setTelegramLinkStatus("Preparing Telegram setup...", false);
  }

  try {
    renderTelegramSaveToCommand();
  } catch (error) {
    if (telegramLinkCode) telegramLinkCode.textContent = "Try again";
    setTelegramLinkStatus(error?.message || "Could not prepare Telegram setup.", true);
  }
}

async function getTelegramLinkCode(forceNewCode) {
  try {
    const { data, error } = await withTimeout(
      supabase.rpc("create_telegram_link_code", { force_new: forceNewCode }),
      12000,
      "Supabase client timed out creating the Telegram code.",
    );

    if (error) {
      throw new Error(error.message || "Could not create Telegram code.");
    }

    if (!data) throw new Error("Supabase did not return a Telegram code.");
    return data;
  } catch (error) {
    console.warn("Supabase client code creation failed; trying direct fetch.", error);
    return getTelegramLinkCodeWithFetch(forceNewCode);
  }
}

async function getTelegramLinkCodeWithFetch(forceNewCode) {
  const sessionResult = await withTimeout(
    supabase.auth.getSession(),
    8000,
    "Could not confirm your login session. Log out and back in, then try again.",
  );
  const accessToken = sessionResult?.data?.session?.access_token;
  if (!accessToken) {
    throw new Error("Your login session expired. Log out and back in, then try again.");
  }

  const response = await fetchWithTimeout(
    `${SUPABASE_URL}/rest/v1/rpc/create_telegram_link_code`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ force_new: forceNewCode }),
    },
    15000,
    "Creating the Telegram code took too long. Try New Code.",
  );

  const text = await response.text();
  if (!response.ok) {
    let message = text || "Could not create Telegram code.";
    try {
      const parsed = JSON.parse(text);
      message = parsed.message || parsed.error || message;
    } catch (_error) {
      // Keep the plain response text.
    }
    throw new Error(message);
  }

  const code = text.replace(/^"|"$/g, "").trim();
  if (!code) throw new Error("Supabase did not return a Telegram code.");
  return code;
}

function renderTelegramLinkCode(code) {
  const botUrl = `https://t.me/${TELEGRAM_BOT_USERNAME}?start=link_${encodeURIComponent(code)}`;
  const accountEmail = currentUser?.email || "this Debrief account";
  currentTelegramLinkCode = `/link ${code}`;
  if (telegramLinkTitle) telegramLinkTitle.textContent = `Save Telegram notes to ${accountEmail}`;
  if (telegramLinkCopy) {
    telegramLinkCopy.textContent = `Telegram can save to one Debrief account at a time. Send this code to make future #debrief messages save to ${accountEmail}.`;
  }
  if (telegramLinkCode) telegramLinkCode.textContent = currentTelegramLinkCode;
  if (telegramLinkSteps) telegramLinkSteps.classList.remove("hidden");
  if (openTelegramBotButton) {
    openTelegramBotButton.href = botUrl;
    openTelegramBotButton.textContent = "Move Telegram to This Account";
    openTelegramBotButton.removeAttribute("aria-disabled");
  }
  setTelegramLinkStatus("Tip: send /status in Telegram anytime to see the current destination account.", false);
}

function renderTelegramSaveToCommand() {
  const accountEmail = currentUser?.email || "";
  const botUrl = `https://t.me/${TELEGRAM_BOT_USERNAME}`;
  currentTelegramLinkCode = `/save_to ${accountEmail}`;
  if (telegramLinkTitle) telegramLinkTitle.textContent = `Save Telegram notes to ${accountEmail}`;
  if (telegramLinkCopy) {
    telegramLinkCopy.textContent = `Telegram can save to one Debrief account at a time. Send this command to move future #debrief messages to ${accountEmail}.`;
  }
  if (telegramLinkCode) telegramLinkCode.textContent = currentTelegramLinkCode;
  if (telegramLinkSteps) telegramLinkSteps.classList.remove("hidden");
  if (openTelegramBotButton) {
    openTelegramBotButton.href = botUrl;
    openTelegramBotButton.textContent = "Open Telegram";
    openTelegramBotButton.removeAttribute("aria-disabled");
  }
  setTelegramLinkStatus("Copy the command, open Telegram, paste it to the Debrief bot, then send /status to confirm.", false);
}

function renderTelegramLinked(linkedAt) {
  const linkedDate = linkedAt ? new Date(linkedAt).toLocaleDateString() : "recently";
  const accountEmail = currentUser?.email || "this Debrief account";
  if (telegramLinkTitle) telegramLinkTitle.textContent = `Telegram saves to ${accountEmail}`;
  if (telegramLinkCopy) {
    telegramLinkCopy.textContent = `Telegram notes will save to ${accountEmail}. Send notes to the Debrief bot starting with #debrief.`;
  }
  if (telegramLinkSteps) telegramLinkSteps.classList.add("hidden");
  if (openTelegramBotButton) {
    openTelegramBotButton.href = `https://t.me/${TELEGRAM_BOT_USERNAME}`;
    openTelegramBotButton.textContent = "Open Debrief Bot";
    openTelegramBotButton.removeAttribute("aria-disabled");
  }
  setTelegramLinkStatus(`Connected ${linkedDate}. Future #debrief messages save to ${accountEmail}.`, false);
}

async function copyTelegramLinkCode() {
  if (!currentTelegramLinkCode) {
    setTelegramLinkStatus("The Telegram command is still being prepared. Try Check Status if it does not appear.", true);
    return;
  }

  try {
    await navigator.clipboard.writeText(currentTelegramLinkCode);
    setTelegramLinkStatus("Command copied. Paste it into the Debrief bot.", false);
  } catch (_error) {
    setTelegramLinkStatus(`Copy this command: ${currentTelegramLinkCode}`, false);
  }
}

function setTelegramLinkStatus(message, isError) {
  if (!telegramLinkStatus) return;
  telegramLinkStatus.textContent = message;
  telegramLinkStatus.style.color = isError ? "#ff9e9e" : "#cfe7ff";
}

function isMissingRelationError(error) {
  return error?.code === "42P01" || /does not exist|schema cache/i.test(error?.message || "");
}

function renderViewState() {
  const sharedMode = currentView === "shared";
  const sharedWithMeMode = currentView === "sharedWithMe";
  const favouritesMode = currentView === "favourites";
  if (viewMineButton) viewMineButton.classList.toggle("active-tab", currentView === "mine");
  if (viewSharedButton) viewSharedButton.classList.toggle("active-tab", sharedMode);
  if (viewSharedWithMeButton) viewSharedWithMeButton.classList.toggle("active-tab", sharedWithMeMode);
  if (viewFavouritesButton) viewFavouritesButton.classList.toggle("active-tab", favouritesMode);
  if (sharedSettings) sharedSettings.classList.toggle("hidden", !sharedMode);
}

function switchView(view) {
  if (currentView === view) return;
  currentView = view;
  activeEntryId = null;
  closeMenuPanel();
  renderViewState();
  loadEntries({ reset: true });
}

async function loadSharedOptIn() {
  if (!supabase || !currentUser) return;
  const { data, error } = await supabase
    .from("user_feed_preferences")
    .select("show_shared_notes")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (error) {
    if (sharedOptInStatus) {
      sharedOptInStatus.textContent = error.message;
      sharedOptInStatus.style.color = "#ff9e9e";
    }
    return;
  }

  sharedOptIn = Boolean(data?.show_shared_notes);
  if (sharedOptInInput) sharedOptInInput.checked = sharedOptIn;
  if (sharedOptInStatus) {
    sharedOptInStatus.textContent = sharedOptIn
      ? "Shared feed is enabled."
      : "Shared feed is disabled.";
    sharedOptInStatus.style.color = "#cfe7ff";
  }
}

async function loadFavouriteIds() {
  if (!supabase || !currentUser) return;
  const { data, error } = await supabase
    .from("debrief_favourites")
    .select("debrief_id")
    .eq("user_id", currentUser.id);

  if (error) {
    setListStatus(`Favourites unavailable: ${error.message}`, true);
    favouriteIds = new Set();
    return;
  }

  favouriteIds = new Set((data ?? []).map((item) => item.debrief_id));
}

async function updateSharedOptIn() {
  if (!supabase || !currentUser) return;
  const nextValue = Boolean(sharedOptInInput?.checked);
  if (sharedOptInStatus) {
    sharedOptInStatus.textContent = "Saving...";
    sharedOptInStatus.style.color = "#cfe7ff";
  }

  const { error } = await supabase
    .from("user_feed_preferences")
    .upsert({
      user_id: currentUser.id,
      show_shared_notes: nextValue,
    });

  if (error) {
    if (sharedOptInInput) sharedOptInInput.checked = sharedOptIn;
    if (sharedOptInStatus) {
      sharedOptInStatus.textContent = error.message;
      sharedOptInStatus.style.color = "#ff9e9e";
    }
    return;
  }

  sharedOptIn = nextValue;
  if (sharedOptInStatus) {
    sharedOptInStatus.textContent = sharedOptIn
      ? "Shared feed is enabled."
      : "Shared feed is disabled.";
    sharedOptInStatus.style.color = "#cfe7ff";
  }
  if (currentView === "shared") {
    loadEntries({ reset: true });
  }
}

async function loadEntries({ reset }) {
  if (!supabase) return;
  if (!currentUser) {
    renderAuthState();
    setAuthStatus("Log in to view your debriefs.", true);
    return;
  }
  let constrainedIds = null;
  let emptyMessage = "";

  if (currentView === "favourites") {
    await loadFavouriteIds();
    if (favouriteIds.size === 0) {
      renderEmptyState("No favourites yet. Save a debrief with the star button.");
      return;
    }
    constrainedIds = [...favouriteIds];
  }

  if (currentView === "shared" && !sharedOptIn) {
    renderEmptyState("Enable shared feed to browse club-shared notes.");
    return;
  }

  if (currentView === "shared") {
    constrainedIds = await loadShareScopedDebriefIds("club");
    emptyMessage = "No club-shared notes yet.";
  }

  if (currentView === "sharedWithMe") {
    constrainedIds = await loadShareScopedDebriefIds("user");
    emptyMessage = "No notes have been shared directly with you yet.";
  }

  if (constrainedIds && constrainedIds.length === 0) {
    renderEmptyState(emptyMessage || "No entries found.");
    return;
  }

  if (reset) {
    currentPage = 0;
    entries = [];
    activeEntryId = null;
  }

  setListStatus("Loading debriefs...", false);

  const from = currentPage * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  let query = supabase
    .from("debriefs")
    .select("id, club_id, author_user_id, created_at, debrief_date, note_title, note_summary, domain, topic_primary, topic_secondary, topic_tags, action_items, parse_status, parse_stage, parse_confidence, needs_review, technique, technique_type, key_points, reflections, raw_notes, summary_text, visibility")
    .order("created_at", { ascending: false })
    .range(from, to);

  const dateFrom = document.querySelector("#dateFrom")?.value || "";
  const dateTo = document.querySelector("#dateTo")?.value || "";
  const domainFilter = (document.querySelector("#domainFilter")?.value || "").trim().toLowerCase();
  const topicSearch = (document.querySelector("#topicSearch")?.value || "").trim();
  const tagSearch = (document.querySelector("#tagSearch")?.value || "").trim();

  if (dateFrom) query = query.gte("debrief_date", dateFrom);
  if (dateTo) query = query.lte("debrief_date", dateTo);
  if (domainFilter) query = query.eq("domain", domainFilter);
  if (topicSearch) {
    const topicLike = normalizeLikeValue(topicSearch);
    if (topicLike) {
      query = query.or(
        `note_title.ilike.%${topicLike}%,note_summary.ilike.%${topicLike}%,topic_primary.ilike.%${topicLike}%,topic_secondary.ilike.%${topicLike}%,raw_notes.ilike.%${topicLike}%`,
      );
    }
  }

  const tagFilters = parseTagFilter(tagSearch);
  if (tagFilters.length > 0) {
    query = query.contains("topic_tags", tagFilters);
  }

  const canUseMyHistoryRpc =
    currentView === "mine" &&
    !dateFrom &&
    !dateTo &&
    !domainFilter &&
    !topicSearch &&
    tagFilters.length === 0;

  if (canUseMyHistoryRpc) {
    const fetchLoaded = await loadMyDebriefsWithFetch({ from, reset });
    if (fetchLoaded) return;
  }

  if (currentView === "mine") {
    query = query.eq("author_user_id", currentUser.id);
  } else if (constrainedIds) {
    query = query.in("id", constrainedIds);
  } else {
    query = query.eq("visibility", "shared").neq("author_user_id", currentUser.id);
  }

  let response;
  try {
    response = await withTimeout(query, 7000, "Debrief list took too long.");
  } catch (error) {
    response = { data: null, error };
  }

  const { data, error } = response;
  if (error) {
    if (currentView === "mine") {
      const fallbackLoaded = await loadMyDebriefsFallback({ from, reset });
      if (fallbackLoaded) return;
    }
    setListStatus(error.message, true);
    return;
  }

  let batch = data ?? [];
  if (canUseMyHistoryRpc && batch.length === 0) {
    const fallbackLoaded = await loadMyDebriefsFallback({ from, reset });
    if (fallbackLoaded) return;
  }
  hasMore = batch.length === PAGE_SIZE;
  if (batch.length > 0) {
    currentPage += 1;
  }

  const merged = reset ? batch : [...entries, ...batch];
  const uniqueById = new Map(merged.map((entry) => [entry.id, entry]));
  entries = [...uniqueById.values()];

  if (entries.length === 0) {
    renderEntryList();
    renderEntryDetail();
    renderLoadMore();
    setListStatus("No entries found.", false);
    return;
  }

  if (!entries.find((entry) => entry.id === activeEntryId)) {
    activeEntryId = entries[0].id;
  }

  renderEntryList();
  renderEntryDetail();
  renderLoadMore();
  setListStatus(
    hasMore
      ? `${entries.length} loaded. Tap Load More for older debriefs.`
      : `${entries.length} loaded.`,
    false,
  );
}

function renderEmptyState(message) {
  entries = [];
  activeEntryId = null;
  hasMore = false;
  renderEntryList();
  renderEntryDetail();
  renderLoadMore();
  setListStatus(message, false);
}

async function loadShareScopedDebriefIds(scope) {
  if (!supabase || !currentUser) return [];
  let query = supabase
    .from("debrief_shares")
    .select("debrief_id")
    .is("revoked_at", null)
    .eq("scope", scope);

  if (scope === "user") {
    query = query.eq("recipient_user_id", currentUser.id);
  }

  const { data, error } = await query;
  if (error) {
    setListStatus(error.message, true);
    return [];
  }

  return [...new Set((data ?? []).map((share) => share.debrief_id).filter(Boolean))];
}

function renderLoadMore() {
  loadMoreButton.classList.toggle("hidden", !hasMore);
}

function renderEntryList() {
  if (listCountBadge) listCountBadge.textContent = String(entries.length);

  if (entries.length === 0) {
    entryList.innerHTML = "";
    return;
  }

  entryList.innerHTML = entries
    .map((entry) => {
      const isActive = entry.id === activeEntryId;
      const title = entry.note_title || entry.technique || "Untitled debrief";
      const dateLabel = entry.debrief_date || asDate(entry.created_at);
      const sharedBadge = entry.visibility === "shared" ? '<span class="entry-pill">Shared</span>' : "";
      const favouriteBadge = favouriteIds.has(entry.id) ? '<span class="entry-pill favourite-pill">Saved</span>' : "";

      return `
        <button class="entry-item ${isActive ? "active" : ""}" data-id="${entry.id}" type="button">
          <span class="entry-date">${escapeHtml(formatFriendlyDate(dateLabel))}</span>
          <strong>${escapeHtml(title)}</strong>
          ${sharedBadge}${favouriteBadge}
        </button>
      `;
    })
    .join("");

  entryList.querySelectorAll(".entry-item").forEach((button) => {
    button.addEventListener("click", () => {
      activeEntryId = button.dataset.id;
      renderEntryList();
      renderEntryDetail();
      if (appCard && window.matchMedia("(max-width: 720px)").matches) {
        appCard.classList.add("detail-open");
        entryDetail.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

function renderEntryDetail() {
  const entry = entries.find((item) => item.id === activeEntryId);
  if (!entry) {
    entryDetail.innerHTML = '<p class="muted">Select a debrief to view details.</p>';
    return;
  }

  const keyPoints = Array.isArray(entry.key_points) && entry.key_points.length
    ? `<ul class="keypoint-grid">${entry.key_points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>`
    : "<p>No key points parsed.</p>";
  const tags = Array.isArray(entry.topic_tags) && entry.topic_tags.length
    ? `<div class="tag-row">${entry.topic_tags.map((tag) => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join("")}</div>`
    : "<p>No tags assigned.</p>";
  const actionItems = Array.isArray(entry.action_items) && entry.action_items.length
    ? `<ul>${entry.action_items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "<p>No action items.</p>";
  const parseConfidence = typeof entry.parse_confidence === "number"
    ? `${Math.round(entry.parse_confidence * 100)}%`
    : "n/a";
  const canShare = entry.author_user_id === currentUser?.id;
  const shareLabel = entry.visibility === "shared" ? "Sharing" : "Share";
  const isFavourite = favouriteIds.has(entry.id);
  const favouriteLabel = isFavourite ? "Saved" : "Save";
  const dateLabel = entry.debrief_date || asDate(entry.created_at);
  const title = entry.note_title || entry.technique || "Untitled debrief";
  const summary = entry.note_summary || entry.summary_text || "No summary parsed yet.";

  entryDetail.innerHTML = `
    <button id="backToTimelineButton" class="ghost back-to-timeline" type="button">Back to timeline</button>
    <div class="detail-hero">
      <div>
        <p class="detail-date">${escapeHtml(formatFriendlyDate(dateLabel))}</p>
        <h1 class="detail-title">${escapeHtml(title)}</h1>
      </div>
      <div class="detail-actions">
        <button id="favouriteToggleButton" class="ghost favourite-toggle ${isFavourite ? "active-tab" : ""}" type="button">${favouriteLabel}</button>
        ${canShare ? `<button id="shareToggleButton" class="action" type="button">${shareLabel}</button>` : ""}
      </div>
    </div>
    <div class="summary-card">
      <h3>Summary</h3>
      <p>${escapeHtml(summary)}</p>
    </div>
    <div class="detail-block">
      <h3>Key Points</h3>
      ${keyPoints}
    </div>
    <details class="detail-disclosure">
      <summary>More details</summary>
      <div class="details-grid">
        <div class="detail-block">
          <h3>Domain</h3>
          <p>${escapeHtml(entry.domain || inferLegacyDomain(entry.technique_type))}</p>
        </div>
        <div class="detail-block">
          <h3>Primary Topic</h3>
          <p>${escapeHtml(entry.topic_primary || entry.technique_type || "general")}</p>
        </div>
        <div class="detail-block">
          <h3>Secondary Topic</h3>
          <p>${escapeHtml(entry.topic_secondary || entry.technique || "note")}</p>
        </div>
        <div class="detail-block">
          <h3>Visibility</h3>
          <p>${escapeHtml(entry.visibility || "private")}</p>
        </div>
        <div class="detail-block">
          <h3>Tags</h3>
          ${tags}
        </div>
        <div class="detail-block">
          <h3>Action Items</h3>
          ${actionItems}
        </div>
        <div class="detail-block">
          <h3>Reflections</h3>
          <p>${escapeHtml(entry.reflections || "")}</p>
        </div>
        <div class="detail-block">
          <h3>Parse Status</h3>
          <p>${escapeHtml(entry.parse_status || "unknown")} · stage ${escapeHtml(entry.parse_stage ?? 0)} · confidence ${escapeHtml(parseConfidence)}</p>
        </div>
        <div class="detail-block">
          <h3>Raw Notes</h3>
          <p>${escapeHtml(entry.raw_notes || "")}</p>
        </div>
      </div>
    </details>
  `;

  if (canShare) {
    const shareToggleButton = document.querySelector("#shareToggleButton");
    shareToggleButton.addEventListener("click", () => openSharePanel(entry));
  }
  const favouriteToggleButton = document.querySelector("#favouriteToggleButton");
  if (favouriteToggleButton) {
    favouriteToggleButton.addEventListener("click", () => toggleFavourite(entry));
  }
  const backToTimelineButton = document.querySelector("#backToTimelineButton");
  if (backToTimelineButton) {
    backToTimelineButton.addEventListener("click", () => {
      appCard?.classList.remove("detail-open");
      entryList?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
}

async function openSharePanel(entry) {
  if (!supabase || !currentUser || !entry) return;
  activeShareEntry = entry;
  if (sharePanel) sharePanel.classList.remove("hidden");
  if (sharePanelTitle) sharePanelTitle.textContent = entry.note_title || entry.technique || "Share this debrief";
  setSharePanelStatus("Loading share options...", false);
  openMenuPanel();

  await loadClubMembers(entry.club_id);
  await loadShareSettings(entry.id);
  renderSharePeopleList();
  setSharePanelStatus("Choose whole club, selected people, or make it private.", false);
}

async function loadClubMembers(clubId) {
  if (!supabase || !currentUser || !clubId) {
    clubMembers = [];
    return;
  }

  const { data, error } = await supabase
    .from("club_memberships")
    .select("user_id, profiles(id, display_name, email)")
    .eq("club_id", clubId)
    .eq("status", "active");

  if (error) {
    setSharePanelStatus(error.message, true);
    clubMembers = [];
    return;
  }

  clubMembers = (data ?? [])
    .map((membership) => ({
      id: membership.user_id,
      display_name: membership.profiles?.display_name || membership.profiles?.email || "Club member",
      email: membership.profiles?.email || "",
    }))
    .filter((member) => member.id && member.id !== currentUser.id)
    .sort((a, b) => a.display_name.localeCompare(b.display_name));
}

async function loadShareSettings(debriefId) {
  activeShareWholeClub = false;
  activeShareRecipientIds = new Set();
  if (!supabase || !currentUser || !debriefId) return;

  const { data, error } = await supabase
    .from("debrief_shares")
    .select("scope, recipient_user_id")
    .eq("debrief_id", debriefId)
    .eq("author_user_id", currentUser.id)
    .is("revoked_at", null);

  if (error) {
    setSharePanelStatus(error.message, true);
    return;
  }

  (data ?? []).forEach((share) => {
    if (share.scope === "club") activeShareWholeClub = true;
    if (share.scope === "user" && share.recipient_user_id) {
      activeShareRecipientIds.add(share.recipient_user_id);
    }
  });

  if (shareWholeClubInput) shareWholeClubInput.checked = activeShareWholeClub;
}

function renderSharePeopleList() {
  if (!sharePeopleList) return;
  const wholeClub = Boolean(shareWholeClubInput?.checked);
  if (clubMembers.length === 0) {
    sharePeopleList.innerHTML = '<p class="muted">No other active club members found yet.</p>';
    return;
  }

  sharePeopleList.innerHTML = clubMembers
    .map((member) => `
      <label class="share-person ${wholeClub ? "disabled" : ""}">
        <input type="checkbox" value="${escapeHtml(member.id)}" ${activeShareRecipientIds.has(member.id) ? "checked" : ""} ${wholeClub ? "disabled" : ""}>
        <span>
          <strong>${escapeHtml(member.display_name)}</strong>
          ${member.email ? `<small>${escapeHtml(member.email)}</small>` : ""}
        </span>
      </label>
    `)
    .join("");
}

function handleShareWholeClubChange() {
  renderSharePeopleList();
}

function selectedShareRecipientIds() {
  if (!sharePeopleList || shareWholeClubInput?.checked) return [];
  return [...sharePeopleList.querySelectorAll("input[type='checkbox']:checked")]
    .map((input) => input.value)
    .filter(Boolean);
}

async function saveShareSettings() {
  if (!supabase || !currentUser || !activeShareEntry) return;
  const shareWholeClub = Boolean(shareWholeClubInput?.checked);
  const recipientIds = selectedShareRecipientIds();
  await writeShareSettings(activeShareEntry, {
    shareWholeClub,
    recipientIds,
  });
}

async function stopSharingActiveEntry() {
  if (!activeShareEntry) return;
  await writeShareSettings(activeShareEntry, {
    shareWholeClub: false,
    recipientIds: [],
  });
}

async function writeShareSettings(entry, { shareWholeClub, recipientIds }) {
  setSharePanelStatus("Saving sharing settings...", false);
  const now = new Date().toISOString();

  const { error: revokeError } = await supabase
    .from("debrief_shares")
    .update({ revoked_at: now })
    .eq("debrief_id", entry.id)
    .eq("author_user_id", currentUser.id)
    .is("revoked_at", null);

  if (revokeError) {
    setSharePanelStatus(revokeError.message, true);
    return;
  }

  const shareRows = [];
  if (shareWholeClub) {
    shareRows.push({
      debrief_id: entry.id,
      author_user_id: currentUser.id,
      scope: "club",
      recipient_user_id: null,
    });
  }

  recipientIds.forEach((recipientId) => {
    shareRows.push({
      debrief_id: entry.id,
      author_user_id: currentUser.id,
      scope: "user",
      recipient_user_id: recipientId,
    });
  });

  if (shareRows.length > 0) {
    const { error: insertError } = await supabase
      .from("debrief_shares")
      .insert(shareRows);
    if (insertError) {
      setSharePanelStatus(insertError.message, true);
      return;
    }
  }

  const nextVisibility = shareRows.length > 0 ? "shared" : "private";
  const { error: visibilityError } = await supabase
    .from("debriefs")
    .update({ visibility: nextVisibility })
    .eq("id", entry.id);

  if (visibilityError) {
    setSharePanelStatus(visibilityError.message, true);
    return;
  }

  activeShareWholeClub = shareWholeClub;
  activeShareRecipientIds = new Set(recipientIds);
  setSharePanelStatus(shareRows.length > 0 ? "Sharing updated." : "This debrief is private.", false);
  await loadEntries({ reset: true });
}

function setSharePanelStatus(message, isError) {
  if (!sharePanelStatus) return;
  sharePanelStatus.textContent = message;
  sharePanelStatus.style.color = isError ? "#ff9e9e" : "#cfe7ff";
}

async function toggleFavourite(entry) {
  if (!supabase || !currentUser) return;
  const isFavourite = favouriteIds.has(entry.id);
  setListStatus(isFavourite ? "Removing from favourites..." : "Saving to favourites...", false);

  const response = isFavourite
    ? await supabase
        .from("debrief_favourites")
        .delete()
        .eq("user_id", currentUser.id)
        .eq("debrief_id", entry.id)
    : await supabase
        .from("debrief_favourites")
        .insert({
          user_id: currentUser.id,
          debrief_id: entry.id,
        });

  if (response.error) {
    setListStatus(response.error.message, true);
    return;
  }

  if (isFavourite) {
    favouriteIds.delete(entry.id);
  } else {
    favouriteIds.add(entry.id);
  }

  setListStatus(isFavourite ? "Removed from favourites." : "Saved to favourites.", false);

  if (currentView === "favourites" && isFavourite) {
    await loadEntries({ reset: true });
    return;
  }

  renderEntryList();
  renderEntryDetail();
}

async function loadMyDebriefsWithFetch({ from, reset }) {
  setListStatus("Loading your debrief history...", false);
  if (!currentAccessToken || !currentUser?.id) return false;

  const url = new URL(`${SUPABASE_URL}/rest/v1/debriefs`);
  url.searchParams.set(
    "select",
    "id,club_id,author_user_id,created_at,debrief_date,note_title,note_summary,domain,topic_primary,topic_secondary,topic_tags,action_items,parse_status,parse_stage,parse_confidence,needs_review,technique,technique_type,key_points,reflections,raw_notes,summary_text,visibility",
  );
  url.searchParams.set("author_user_id", `eq.${currentUser.id}`);
  url.searchParams.set("order", "created_at.desc");
  url.searchParams.set("limit", String(PAGE_SIZE));
  url.searchParams.set("offset", String(from));

  let batch = [];
  try {
    const response = await fetchWithTimeout(
      url.toString(),
      {
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          authorization: `Bearer ${currentAccessToken}`,
        },
      },
      7000,
      "Debrief history took too long.",
    );
    if (!response.ok) return false;
    batch = await response.json();
  } catch (_error) {
    return false;
  }

  hasMore = batch.length === PAGE_SIZE;
  if (batch.length > 0) {
    entries = reset ? batch : [...entries, ...batch];
    currentPage += 1;
    if (!entries.find((entry) => entry.id === activeEntryId)) {
      activeEntryId = entries[0].id;
    }
    setListStatus(`${entries.length} loaded.`, false);
  } else if (reset) {
    entries = [];
    activeEntryId = null;
    setListStatus("No debriefs yet.", false);
  }
  renderEntryList();
  renderEntryDetail();
  renderLoadMore();
  return true;
}

async function loadMyDebriefsFallback({ from, reset }) {
  setListStatus("Loading your debrief history...", false);
  let response;
  try {
    response = await withTimeout(
      supabase.rpc("get_my_debrief_history", {
        limit_count: PAGE_SIZE,
        offset_count: from,
      }),
      5000,
      "Debrief history took too long.",
    );
  } catch (_error) {
    return false;
  }

  const { data, error } = response;
  if (error) return false;
  const batch = data ?? [];
  hasMore = batch.length === PAGE_SIZE;
  if (batch.length > 0) {
    if (reset) {
      entries = batch;
    } else {
      entries = [...entries, ...batch];
    }
    currentPage += 1;
    if (!entries.find((entry) => entry.id === activeEntryId)) {
      activeEntryId = entries[0].id;
    }
    setListStatus(`${entries.length} loaded.`, false);
  } else if (reset) {
    entries = [];
    activeEntryId = null;
    setListStatus("No debriefs yet.", false);
  }
  renderEntryList();
  renderEntryDetail();
  renderLoadMore();
  return true;
}

async function toggleShare(entry) {
  if (!supabase || !currentUser) return;
  const isCurrentlyShared = entry.visibility === "shared";
  setListStatus(isCurrentlyShared ? "Making note private..." : "Sharing note...", false);

  const { error: visibilityError } = await supabase
    .from("debriefs")
    .update({ visibility: isCurrentlyShared ? "private" : "shared" })
    .eq("id", entry.id);

  if (visibilityError) {
    setListStatus(visibilityError.message, true);
    return;
  }

  if (isCurrentlyShared) {
    const { error: revokeError } = await supabase
      .from("debrief_shares")
      .update({ revoked_at: new Date().toISOString() })
      .eq("debrief_id", entry.id)
      .eq("author_user_id", currentUser.id)
      .is("revoked_at", null);

    if (revokeError) {
      setListStatus(revokeError.message, true);
      return;
    }
  } else {
    const { data: existingShare, error: shareLookupError } = await supabase
      .from("debrief_shares")
      .select("id, revoked_at")
      .eq("debrief_id", entry.id)
      .eq("author_user_id", currentUser.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (shareLookupError) {
      setListStatus(shareLookupError.message, true);
      return;
    }

    if (!existingShare) {
      const { error: insertError } = await supabase
        .from("debrief_shares")
        .insert({
          debrief_id: entry.id,
          author_user_id: currentUser.id,
          scope: "club",
        });
      if (insertError) {
        setListStatus(insertError.message, true);
        return;
      }
    } else if (existingShare.revoked_at) {
      const { error: unRevokeError } = await supabase
        .from("debrief_shares")
        .update({ revoked_at: null })
        .eq("id", existingShare.id);
      if (unRevokeError) {
        setListStatus(unRevokeError.message, true);
        return;
      }
    }
  }

  setListStatus(isCurrentlyShared ? "Note is now private." : "Note shared with club feed.", false);
  await loadEntries({ reset: true });
}

function setAuthStatus(message, isError) {
  if (!authStatus) return;
  authStatus.textContent = message;
  authStatus.style.color = isError ? "#ff9e9e" : "#cfe7ff";
}

function setListStatus(message, isError) {
  if (!listStatus) return;
  listStatus.textContent = message;
  listStatus.style.color = isError ? "#ff9e9e" : "#cfe7ff";
}

function canSendAuthEmail() {
  const secondsLeft = Math.ceil((emailCooldownUntil - Date.now()) / 1000);
  if (secondsLeft > 0) {
    setAuthStatus(`Please wait ${secondsLeft}s before sending another email.`, true);
    return false;
  }
  return true;
}

function startEmailCooldown(seconds) {
  emailCooldownUntil = Date.now() + seconds * 1000;
}

function handleAuthEmailError(message) {
  const text = String(message ?? "");
  if (text.toLowerCase().includes("rate limit")) {
    startEmailCooldown(600);
    setAuthStatus("Too many emails sent. Please wait about 10 minutes, then try once.", true);
    return;
  }
  setAuthStatus(text || "Unable to send auth email.", true);
}

function normalizeLikeValue(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_\- ]+/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 64);
}

function parseTagFilter(rawValue) {
  if (!rawValue) return [];
  const tags = rawValue
    .split(",")
    .map((tag) => normalizeTag(tag))
    .filter((tag) => tag.length > 0);
  return [...new Set(tags)].slice(0, 8);
}

function normalizeTag(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_\- ]+/g, "")
    .replace(/\s+/g, "_");
}

function inferLegacyDomain(techniqueType) {
  return techniqueType && techniqueType !== "other" ? "martial_arts" : "general";
}

function isRecoveryLink(hashValue) {
  const hash = String(hashValue ?? "");
  return hash.includes("type=recovery") || hash.includes("access_token=");
}

function asDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatFriendlyDate(value) {
  if (!value) return "Undated";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
