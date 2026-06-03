import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const parseRefiner = readFileSync(
  new URL("../beta-v1/supabase/functions/parse-refiner/index.ts", import.meta.url),
  "utf8",
);
const submitDebrief = readFileSync(
  new URL("../beta-v1/supabase/functions/submit-debrief/index.ts", import.meta.url),
  "utf8",
);
const viewerBundle = readFileSync(
  new URL("../debrief-viewer.20260430g.js", import.meta.url),
  "utf8",
);

test("refiner prompt preserves technique details before coach interpretation", () => {
  assert.match(parseRefiner, /preserve concrete technique details/i);
  assert.match(parseRefiner, /faithful technique summary/i);
  assert.match(parseRefiner, /coach takeaway.*secondary/i);
});

test("refiner prompt blocks unsupported generic slogans", () => {
  assert.doesNotMatch(parseRefiner, /Do not echo the user's wording/i);
  assert.doesNotMatch(parseRefiner, /infer the most useful lesson/i);
  assert.doesNotMatch(parseRefiner, /not a rewrite of the note/i);
});

test("local first-save fallback does not write generic placeholder takeaways", () => {
  assert.doesNotMatch(submitDebrief, /Choose one main lesson/i);
  assert.doesNotMatch(submitDebrief, /Pick the next training focus/i);
  assert.doesNotMatch(submitDebrief, /Training takeaway:/i);
});

test("viewer fallback does not reintroduce generic parser slogans", () => {
  assert.doesNotMatch(viewerBundle, /Build connection first/i);
  assert.doesNotMatch(viewerBundle, /Load weight before moving/i);
  assert.doesNotMatch(viewerBundle, /Move when resistance lightens/i);
  assert.doesNotMatch(viewerBundle, /Choose one main lesson/i);
  assert.doesNotMatch(viewerBundle, /Training takeaway:/i);
});

test("viewer polls the deployed parse-status function, not a missing local route", () => {
  assert.doesNotMatch(viewerBundle, /\/functions\/v1\/parse-job\//i);
  assert.match(viewerBundle, /\/functions\/v1\/get-parse-status\?debrief_id=/i);
});
