# Debrief Chatbot Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a helpful Debrief support chatbot to the signed-in viewer and harden the chat surface so it is safe, useful, and consistent with the rest of the app.

**Architecture:** Keep the chatbot inside the existing Debrief site instead of introducing a separate service. Reuse the current `debrief-chat-widget.js` shell for the UI, tighten the `/api/chat` serverless endpoint for same-origin use, and keep the assistant focused on account setup, Telegram intake, pricing, privacy, and first-note support.

**Tech Stack:** Static Vercel site, Node-style serverless function in `api/chat.js`, vanilla JS widget, existing viewer HTML/CSS/JS, simple smoke tests.

---

### Task 1: Harden the chat API prompt and access policy

**Files:**
- Modify: `api/chat.js`
- Test: `test/site-audit.test.mjs`
- Optional verify: `curl` against `/api/chat` in local or deployed preview

- [ ] **Step 1: Write the failing expectation**

```js
// test idea:
// - api/chat should reject requests from unexpected origins when Origin is present
// - api/chat should keep only the last 20 messages
// - api/chat should answer with Debrief-specific support guidance
```

- [ ] **Step 2: Run the current test suite**

Run: `npm test`
Expected: pass for the existing SEO/security checks, but no chatbot-specific coverage yet.

- [ ] **Step 3: Implement the minimal API changes**

```js
const ALLOWED_ORIGINS = new Set([
  "https://debrief-training.vercel.app",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

function isAllowedOrigin(origin) {
  return !origin || ALLOWED_ORIGINS.has(origin);
}

// Use the same-origin CORS pattern for the widget and fail closed on bad origins.
// Keep the prompt Debrief-specific, brief, and non-technical.
```

- [ ] **Step 4: Run the API smoke checks**

Run:
`node test/site-audit.test.mjs`
`curl -i -X POST http://127.0.0.1:3000/api/chat -H "Content-Type: application/json" -H "Origin: https://debrief-training.vercel.app" -d "{\"messages\":[{\"role\":\"user\",\"content\":\"How do I connect Telegram?\"}] }"`

Expected:
- `200` for valid same-origin requests with a short Debrief answer
- `403` or `400` for disallowed origins or malformed payloads

- [ ] **Step 5: Commit**

```bash
git add api/chat.js test/site-audit.test.mjs
git commit -m "Harden Debrief chat api"
```

### Task 2: Add the chatbot to the signed-in viewer

**Files:**
- Modify: `viewer.html`
- Modify: `debrief-chat-widget.js`
- Optional modify: `debrief-viewer.20260430g.js` if a boot flag is needed
- Test: browser smoke on `/viewer`

- [ ] **Step 1: Write the failing browser expectation**

```text
After login, the viewer should show a single floating Debrief help button.
Before login, the widget should stay hidden or inert.
```

- [ ] **Step 2: Update the viewer HTML**

```html
<script>
  window.__debriefViewerReady = true;
</script>
<script src="viewer-shell.js"></script>
<script src="debrief-chat-widget.js"></script>
<script src="load-assets.js"></script>
```

- [ ] **Step 3: Gate the widget to signed-in users**

```js
function isViewerReady() {
  var appCard = document.getElementById("appCard");
  return Boolean(appCard && !appCard.classList.contains("hidden"));
}

function init() {
  if (!window.__debriefViewerReady || !isViewerReady()) return;
  if (document.getElementById("debrief-chat-root")) return;
  // existing widget setup
}
```

- [ ] **Step 4: Improve widget usability**

```js
var QUICK_REPLIES = [
  { label: "How it works", text: "How does Debrief work?" },
  { label: "Telegram setup", text: "Walk me through connecting Telegram." },
  { label: "First note", text: "How do I send my first debrief note?" },
  { label: "Pricing", text: "How much does Debrief cost?" },
];
```

- [ ] **Step 5: Run a live browser smoke test**

Run: open `/viewer`, log in, and confirm the widget button opens, sends a message, and shows a fallback if the API is unavailable.

- [ ] **Step 6: Commit**

```bash
git add viewer.html debrief-chat-widget.js
git commit -m "Add Debrief viewer chatbot"
```

### Task 3: Verify deployment and update project notes

**Files:**
- Modify: `HANDOFF.md`
- Modify: `PROJECT_NOTES.md`
- Modify: `deploy-manifest.json` only if asset references change
- Test: live `/viewer` and `/api/chat`

- [ ] **Step 1: Verify the live widget and API**

Run:
`curl -I https://debrief-training.vercel.app/viewer`
`curl -i -X POST https://debrief-training.vercel.app/api/chat -H "Content-Type: application/json" -H "Origin: https://debrief-training.vercel.app" -d "{\"messages\":[{\"role\":\"user\",\"content\":\"How do I get started?\"}] }"`

- [ ] **Step 2: Update the handoff notes**

```md
- Viewer chatbot is now available for signed-in users only.
- `/api/chat` is treated as a first-class support surface and is same-origin hardened.
```

- [ ] **Step 3: Update project notes**

```md
- Record the chatbot placement decision.
- Record the hardening changes and live verification results.
```

- [ ] **Step 4: Validate the repo**

Run: `npm test`

- [ ] **Step 5: Commit**

```bash
git add HANDOFF.md PROJECT_NOTES.md deploy-manifest.json
git commit -m "Document Debrief chatbot rollout"
```
