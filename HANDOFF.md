# Debrief App Handoff

## Current State

- The project is a static web app deployed/served from the project root.
- Local preview server has been running at `http://127.0.0.1:4173/`.
- Public landing page is `index.html`.
- App/login/viewer page is `debrief-viewer.html`, also routed as `/viewer` in `vercel.json`.
- Setup helper is `setup-wizard.html`, also routed as `/setup`.

## Product Direction

- Positioning: martial arts broadly, not BJJ-only.
- Public wedge: training memory for martial artists.
- Copy should include striking, wrestling, and grappling examples.
- Avoid making the public site sound like a generic notes app.
- Keep the architecture flexible enough for future broader “event debrief” uses, but keep current marketing niche and concrete.

## Design Direction

- Premium, dark, high-end, modern.
- Avoid puffy/childish SaaS styling.
- Use sharp 6-8px radius cards, thin borders, gold/orange accents, opaque foreground panels, and subtle motion.
- Landing page currently uses:
  - Moving low-opacity diagonal Debrief logo background
  - Opaque foreground panels
  - Hover lift/glow
  - Subtle app-preview sheen/float
  - Scroll reveal for lower page sections only
- Above-the-fold content must be immediately visible at 100% opacity.

## Logo Assets

- Current favicon/header mark: `debrief-mark-gold.png`.
- Current full logo/watermark source: `Debrief Logo transparent.png`.
- Old purple mark `debrief-mark.png` is retained only for reference.

## Homepage Images

Images now used on homepage:

- `striking-vs-grappling.png`
- `boxing picture.png`
- `martial-arts-rack-card.jpg`

They appear in a visual section after the hero:

- Eyebrow: `Built for the whole room`
- Heading: `Striking. Wrestling. Grappling.`
- Keep this section visual-first with minimal copy.

## Beta Strategy

- Best next step is still a private web beta, not App Store/Play Store yet.
- Test with several email aliases first.
- Then invite 3-5 trusted students.
- Let them use it for 2-4 weeks.
- Validate:
  - login/signup
  - Telegram intake
  - notes appearing in app
  - private vs shared behavior
  - whether students actually submit debriefs

## Draft Pricing

Draft beta pricing on landing page:

- Free: `$0`, up to 20 debriefs/month
- Pro: `$5/mo`
- Club: `$29/mo`

Treat this as test copy, not final business commitment.

## Setup Wizard Direction

- The wizard was simplified because old text referenced Google Sheets/n8n too heavily.
- Visible UI should stay low-friction:
  - Club
  - Access
  - Telegram
  - Launch
- Avoid visible Sheets/n8n-heavy language.
- Hidden legacy fields remain in code so the older `app.js` flow does not break.
- If continuing work, consider replacing the wizard logic entirely with a cleaner beta-onboarding script.

## Key Files

- `index.html`: public landing page.
- `styles.css`: landing page visual system and animations.
- `landing.js`: landing page scroll reveal behavior.
- `debrief-viewer.html`: login/app viewer.
- `debrief-viewer.20260430g.css`: active viewer styling.
- `debrief-viewer.20260430g.js`: active Supabase viewer logic.
- `setup-wizard.html`: simplified beta setup helper.
- `setup-wizard.css`: setup wizard styling.
- `app.js`: legacy setup wizard logic, partially simplified.
- `PROJECT_NOTES.md`: running wisdom/history.
- `vercel.json`: clean URL rewrites.

## Important Current Caveats

- The landing page changes are local unless deployed to Vercel.
- `app.js` still contains legacy workflow/export logic and hidden Sheet-related field names.
- The setup wizard UI no longer talks about Sheets, but the underlying script has old machinery.
- The viewer is still a separate experience and may need visual refresh later to fully match the new premium landing page.
- New homepage image files are relatively large; later optimization may be useful before public launch.

## Suggested Next Tasks

1. Deploy the updated landing page to Vercel when ready.
2. Test `/`, `/viewer`, and `/setup` on the live URL.
3. Refresh the viewer UI to match the premium landing page.
4. Simplify or replace `app.js` so the setup wizard no longer carries legacy Sheets/n8n assumptions.
5. Run a real beta test with 2-4 test accounts, then 3-5 students.
6. Optimize image sizes before broader sharing.
