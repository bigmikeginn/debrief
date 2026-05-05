import { chromium } from "playwright";

const baseUrl = process.env.PRESSURE_BASE_URL || "http://127.0.0.1:4180";
const cdnUrl = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const scenarios = {
  linkedHistory: {
    session: true,
    link: "linked",
    history: [
      {
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
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        club_id: "22222222-2222-4222-8222-222222222222",
        author_user_id: "user-1",
        created_at: "2026-04-28T12:00:00.000Z",
        debrief_date: "2026-04-28",
        note_title: "Pressure Test Round Two",
        note_summary: "Second note.",
        domain: "bjj",
        topic_primary: "passing",
        topic_secondary: "knee cut",
        topic_tags: ["test"],
        action_items: [],
        parse_status: "parsed",
        parse_stage: 3,
        parse_confidence: 0.91,
        needs_review: false,
        technique: "Knee cut",
        technique_type: "passing",
        key_points: [],
        reflections: "",
        raw_notes: "#debrief pressure test 2",
        summary_text: "Second note.",
        visibility: "private",
      },
    ],
  },
  linkedEmpty: {
    session: true,
    link: "linked",
    history: [],
  },
  unknownStatusHistory: {
    session: true,
    link: "unknown",
    history: [
      {
        id: "44444444-4444-4444-8444-444444444444",
        club_id: "22222222-2222-4222-8222-222222222222",
        author_user_id: "user-1",
        created_at: "2026-04-29T13:00:00.000Z",
        debrief_date: "2026-04-29",
        note_title: "Unknown Status Still Loads",
        note_summary: "Viewer must not bounce backward.",
        domain: "bjj",
        topic_primary: "test",
        topic_secondary: "",
        topic_tags: [],
        action_items: [],
        parse_status: "parsed",
        parse_stage: 3,
        parse_confidence: 0.9,
        needs_review: false,
        technique: "Routing",
        technique_type: "other",
        key_points: [],
        reflections: "",
        raw_notes: "#debrief unknown status",
        summary_text: "Viewer must not bounce backward.",
        visibility: "private",
      },
    ],
  },
  unlinked: {
    session: true,
    link: "unlinked",
    history: [],
  },
  noSession: {
    session: false,
    link: "unknown",
    history: [],
  },
};

function mockModule() {
  return `
    const scenario = JSON.parse(decodeURIComponent(new URL(location.href).searchParams.get("scenario") || "%7B%7D"));
    const user = { id: "user-1", email: "bigmikeginn@gmail.com" };

    function resultForTable(table) {
      if (table === "user_feed_preferences") return { data: { show_shared_notes: false }, error: null };
      if (table === "debrief_favourites") return { data: [], error: null };
      if (table === "debriefs") return { data: scenario.directDebriefs || [], error: null };
      if (table === "debrief_shares") return { data: [], error: null };
      if (table === "club_memberships") return { data: [], error: null };
      return { data: null, error: null };
    }

    function queryBuilder(table) {
      const builder = {
        select: () => builder,
        eq: () => builder,
        neq: () => builder,
        gte: () => builder,
        lte: () => builder,
        ilike: () => builder,
        or: () => builder,
        in: () => builder,
        contains: () => builder,
        order: () => builder,
        range: () => builder,
        limit: () => builder,
        is: () => builder,
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
          signInWithPassword() {
            return Promise.resolve({ error: null });
          },
          signOut() {
            return Promise.resolve({ error: null });
          },
        },
        rpc(name) {
          if (name === "get_my_telegram_link_status") {
            if (scenario.link === "unknown") return Promise.reject(new Error("temporary status failure"));
            return Promise.resolve({
              data: {
                email: user.email,
                is_linked: scenario.link === "linked",
                linked_at: scenario.link === "linked" ? "2026-04-29T12:00:00.000Z" : null,
              },
              error: null,
            });
          }
          if (name === "get_my_debrief_history") {
            return Promise.resolve({ data: scenario.history || [], error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
        from: queryBuilder,
      };
    }
  `;
}

async function openScenario(page, path, scenarioName) {
  const scenario = encodeURIComponent(JSON.stringify(scenarios[scenarioName]));
  await page.goto(`${baseUrl}${path}${path.includes("?") ? "&" : "?"}scenario=${scenario}`, {
    waitUntil: "domcontentloaded",
  });
}

async function expectText(page, text, label) {
  const locator = page.getByText(text, { exact: false }).first();
  await locator.waitFor({ state: "visible", timeout: 7000 });
  console.log(`PASS ${label}`);
}

async function expectUrl(page, pattern, label) {
  await page.waitForURL(pattern, { timeout: 7000 });
  console.log(`PASS ${label}`);
}

async function expectHidden(page, selector, label) {
  await page.waitForFunction((sel) => {
    const el = document.querySelector(sel);
    return !el || el.classList.contains("hidden") || getComputedStyle(el).display === "none";
  }, selector, { timeout: 7000 });
  console.log(`PASS ${label}`);
}

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.route(cdnUrl, (route) => route.fulfill({
    status: 200,
    contentType: "application/javascript",
    body: mockModule(),
  }));
  const page = await context.newPage();

  await openScenario(page, "/debrief-viewer.html", "linkedHistory");
  await expectText(page, "2 loaded.", "linked viewer loads history count");
  await expectText(page, "Pressure Test Round One", "linked viewer renders first debrief");
  await expectHidden(page, "#telegramLinkCard", "linked viewer hides Telegram setup card");

  await openScenario(page, "/debrief-viewer.html", "unknownStatusHistory");
  await expectText(page, "1 loaded.", "unknown Telegram status still loads viewer");
  await expectText(page, "Unknown Status Still Loads", "unknown status does not bounce backward");

  await openScenario(page, "/debrief-viewer.html", "linkedEmpty");
  await expectText(page, "No debriefs yet.", "linked empty history shows clean empty state");
  await expectHidden(page, "#telegramLinkCard", "empty linked viewer still hides Telegram setup");

  await openScenario(page, "/debrief-viewer.html", "unlinked");
  await expectUrl(page, /telegram-connect/, "unlinked viewer routes to Telegram connect");

  await openScenario(page, "/login.html", "linkedHistory");
  await expectUrl(page, /debrief-viewer|viewer/, "linked login routes forward to viewer");

  await openScenario(page, "/login.html", "unlinked");
  await expectUrl(page, /telegram-connect/, "unlinked login routes to Telegram connect");

  await openScenario(page, "/telegram-check.html", "linkedHistory");
  const start = Date.now();
  await expectUrl(page, /telegram-confirmed/, "telegram check reaches confirmation");
  const elapsed = Date.now() - start;
  if (elapsed < 4800) throw new Error(`Telegram check redirected too fast: ${elapsed}ms`);
  console.log(`PASS telegram check waits at least about 5s (${elapsed}ms)`);

  await openScenario(page, "/telegram-confirmed.html", "unknownStatusHistory");
  await expectUrl(page, /debrief-viewer|viewer/, "confirmation does not bounce backward on unknown status");

  await openScenario(page, "/telegram-confirmed.html", "unlinked");
  await expectUrl(page, /telegram-connect/, "confirmation routes backward only on explicit unlinked status");

  await openScenario(page, "/telegram-connect.html", "noSession");
  await expectUrl(page, /login/, "telegram connect requires login");

  await browser.close();
}

run().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
