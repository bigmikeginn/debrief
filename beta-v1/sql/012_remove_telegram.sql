-- Remove Telegram support entirely
-- Run after 011_app_status_and_history_rpc.sql
-- Drops all Telegram-related tables, functions, and columns

-- =================
-- Drop RLS policies
-- =================
drop policy if exists telegram_links_select_own on public.telegram_links;
drop policy if exists telegram_links_insert_own on public.telegram_links;
drop policy if exists telegram_links_update_own on public.telegram_links;
drop policy if exists telegram_links_delete_own on public.telegram_links;

drop policy if exists telegram_link_codes_select_own on public.telegram_link_codes;
drop policy if exists telegram_link_codes_insert_own on public.telegram_link_codes;
drop policy if exists telegram_link_codes_update_own on public.telegram_link_codes;
drop policy if exists telegram_link_codes_delete_own on public.telegram_link_codes;

-- ========================
-- Drop tables and function
-- ========================
drop table if exists public.telegram_link_codes;
drop table if exists public.telegram_links;
drop function if exists public.create_telegram_link_code(boolean);

-- =========================
-- Remove Telegram from debriefs schema
-- =========================
-- Remove telegram-specific columns
alter table public.debriefs
  drop column if exists telegram_message,
  drop column if exists telegram_update_id,
  drop column if exists telegram_text,
  drop column if exists telegram_chat_id;

-- Remove the source column (all debriefs are now 'app')
alter table public.debriefs
  drop column if exists source;

-- Drop the debrief_source enum since it's no longer needed
drop type if exists public.debrief_source;

-- =================
-- Note for the record
-- =================
-- Telegram was used as a bridge to capture training notes via Telegram bot.
-- As of 2026-05-05, native iOS/Android apps with voice recording replace Telegram.
-- All user notes now come through the in-app submission endpoint.
-- The 'source' column is removed; all debriefs are created via 'app'.
