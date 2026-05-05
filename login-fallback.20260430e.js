(function () {
  const SUPABASE_URL = "https://wtmzcwsfetqhfrdlygyr.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bLuHb3b4yECOGg5IG9evag_rTZbzioA";
  const AUTH_STORAGE_KEY = "sb-wtmzcwsfetqhfrdlygyr-auth-token";
  const FALLBACK_SESSION_KEY = "debrief-fallback-session";
  const PAGE_SIZE = 10;
  const fallbackState = {
    page: 0,
    entries: [],
    hasNext: false,
    token: "",
  };

  function setStatus(message, isError) {
    const status = document.querySelector("#authStatus");
    if (!status) return;
    status.textContent = message;
    status.style.color = isError ? "#ff9e9e" : "#cfe7ff";
  }

  function setListStatus(message, isError) {
    const status = document.querySelector("#listStatus");
    if (!status) return;
    status.textContent = message;
    status.style.color = isError ? "#ff9e9e" : "#cfe7ff";
  }

  function authMode() {
    return document.documentElement.dataset.authMode === "signup" ? "signup" : "login";
  }

  function persistSession(session) {
    if (!session?.access_token || !session?.refresh_token) return;
    const expiresAt = Math.floor(Date.now() / 1000) + Number(session.expires_in || 3600);
    const normalizedSession = {
      access_token: session.access_token,
      token_type: session.token_type || "bearer",
      expires_in: session.expires_in || 3600,
      expires_at: expiresAt,
      refresh_token: session.refresh_token,
      user: session.user,
    };
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        currentSession: normalizedSession,
        expiresAt,
      }),
    );
    sessionStorage.setItem(FALLBACK_SESSION_KEY, JSON.stringify(normalizedSession));
  }

  function readSession() {
    try {
      const raw = sessionStorage.getItem(FALLBACK_SESSION_KEY) || localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.currentSession || parsed;
    } catch (_error) {
      return null;
    }
  }

  async function fetchJson(path, token, options = {}) {
    const response = await fetch(`${SUPABASE_URL}${path}`, {
      ...options,
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.message || data?.msg || data?.error || "Request failed.");
    }
    return data;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function titleFor(entry) {
    return entry.note_title || entry.summary_text || entry.note_summary || entry.topic_primary || "Untitled debrief";
  }

  function summaryFor(entry) {
    return entry.note_summary || entry.summary_text || entry.reflections || entry.raw_notes || "";
  }

  function renderFallbackDetail(entry) {
    const detail = document.querySelector("#entryDetail");
    if (!detail) return;
    if (!entry) {
      detail.innerHTML = '<p class="muted">Select a debrief to view details.</p>';
      return;
    }
    const raw = entry.raw_notes || entry.reflections || "";
    detail.innerHTML = `
      <div class="detail-hero">
        <div>
          <p class="detail-date">${escapeHtml(entry.debrief_date || entry.created_at || "")}</p>
          <h1 class="detail-title">${escapeHtml(titleFor(entry))}</h1>
        </div>
      </div>
      <div class="summary-card">
        <h3>Summary</h3>
        <p>${escapeHtml(summaryFor(entry))}</p>
      </div>
      <details class="raw-note-disclosure">
        <summary>Raw notes</summary>
        <p>${escapeHtml(raw)}</p>
      </details>
    `;
  }

  function renderFallbackEntries(entries) {
    const list = document.querySelector("#entryList");
    const badge = document.querySelector("#listCountBadge");
    if (badge) {
      const start = entries.length ? fallbackState.page * PAGE_SIZE + 1 : 0;
      const end = fallbackState.page * PAGE_SIZE + entries.length;
      badge.textContent = entries.length ? `${start}-${end}` : "0";
    }
    if (!list) return;
    if (!entries.length) {
      list.innerHTML = '<p class="muted">No debriefs found yet.</p>';
      renderFallbackDetail(null);
      return;
    }
    list.innerHTML = entries.map((entry, index) => {
      const dateString = escapeHtml(entry.debrief_date || (entry.created_at ? entry.created_at.split("T")[0] : ""));
      return `
      <button class="entry-item ${index === 0 ? "active" : ""}" type="button" data-fallback-index="${index}">
        <strong>${escapeHtml(titleFor(entry))}</strong>
        ${dateString ? `<small class="muted" style="display:block; margin-top:0.25rem; font-size:0.8rem;">${dateString}</small>` : ""}
      </button>
    `}).join("");
    list.querySelectorAll("[data-fallback-index]").forEach((button) => {
      button.addEventListener("click", () => {
        list.querySelectorAll(".entry-item").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        renderFallbackDetail(entries[Number(button.dataset.fallbackIndex)]);
      });
    });
    renderFallbackDetail(entries[0]);
  }

  function renderPagination() {
    const paginationControls = document.querySelector("#paginationControls");
    if (!paginationControls) return;

    const knownPages = fallbackState.page + 1 + (fallbackState.hasNext ? 1 : 0);
    const totalVisiblePages = Math.max(knownPages, fallbackState.entries.length ? 1 : 0);

    if (totalVisiblePages <= 1) {
      paginationControls.classList.add("hidden");
      paginationControls.innerHTML = "";
      return;
    }

    paginationControls.classList.remove("hidden");
    paginationControls.innerHTML = Array.from({ length: totalVisiblePages }, (_, index) => {
      const pageNumber = index + 1;
      const active = pageNumber === (fallbackState.page + 1);
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
        loadFallbackPage(Number(button.dataset.pageNumber) - 1);
      });
    });
  }

  async function loadFallbackPage(page) {
    if (!fallbackState.token) return;
    const safePage = Math.max(0, page);
    setListStatus("Loading debriefs...", false);
    const batch = await fetchJson(
      "/rest/v1/rpc/get_my_debrief_history",
      fallbackState.token,
      {
        method: "POST",
        body: JSON.stringify({ limit_count: PAGE_SIZE + 1, offset_count: safePage * PAGE_SIZE }),
      },
    );
    const rows = Array.isArray(batch) ? batch : [];
    fallbackState.page = safePage;
    fallbackState.hasNext = rows.length > PAGE_SIZE;
    fallbackState.entries = rows.slice(0, PAGE_SIZE);
    renderFallbackEntries(fallbackState.entries);
    renderPagination();
    setListStatus(fallbackState.entries.length ? "" : "No debriefs found yet.", false);
  }

  function openDrawer() {
    document.querySelector("#drawerScrim")?.classList.remove("hidden");
    document.querySelector("#controlDrawer")?.classList.remove("hidden");
    document.body.classList.add("drawer-open");
    document.querySelector("#menuButton")?.setAttribute("aria-expanded", "true");
  }

  function closeDrawer() {
    document.querySelector("#drawerScrim")?.classList.add("hidden");
    document.querySelector("#controlDrawer")?.classList.add("hidden");
    document.body.classList.remove("drawer-open");
    document.querySelector("#menuButton")?.setAttribute("aria-expanded", "false");
  }

  async function loadFallbackClubContext() {
    const select = document.querySelector("#activeClubSelect");
    const status = document.querySelector("#clubPanelStatus");
    if (!select || !fallbackState.token) return;
    try {
      const data = await fetchJson(
        "/rest/v1/rpc/get_my_club_context",
        fallbackState.token,
        { method: "POST", body: "{}" },
      );
      const clubs = Array.isArray(data?.clubs) ? data.clubs : [];
      if (!clubs.length) {
        select.innerHTML = '<option value="">No club found</option>';
        if (status) status.textContent = "No active club found.";
        return;
      }
      select.innerHTML = clubs.map((club) => `
        <option value="${escapeHtml(club.id)}" ${club.id === data.active_club_id ? "selected" : ""}>${escapeHtml(club.name || "Club")}</option>
      `).join("");
      if (status) status.textContent = "";
    } catch (_error) {
      select.innerHTML = '<option value="">Club unavailable</option>';
      if (status) status.textContent = "Club controls are unavailable in fallback mode.";
    }
  }

  function setupFallbackControls() {
    document.querySelector("#menuButton")?.addEventListener("click", openDrawer);
    document.querySelector("#drawerCloseButton")?.addEventListener("click", closeDrawer);
    document.querySelector("#drawerScrim")?.addEventListener("click", closeDrawer);
    document.querySelector("#refreshButton")?.addEventListener("click", () => loadFallbackPage(fallbackState.page));
    ["#viewSharedButton", "#viewSharedWithMeButton", "#viewFavouritesButton"].forEach((selector) => {
      document.querySelector(selector)?.addEventListener("click", () => {
        setListStatus("Fallback viewer is showing My Notes. Full feed controls will come back when the main viewer is stable.", false);
        closeDrawer();
      });
    });
    ["#exportCurrentButton", "#exportAllButton"].forEach((selector) => {
      const button = document.querySelector(selector);
      if (!button) return;
      button.disabled = true;
      button.classList.add("muted-control");
    });
    const exportStatus = document.querySelector("#exportStatus");
    if (exportStatus) exportStatus.textContent = "CSV export is unavailable in fallback mode.";
  }

  function renderFallbackHeader() {
    document.title = "Debrief History | Debrief";
    const title = document.querySelector("#authPageTitle");
    const copy = document.querySelector("#authPageCopy");
    const accountTitle = document.querySelector("#accountCardTitle");
    if (title) title.textContent = "Your Debrief Archive";
    if (copy) copy.textContent = "Review your training notes, saved lessons, and shared club insights.";
    if (accountTitle) accountTitle.textContent = "Account";
  }

  async function openFallbackViewer() {
    const session = readSession();
    if (!session?.access_token) {
      setStatus("Login succeeded, but the browser did not save the session. Try one more time.", true);
      return;
    }
    window.__debriefUseFallbackViewer = true;
    fallbackState.token = session.access_token;
    renderFallbackHeader();
    setStatus("Opening your archive...", false);
    try {
      const user = session.user || await fetchJson("/auth/v1/user", session.access_token);
      const accountCard = document.querySelector("#accountCard");
      const appCard = document.querySelector("#appCard");
      const sessionBar = document.querySelector("#sessionBar");
      const sessionEmail = document.querySelector("#sessionEmail");
      const topSession = document.querySelector("#topSession");
      const topSessionEmail = document.querySelector("#topSessionEmail");
      if (accountCard) accountCard.classList.add("hidden");
      if (appCard) appCard.classList.remove("hidden");
      if (sessionBar) sessionBar.classList.remove("hidden");
      if (sessionEmail) sessionEmail.textContent = `Signed in as ${user.email || "your account"}`;
      if (topSession) topSession.classList.remove("hidden");
      if (topSessionEmail) topSessionEmail.textContent = user.email || "";
      setStatus(`Logged in as ${user.email || "your account"}.`, false);
      setupFallbackControls();
      await loadFallbackClubContext();
      await loadFallbackPage(0);
    } catch (error) {
      setStatus(error?.message || "Could not open your archive after login.", true);
    }
  }

  async function fallbackLogin() {
    const email = document.querySelector("#email")?.value.trim();
    const password = document.querySelector("#password")?.value || "";
    if (!email || !password) {
      setStatus("Email and password are required for login.", true);
      return;
    }

    setStatus("Logging in...", false);
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(data.error_description || data.msg || data.error || "Login failed. Check the email and password.", true);
        return;
      }
      persistSession(data);
      setStatus("Logged in. Opening your account...", false);
      sessionStorage.setItem("debrief-login-handoff", String(Date.now()));
      window.location.replace(`${window.location.origin}/viewer?login=1`);
    } catch (_error) {
      setStatus("Login could not reach the server. Check your connection and try again.", true);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const loginButton = document.querySelector("#loginButton");
    const authForm = document.querySelector("#authForm");
    const isViewerHandoff = new URLSearchParams(window.location.search).get("login") === "1";
    if (isViewerHandoff || (window.location.pathname.includes("debrief-viewer") && readSession()?.access_token)) {
      window.setTimeout(() => {
        const appCard = document.querySelector("#appCard");
        const sessionEmail = document.querySelector("#sessionEmail")?.textContent.trim();
        const topSessionEmail = document.querySelector("#topSessionEmail")?.textContent.trim();
        const appVisible = appCard && !appCard.classList.contains("hidden");
        if (!window.__debriefAppBooted || (!appVisible && !sessionEmail && !topSessionEmail)) {
          openFallbackViewer();
        }
      }, 3500);
    }
    if (authMode() !== "login") return;
    window.setTimeout(() => {
      if (window.__debriefAppBooted) return;
      if (loginButton) {
        loginButton.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
          fallbackLogin();
        });
      }
      if (authForm) {
        authForm.addEventListener("submit", (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
          fallbackLogin();
        });
      }
      setStatus("Login backup is ready.", false);
    }, 1200);
  });
})();
