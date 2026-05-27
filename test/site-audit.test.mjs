import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { test } from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (...parts) => readFileSync(join(root, ...parts), 'utf8');
const chatHandlerModule = await import(new URL('../api/chat.js', import.meta.url));
const chatHandler = chatHandlerModule.default ?? chatHandlerModule;

function makeMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    ended: false,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
}

test('public SEO files exist for crawlability and discovery', () => {
  assert.equal(existsSync(join(root, 'robots.txt')), true);
  assert.equal(existsSync(join(root, 'sitemap.xml')), true);
  assert.equal(existsSync(join(root, '404.html')), true);
  assert.equal(existsSync(join(root, 'setup.html')), true);
  assert.equal(existsSync(join(root, 'viewer-shell.js')), true);
  assert.equal(existsSync(join(root, 'login-fresh.js')), true);
  assert.equal(existsSync(join(root, 'security.txt')), true);
  assert.equal(existsSync(join(root, '.well-known', 'security.txt')), true);
  assert.equal(existsSync(join(root, 'site.webmanifest')), true);
});

test('robots policy and sitemap point at the public Debrief site', () => {
  const robots = read('robots.txt');
  const sitemap = read('sitemap.xml');

  assert.match(robots, /Disallow: \/viewer/);
  assert.match(robots, /Disallow: \/login/);
  assert.match(robots, /Disallow: \/signup/);
  assert.match(robots, /Sitemap: https:\/\/debrief-training\.vercel\.app\/sitemap\.xml/);
  assert.match(sitemap, /https:\/\/debrief-training\.vercel\.app\//);
});

test('public landing page has canonical SEO metadata', () => {
  const index = read('index.html');

  assert.match(index, /meta name="description"/);
  assert.match(index, /meta name="robots" content="index,follow"/);
  assert.match(index, /link rel="canonical" href="https:\/\/debrief-training\.vercel\.app\/"/);
  assert.match(index, /meta property="og:site_name" content="Debrief"/);
  assert.match(index, /meta property="og:url" content="https:\/\/debrief-training\.vercel\.app\/"/);
  assert.match(index, /meta name="twitter:card" content="summary_large_image"/);
  assert.match(index, /link rel="manifest" href="\/site.webmanifest"/);
});

test('auth and app surfaces are marked noindex', () => {
  const login = read('login.html');
  const signup = read('signup.html');
  const viewer = read('viewer.html');
  const analytics = read('analytics.html');
  const setup = read('setup.html');
  const loginFresh = read('login-fresh.html');

  for (const page of [login, signup, viewer, analytics, setup, loginFresh]) {
    assert.match(page, /meta name="robots" content="noindex,nofollow"/);
  }

  assert.doesNotMatch(login, /onsubmit=/);
  assert.doesNotMatch(signup, /onsubmit=/);
  assert.doesNotMatch(viewer, /onsubmit=/);
  assert.doesNotMatch(viewer, /<script>\s*const OWNER_USER_ID/);
  assert.doesNotMatch(analytics, /onclick=/);
  assert.match(viewer, /viewer-shell\.js/);
  assert.match(loginFresh, /login-fresh\.js/);
});

test('auth surfaces include critical dark first-paint styles before dynamic assets load', () => {
  const login = read('login.html');
  const signup = read('signup.html');
  const viewer = read('viewer.html');

  for (const page of [login, signup, viewer]) {
    assert.match(page, /<style data-critical-auth-shell>/);
    assert.match(page, /background:\s*#0d0e12/);
    assert.match(page, /\.brand-mark\s*{/);
    assert.match(page, /width:\s*44px/);
    assert.match(page, /\.hidden\s*{\s*display:\s*none\s*!important;/);
    assert.ok(
      page.indexOf('<style data-critical-auth-shell>') < page.indexOf('load-assets.js'),
      'critical auth styles must be available before load-assets.js runs',
    );
  }
});

test('Vercel config adds security headers and route-specific noindex caching', () => {
  const vercel = read('vercel.json');

  assert.match(vercel, /Content-Security-Policy/);
  assert.match(vercel, /Cross-Origin-Opener-Policy/);
  assert.match(vercel, /Permissions-Policy/);
  assert.match(vercel, /X-XSS-Protection/);
  assert.match(vercel, /X-Robots-Tag/);
  assert.match(vercel, /noindex, nofollow/);
  assert.match(vercel, /source": "\/setup"/);
  assert.match(vercel, /source": "\/viewer"/);
});

test('Debrief chatbot is wired to the signed-in viewer and hardened for same-origin use', () => {
  const chatApi = read('api/chat.js');
  const widget = read('debrief-chat-widget.js');
  const viewer = read('viewer.html');

  assert.match(chatApi, /const ALLOWED_ORIGINS = new Set\(/);
  assert.match(chatApi, /https:\/\/debrief-training\.vercel\.app/);
  assert.match(chatApi, /http:\/\/localhost:4173/);
  assert.match(chatApi, /The chatbot lives in the signed-in viewer/);
  assert.match(chatApi, /Where is the chatbot\?/);
  assert.doesNotMatch(chatApi, /Access-Control-Allow-Origin", "\*"/);

  assert.match(widget, /MutationObserver/);
  assert.match(widget, /appCard/);
  assert.match(widget, /debrief-chat-root/);
  assert.match(widget, /\?\<\/button\>/);

  assert.match(viewer, /window\.__debriefViewerReady = true;/);
  assert.match(viewer, /debrief-chat-widget\.js/);
});

test('Debrief chatbot falls back to the FAQ answer bank when Anthropic is unavailable', async () => {
  const previousKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;

  const req = {
    method: 'POST',
    headers: { origin: 'https://debrief-training.vercel.app' },
    body: { messages: [{ role: 'user', content: 'How do I connect Telegram?' }] },
    socket: { remoteAddress: '127.0.0.1' },
  };
  const res = makeMockRes();

  await chatHandler(req, res);

  if (previousKey === undefined) {
    delete process.env.ANTHROPIC_API_KEY;
  } else {
    process.env.ANTHROPIC_API_KEY = previousKey;
  }

  assert.equal(res.statusCode, 200);
  assert.match(res.body.reply, /Telegram/i);
});
