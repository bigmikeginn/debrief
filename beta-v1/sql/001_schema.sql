-- Debrief Beta v1 Schema
-- Run this first in Supabase SQL editor.

create extension if not exists pgcrypto;

-- =========
-- Enums
-- =========
do $$
begin
  if not exists (select 1 from pg_type where typname = 'membership_role') then
    create type public.membership_role as enum ('student', 'coach', 'admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'membership_status') then
    create type public.membership_status as enum ('active', 'inactive', 'invited');
  end if;

  if not exists (select 1 from pg_type where typname = 'debrief_source') then
    create type public.debrief_source as enum ('telegram', 'app');
  end if;

  if not exists (select 1 from pg_type where typname = 'debrief_visibility') then
    create type public.debrief_visibility as enum ('private', 'shared');
  end if;

  if not exists (select 1 from pg_type where typname = 'share_scope') then
    create type public.share_scope as enum ('club');
  end if;

  if not exists (select 1 from pg_type where typname = 'ai_run_status') then
    create type public.ai_run_status as enum ('queued', 'success', 'failed');
  end if;
end $$;

-- =========
-- Core user profile
-- =========
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  created_at timestamptz not null default now()
);

-- =========
-- Club and memberships
-- =========
create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.club_memberships (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.membership_role not null default 'student',
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (club_id, user_id)
);

create index if not exists idx_club_memberships_user on public.club_memberships(user_id);
create index if not exists idx_club_memberships_club on public.club_memberships(club_id);

-- =========
-- Telegram link
-- =========
create table if not exists public.telegram_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  telegram_user_id bigint not null unique,
  telegram_chat_id bigint not null,
  linked_at timestamptz not null default now(),
  is_active boolean not null default true
);

create index if not exists idx_telegram_links_user on public.telegram_links(user_id);

-- =========
-- Debriefs and sharing
-- =========
create table if not exists public.debriefs (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  author_user_id uuid not null references public.profiles(id) on delete cascade,
  source public.debrief_source not null default 'telegram',
  raw_input text not null,
  structured_json jsonb,
  summary_text text,
  visibility public.debrief_visibility not null default 'private',
  created_at timestamptz not null default now()
);

create index if not exists idx_debriefs_author_created on public.debriefs(author_user_id, created_at desc);
create index if not exists idx_debriefs_club_visibility on public.debriefs(club_id, visibility);

create table if not exists public.debrief_shares (
  id uuid primary key default gen_random_uuid(),
  debrief_id uuid not null references public.debriefs(id) on delete cascade,
  author_user_id uuid not null references public.profiles(id) on delete cascade,
  scope public.share_scope not null default 'club',
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists idx_debrief_shares_debrief on public.debrief_shares(debrief_id);
create index if not exists idx_debrief_shares_active on public.debrief_shares(debrief_id) where revoked_at is null;

-- =========
-- User feed preferences
-- =========
create table if not exists public.user_feed_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  show_shared_notes boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========
-- AI runs (cost tracking)
-- =========
create table if not exists public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  debrief_id uuid references public.debriefs(id) on delete set null,
  model text not null,
  input_tokens integer,
  output_tokens integer,
  cost_estimate numeric(10,6),
  status public.ai_run_status not null default 'queued',
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_runs_created on public.ai_runs(created_at desc);
create index if not exists idx_ai_runs_debrief on public.ai_runs(debrief_id);

-- =========
-- Triggers: auto-create profile + feed preferences on new auth user
-- =========
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email),
    new.email
  )
  on conflict (id) do update
  set email = excluded.email;

  insert into public.user_feed_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- =========
-- Timestamp helper
-- =========
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_feed_preferences_touch_updated_at on public.user_feed_preferences;
create trigger user_feed_preferences_touch_updated_at
before update on public.user_feed_preferences
for each row execute function public.touch_updated_at();


