const { test, expect } = require("@playwright/test");

const baseUrl = process.env.PRESSURE_BASE_URL || "http://127.0.0.1:4180";
const cdnUrl = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const baseEntry = {
  id: "11111111-1111-4111-8111-111111111111",
  club_id: "22222222-2222-4222-8222-222222222222",
  author_user_id: "user-1",
  created_at: "2026-04-29T12:00:00.000Z",
  debrief_date: "2026-04-29",
  note_title: "Pressure Test Round One",
  note_summary: "A clean loaded debrief.",
  domain: "bjj",
  topic_primary: "guard",
  topic_secondary: "retention",
  topic_tags: ["test"],
  action_items: ["keep elbows in"],
  parse_status: "parsed",
  parse_stage: 3,
  parse_confidence: 0.95,
  needs_review: false,
  technique: "Guard retention",
  technique_type: "guard",
  key_points: ["frames", "hips"],
  reflections: "Stayed calm.",
  raw_notes: "#debrief pressure test",
  summary_text: "A clean loaded debrief.",
  visibility: "private",
};

const baseClub = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Pressure Test Club",
  slug: "pressure-test-club",
  role: "admin",
  status: "active",
  is_active: true,
  invite_code: "TEST-CLUB",
};

const scenarios = {
  linkedHistory: {
    session: true,
    link: "linked",
    history: [
      baseEntry,
      {
        ...baseEntry,
        id: "33333333-3333-4333-8333-333333333333",
        created_at: "2026-04-28T12:00:00.000Z",
        note_title: "Pressure Test Round Two",
      },
    ],
    directDebriefs: [
      baseEntry,
      {
        ...baseEntry,
        id: "33333333-3333-4333-8333-333333333333",
        created_at: "2026-04-28T12:00:00.000Z",
        note_title: "Pressure Test Round Two",
      },
    ],
  },
  linkedEmpty: { session: true, link: "linked", history: [] },
  unknownStatusHistory: {
    session: true,
    link: "unknown",
    history: [{ ...baseEntry, id: "44444444-4444-4444-8444-444444444444", note_title: "Unknown Status Still Loads" }],
  },
  unlinked: { session: true, link: "unlinked", history: [] },
  noSession: { session: false, link: "unknown", history: [] },
};

function mockModule() {
  return `
    const scenarioParam = new URL(location.href).searchParams.get("scenario");
    if (scenarioParam) sessionStorage.setItem("pressureScenario", scenarioParam);
    const scenario = JSON.parse(decodeURIComponent(scenarioParam || sessionStorage.getItem("pressureScenario") || "%7B%7D"));
    const user = { id: "user-1", email: "bigmikeginn@gmail.com" };
    const baseClub = ${JSON.stringify(baseClub)};
    function searchMatches(entry, search) {
      const needle = String(search || "").trim().toLowerCase();
      if (!needle) return true;
      return [
        entry.note_title,
        entry.note_summary,
        entry.topic_primary,
        entry.topic_secondary,
        entry.raw_notes,
      ].some((value) => String(value || "").toLowerCase().includes(needle));
    }
    function resultForTable(table) {
      if (table === "user_feed_preferences") return { data: { show_shared_notes: false }, error: null };
      if (table === "debrief_favourites") return { data: [], error: null };
      if (table === "debriefs") {
        const search = document.querySelector("#topicSearch")?.value || "";
        const data = (scenario.directDebriefs || []).filter((entry) => searchMatches(entry, search));
        return { data, error: null };
      }
      if (table === "debrief_shares") return { data: [], error: null };
      return { data: null, error: null };
    }
    function queryBuilder(table) {
      const builder = {
        select: () => builder, eq: () => builder, neq: () => builder, gte: () => builder, lte: () => builder,
        ilike: () => builder, or: () => builder, in: () => builder, contains: () => builder,
        order: () => builder, range: () => builder, limit: () => builder, is: () => builder,
        maybeSingle: () => Promise.resolve(resultForTable(table)),
        then: (resolve, reject) => Promise.resolve(resultForTable(table)).then(resolve, reject),
      };
      return builder;
    }
    export function createClient() {
      return {
        auth: {
          onAuthStateChange(callback) {
            setTimeout(() => callback("INITIAL_SESSION", scenario.session ? { user } : null), 0);
            return { data: { subscription: { unsubscribe() {} } } };
          },
          getSession() {
            return Promise.resolve({ data: { session: scenario.session ? { user, access_token: "test-token" } : null } });
          },
          signInWithPassword() { return Promise.resolve({ error: null }); },
          signOut() { return Promise.resolve({ error: null }); },
        },
        rpc(name) {
          if (name === "get_my_telegram_link_status") {
            if (scenario.link === "unknown") return Promise.reject(new Error("temporary status failure"));
            return Promise.resolve({ data: { email: user.email, is_linked: scenario.link === "linked", linked_at: scenario.link === "linked" ? "2026-04-29T12:00:00.000Z" : null }, error: null });
          }
          if (name === "get_my_club_context") {
            return Promise.resolve({ data: { active_club_id: baseClub.id, clubs: scenario.clubs || [baseClub] }, error: null });
          }
          if (name === "set_my_active_club" || name === "join_club_with_invite" || name === "create_club") {
            return Promise.resolve({ data: { active_club_id: baseClub.id, clubs: scenario.clubs || [baseClub] }, error: null });
          }
          if (name === "get_my_debrief_history") return Promise.resolve({ data: scenario.history || [], error: null });
          return Promise.resolve({ data: null, error: null });
        },
        from: queryBuilder,
      };
    }
  `;
}

test.beforeEach(async ({ page }) => {
  await page.route(cdnUrl, (route) => route.fulfill({
    status: 200,
    contentType: "application/javascript",
    body: mockModule(),
  }));
});

async function openScenario(page, path, scenarioName) {
  const scenario = encodeURIComponent(JSON.stringify(scenarios[scenarioName]));
  await page.goto(`${baseUrl}${path}${path.includes("?") ? "&" : "?"}scenario=${scenario}`, { waitUntil: "domcontentloaded" });
}

test("linked viewer loads notes and hides Telegram setup", async ({ page }) => {
  await openScenario(page, "/debrief-viewer.html", "linkedHistory");
  await expect(page.getByText("2 loaded.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pressure Test Round One" })).toBeVisible();
  await expect(page.locator("#telegramLinkCard")).toBeHidden();
});

test("filter search closes controls after results load", async ({ page }) => {
  await openScenario(page, "/debrief-viewer.html", "linkedHistory");
  await expect(page.getByText("2 loaded.")).toBeVisible();

  await page.locator("#menuButton").click();
  await expect(page.locator("#controlDrawer")).toBeVisible();
  await page.locator("#topicSearch").fill("round two");
  await page.locator("#filterForm").getByRole("button", { name: "Search" }).click();

  await expect(page.getByText("1 loaded.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pressure Test Round Two" })).toBeVisible();
  await expect(page.locator("#controlDrawer")).toBeHidden();
});

test("club controls show active club and invite code", async ({ page }) => {
  await openScenario(page, "/debrief-viewer.html", "linkedHistory");
  await expect(page.getByText("Active club: Pressure Test Club")).toBeVisible();

  await page.locator("#menuButton").click();
  await expect(page.locator("#activeClubSelect")).toHaveValue(baseClub.id);
  await expect(page.locator("#clubList")).toContainText("Pressure Test Club");
  await expect(page.locator("#clubList")).toContainText("TEST-CLUB");
});

test("unknown Telegram status still loads viewer instead of bouncing", async ({ page }) => {
  await openScenario(page, "/debrief-viewer.html", "unknownStatusHistory");
  await expect(page.getByText("1 loaded.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Unknown Status Still Loads" })).toBeVisible();
  await expect(page).not.toHaveURL(/telegram-connect/);
});

test("linked empty history shows a clean empty state", async ({ page }) => {
  await openScenario(page, "/debrief-viewer.html", "linkedEmpty");
  await expect(page.getByText("No debriefs yet.")).toBeVisible();
  await expect(page.locator("#telegramLinkCard")).toBeHidden();
});

test("unlinked viewer routes to Telegram connect", async ({ page }) => {
  await openScenario(page, "/debrief-viewer.html", "unlinked");
  await expect(page).toHaveURL(/telegram-connect/);
});

test("login routes linked users forward and unlinked users to connect", async ({ page }) => {
  await openScenario(page, "/login.html", "linkedHistory");
  await expect(page).toHaveURL(/debrief-viewer|viewer/);
  await openScenario(page, "/login.html", "unlinked");
  await expect(page).toHaveURL(/telegram-connect/);
});

test("telegram check has a visible minimum wait before confirmation", async ({ page }) => {
  const start = Date.now();
  await openScenario(page, "/telegram-check.html", "linkedHistory");
  await expect(page).toHaveURL(/telegram-confirmed/, { timeout: 8000 });
  expect(Date.now() - start).toBeGreaterThanOrEqual(4800);
});

test("confirmation only routes backward on explicit unlinked status", async ({ page }) => {
  await openScenario(page, "/telegram-confirmed.html", "unknownStatusHistory");
  await expect(page).toHaveURL(/debrief-viewer|viewer/, { timeout: 7000 });
  await openScenario(page, "/telegram-confirmed.html", "unlinked");
  await expect(page).toHaveURL(/telegram-connect/);
});

test("telegram connect requires a login session", async ({ page }) => {
  await openScenario(page, "/telegram-connect.html", "noSession");
  await expect(page).toHaveURL(/login/);
});
