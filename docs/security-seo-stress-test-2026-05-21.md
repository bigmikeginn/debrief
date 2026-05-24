# Debrief Security, SEO, and Stress-Test Report - 2026-05-21

Target:
- Site: https://debrief-training.vercel.app/
- Repo: https://github.com/bigmikeginn/debrief
- Local checkout: C:\Software Development\Projects\Internal\BJJ Debrief

Scope:
- Non-destructive live checks only.
- Repo security review, dependency audit, live header/SEO checks, sensitive path probes, safe API probes, light availability test, Lighthouse run, and Supabase function review.

## Summary

The public site is in good shape. HTTPS redirects, HSTS, CSP, frame protection, referrer policy, permissions policy, nosniff, SEO files, route noindex behavior, and the chat API guardrails all verified live.

One backend defense-in-depth issue was fixed and deployed: `submit-debrief` now verifies that the JWT user matches the submitted `user_id` unless the trusted server secret is used. The deployed Supabase function is active at version 4 and still rejects no-auth/fake-token probes.

The main remaining issue is performance: Lighthouse performance scored 79, with large image payloads as the clear next optimization target.

## Findings

### Fixed

- `beta-v1/supabase/functions/submit-debrief/index.ts`
  - Before: trusted any long bearer-looking token inside the function body and relied on deployment-level JWT enforcement.
  - After: verifies the bearer token with Supabase Auth and rejects requests where the authenticated user does not match `body.user_id`; trusted server-secret calls still work.
  - Deployed: `submit-debrief` Supabase function version 4.

- `package.json` / `package-lock.json`
  - Added a lockfile so dependency auditing is repeatable.
  - Upgraded `esbuild` from `^0.21.5` to `^0.28.0`.
  - Result: `npm audit` and `npm audit --omit=dev` both return 0 vulnerabilities.

### Remaining

- Performance: Lighthouse scores were Performance 79, Accessibility 100, Best Practices 100, SEO 100.
- Large public image payloads:
  - `/boxing%20picture.png` about 2.1 MB
  - `/striking-vs-grappling.png` about 1.8 MB
  - `/Debrief%20Logo%20transparent.png` about 1.4 MB
  - `/debrief-mark-gold.png` about 250 KB
- `openssl` is not available on this Windows PATH, so certificate dates were not checked with the SOP command. HTTPS and HSTS were verified by live HTTP responses.

## Verification

- Repo:
  - `gh repo view bigmikeginn/debrief --json ...` confirmed public repo, default branch `main`, latest push 2026-05-21.
  - Local checkout is `main` and aligned with `origin/main`.
  - Tracked secret-pattern scan found no matches.
  - Local `.env.production.local` and `.vercel/` are ignored.

- Tests:
  - `npm test` passed: 7/7 tests.
  - `npm audit --omit=dev` passed: 0 vulnerabilities.
  - `npm audit` passed: 0 vulnerabilities.
  - `npx esbuild --version` returned `0.28.0`.
  - Esbuild minification smoke test passed for the viewer and touch-feedback bundles.

- Live site:
  - `http://debrief-training.vercel.app/` returns 308 to HTTPS.
  - `https://debrief-training.vercel.app/` returns 200.
  - HSTS, CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy, X-Content-Type-Options, and X-XSS-Protection verified live.
  - `/robots.txt`, `/sitemap.xml`, `/.well-known/security.txt`, and `/site.webmanifest` return 200.
  - `/login`, `/signup`, `/viewer`, `/analytics`, and `/setup` return `X-Robots-Tag: noindex, nofollow`.
  - Sensitive path probes returned 404/403 for `/.env`, `/.env.production.local`, `/.git/config`, `/phpinfo.php`, `/server-status`, `/admin`, `/wp-admin`, and a fake source map.
  - Unknown route returned 404.
  - 30 sequential homepage requests: 30/30 successful, average about 0.134s, max about 0.327s.

- Live API:
  - `/api/chat` allowed valid origin POST: 200.
  - `/api/chat` allowed valid origin OPTIONS: 200.
  - `/api/chat` rejected disallowed origin: 403.
  - `/api/chat` rejected too-long message: 400.
  - `/api/chat` rejected GET: 405.
  - Supabase `submit-debrief` no-auth probe: 401.
  - Supabase `submit-debrief` fake bearer probe: 401.
  - Supabase `parse-refiner` no-auth POST probe: 401.
  - Supabase `analytics` function returned 404, not deployed.

## Next Actions

1. Convert and resize the largest PNG assets to WebP/AVIF with responsive dimensions.
2. Run a signed-in end-to-end submit test using a real beta account to confirm the patched `submit-debrief` path still saves legitimate notes.
3. Consider adding a focused test for `submit-debrief` auth matching so the JWT/body-user check does not regress.
