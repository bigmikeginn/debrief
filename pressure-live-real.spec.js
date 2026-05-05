const { test, expect } = require("@playwright/test");
const { execFileSync } = require("node:child_process");
const { writeFileSync, unlinkSync } = require("node:fs");
const { join } = require("node:path");

const baseUrl = "https://debrief-training.vercel.app";
const stamp = Date.now();
const email = `pressure-${stamp}@example.com`;
const password = `Pressure-${stamp}!`;
let profileId = "";

function runSupabaseSql(sql) {
  const sqlFile = join("I:\\My Drive\\AI\\Projects\\Internal\\BJJ Debrief", `.pressure-${Date.now()}-${Math.random().toString(16).slice(2)}.sql`);
  writeFileSync(sqlFile, sql);
  const envText = execFileSync(
    "powershell",
    ["-NoProfile", "-Command", "Get-Content -Raw -LiteralPath 'I:\\My Drive\\AI\\Credentials\\bjj_debrief.env'"],
    { encoding: "utf8" },
  );
  const tokenLine = envText.split(/\r?\n/).find((line) => line.startsWith("SUPABASE_BJJ_DEBRIEF_MAIN_ACCESS_TOKEN="));
  const token = tokenLine.replace("SUPABASE_BJJ_DEBRIEF_MAIN_ACCESS_TOKEN=", "").trim();
  try {
    return execFileSync(
      "cmd",
      ["/c", "npx", "supabase", "db", "query", "--linked", "--file", sqlFile, "--output", "json"],
      {
        cwd: "I:\\My Drive\\AI\\Projects\\Internal\\BJJ Debrief",
        encoding: "utf8",
        env: { ...process.env, SUPABASE_ACCESS_TOKEN: token },
      },
    );
  } finally {
    try {
      unlinkSync(sqlFile);
    } catch (_error) {
      // Best-effort cleanup only.
    }
  }
}

function rowsFromOutput(output) {
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start < 0 || end < 0) return [];
  return JSON.parse(output.slice(start, end + 1)).rows || [];
}

async function findProfileId() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const output = runSupabaseSql(`select id from public.profiles where email = '${email}' limit 1;`);
    const rows = rowsFromOutput(output);
    if (rows[0]?.id) return rows[0].id;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Could not find profile for ${email}`);
}

function getSeedSummary() {
  if (!profileId) return [];
  const output = runSupabaseSql(`
    select
      p.id,
      p.email,
      count(distinct tl.id) as active_links,
      count(distinct d.id) as debriefs,
      max(d.note_title) as latest_title
    from public.profiles p
    left join public.telegram_links tl on tl.user_id = p.id and tl.is_active = true
    left join public.debriefs d on d.author_user_id = p.id
    where p.id = '${profileId}'
    group by p.id, p.email;
  `);
  return rowsFromOutput(output);
}

test.afterAll(async () => {
  if (!profileId) return;
  runSupabaseSql(`
    delete from public.telegram_links where user_id = '${profileId}';
    delete from public.debriefs where author_user_id = '${profileId}';
    delete from public.club_memberships where user_id = '${profileId}';
    delete from public.user_feed_preferences where user_id = '${profileId}';
    delete from public.profiles where id = '${profileId}';
    delete from auth.users where id = '${profileId}';
  `);
});

test("real signup to Telegram confirmation to viewer history", async ({ page }) => {
  await page.goto(`${baseUrl}/signup?pressure=${stamp}`);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("#signupConfirmPassword").fill(password);
  await page.locator("#emailLinkButton").click();

  await expect(page).toHaveURL(/telegram-connect/, { timeout: 30000 });

  profileId = await findProfileId();
  const telegramId = 900000000000 + (stamp % 1000000000);
  runSupabaseSql(`
    insert into public.telegram_links (user_id, telegram_user_id, telegram_chat_id, is_active)
    values ('${profileId}', ${telegramId}, ${telegramId}, true)
    on conflict (telegram_user_id) do update
    set user_id = excluded.user_id,
        telegram_chat_id = excluded.telegram_chat_id,
        linked_at = now(),
        is_active = true;

    insert into public.debriefs (
      club_id,
      author_user_id,
      raw_input,
      raw_notes,
      note_title,
      note_summary,
      summary_text,
      domain,
      topic_primary,
      topic_tags,
      action_items,
      parse_status,
      parse_stage,
      parse_confidence,
      visibility
    )
    select
      c.id,
      '${profileId}',
      '#debrief live pressure test',
      '#debrief live pressure test',
      'Live Pressure Test Debrief',
      'This confirms the real viewer history path.',
      'This confirms the real viewer history path.',
      'bjj',
      'pressure test',
      array['pressure'],
      array['confirm viewer'],
      'ready',
      2,
      0.99,
      'private'
    from public.clubs c
    order by c.created_at asc
    limit 1;
  `);

  console.log("Seed summary:", JSON.stringify(getSeedSummary()));

  await page.goto(`${baseUrl}/telegram-check?pressure=${stamp}`);
  await expect(page).toHaveURL(/telegram-confirmed/, { timeout: 12000 });
  await expect(page).toHaveURL(/debrief-viewer|viewer/, { timeout: 12000 });
  try {
    await expect(page.getByText("Live Pressure Test Debrief").first()).toBeVisible({ timeout: 15000 });
  } catch (error) {
    const diagnostics = await page.evaluate(() => ({
      url: window.location.href,
      authStatus: document.querySelector("#authStatus")?.textContent || "",
      listStatus: document.querySelector("#listStatus")?.textContent || "",
      count: document.querySelector("#listCountBadge")?.textContent || "",
      entryList: document.querySelector("#entryList")?.textContent || "",
      entryDetail: document.querySelector("#entryDetail")?.textContent || "",
      telegramHidden: document.querySelector("#telegramLinkCard")?.classList.contains("hidden") ?? null,
    }));
    const browserAuth = await page.evaluate(async () => {
      const authKey = Object.keys(localStorage).find((key) => key.startsWith("sb-") && key.includes("auth-token"));
      const raw = authKey ? localStorage.getItem(authKey) : "";
      let parsed = null;
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch (_error) {
        parsed = null;
      }
      const token = parsed?.access_token;
      const userId = parsed?.user?.id;
      if (!token) return { authKey, userId, directStatus: "no-token" };
      const url = new URL("https://wtmzcwsfetqhfrdlygyr.supabase.co/rest/v1/debriefs");
      url.searchParams.set("select", "id,author_user_id,note_title");
      url.searchParams.set("author_user_id", `eq.${userId}`);
      const response = await fetch(url.toString(), {
        headers: {
          apikey: "sb_publishable_bLuHb3b4yECOGg5IG9evag_rTZbzioA",
          authorization: `Bearer ${token}`,
        },
      });
      return {
        authKey,
        userId,
        directStatus: response.status,
        directBody: await response.text(),
      };
    });
    console.log("Viewer diagnostics:", JSON.stringify(diagnostics));
    console.log("Browser auth/direct query:", JSON.stringify(browserAuth));
    console.log("Seed summary on failure:", JSON.stringify(getSeedSummary()));
    throw error;
  }
  await expect(page.locator("#telegramLinkCard")).toBeHidden();
});
