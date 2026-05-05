# Supabase Email Personalization (All Templates)

Use this once in Supabase to fully brand your auth emails.

## 1) Open the email template area

1. Log in to [Supabase](https://supabase.com/dashboard).
2. Open your Debrief project.
3. In the left menu, click `Authentication`.
4. Click `Email Templates`.

## 2) Paste each template file into the matching Supabase template

Use this mapping:

1. `Magic Link` template
   Subject: `Sign in to Debrief`
   HTML file: `beta-v1/auth-email/magic-link-template.html`
2. `Invite User` template
   Subject: `You're invited to Debrief`
   HTML file: `beta-v1/auth-email/invite-template.html`
3. `Reset Password` template
   Subject: `Reset your Debrief password`
   HTML file: `beta-v1/auth-email/password-reset-template.html`
4. `Change Email Address` template
   Subject: `Confirm your new Debrief email`
   HTML file: `beta-v1/auth-email/email-change-template.html`

For each one:

1. Click the template in Supabase.
2. Replace the Subject line.
3. Open the matching HTML file above.
4. Copy all contents and paste into the Supabase HTML editor.
5. Click `Save`.

## 3) Optional sender branding (recommended)

If you want emails to come from your own branded sender instead of Supabase default:

1. In Supabase, go to `Authentication` -> `Settings` -> `SMTP Settings`.
2. Connect a sender provider (Resend or SendGrid are common choices).
3. Set sender name to `Debrief`.
4. Save.

## 4) Quick test checklist

1. Test Magic Link login from the app.
2. Test password reset from auth UI.
3. (Optional) Invite a second test user and check invite email.
4. Confirm styling and button links look right in Gmail.

