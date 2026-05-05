-- Debrief Beta v1: parsed debrief fields + search support
-- Run after 001_schema.sql and 002_rls.sql.

create extension if not exists pg_trgm;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'technique_type') then
    create type public.technique_type as enum (
      'choke',
      'arm_attack',
      'leg_attack',
      'sweep',
      'escape',
      'guard_pass',
      'guard_retention',
      'takedown',
      'back_control',
      'mount',
      'side_control',
      'other'
    );
  end if;
end $$;

alter table public.debriefs
  add column if not exists debrief_date date,
  add column if not exists technique text,
  add column if not exists technique_type public.technique_type,
  add column if not exists key_points text[] not null default '{}',
  add column if not exists reflections text,
  add column if not exists raw_notes text,
  add column if not exists telegram_message jsonb,
  add column if not exists telegram_update_id bigint,
  add column if not exists telegram_text text,
  add column if not exists cleaned_text text,
  add column if not exists is_debrief boolean not null default false,
  add column if not exists telegram_chat_id bigint;

-- Backfill minimal values for existing rows
update public.debriefs
set debrief_date = coalesce(debrief_date, (created_at at time zone 'utc')::date),
    raw_notes = coalesce(raw_notes, raw_input),
    telegram_text = coalesce(telegram_text, raw_input),
    cleaned_text = coalesce(cleaned_text, raw_input),
    is_debrief = coalesce(is_debrief, false)
where debrief_date is null
   or raw_notes is null
   or telegram_text is null
   or cleaned_text is null;

create index if not exists idx_debriefs_author_date on public.debriefs(author_user_id, debrief_date desc);
create index if not exists idx_debriefs_technique_type on public.debriefs(technique_type);
create index if not exists idx_debriefs_technique_trgm on public.debriefs using gin (technique gin_trgm_ops);
create index if not exists idx_debriefs_reflections_trgm on public.debriefs using gin (reflections gin_trgm_ops);
create index if not exists idx_debriefs_raw_notes_trgm on public.debriefs using gin (raw_notes gin_trgm_ops);

