import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const viewerHtml = readFileSync(new URL("../viewer.html", import.meta.url), "utf8");
const viewerCss = readFileSync(new URL("../debrief-viewer.20260430g.css", import.meta.url), "utf8");
const viewerBundle = readFileSync(new URL("../debrief-viewer.20260430g.js", import.meta.url), "utf8");

test("new debrief modal removes helper copy to preserve vertical space", () => {
  assert.doesNotMatch(viewerHtml, /Keep it simple/i);
});

test("new debrief modal stays top aligned on desktop", () => {
  assert.match(
    viewerCss,
    /#newDebriefModalOverlay\s*{[^}]*align-items:\s*flex-start[^}]*padding:\s*clamp\(1rem,\s*6vh,\s*4rem\)/s,
  );
  assert.match(
    viewerCss,
    /#newDebriefModal\s*{[^}]*max-height:\s*min\(90vh,\s*calc\(100dvh - 2rem\)\)/s,
  );
});

test("new debrief modal tracks mobile keyboard viewport and keeps save visible", () => {
  assert.match(viewerBundle, /visualViewport\.addEventListener\("resize", syncNewDebriefViewportHeight/);
  assert.match(viewerBundle, /newDebriefText\.focus\(\{\s*preventScroll:\s*true\s*\}\)/);
  assert.match(viewerBundle, /function shouldUseNewDebriefKeyboardGuard\(/);
  assert.match(viewerBundle, /--new-debrief-viewport-top/);
  assert.match(viewerBundle, /--new-debrief-keyboard-inset/);
  assert.match(viewerBundle, /function keepNewDebriefActionVisible\(/);
  assert.match(viewerBundle, /submitDebriefButton\.getBoundingClientRect\(\)/);
  assert.match(
    viewerCss,
    /@media \(max-width:\s*680px\)\s*{[\s\S]*#newDebriefModalOverlay\s*{[^}]*height:\s*var\(--new-debrief-viewport-height/s,
  );
  assert.match(
    viewerCss,
    /@media \(max-width:\s*680px\)\s*{[\s\S]*#newDebriefModal\s+\.modal-actions\s*{[^}]*position:\s*sticky/s,
  );
});
