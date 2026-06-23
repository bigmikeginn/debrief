import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const authPages = ["login.html", "signup.html", "viewer.html"].map((name) => ({
  name,
  html: readFileSync(new URL(`../${name}`, import.meta.url), "utf8"),
}));

const viewerBundle = readFileSync(
  new URL("../debrief-viewer.20260430g.js", import.meta.url),
  "utf8",
);

test("auth pages hide the real UI until the app resolves auth state", () => {
  for (const { name, html } of authPages) {
    assert.match(html, /<html[^>]+data-auth-state="booting"/i, `${name} starts in booting auth state`);
    assert.match(html, /<div class="auth-boot-screen"/i, `${name} renders branded boot screen`);
    assert.match(html, /<div class="shell" inert aria-hidden="true">/i, `${name} prevents pre-auth shell exposure`);
    assert.match(html, /body\[data-auth-state="booting"\]\s+\.shell/i, `${name} includes critical boot CSS`);
    assert.match(html, /body\[data-auth-state="ready"\]\s+\.auth-boot-screen/i, `${name} hides boot screen only after ready`);
  }
});

test("viewer bundle explicitly resolves and releases auth boot state", () => {
  assert.match(viewerBundle, /function setAuthBootState\(/);
  assert.match(viewerBundle, /setAuthBootState\("resolving"\)/);
  assert.match(viewerBundle, /setAuthBootState\("ready"\)/);
  assert.match(viewerBundle, /removeAttribute\("inert"\)/);
  assert.match(viewerBundle, /setAttribute\("aria-hidden", "false"\)/);
});

test("new debrief modal tracks the keyboard-safe viewport and keeps submit visible", () => {
  const css = readFileSync(new URL("../debrief-viewer.20260430g.css", import.meta.url), "utf8");
  const viewerHtml = readFileSync(new URL("../viewer.html", import.meta.url), "utf8");

  assert.doesNotMatch(viewerHtml, /Keep it simple/i);
  assert.match(viewerBundle, /visualViewport\.addEventListener\("resize", syncNewDebriefViewportHeight/);
  assert.match(viewerBundle, /function shouldUseNewDebriefKeyboardGuard\(/);
  assert.match(viewerBundle, /--new-debrief-viewport-top/);
  assert.match(viewerBundle, /--new-debrief-keyboard-inset/);
  assert.match(viewerBundle, /function keepNewDebriefActionVisible\(/);
  assert.match(viewerBundle, /submitDebriefButton\.getBoundingClientRect\(\)/);
  assert.match(css, /#newDebriefModalOverlay\s*{[^}]*align-items:\s*flex-start[^}]*padding:\s*clamp\(1rem,\s*6vh,\s*4rem\)/s);
  assert.match(css, /#newDebriefModal\s*{[^}]*max-height:\s*min\(90vh,\s*calc\(100dvh - 2rem\)\)/s);
  assert.match(css, /@media \(max-width:\s*680px\)\s*{[\s\S]*#newDebriefModalOverlay\s*{[^}]*height:\s*var\(--new-debrief-viewport-height/s);
  assert.match(css, /@media \(max-width:\s*680px\)\s*{[\s\S]*#newDebriefModal\s+\.modal-actions\s*{[^}]*position:\s*sticky/s);
});
