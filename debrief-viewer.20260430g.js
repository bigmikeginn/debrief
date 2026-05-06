import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://wtmzcwsfetqhfrdlygyr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bLuHb3b4yECOGg5IG9evag_rTZbzioA";
const PAGE_SIZE = 10;
const SUPABASE_AUTH_STORAGE_KEY = "sb-wtmzcwsfetqhfrdlygyr-auth-token";
const FREE_MONTHLY_DEBRIEF_LIMIT = 8;
const QUOTA_WARNING_RATIO = 0.75;
const TRIAL_DAYS = 14;
const WHATS_NEW_KEY = "debrief-whats-new-20260430g-native-submit";
const PLAN_STATUS_RPC_ENABLED = true;
const OWNER_EMAILS = new Set(["bigmikeginn@gmail.com"]);
const DEBRIEF_SUBMIT_URL = "https://wtmzcwsfetqhfrdlygyr.supabase.co/functions/v1/submit-debrief";

let supabase = null;
let currentUser = null;
let currentAccessToken = "";
let entries = [];
let activeEntryId = null;
let currentView = "mine";
let currentPage = 0;
let hasMore = false;
let totalPageCount = 0;
let totalItemCount = 0;
let sharedOptIn = false;
let favouriteIds = new Set();
let clubMembers = [];
let clubContext = { active_club_id: null, clubs: [] };
let adminMemberLists = {};
let activeClubId = null;
let activeShareEntry = null;
let activeShareRecipientIds = new Set();
let activeShareWholeClub = false;
let inPasswordRecovery = false;
let emailCooldownUntil = 0;
let quickRange = "all";
let handlingSignedInSession = false;
let planStatus = defaultFreePlanStatus();
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
const signupPlanInputs = document.querySelectorAll("input[name='signupPlan']");

const appCard = document.querySelector("#appCard");
const listStatus = document.querySelector("#listStatus");
const quotaNotice = document.querySelector("#quotaNotice");
const whatsNewNotice = document.querySelector("#whatsNewNotice");
const filterForm = document.querySelector("#filterForm");
const refreshButton = document.querySelector("#refreshButton");
const paginationControls = document.querySelector("#paginationControls");
const exportCurrentButton = document.querySelector("#exportCurrentButton");
const exportAllButton = document.querySelector("#exportAllButton");
const exportStatus = document.querySelector("#exportStatus");
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
const newDebriefButton = document.querySelector("#newDebriefButton");
const newDebriefModalOverlay = document.querySelector("#newDebriefModalOverlay");
const newDebriefModalCloseButton = document.querySelector("#newDebriefModalCloseButton");
const newDebriefText = document.querySelector("#newDebriefText");
const submitDebriefButton = document.querySelector("#submitDebriefButton");
const cancelDebriefButton = document.querySelector("#cancelDebriefButton");
const newDebriefStatus = document.querySelector("#newDebriefStatus");
const sharePanel = document.querySelector("#sharePanel");
const sharePanelTitle = document.querySelector("#sharePanelTitle");
const shareWholeClubInput = document.querySelector("#shareWholeClub");
const sharePeopleList = document.querySelector("#sharePeopleList");
const sharePanelStatus = document.querySelector("#sharePanelStatus");
const shareModalOverlay = document.querySelector("#shareModalOverlay");
const shareModalTitle = document.querySelector("#shareModalTitle");
const shareModalBody = document.querySelector("#shareModalBody");
const shareModalStatus = document.querySelector("#shareModalStatus");
const shareModalCloseButton = document.querySelector("#shareModalCloseButton");
const saveShareSettingsButton = document.querySelector("#saveShareSettingsButton");
const stopSharingButton = document.querySelector("#stopSharingButton");
const clubContextLabel = document.querySelector("#clubContextLabel");
const activeClubSelect = document.querySelector("#activeClubSelect");
const clubList = document.querySelector("#clubList");
const clubInviteCodeInput = document.querySelector("#clubInviteCode");
const joinClubButton = document.querySelector("#joinClubButton");
const newClubNameInput = document.querySelector("#newClubName");
const createClubButton = document.querySelector("#createClubButton");
const clubPanelStatus = document.querySelector("#clubPanelStatus");

boot();

function boot() {
  if (window.__debriefUseFallbackViewer) return;
  configureAuthPage();
  if (loginButton) {
    loginButton.addEventListener("click", (event) => {
      event.preventDefault();
      if (authMode === "signup") {
        handleSignup();
        return;
      }
      handleLogin();
    });
  }
  if (emailLinkButton) {
    emailLinkButton.addEventListener("click", (event) => {
      event.preventDefault();
      if (authMode === "signup") {
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
  signupPlanInputs.forEach((input) => input.addEventListener("change", renderSignupPlanSelection));
  if (refreshButton) refreshButton.addEventListener("click", handleRefreshFeed);
  if (exportCurrentButton) exportCurrentButton.addEventListener("click", exportCurrentResults);
  if (exportAllButton) exportAllButton.addEventListener("click", exportAllMyDebriefs);
  if (toggleFiltersButton) toggleFiltersButton.addEventListener("click", toggleFilters);
  if (menuButton) menuButton.addEventListener("click", toggleMenuPanel);
  if (drawerCloseButton) drawerCloseButton.addEventListener("click", closeMenuPanel);
  if (drawerScrim) drawerScrim.addEventListener("click", closeMenuPanel);
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
  // New Debrief modal
  if (newDebriefButton) newDebriefButton.addEventListener("click", openNewDebriefModal);
  if (newDebriefModalCloseButton) newDebriefModalCloseButton.addEventListener("click", closeNewDebriefModal);
  if (cancelDebriefButton) cancelDebriefButton.addEventListener("click", closeNewDebriefModal);
  if (newDebriefModalOverlay) newDebriefModalOverlay.addEventListener("click", (event) => {
    if (event.target === newDebriefModalOverlay) closeNewDebriefModal();
  });
  if (submitDebriefButton) submitDebriefButton.addEventListener("click", handleNativeSubmit);
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
    filterForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      await loadEntries({ reset: true });
      closeMenuPanel();
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
  if (activeClubSelect) activeClubSelect.addEventListener("change", handleActiveClubChange);
  if (joinClubButton) joinClubButton.addEventListener("click", handleJoinClub);
  if (createClubButton) createClubButton.addEventListener("click", handleCreateClub);
  if (shareModalCloseButton) shareModalCloseButton.addEventListener("click", closeShareModal);
  if (shareModalOverlay) shareModalOverlay.addEventListener("click", (event) => {
    if (event.target === shareModalOverlay) closeShareModal();
  });
  document.addEventListener("click", handleGlobalClick);
  document.addEventListener("click", handleDelegatedActions);

  renderRuntimeHint();
  renderRecoveryState();
  renderSignupPlanSelection();
  if (toggleFiltersButton) toggleFiltersButton.textContent = "Search";
  window.__debriefAppBooted = setupSupabase();
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
  await loadPlanStatus();
  renderPlanGates();
  renderQuotaNotice();
  await retryStuckParseJobs();
  await loadEntries({ reset: true });
}

async function handleClearSearch({ load = true } = {}) {
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
  if (load) {
    await loadEntries({ reset: true });
    closeMenuPanel();
  }
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
  } else if (actionId === "shareToggleButton") {
    const entry = entries.find((item) => item.id === activeEntryId);
    if (entry) {
      openSharePanel(entry);
    }
  } else if (actionEl.dataset.copyInvite) {
    copyClubInvite(actionEl.dataset.copyInvite);
  } else if (actionEl.dataset.loadClubMembers) {
    loadClubMembersForAdmin(actionEl.dataset.loadClubMembers);
  } else if (actionEl.dataset.removeClubMember) {
    removeClubMember(actionEl.dataset.clubId, actionEl.dataset.removeClubMember);
  } else if (actionEl.dataset.dismissWhatsNew) {
    dismissWhatsNewNotice();
  }
}

async function loadClubContext() {
  if (!supabase || !currentUser) {
    clubContext = { active_club_id: null, clubs: [] };
    activeClubId = null;
    renderClubContext();
    return;
  }

  setClubPanelStatus("Loading clubs...", false);
  try {
    const { data, error } = await withTimeout(
      supabase.rpc("get_my_club_context"),
      7000,
      "Club list took too long.",
    );
    if (error) throw error;
    applyClubContext(data);
    setClubPanelStatus("", false);
  } catch (error) {
    setClubPanelStatus(error?.message || "Could not load clubs.", true);
    renderClubContext();
  }
}

function applyClubContext(data) {
  clubContext = {
    active_club_id: data?.active_club_id || null,
    clubs: Array.isArray(data?.clubs) ? data.clubs : [],
  };
  adminMemberLists = {};
  activeClubId = clubContext.active_club_id;
  renderClubContext();
}

function renderClubContext() {
  const clubs = clubContext.clubs || [];
  const activeClub = clubs.find((club) => club.id === activeClubId) || clubs[0] || null;

  if (clubContextLabel) {
    clubContextLabel.textContent = activeClub
      ? `Active club: ${activeClub.name}`
      : "No club selected yet.";
  }

  if (activeClubSelect) {
    if (clubs.length === 0) {
      activeClubSelect.innerHTML = '<option value="">No clubs yet</option>';
    } else {
      activeClubSelect.innerHTML = clubs
        .map((club) => `<option value="${escapeHtml(club.id)}" ${club.id === activeClubId ? "selected" : ""}>${escapeHtml(club.name)}</option>`)
        .join("");
    }
  }

  if (clubList) {
    if (clubs.length === 0) {
      clubList.innerHTML = '<p class="muted">Join with an invite code or create a club to get started.</p>';
    } else {
      clubList.innerHTML = clubs
        .map((club) => {
          const role = String(club.role || "student");
          const invite = club.invite_code || "";
          const memberPanel = role === "admin" && club.id === activeClubId
            ? renderAdminMemberPanel(club, adminMemberLists[club.id] || [])
            : "";
          return `
            <div class="club-row ${club.id === activeClubId ? "active" : ""}">
              <div>
                <strong>${escapeHtml(club.name)}</strong>
                <small>${escapeHtml(role)}${club.id === activeClubId ? " · active" : ""}</small>
              </div>
              ${invite ? `
                <div class="club-invite-row">
                  <code class="club-invite-code">${escapeHtml(invite)}</code>
                  <button class="ghost" type="button" data-copy-invite="${escapeHtml(invite)}">Copy</button>
                </div>
              ` : ""}
              ${memberPanel}
            </div>
          `;
        })
        .join("");
    }
  }
}

function renderAdminMemberPanel(club, members) {
  const memberRows = members.length
    ? members.map((member) => {
        const isSelf = member.user_id === currentUser?.id;
        const role = member.role || "student";
        return `
          <div class="club-member-row">
            <div>
              <strong>${escapeHtml(member.display_name || member.email || "Club member")}</strong>
              <small>${escapeHtml(role)}${member.email ? ` · ${escapeHtml(member.email)}` : ""}</small>
            </div>
            ${isSelf ? '<span class="member-pill">You</span>' : `<button class="ghost danger-button" type="button" data-club-id="${escapeHtml(club.id)}" data-remove-club-member="${escapeHtml(member.user_id)}">Remove</button>`}
          </div>
        `;
      }).join("")
    : '<p class="muted">Load members to manage this club.</p>';

  return `
    <div class="club-admin-panel">
      <div>
        <strong>Admin controls</strong>
        <small>Remove someone from this club if needed. Their private account stays intact.</small>
      </div>
      <button class="ghost" type="button" data-load-club-members="${escapeHtml(club.id)}">Load Members</button>
      <div class="club-member-list">${memberRows}</div>
    </div>
  `;
}

async function loadClubMembersForAdmin(clubId) {
  if (!clubId || !supabase || !currentUser) return;
  setClubPanelStatus("Loading club members...", false);
  const { data, error } = await supabase.rpc("get_club_members_for_admin", { target_club_id: clubId });
  if (error) {
    setClubPanelStatus(error.message, true);
    return;
  }
  adminMemberLists[clubId] = Array.isArray(data) ? data : [];
  renderClubContext();
  setClubPanelStatus("", false);
}

async function removeClubMember(clubId, userId) {
  if (!clubId || !userId || !supabase || !currentUser) return;
  const member = (adminMemberLists[clubId] || []).find((item) => item.user_id === userId);
  const label = member?.display_name || member?.email || "this member";
  if (!window.confirm(`Remove ${label} from this club? They will lose access to the club feed, but their private account stays intact.`)) {
    return;
  }

  setClubPanelStatus("Removing member...", false);
  const { data, error } = await supabase.rpc("remove_club_member", {
    target_club_id: clubId,
    target_user_id: userId,
  });
  if (error) {
    setClubPanelStatus(error.message, true);
    return;
  }
  applyClubContext(data);
  await loadClubMembersForAdmin(clubId);
  setClubPanelStatus("Member removed from the club.", false);
}

async function handleActiveClubChange() {
  const clubId = activeClubSelect?.value || "";
  if (!clubId || !supabase || !currentUser) return;

  setClubPanelStatus("Switching club...", false);
  const { data, error } = await supabase.rpc("set_my_active_club", { target_club_id: clubId });
  if (error) {
    setClubPanelStatus(error.message, true);
    return;
  }
  applyClubContext(data);
  await loadPlanStatus();
  renderPlanGates();
  renderQuotaNotice();
  closeMenuPanel();
  await loadEntries({ reset: true });
}

async function handleJoinClub() {
  const code = (clubInviteCodeInput?.value || "").trim();
  if (!code) {
    setClubPanelStatus("Enter an invite code.", true);
    return;
  }

  setClubPanelStatus("Joining club...", false);
  const { data, error } = await supabase.rpc("join_club_with_invite", { invite_code: code });
  if (error) {
    setClubPanelStatus(error.message, true);
    return;
  }
  if (clubInviteCodeInput) clubInviteCodeInput.value = "";
  applyClubContext(data);
  setClubPanelStatus("Club joined.", false);
  await loadEntries({ reset: true });
}

async function handleCreateClub() {
  const name = (newClubNameInput?.value || "").trim();
  if (name.length < 2) {
    setClubPanelStatus("Enter a club name.", true);
    return;
  }

  setClubPanelStatus("Creating club...", false);
  const { data, error } = await supabase.rpc("create_club", { club_name: name });
  if (error) {
    setClubPanelStatus(error.message, true);
    return;
  }
  if (newClubNameInput) newClubNameInput.value = "";
  applyClubContext(data);
  setClubPanelStatus("Club created. Share the invite code with students.", false);
  await loadEntries({ reset: true });
}

async function copyClubInvite(code) {
  try {
    await navigator.clipboard.writeText(code);
    setClubPanelStatus("Invite code copied.", false);
  } catch (_error) {
    setClubPanelStatus(`Invite code: ${code}`, false);
  }
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
  const handoffSession = readStoredAuthSession();
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  } catch (_error) {
    setAuthStatus("App configuration is invalid. Please contact support.", true);
    return false;
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
    if (!session && isLoginHandoff() && currentUser) return;
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
    const storedSession = handoffSession || readStoredAuthSession();
    const session = data.session || await hydrateStoredSession(storedSession);
    currentUser = session?.user ?? null;
    currentAccessToken = session?.access_token || "";
    renderAuthState();
    if (currentUser) await handleSignedInSession();
  }).catch(async () => {
    const storedSession = handoffSession || readStoredAuthSession();
    const session = await hydrateStoredSession(storedSession);
    currentUser = session?.user ?? null;
    currentAccessToken = session?.access_token || "";
    renderAuthState();
    if (currentUser) await handleSignedInSession();
  });
  return true;
}

function readStoredAuthSession() {
  try {
    const raw = sessionStorage.getItem("debrief-fallback-session") || localStorage.getItem(SUPABASE_AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const session = parsed?.currentSession || parsed;
    if (!session?.access_token) return null;
    return session;
  } catch (_error) {
    return null;
  }
}

function isLoginHandoff() {
  return new URLSearchParams(window.location.search).get("login") === "1"
    || Boolean(sessionStorage.getItem("debrief-login-handoff"));
}

async function hydrateStoredSession(session) {
  if (!session?.access_token) return null;
  if (session.user) return session;
  try {
    setAuthStatus("Confirming your login...", false);
    const response = await fetchWithTimeout(
      `${SUPABASE_URL}/auth/v1/user`,
      {
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          authorization: `Bearer ${session.access_token}`,
        },
      },
      7000,
      "Login handoff took too long.",
    );
    if (!response.ok) return null;
    const user = await response.json();
    return { ...session, user };
  } catch (_error) {
    return null;
  }
}

async function handleSignedInSession() {
  if (inPasswordRecovery || handlingSignedInSession) return;
  handlingSignedInSession = true;

  try {
    if (pageKind === "login" || pageKind === "signup") {
      redirectTo("/viewer");
      return;
    }

    await loadClubContext();
    await loadPlanStatus();
  renderWhatsNewNotice();
  renderViewState();
  await retryStuckParseJobs();
  await loadEntries({ reset: true });
  loadViewerPreferences();
    sessionStorage.removeItem("debrief-login-handoff");
  } finally {
    handlingSignedInSession = false;
  }
}

function renderWhatsNewNotice() {
  if (!whatsNewNotice) return;
  if (!currentUser || localStorage.getItem(WHATS_NEW_KEY) === "dismissed") {
    whatsNewNotice.classList.add("hidden");
    whatsNewNotice.innerHTML = "";
    return;
  }

  whatsNewNotice.classList.remove("hidden");
  whatsNewNotice.innerHTML = `
    <div>
      <p class="eyebrow compact">What&apos;s new</p>
      <strong>New Debrief button is here.</strong>
      <p>You can now save training notes directly from the app. Tap New Debrief in the toolbar, write a note, and it appears in your timeline.</p>
    </div>
    <button class="ghost" type="button" data-dismiss-whats-new="true">Dismiss</button>
  `;
}

function dismissWhatsNewNotice() {
  localStorage.setItem(WHATS_NEW_KEY, "dismissed");
  renderWhatsNewNotice();
}

async function loadViewerPreferences() {
  await loadSharedOptIn();
  await loadFavouriteIds();
  renderPlanGates();
  renderQuotaNotice();
  if (currentView === "mine" && entries.length > 0) {
    renderEntryList();
    renderEntryDetail();
  }
}

function redirectTo(path) {
  const destination = new URL(path, window.location.origin);
  window.location.replace(destination.toString());
}

function renderRecoveryState() {
  if (!passwordResetForm) return;
  passwordResetForm.classList.toggle("hidden", !inPasswordRecovery);
}

async function handleLogin() {
  if (authMode === "signup") return;
  setAuthStatus("Checking login...", false);
  if (!supabase) {
    window.__debriefAppBooted = false;
    setAuthStatus("Login is starting. Trying backup login...", false);
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) {
    setAuthStatus("Email and password are required for login.", true);
    return;
  }

  setAuthStatus("Logging in...", false);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    setAuthStatus(error.message, true);
    return;
  }
  currentUser = data.session?.user ?? data.user ?? null;
  currentAccessToken = data.session?.access_token || currentAccessToken;
  setAuthStatus("Logged in. Opening your account...", false);
  await handleSignedInSession();
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
  const selectedPlan = getSelectedSignupPlan();

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

  if (selectedPlan !== "free") {
    setAuthStatus("Paid plans will open through Stripe soon. For beta testing, choose Free to create your account.", true);
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
          data: {
            requested_plan: selectedPlan,
          },
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

function getSelectedSignupPlan() {
  const checked = [...signupPlanInputs].find((input) => input.checked);
  return checked?.value || "free";
}

function renderSignupPlanSelection() {
  if (!signupPlanInputs.length) return;
  signupPlanInputs.forEach((input) => {
    const card = input.closest(".signup-plan-card");
    if (card) card.classList.toggle("selected", input.checked);
  });
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
      emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
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
  clubContext = { active_club_id: null, clubs: [] };
  activeClubId = null;
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
    renderSignedInHeader();
    if (topSession) topSession.classList.remove("hidden");
    if (topSessionEmail) topSessionEmail.textContent = currentUser.email;
    if (accountCard) accountCard.classList.add("hidden");
    if (appCard) appCard.classList.toggle("hidden", pageKind !== "viewer");
    if (sessionEmail) sessionEmail.textContent = `Signed in as ${currentUser.email}`;
    if (sessionBar) sessionBar.classList.toggle("hidden", pageKind !== "viewer");
    if (authForm) authForm.classList.add("hidden");
    if (logoutButton) logoutButton.classList.remove("hidden");
    setAuthStatus(pageKind === "viewer" ? `Logged in as ${currentUser.email}` : "Logged in. Sending you to the next step...", false);
    renderClubContext();
    renderWhatsNewNotice();
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
    entries = [];
    favouriteIds = new Set();
    clubContext = { active_club_id: null, clubs: [] };
    activeClubId = null;
    planStatus = defaultFreePlanStatus();
    activeEntryId = null;
    renderClubContext();
    renderWhatsNewNotice();
    if (appCard) appCard.classList.remove("detail-open");
    if (entryList) entryList.innerHTML = "";
    if (entryDetail) entryDetail.innerHTML = '<p class="muted">Log in to view your debriefs.</p>';
    if (listCountBadge) listCountBadge.textContent = "0";
    renderQuotaNotice();
    setListStatus("", false);
  }
}

function renderSignedInHeader() {
  document.title = "Debrief History | Debrief";
  if (authPageTitle) authPageTitle.textContent = "Your Debrief Archive";
  if (authPageCopy) {
    authPageCopy.textContent = "Review your training notes, saved lessons, and shared club insights.";
  }
  if (accountCardTitle) accountCardTitle.textContent = "Account";
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
  renderPlanGates();
  renderQuotaNotice();
}

function switchView(view) {
  if ((view === "shared" || view === "sharedWithMe") && !canShareOrViewClubFeed()) {
    setListStatus("Club sharing is available on paid plans. Free accounts keep notes private.", true);
    closeMenuPanel();
    return;
  }
  if (currentView === view) return;
  currentView = view;
  activeEntryId = null;
  closeMenuPanel();
  renderViewState();
  loadEntries({ reset: true });
}

function defaultFreePlanStatus(overrides = {}) {
  const used = Number(overrides.used_this_month ?? 0);
  const limit = Number(overrides.monthly_limit ?? FREE_MONTHLY_DEBRIEF_LIMIT);
  const trial = overrides.is_trial ? getTrialStatusFromUser() : null;
  return {
    plan: String(overrides.plan || trial?.plan || "free").toLowerCase(),
    monthly_limit: trial?.monthly_limit ?? limit,
    used_this_month: used,
    can_share: Boolean(overrides.can_share ?? trial?.can_share),
    can_export: Boolean(overrides.can_export ?? trial?.can_export),
    quota_percent: (trial?.monthly_limit ?? limit) > 0 ? used / (trial?.monthly_limit ?? limit) : 0,
    is_trial: Boolean(trial?.is_trial || overrides.is_trial),
    trial_ends_at: overrides.trial_ends_at || trial?.trial_ends_at || null,
    club_activity_hint: String(overrides.club_activity_hint || ""),
  };
}

async function loadPlanStatus() {
  if (!supabase || !currentUser) {
    planStatus = defaultFreePlanStatus();
    return;
  }

  if (isOwnerAccount()) {
    planStatus = ownerPlanStatus();
    return;
  }

  if (PLAN_STATUS_RPC_ENABLED) {
    try {
      const { data, error } = await supabase.rpc("get_my_plan_status");
      if (!error && data) {
        planStatus = normalizePlanStatus(data);
        return;
      }
    } catch (_error) {
      // Use client-side fallback until the database helper is deployed.
    }
  }

  const used = await countMyDebriefsThisMonth();
  const clubHint = await getClubActivityHint();
  const trial = getTrialStatusFromUser();
  planStatus = defaultFreePlanStatus({
    ...trial,
    used_this_month: used,
    club_activity_hint: clubHint,
  });
}

function isOwnerAccount() {
  return OWNER_EMAILS.has(String(currentUser?.email || "").trim().toLowerCase());
}

function ownerPlanStatus() {
  return {
    plan: "owner",
    monthly_limit: 0,
    used_this_month: 0,
    can_share: true,
    can_export: true,
    quota_percent: 0,
    is_trial: false,
    trial_ends_at: null,
    club_activity_hint: "",
  };
}

function normalizePlanStatus(data) {
  const raw = Array.isArray(data) ? data[0] : data;
  const plan = String(raw?.plan || raw?.tier || "free").toLowerCase();
  const isFree = plan === "free";
  const limit = Number(raw?.monthly_limit ?? (isFree ? FREE_MONTHLY_DEBRIEF_LIMIT : 0));
  const used = Number(raw?.used_this_month ?? raw?.monthly_used ?? 0);
  return {
    plan,
    monthly_limit: limit,
    used_this_month: used,
    can_share: Boolean(raw?.can_share ?? !isFree),
    can_export: Boolean(raw?.can_export ?? !isFree),
    quota_percent: limit > 0 ? used / limit : 0,
    is_trial: Boolean(raw?.is_trial || plan === "trial"),
    trial_ends_at: raw?.trial_ends_at || null,
    club_activity_hint: String(raw?.club_activity_hint || ""),
  };
}

function getTrialStatusFromUser() {
  const createdAt = currentUser?.created_at ? new Date(currentUser.created_at) : null;
  if (!createdAt || Number.isNaN(createdAt.getTime())) return null;
  const trialEndsAt = new Date(createdAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  if (trialEndsAt <= new Date()) return null;
  return {
    plan: "trial",
    monthly_limit: 0,
    can_share: true,
    can_export: true,
    is_trial: true,
    trial_ends_at: trialEndsAt.toISOString(),
  };
}

async function countMyDebriefsThisMonth() {
  const { count, error } = await supabase
    .from("debriefs")
    .select("id", { count: "exact", head: true })
    .eq("author_user_id", currentUser.id)
    .gte("created_at", startOfCurrentMonthIso());
  if (error) return 0;
  return Number(count || 0);
}

async function getClubActivityHint() {
  if (!activeClubId) return "";
  try {
    const { count, error } = await supabase
      .from("debriefs")
      .select("id", { count: "exact", head: true })
      .eq("club_id", activeClubId)
      .neq("author_user_id", currentUser.id)
      .gte("created_at", startOfCurrentMonthIso());
    if (error || !count) return "";
    return "Other people in your club are building their training notes this month too.";
  } catch (_error) {
    return "";
  }
}

function startOfCurrentMonthIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function isFreePlan() {
  return String(planStatus?.plan || "free").toLowerCase() === "free";
}

function isTrialPlan() {
  return Boolean(planStatus?.is_trial || String(planStatus?.plan || "").toLowerCase() === "trial");
}

function canExportDebriefs() {
  return Boolean(planStatus?.can_export);
}

function canShareDebriefs() {
  return Boolean(planStatus?.can_share);
}

function canShareOrViewClubFeed() {
  return !isFreePlan();
}

function renderPlanGates() {
  const exportLocked = !canExportDebriefs();
  [exportCurrentButton, exportAllButton].forEach((button) => {
    if (!button) return;
    button.disabled = exportLocked;
    button.classList.toggle("muted-control", exportLocked);
  });
  if (exportStatus) {
    exportStatus.textContent = exportLocked
      ? "CSV export is available on paid plans."
      : "Export your current results or your full archive.";
    exportStatus.style.color = "#cfe7ff";
  }
  [viewSharedButton, viewSharedWithMeButton].forEach((button) => {
    if (!button) return;
    const locked = !canShareOrViewClubFeed();
    button.disabled = locked;
    button.classList.toggle("muted-control", locked);
  });
  if (sharedOptInInput) sharedOptInInput.disabled = !canShareOrViewClubFeed();
  if (sharedOptInStatus && !canShareOrViewClubFeed()) {
    sharedOptInStatus.textContent = "Club sharing is available on paid plans.";
    sharedOptInStatus.style.color = "#cfe7ff";
  }
}

function renderQuotaNotice() {
  if (!quotaNotice || !currentUser) return;
  if (isTrialPlan()) {
    quotaNotice.classList.remove("hidden", "urgent");
    quotaNotice.innerHTML = `
      <div>
        <p class="eyebrow compact">Full-access trial</p>
        <strong>${escapeHtml(formatTrialDaysRemaining())}</strong>
        <p>Use everything for now: frequent debriefs, sharing, and CSV export. After the trial, the Free plan keeps your notes but limits new submissions to 8/month and locks sharing/export.</p>
      </div>
      <a class="action" href="/#pricing">Keep Access</a>
    `;
    return;
  }
  const limit = Number(planStatus?.monthly_limit || 0);
  const used = Number(planStatus?.used_this_month || 0);
  if (!isFreePlan() || !limit) {
    quotaNotice.classList.add("hidden");
    quotaNotice.innerHTML = "";
    return;
  }

  const remaining = Math.max(0, limit - used);
  const percent = used / limit;
  const hasWarning = percent >= QUOTA_WARNING_RATIO;
  const isAtLimit = used >= limit;
  if (!hasWarning && !planStatus.club_activity_hint) {
    quotaNotice.classList.add("hidden");
    quotaNotice.innerHTML = "";
    return;
  }
  quotaNotice.classList.remove("hidden");
  quotaNotice.classList.toggle("urgent", isAtLimit);
  quotaNotice.innerHTML = `
    <div>
      <p class="eyebrow compact">Free plan</p>
      <strong>${escapeHtml(String(used))} of ${escapeHtml(String(limit))} monthly debriefs used</strong>
      <p>${escapeHtml(quotaMessage({ remaining, hasWarning, isAtLimit }))}</p>
      ${planStatus.club_activity_hint ? `<p>${escapeHtml(planStatus.club_activity_hint)}</p>` : ""}
    </div>
    <a class="action" href="/#pricing">Upgrade</a>
  `;
}

function formatTrialDaysRemaining() {
  const endsAt = planStatus?.trial_ends_at ? new Date(planStatus.trial_ends_at) : null;
  if (!endsAt || Number.isNaN(endsAt.getTime())) return "Your trial is active.";
  const days = Math.max(1, Math.ceil((endsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
  return `${days} day${days === 1 ? "" : "s"} of full access remaining`;
}

function quotaMessage({ remaining, hasWarning, isAtLimit }) {
  if (isAtLimit) {
    return "You have reached your free monthly limit. Upgrade to keep submitting, sharing, and exporting.";
  }
  if (hasWarning) {
    return `${remaining} free debrief${remaining === 1 ? "" : "s"} left this month. Upgrade to unlock more submissions, sharing, and CSV export.`;
  }
  return `${remaining} free debrief${remaining === 1 ? "" : "s"} left this month. Sharing and CSV export are paid features.`;
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
  if (!canShareOrViewClubFeed()) {
    if (sharedOptInInput) sharedOptInInput.checked = false;
    if (sharedOptInStatus) {
      sharedOptInStatus.textContent = "Club sharing is available on paid plans.";
      sharedOptInStatus.style.color = "#ff9e9e";
    }
    return;
  }
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
  if (!activeClubId && (clubContext.clubs || []).length === 0) {
    renderEmptyState("Join a club or create one to start saving debriefs.");
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
    totalPageCount = 0;
    totalItemCount = 0;
    entries = [];
    activeEntryId = null;
  }

  setListStatus("Loading debriefs...", false);

  const from = currentPage * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  let query = supabase
    .from("debriefs")
    .select("id, club_id, author_user_id, created_at, debrief_date, note_title, note_summary, domain, topic_primary, topic_secondary, topic_tags, action_items, parse_status, parse_stage, parse_confidence, needs_review, technique, technique_type, key_points, reflections, raw_notes, summary_text, visibility", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  const dateFrom = document.querySelector("#dateFrom")?.value || "";
  const dateTo = document.querySelector("#dateTo")?.value || "";
  const domainFilter = (document.querySelector("#domainFilter")?.value || "").trim().toLowerCase();
  const topicSearch = (document.querySelector("#topicSearch")?.value || "").trim();
  const tagSearch = (document.querySelector("#tagSearch")?.value || "").trim();

  if (dateFrom) query = query.gte("debrief_date", dateFrom);
  if (dateTo) query = query.lte("debrief_date", dateTo);
  if (activeClubId) query = query.eq("club_id", activeClubId);
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

  const { data, error, count } = response;
  if (error) {
    if (currentView === "mine") {
      const fallbackLoaded = await loadMyDebriefsFallback({ from, reset });
      if (fallbackLoaded) return;
    }
    setListStatus(error.message, true);
    return;
  }

  let batch = data ?? [];
  if (typeof count === "number") {
    totalItemCount = count;
    totalPageCount = Math.ceil(count / PAGE_SIZE);
  }
  if (canUseMyHistoryRpc && batch.length === 0) {
    const fallbackLoaded = await loadMyDebriefsFallback({ from, reset });
    if (fallbackLoaded) return;
  }
  hasMore = batch.length === PAGE_SIZE;
  if (batch.length > 0) {
    currentPage += 1;
  }

  const merged = batch;
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
      ? `Page ${currentPage}. Showing ${entries.length} debriefs.`
      : `Page ${currentPage}. Showing ${entries.length} debriefs.`,
    false,
  );
}

function renderEmptyState(message) {
  entries = [];
  activeEntryId = null;
  currentPage = 0;
  totalPageCount = 0;
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
  if (!paginationControls) return;
  const knownPages = totalPageCount || currentPage + (hasMore ? 1 : 0);
  const totalVisiblePages = Math.max(knownPages, entries.length ? 1 : 0);
  if (totalVisiblePages <= 1) {
    paginationControls.classList.add("hidden");
    paginationControls.innerHTML = "";
    return;
  }

  paginationControls.classList.remove("hidden");
  paginationControls.innerHTML = Array.from({ length: totalVisiblePages }, (_, index) => {
    const pageNumber = index + 1;
    const active = pageNumber === currentPage;
    return `
      <button
        class="page-button ${active ? "active" : ""}"
        type="button"
        data-page-number="${pageNumber}"
        aria-label="Go to page ${pageNumber}"
        ${active ? 'aria-current="page"' : ""}
      >${pageNumber}</button>
    `;
  }).join("");

  paginationControls.querySelectorAll("[data-page-number]").forEach((button) => {
    button.addEventListener("click", () => {
      goToPage(Number(button.dataset.pageNumber));
    });
  });
}

function goToPage(pageNumber) {
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber === currentPage) return;
  const highestKnownPage = Math.max(currentPage + (hasMore ? 1 : 0), 1);
  const highestPage = Math.max(totalPageCount || highestKnownPage, highestKnownPage);
  if (pageNumber > highestPage) return;
  currentPage = pageNumber - 1;
  activeEntryId = null;
  loadEntries({ reset: false });
}

function renderEntryList() {
  if (listCountBadge) {
    listCountBadge.textContent = totalItemCount > 0 ? String(totalItemCount) : String(entries.length);
  }

  if (entries.length === 0) {
    entryList.innerHTML = currentView === "mine"
      ? '<div class="first-note-panel"><p class="eyebrow compact">First note</p><strong>Create your first debrief.</strong><p>Example: Today we worked guard retention. I need to frame earlier and keep my knees tighter.</p><button class="ghost" id="newDebriefButton" type="button">New Debrief</button></div>'
      : "";
    return;
  }

  entryList.innerHTML = entries
    .map((entry) => {
      const isActive = entry.id === activeEntryId;
      const title = entry.note_title || entry.technique || "Untitled debrief";

      const dateString = escapeHtml(entry.debrief_date || (entry.created_at ? entry.created_at.split("T")[0] : ""));
      return `
        <button class="entry-item ${isActive ? "active" : ""}" data-id="${entry.id}" type="button">
          <strong>${escapeHtml(title)}</strong>
          ${dateString ? `<small class="muted" style="display:block; margin-top:0.25rem; font-size:0.8rem;">${dateString}</small>` : ""}
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
    entryDetail.innerHTML = currentView === "mine"
      ? '<section class="first-note-panel detail-first-note"><p class="eyebrow compact">Nothing here yet</p><h3>Create your first debrief.</h3><p>One or two sentences is enough. Tap the <strong>New Debrief</strong> button to add a training note.</p><p>Example: Today we drilled guard retention. I need to frame earlier and keep my knees tighter.</p><div class="button-row"><button class="action" type="button" id="emptyNewDebriefButton">New Debrief</button></div></section>'
      : '<p class="muted">Select a debrief to view details.</p>';
    document.querySelector("#emptyNewDebriefButton")?.addEventListener("click", openNewDebriefModal);
    return;
  }

  const displayKeyPoints = normalizeDisplayKeyPoints(entry.key_points, entry.raw_notes || "");
  const keyPoints = displayKeyPoints.length
    ? `<ul class="keypoint-grid">${displayKeyPoints.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>`
    : "<p>No key points parsed.</p>";
  const tags = Array.isArray(entry.topic_tags) && entry.topic_tags.length
    ? `<div class="tag-row">${entry.topic_tags.map((tag) => `<span class="tag-chip">${escapeHtml(formatTagLabel(tag))}</span>`).join("")}</div>`
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
  const rawNotes = entry.raw_notes || "";
  const reflections = entry.reflections || "";
  const showReflections = reflections && normalizeComparableText(reflections) !== normalizeComparableText(rawNotes);

  entryDetail.innerHTML = `
    <button id="backToTimelineButton" class="ghost back-to-timeline" type="button">Back to timeline</button>
    <div class="detail-hero">
      <div>
        <p class="detail-date">${escapeHtml(formatFriendlyDate(dateLabel))}</p>
        <h1 class="detail-title">${escapeHtml(title)}</h1>
      </div>
      <div class="detail-actions">
        <button id="favouriteToggleButton" class="ghost favourite-toggle ${isFavourite ? "active-tab" : ""}" type="button">${favouriteLabel}</button>
        ${canShare ? `<button id="shareToggleButton" class="action" type="button">${canShareDebriefs() ? shareLabel : "Upgrade to Share"}</button>
        <span style="display:none" data-debrief-version="20260430e-diagnostic"></span>` : ""}
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
          <p>${showReflections ? escapeHtml(reflections) : "Captured in the summary and key points."}</p>
        </div>
        <div class="detail-block">
          <h3>Parse Status</h3>
          <div class="parse-status-indicator ${getParseStatusClass(entry)}">
            ${getParseStatusDisplay(entry)}
          </div>
          ${entry.parse_status === "failed" ? `
            <button id="retryParseButton" class="ghost" style="margin-top:0.5rem" type="button">Retry Analysis</button>
          ` : ""}
          ${entry.parse_status === "refining" || entry.parse_status === "queued" ? `
            <button id="refreshParseButton" class="ghost" style="margin-top:0.5rem" type="button">Refresh Status</button>
          ` : ""}
        </div>
      </div>
      <details class="raw-note-disclosure">
        <summary>Raw note</summary>
        <p>${escapeHtml(rawNotes || "No raw note stored.")}</p>
      </details>
    </details>
  `;

  if (canShare) {
    const shareToggleButton = document.querySelector("#shareToggleButton");
    if (shareToggleButton) {
      shareToggleButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const entryToShare = entries.find((item) => item.id === activeEntryId);
        if (entryToShare) openSharePanel(entryToShare);
      });
    }
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
  const retryParseButton = document.querySelector("#retryParseButton");
  if (retryParseButton) {
    retryParseButton.addEventListener("click", async () => {
      if (!entry) return;
      retryParseButton.disabled = true;
      try {
        await retryParseForEntry(entry.id);
        showToast("Parse retry queued", "info");
        await loadEntries({ reset: false });
        renderEntryDetail();
      } catch (err) {
        showToast("Failed to queue retry: " + err.message, "error");
      } finally {
        retryParseButton.disabled = false;
      }
    });
  }
  const refreshParseButton = document.querySelector("#refreshParseButton");
  if (refreshParseButton) {
    refreshParseButton.addEventListener("click", async () => {
      if (!entry) return;
      refreshParseButton.disabled = true;
      try {
        await loadEntries({ reset: false });
        renderEntryDetail();
        showToast("Status refreshed", "info", 2000);
      } catch (err) {
        showToast("Failed to refresh: " + err.message, "error");
      } finally {
        refreshParseButton.disabled = false;
      }
    });
  }
}

function openShareModal(html) {
  if (!shareModalOverlay || !shareModalBody) return;
  shareModalBody.innerHTML = html;
  shareModalOverlay.classList.remove("hidden");
}
function closeShareModal() {
  if (shareModalOverlay) shareModalOverlay.classList.add("hidden");
}

async function openSharePanel(entry) {
  try {
    if (!supabase || !currentUser || !entry) return;
    if (!canShareDebriefs()) {
      openShareModal(`<p class="muted">Free accounts keep notes private. Upgrade to share with your club or selected teammates.</p>`);
      if (shareModalTitle) shareModalTitle.textContent = "Sharing is a paid feature";
      setShareModalStatus("Upgrade to unlock sharing.", true);
      return;
    }
    activeShareEntry = entry;
    if (shareModalTitle) shareModalTitle.textContent = entry.note_title || entry.technique || "Share this debrief";
    setShareModalStatus("Loading share options...", false);
    openShareModal(`<p class="muted">Loading...</p>`);

    await loadClubMembers(entry.club_id);
    await loadShareSettings(entry.id);
    const peopleHtml = buildSharePeopleListHtml();
    const wcChecked = activeShareWholeClub ? "checked" : "";
    openShareModal(`
      <label class="share-option">
        <input id="shareWholeClub" type="checkbox" ${wcChecked}>
        <span><strong>Whole club</strong><small>Appears in the club feed for members who enable it.</small></span>
      </label>
      <div class="share-people-block">
        <p class="drawer-label">People</p>
        <div id="sharePeopleList" class="share-people-list">${peopleHtml}</div>
      </div>
      <div class="drawer-button-grid" style="margin-top:1rem">
        <button id="saveShareSettingsButton" class="action" type="button">Save Sharing</button>
        <button id="stopSharingButton" class="ghost" type="button">Make Private</button>
      </div>
    `);
    const wcInput = document.querySelector("#shareModalBody #shareWholeClub") || document.querySelector("#shareWholeClub");
    if (wcInput) wcInput.addEventListener("change", () => { activeShareWholeClub = wcInput.checked; refreshSharePeopleModal(); });
    const saveBtn = document.querySelector("#shareModalBody #saveShareSettingsButton") || document.querySelector("#saveShareSettingsButton");
    if (saveBtn) saveBtn.addEventListener("click", saveShareSettingsFromModal);
    const stopBtn = document.querySelector("#shareModalBody #stopSharingButton") || document.querySelector("#stopSharingButton");
    if (stopBtn) stopBtn.addEventListener("click", stopSharingFromModal);
    setShareModalStatus("Choose whole club, selected people, or make it private.", false);
  } catch (error) {
    console.error("openSharePanel failed", error);
    setShareModalStatus(error?.message || "Could not open sharing. Try refreshing the page.", true);
    openShareModal(`<p class="muted">${error?.message || "Could not open sharing."}</p>`);
  }
}

function buildSharePeopleListHtml() {
  if (clubMembers.length === 0) return '<p class="muted">No other active club members found yet.</p>';
  const wholeClub = activeShareWholeClub;
  return clubMembers.map((member) => `
    <label class="share-person ${wholeClub ? "disabled" : ""}">
      <input type="checkbox" value="${escapeHtml(member.id)}" ${activeShareRecipientIds.has(member.id) ? "checked" : ""} ${wholeClub ? "disabled" : ""}>
      <span>
        <strong>${escapeHtml(member.display_name)}</strong>
        ${member.email ? `<small>${escapeHtml(member.email)}</small>` : ""}
      </span>
    </label>
  `).join("");
}

function refreshSharePeopleModal() {
  const list = document.querySelector("#shareModalBody #sharePeopleList") || document.querySelector("#sharePeopleList");
  if (list) list.innerHTML = buildSharePeopleListHtml();
}

function selectedShareRecipientIds() {
  const list = document.querySelector("#shareModalBody #sharePeopleList") || sharePeopleList;
  if (!list || activeShareWholeClub) return [];
  return [...list.querySelectorAll("input[type='checkbox']:checked")]
    .map((input) => input.value)
    .filter(Boolean);
}

function setShareModalStatus(message, isError) {
  if (!shareModalStatus) return;
  shareModalStatus.textContent = message;
  shareModalStatus.style.color = isError ? "#ff9e9e" : "#cfe7ff";
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

function getModalShareWholeClub() {
  const modalWc = document.querySelector("#shareModalBody #shareWholeClub");
  if (modalWc) return Boolean(modalWc.checked);
  return Boolean(shareWholeClubInput?.checked);
}

function getModalShareRecipientIds() {
  const modalList = document.querySelector("#shareModalBody #sharePeopleList");
  const list = modalList || sharePeopleList;
  if (!list || getModalShareWholeClub()) return [];
  return [...list.querySelectorAll("input[type='checkbox']:checked")]
    .map((input) => input.value)
    .filter(Boolean);
}

async function saveShareSettingsFromModal() {
  if (!supabase || !currentUser || !activeShareEntry) return;
  await writeShareSettings(activeShareEntry, {
    shareWholeClub: getModalShareWholeClub(),
    recipientIds: getModalShareRecipientIds(),
    useModal: true,
  });
}

async function stopSharingFromModal() {
  if (!activeShareEntry) return;
  await writeShareSettings(activeShareEntry, {
    shareWholeClub: false,
    recipientIds: [],
    useModal: true,
  });
}

async function saveShareSettings() {
  if (!supabase || !currentUser || !activeShareEntry) return;
  const shareWholeClub = Boolean(shareWholeClubInput?.checked);
  const recipientIds = selectedShareRecipientIds();
  await writeShareSettings(activeShareEntry, {
    shareWholeClub,
    recipientIds,
    useModal: false,
  });
}

async function stopSharingActiveEntry() {
  if (!activeShareEntry) return;
  await writeShareSettings(activeShareEntry, {
    shareWholeClub: false,
    recipientIds: [],
    useModal: false,
  });
}

async function writeShareSettings(entry, { shareWholeClub, recipientIds, useModal }) {
  const setStatus = useModal ? setShareModalStatus : setSharePanelStatus;
  if (!canShareDebriefs()) {
    setStatus("Sharing is available on paid plans.", true);
    return;
  }
  setStatus("Saving sharing settings...", false);
  const now = new Date().toISOString();

  const { error: revokeError } = await supabase
    .from("debrief_shares")
    .update({ revoked_at: now })
    .eq("debrief_id", entry.id)
    .eq("author_user_id", currentUser.id)
    .is("revoked_at", null);

  if (revokeError) {
    setStatus(revokeError.message, true);
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
      setStatus(insertError.message, true);
      return;
    }
  }

  const nextVisibility = shareRows.length > 0 ? "shared" : "private";
  const { error: visibilityError } = await supabase
    .from("debriefs")
    .update({ visibility: nextVisibility })
    .eq("id", entry.id);

  if (visibilityError) {
    setStatus(visibilityError.message, true);
    return;
  }

  activeShareWholeClub = shareWholeClub;
  activeShareRecipientIds = new Set(recipientIds);
  const successMessage = shareRows.length > 0 ? "Sharing updated!" : "This debrief is now private.";
  setStatus(successMessage, false);

  if (useModal) {
    window.setTimeout(() => closeShareModal(), 1500);
  }
  await loadEntries({ reset: true });
}

function setSharePanelStatus(message, isError) {
  if (!sharePanelStatus) return;
  sharePanelStatus.textContent = message;
  sharePanelStatus.style.color = isError ? "#ff9e9e" : "#cfe7ff";
}

async function exportCurrentResults() {
  if (!canExportDebriefs()) {
    setExportStatus("CSV export is available on paid plans.", true);
    return;
  }
  if (!entries.length) {
    setExportStatus("There are no visible debriefs to export.", true);
    return;
  }
  downloadCsv(entries, "debrief-current-results");
  setExportStatus(`Exported ${entries.length} visible debrief${entries.length === 1 ? "" : "s"}.`, false);
}

async function exportAllMyDebriefs() {
  if (!canExportDebriefs()) {
    setExportStatus("CSV export is available on paid plans.", true);
    return;
  }
  setExportStatus("Preparing full CSV export...", false);
  const rows = await fetchAllMyDebriefsForExport();
  if (!rows.length) {
    setExportStatus("No debriefs found to export.", true);
    return;
  }
  downloadCsv(rows, "debrief-all-my-notes");
  setExportStatus(`Exported ${rows.length} debrief${rows.length === 1 ? "" : "s"}.`, false);
}

async function fetchAllMyDebriefsForExport() {
  if (!supabase || !currentUser) return [];
  const { data, error } = await supabase
    .from("debriefs")
    .select("id, club_id, created_at, debrief_date, note_title, note_summary, domain, topic_primary, topic_secondary, topic_tags, action_items, technique, technique_type, key_points, reflections, raw_notes, summary_text, visibility")
    .eq("author_user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    setExportStatus(error.message, true);
    return [];
  }
  return data || [];
}

function downloadCsv(rows, filenameBase) {
  const csv = buildDebriefCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filenameBase}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildDebriefCsv(rows) {
  const headers = [
    "date",
    "title",
    "summary",
    "domain",
    "primary_topic",
    "secondary_topic",
    "tags",
    "key_points",
    "action_items",
    "reflections",
    "raw_notes",
    "visibility",
    "created_at",
    "id",
  ];
  const lines = rows.map((entry) => [
    entry.debrief_date || asDate(entry.created_at) || "",
    entry.note_title || entry.technique || "Untitled debrief",
    entry.note_summary || entry.summary_text || "",
    entry.domain || inferLegacyDomain(entry.technique_type),
    entry.topic_primary || "",
    entry.topic_secondary || "",
    joinCsvArray(entry.topic_tags),
    joinCsvArray(normalizeDisplayKeyPoints(entry.key_points, entry.raw_notes || "")),
    joinCsvArray(entry.action_items),
    entry.reflections || "",
    entry.raw_notes || "",
    entry.visibility || "private",
    entry.created_at || "",
    entry.id || "",
  ].map(csvCell).join(","));
  return [headers.join(","), ...lines].join("\r\n");
}

function joinCsvArray(value) {
  if (!Array.isArray(value)) return "";
  return value.filter(Boolean).join("; ");
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function setExportStatus(message, isError) {
  if (!exportStatus) return;
  exportStatus.textContent = message;
  exportStatus.style.color = isError ? "#ff9e9e" : "#cfe7ff";
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
  if (activeClubId) url.searchParams.set("club_id", `eq.${activeClubId}`);
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
          Prefer: "count=exact",
        },
      },
      7000,
      "Debrief history took too long.",
    );
    if (!response.ok) return false;

    const contentRange = response.headers.get("content-range");
    if (contentRange) {
      const match = contentRange.match(/\/(.+)$/);
      if (match && !Number.isNaN(Number(match[1]))) {
        totalItemCount = Number(match[1]);
        totalPageCount = Math.ceil(totalItemCount / PAGE_SIZE);
      }
    }

    batch = await response.json();
  } catch (_error) {
    return false;
  }

  hasMore = batch.length === PAGE_SIZE;
  if (batch.length > 0) {
    entries = batch;
    currentPage += 1;
    if (!entries.find((entry) => entry.id === activeEntryId)) {
      activeEntryId = entries[0].id;
    }
    setListStatus(`Page ${currentPage}. Showing ${entries.length} debriefs.`, false);
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
    entries = batch;
    currentPage += 1;
    if (!entries.find((entry) => entry.id === activeEntryId)) {
      activeEntryId = entries[0].id;
    }
    setListStatus(`Page ${currentPage}. Showing ${entries.length} debriefs.`, false);
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

function setClubPanelStatus(message, isError) {
  if (!clubPanelStatus) return;
  clubPanelStatus.textContent = message;
  clubPanelStatus.style.color = isError ? "#ff9e9e" : "#cfe7ff";
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

function formatTagLabel(value) {
  return String(value ?? "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 48);
}

function normalizeComparableText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDisplayKeyPoints(points, rawNotes) {
  const rawComparable = normalizeComparableText(rawNotes);
  const cleaned = (Array.isArray(points) ? points : [])
    .map((point) => String(point ?? "").trim())
    .filter(Boolean)
    .filter((point) => {
      const comparable = normalizeComparableText(point);
      const wordCount = comparable.split(" ").filter(Boolean).length;
      return wordCount < 6 || !rawComparable.includes(comparable);
    })
    .map((point) => point.replace(/[_-]+/g, " "))
    .map((point) => point.split(/\s+/).slice(0, 12).join(" "))
    .slice(0, 4);

  if (cleaned.length > 0) return [...new Set(cleaned)];
  return buildDisplayKeyPointFallback(rawNotes);
}

function buildDisplayKeyPointFallback(rawNotes) {
  const text = String(rawNotes ?? "").toLowerCase();
  const points = [];
  if (/\b(weight|heavy|fall|pressure|load)\b/.test(text)) points.push("Load weight before moving");
  if (/\b(?:grip|grips|connect|hook|hooks|frame)\b/.test(text)) points.push("Build connection first");
  if (/\b(?:light|timing|when|then|start)\b/.test(text)) points.push("Move when resistance lightens");
  if (/\b(?:finish|complete|follow through|follow-through)\b/.test(text)) points.push("Follow through to finish");
  return points.length ? points.slice(0, 4) : ["Choose one main lesson", "Pick the next training focus"];
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
  var text = String(value ?? "");
  text = text.split("&").join("&");
  text = text.split("<").join("<");
  text = text.split(">").join(">");
  text = text.split('"').join(""");
  text = text.split("'").join("&#039;");
  return text;
}

// ---- New Debrief Modal ----

function openNewDebriefModal() {
  if (!newDebriefModalOverlay || !newDebriefText) return;
  if (!currentUser) {
    setAuthStatus("Log in first to submit a debrief.", true);
    return;
  }
  newDebriefText.value = "";
  if (newDebriefStatus) newDebriefStatus.textContent = "";
  newDebriefModalOverlay.classList.remove("hidden");
  newDebriefText.focus();
}

function closeNewDebriefModal() {
  if (!newDebriefModalOverlay) return;
  newDebriefModalOverlay.classList.add("hidden");
}

async function handleNativeSubmit() {
  if (!supabase || !currentUser || !activeClubId) {
    setNewDebriefStatus("Please log in and join a club first.", true);
    return;
  }
  const text = (newDebriefText?.value || "").trim();
  if (!text) {
    setNewDebriefStatus("Enter your training note first.", true);
    return;
  }
  if (text.length > 3000) {
    setNewDebriefStatus("Note is too long. Keep it under 3000 characters.", true);
    return;
  }

  setNewDebriefStatus("Saving your debrief...", false);
  if (submitDebriefButton) submitDebriefButton.disabled = true;

  try {
    const edgeResult = await submitViaEdgeFunction(currentUser.id, activeClubId, text);
    if (edgeResult.ok) {
      showToast("✅ Debrief saved and submitted for analysis!", "success");
      setNewDebriefStatus("Saved! Your note is being analyzed...", false);
      if (newDebriefText) newDebriefText.value = "";
      window.setTimeout(() => closeNewDebriefModal(), 1500);
      await loadEntries({ reset: true });
      return;
    }
    throw new Error(edgeResult.error || "Edge function failed");
  } catch (err) {
    try {
      await submitViaDirectInsert(currentUser.id, activeClubId, text);
      showToast("✅ Debrief saved!", "success");
      setNewDebriefStatus("Saved! Your note is being analyzed...", false);
      if (newDebriefText) newDebriefText.value = "";
      window.setTimeout(() => closeNewDebriefModal(), 1500);
      await loadEntries({ reset: true });
    } catch (fallbackErr) {
      showToast("Error saving debrief", "error");
      setNewDebriefStatus(fallbackErr?.message || "Could not save your debrief. Check your connection and try again.", true);
    }
  } finally {
    if (submitDebriefButton) submitDebriefButton.disabled = false;
  }
}

async function submitViaEdgeFunction(userId, clubId, text) {
  try {
    const sessionResult = await supabase.auth.getSession();
    const accessToken = sessionResult?.data?.session?.access_token;
    const headers = {
      "content-type": "application/json",
      "apikey": SUPABASE_PUBLISHABLE_KEY,
    };
    if (accessToken) {
      headers["authorization"] = `Bearer ${accessToken}`;
    }

    const response = await fetchWithTimeout(
      DEBRIEF_SUBMIT_URL,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ user_id: userId, club_id: clubId, text }),
      },
      12000,
      "Submission is taking longer than expected.",
    );

    const data = await response.json();
    return { ok: response.ok && data.ok, error: data.error || "" };
  } catch (err) {
    return { ok: false, error: err?.message || "Edge function unavailable" };
  }
}

async function submitViaDirectInsert(userId, clubId, text) {
  const today = new Date().toISOString().slice(0, 10);
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
      parser_version: "v2-native-direct",
      last_parsed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError) throw insertError;

  try {
    await supabase.from("parse_jobs").insert({
      debrief_id: debrief.id,
      stage: 1,
      status: "queued",
      attempts: 0,
      run_after: new Date().toISOString(),
    });
  } catch (_err) {
    // Non-critical; parse-refiner will pick it up on next poll
  }

  try {
    const refinerHeaders = { "content-type": "application/json", "apikey": SUPABASE_PUBLISHABLE_KEY };
    if (currentAccessToken) refinerHeaders["authorization"] = `Bearer ${currentAccessToken}`;
    fetch("https://wtmzcwsfetqhfrdlygyr.supabase.co/functions/v1/parse-refiner?limit=5", {
      method: "POST",
      headers: refinerHeaders,
    }).catch(() => {});
  } catch (_err) {
    // Fire-and-forget
  }

  return debrief;
}

function setNewDebriefStatus(message, isError) {
  if (!newDebriefStatus) return;
  newDebriefStatus.textContent = message;
  newDebriefStatus.style.color = isError ? "#ff9e9e" : "#cfe7ff";
}

// ---- Toast Notifications ----

function showToast(message, type = "info", duration = 3000) {
  const container = document.getElementById("toastContainer") || createToastContainer();
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
  return toast;
}

function createToastContainer() {
  const container = document.createElement("div");
  container.id = "toastContainer";
  container.className = "toast-container";
  document.body.appendChild(container);
  return container;
}

// ---- Parse Status Rendering ----

function getParseStatusDisplay(entry) {
  const status = entry.parse_status || "unknown";
  const confidence = typeof entry.parse_confidence === "number"
    ? Math.round(entry.parse_confidence * 100)
    : null;

  if (status === "ready") {
    return `✅ Parsed successfully${confidence ? ` (${confidence}% confidence)` : ""}`;
  }
  if (status === "needs_review") {
    return `⚠️ Needs review${confidence ? ` (${confidence}% confidence)` : ""}`;
  }
  if (status === "refining" || status === "queued") {
    return `⏳ Parsing your training note... (Est. 30 seconds)`;
  }
  if (status === "failed") {
    return `❌ Parsing failed. Check your note and try again.`;
  }
  return `Processing...`;
}

function getParseStatusClass(entry) {
  const status = entry.parse_status || "unknown";
  if (status === "ready") return "ready";
  if (status === "needs_review") return "needs-review";
  if (status === "refining" || status === "queued") return "parsing";
  if (status === "failed") return "failed";
  return "unknown";
}

// ---- Parse Retry Logic ----

async function retryParseForEntry(debriefId) {
  if (!supabase) throw new Error("Supabase not initialized");

  const { data: existingJobs } = await supabase
    .from("parse_jobs")
    .select("id,status")
    .eq("debrief_id", debriefId)
    .in("status", ["queued", "running", "retry"])
    .limit(1);

  if (existingJobs && existingJobs.length > 0) {
    throw new Error("A parse job is already queued for this debrief");
  }

  const { error } = await supabase
    .from("parse_jobs")
    .insert({
      debrief_id: debriefId,
      status: "queued",
      stage: 0,
      locked_at: null,
      locked_by: null,
      attempts: 0,
      last_error: null,
    });

  if (error) throw new Error(error.message || "Failed to queue parse job");
}

async function retryStuckParseJobs() {
  if (!supabase || !currentUser) return;

  try {
    const { data: stuckDebriefs, error } = await supabase
      .from("debriefs")
      .select("id,parse_status,parse_stage,created_at")
      .eq("author_user_id", currentUser.id)
      .in("parse_status", ["queued", "refining", "failed"])
      .neq("parse_status", "ready")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error || !stuckDebriefs?.length) return;

    const now = Date.now();
    let retried = 0;

    for (const debrief of stuckDebriefs) {
      const createdAt = new Date(debrief.created_at).getTime();
      if (now - createdAt < 2 * 60 * 1000) continue;

      const { data: existingJobs } = await supabase
        .from("parse_jobs")
        .select("id,status")
        .eq("debrief_id", debrief.id)
        .in("status", ["queued", "running", "retry"])
        .limit(1);

      if (existingJobs && existingJobs.length > 0) continue;

      try {
        await supabase.from("parse_jobs").insert({
          debrief_id: debrief.id,
          stage: debrief.parse_stage >= 1 ? 2 : 1,
          status: "queued",
          attempts: 0,
          run_after: new Date().toISOString(),
        });
        retried += 1;
      } catch (_err) {
        // Job may already exist due to unique constraint
      }
    }

    if (retried > 0) {
      try {
        fetch("https://wtmzcwsfetqhfrdlygyr.supabase.co/functions/v1/parse-refiner?limit=" + retried, {
          method: "POST",
          headers: { "content-type": "application/json" },
        }).catch(() => {});
      } catch (_err) {
        // Fire-and-forget
      }
    }
  } catch (_err) {
    // Non-critical
  }
}
