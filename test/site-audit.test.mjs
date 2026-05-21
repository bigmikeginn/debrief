import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { test } from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (...parts) => readFileSync(join(root, ...parts), 'utf8');

test('public SEO files exist for crawlability and discovery', () => {
  assert.equal(existsSync(join(root, 'robots.txt')), true);
  assert.equal(existsSync(join(root, 'sitemap.xml')), true);
  assert.equal(existsSync(join(root, '404.html')), true);
  assert.equal(existsSync(join(root, 'setup.html')), true);
  assert.equal(existsSync(join(root, 'viewer-shell.js')), true);
  assert.equal(existsSync(join(root, 'login-fresh.js')), true);
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

test('Vercel config adds security headers and route-specific noindex caching', () => {
  const vercel = read('vercel.json');

  assert.match(vercel, /Content-Security-Policy/);
  assert.match(vercel, /Cross-Origin-Opener-Policy/);
  assert.match(vercel, /Permissions-Policy/);
  assert.match(vercel, /X-Robots-Tag/);
  assert.match(vercel, /noindex, nofollow/);
  assert.match(vercel, /source": "\/setup"/);
  assert.match(vercel, /source": "\/viewer"/);
});
