import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const viewerHtml = readFileSync(new URL("../viewer.html", import.meta.url), "utf8");
const viewerCss = readFileSync(new URL("../debrief-viewer.20260430g.css", import.meta.url), "utf8");
const viewerBundle = readFileSync(new URL("../debrief-viewer.20260430g.js", import.meta.url), "utf8");

test("new debrief modal removes helper copy to preserve vertical space", () => {
  assert.doesNotMatch(viewerHtml, /Keep it simple/i);
});

test("new debrief modal is not nested inside the filtered archive card", () => {
  assert.match(viewerHtml, /<section[^>]+id="appCard"/);
  assert.match(
    viewerHtml,
    /<\/section>\s+<!-- New Debrief Modal -->\s+<div id="newDebriefModalOverlay"/,
  );
});

test("new debrief modal stays top aligned on desktop", () => {
  assert.match(
    viewerCss,
    /#newDebriefModalOverlay\s*{[^}]*align-items:\s*flex-start[^}]*justify-content:\s*center[^}]*padding:\s*clamp\(1rem,\s*6vh,\s*4rem\)/s,
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
  assert.match(
    viewerCss,
    /@media \(max-width:\s*680px\)\s*{[\s\S]*#newDebriefModal\s*{[^}]*height:\s*calc\(var\(--new-debrief-viewport-height,\s*100dvh\) - 1\.2rem\)/s,
  );
  assert.match(
    viewerCss,
    /#newDebriefModal\s+\.modal-status:empty\s*{[^}]*display:\s*none/s,
  );
  assert.match(
    viewerCss,
    /#newDebriefModal\s+\.modal-actions\s*{[^}]*margin-top:\s*auto/s,
  );
  assert.match(
    viewerCss,
    /@media \(max-width:\s*680px\)\s*{[\s\S]*#newDebriefModalTitle\s*{[^}]*font-size:\s*clamp\(1\.05rem,\s*4\.8vw,\s*1\.25rem\)/s,
  );
});
