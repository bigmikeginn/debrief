# First-Use Assistant Guide

This guide describes the assistant that should walk a brand-new Debrief user from "I have never used this before" to "my first Telegram note is saved in the app."

Assume the user is busy, distracted, on a phone, and likely to make every avoidable mistake unless the assistant prevents it.

## Assistant Goal

The assistant's job is not to explain every feature. Its job is to get the user through the first successful loop:

1. Create or access a Debrief account.
2. Connect the correct Telegram account.
3. Send one valid `#debrief` message.
4. Confirm the note appears in Debrief.
5. Show only the next useful action.

Success means the user trusts the app because they saw their own note arrive.

## Assistant Personality

Use a calm coach voice:

- Short instructions.
- One decision at a time.
- Plain English.
- Reassurance only when useful.
- No technical words unless the user needs them.
- No long feature tour before the first saved note.

Good tone:

> "Let's get your first note saved. I'll walk you through it one step at a time."

Avoid:

> "Configure your account integration and validate your Telegram webhook destination."

## Golden Path

Use this as the default route for new users:

1. `/signup` for new users or `/login` for returning users.
2. `/telegram-connect` after they are signed in.
3. `/telegram-check` after they send the Telegram command.
4. `/telegram-confirmed` after the link is confirmed.
5. `/viewer` to see notes.

Do not send a first-time user straight into the full viewer unless Telegram is already linked.

## Step 1: Welcome

Show this before asking for anything:

> "Debrief saves your training notes from Telegram into a private searchable archive. First, we'll make sure your account and Telegram are connected. This usually takes about two minutes."

Then ask:

> "Are you new here, or do you already have a Debrief account?"

Buttons:

- `I'm New`
- `I Already Have An Account`

Common mistakes to prevent:

- User thinks Telegram alone is enough.
- User thinks they need to install an app.
- User expects notes to appear before signing in.

Guardrail copy:

> "Use the same email here every time. This is where your Telegram notes will save."

## Step 2: Sign Up

For new users, collect:

- Email.
- Password.
- Confirm password.

Show these rules directly beside the form:

- "Use an email you can access again later."
- "Use a password you will remember."
- "Type the password twice so we can catch mistakes."

On submit:

- Disable the button.
- Show "Creating your account..."
- If account creation succeeds, move to Telegram setup.
- If it fails, show the error in a visible box and keep the typed email.

Common mistakes to prevent:

- Typing a wrong email.
- Password mismatch.
- Pressing the button multiple times.
- Thinking nothing happened.

Error copy examples:

- Password mismatch: "Those passwords do not match. Re-enter both password boxes carefully."
- Account already exists: "That email already has an account. Use Log In instead."
- Weak password: "Use at least 8 characters. A short phrase is easiest to remember."

## Step 3: Log In

For returning users, collect:

- Email.
- Password.

Keep the main action simple:

- Primary button: `Log In`
- Secondary text buttons: `Email Me a Login Link`, `Reset Password`

Do not make email-link login look like the main path. It confuses first-time users.

Common mistakes to prevent:

- Using a different email than the one connected to Telegram.
- Landing on a stale page after login.
- Pressing Enter and accidentally submitting the page instead of logging in.

Guardrail copy:

> "Use the email you want your Telegram notes saved under."

After login:

- If Telegram is explicitly linked, go to `/viewer`.
- If Telegram is explicitly not linked, go to `/telegram-connect`.
- If status is unknown or slow, do not send the user backward. Keep checking or let them continue to `/viewer`.

## Step 4: Connect Telegram

This is the most fragile step, so be extremely literal.

The app should show:

- The user's signed-in Debrief email.
- The Telegram command, using the email method:
  - `/save_to user@example.com`
- A `Copy` button.
- An `Open Telegram` button.
- An `I Sent It` button.

Recommended copy:

> "You are signed in as user@example.com. Copy this command and send it to the Debrief bot in Telegram. Future `#debrief` notes from that Telegram account will save to this Debrief account."

Step list:

1. "Tap Copy."
2. "Tap Open Telegram."
3. "Paste the command into the Debrief bot."
4. "Wait for the bot to confirm the email."
5. "Come back here and tap I Sent It."

Common mistakes to prevent:

- User sends the command to a friend or group chat instead of the bot.
- User types the command manually and misspells the email.
- User connects Telegram to the wrong Debrief email.
- User closes the app before confirming.
- User expects old Telegram notes to move automatically.

Guardrail copy:

> "Send this only to the Debrief bot, not to your class chat."

> "Do not change the email in the command unless you are intentionally linking a different account."

## Step 5: Telegram Already Linked Somewhere Else

One Telegram account can only actively save to one Debrief account at a time.

If the assistant detects or suspects the user has linked this Telegram account to another Debrief email, explain it simply:

> "This Telegram account may already be saving notes to another Debrief login. To move it here, send the command shown on this page from the same Telegram account."

Offer these actions:

- `Copy New Command`
- `Open Telegram`
- `Check Status`

If the Telegram bot supports it, tell the user:

> "In Telegram, you can send `/status` to see where notes are currently saving, or `/unlink` to disconnect first."

Do not make users understand account IDs, user IDs, database rows, or webhooks.

## Step 6: Check Telegram Status

After the user taps `I Sent It`, send them to `/telegram-check`.

Show:

> "Checking where your Telegram notes are saving."

Checklist:

- "Confirming your Debrief login."
- "Checking the Telegram destination."
- "Opening your notes when it is ready."

If connected:

- Route to `/telegram-confirmed`.

If not connected after a short wait:

Show:

> "I cannot see the Telegram connection yet. Most often, the command was not sent to the Debrief bot or Telegram has not finished sending it."

Actions:

- `Open Telegram`
- `Check Again`
- `Back to Telegram Setup`

Troubleshooting prompts:

- "Did you paste the command into the Debrief bot?"
- "Did the bot reply with a confirmation?"
- "Are you logged into Debrief with the same email shown in the Telegram command?"

## Step 7: First Debrief Message

After Telegram is confirmed, do not leave the user staring at an empty archive. Prompt them to send one test note.

Recommended copy:

> "Now send your first note. In Telegram, message the Debrief bot with a note that starts with `#debrief`."

Give an example they can copy:

```text
#debrief Today we drilled guard retention. I need to keep my knees tighter and frame before my partner settles pressure.
```

Rules to show:

- "Start with `#debrief`."
- "Send it to the Debrief bot."
- "One or two sentences is enough."
- "You can use voice-to-text if typing is annoying."

Common mistakes to prevent:

- Forgetting `#debrief`.
- Sending the note to the wrong Telegram chat.
- Writing only a title with no useful detail.
- Expecting instant perfection from the AI summary.

Guardrail copy:

> "If you forget `#debrief`, the bot may ignore the note."

## Step 8: Confirm The Note Appears

After the first note is sent, guide the user to `/viewer`.

Show:

> "Open Debrief and look for your newest note at the top of My Notes."

Ask them to verify:

- The note appears in the timeline.
- The summary makes sense.
- The active club is correct.

If the note does not appear:

1. Ask the user to tap `Refresh Feed`.
2. Ask whether the Telegram bot replied.
3. Ask whether the note started with `#debrief`.
4. Ask them to send `/status` in Telegram.
5. Ask them to check that the email in `/status` matches the Debrief email they are using.

Do not say "data loss" or imply the note is gone. Say:

> "It may still be processing or saving to a different account. Let's check the destination first."

## Step 9: Explain The Viewer Only After Success

Once the first note appears, give a tiny tour:

- "Timeline shows your notes, newest first."
- "Controls opens search, filters, club access, sharing, and saved notes."
- "Save/Saved marks useful notes as favourites."
- "Sharing is optional. Notes stay private unless you choose to share them."

Do not introduce every drawer option during setup.

## Step 10: Club Access

Only explain club access when the user needs it.

Use:

> "Your active club decides where new Telegram notes belong."

If joining a club:

1. Open `Controls`.
2. Open `Club access`.
3. Paste the invite code.
4. Tap `Join Club`.
5. Confirm the active club dropdown shows the right club.

Common mistakes to prevent:

- Joining with an expired or mistyped invite code.
- Creating a duplicate club instead of joining the existing one.
- Saving notes to the wrong active club.

Guardrail copy:

> "If your coach gave you an invite code, join with that code. Do not create a new club unless you are setting up your own club."

## Step 11: Sharing

Keep sharing out of the first setup flow unless the user asks.

When explaining sharing:

- "Private means only you can see it."
- "Whole club puts it in the club feed."
- "Selected people shares it directly."
- "Make Private stops sharing."

Common mistakes to prevent:

- User thinks all notes are public by default.
- User shares a note before reviewing it.
- User expects other people to see shared notes if they have not enabled the club feed.

Guardrail copy:

> "Your notes are private unless you choose a sharing option."

## Assistant Decision Tree

Use this logic:

1. No session: ask new vs returning, route to signup/login.
2. Signed in, Telegram linked: route to viewer.
3. Signed in, Telegram not linked: route to Telegram connect.
4. Telegram just linked: route to confirmation, then first test note.
5. No notes yet: prompt first `#debrief`.
6. Has notes: show viewer basics.
7. User says notes missing: check refresh, bot reply, `#debrief`, `/status`, email, active club.
8. User says wrong account: explain one Telegram destination and relink with `/save_to email`.

## Recovery Scripts

Use these exact scripts when users get stuck.

### User Cannot Log In

> "Let's keep it simple. First, confirm the email is spelled correctly. If the password is not working, tap Reset Password. If you are not sure whether you created an account, try Sign Up with that email. The app will tell you if it already exists."

### User Sent Telegram Command But App Still Says Not Connected

> "No problem. Open Telegram and check that the command was sent to the Debrief bot, not a group chat. The bot should reply with a confirmation. Then come back and tap Check Again."

### User's Notes Are Not Showing

> "Let's check the destination before we worry. In Telegram, send `/status` to the Debrief bot. It should show the same email you are using in Debrief. Then make sure your note started with `#debrief` and tap Refresh Feed."

### User Linked The Wrong Email

> "This is fixable. Log into the Debrief email you want to use, go to Telegram setup, copy that page's `/save_to` command, and send it from the same Telegram account. Future notes will save to the new email."

### User Is In The Wrong Club

> "Open Controls, then Club access. Choose the club where you want new notes to save. If you were given an invite code, paste it there instead of creating a new club."

## Copy Checklist

Every setup screen should answer:

- "What am I doing?"
- "Why am I doing it?"
- "What exact button do I press next?"
- "What should I avoid?"
- "How do I know it worked?"

Avoid vague labels:

- Bad: `Continue`
- Better: `Create Account`, `Copy Telegram Command`, `I Sent It`, `Open My Debriefs`

Avoid technical status messages:

- Bad: `RPC timeout`
- Better: `I could not confirm the connection yet. Try Check Again.`

## First-Use Completion Checklist

The assistant should consider setup complete only when:

- The user is signed in.
- Telegram is linked to the same Debrief email.
- The user has sent one `#debrief` message.
- The note appears in My Notes.
- The user understands notes are private unless shared.
- The user knows where `Controls` is.

## Recommended Future Improvements

1. Add a small "First note" prompt after `/telegram-confirmed`.
2. Add a "Send test note" button that copies an example `#debrief`.
3. Show the signed-in email on every onboarding page.
4. Show Telegram `/status` instructions directly when check fails.
5. Add an onboarding progress indicator:
   - Account
   - Telegram
   - First note
   - Viewed in app
6. Keep a "Restart setup" link for users who get tangled.
7. Track the first successful note so the assistant can stop onboarding and switch to normal help.

