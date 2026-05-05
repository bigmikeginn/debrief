-- Debrief plan entitlements and free-tier enforcement.
-- Apply this in Supabase before relying on paid/free restrictions in production.

create table if not exists public.user_plan_entitlements (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'student_plus', 'club')),
  monthly_limit integer,
  can_share boolean not null default false,
  can_export boolean not null default false,
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  updated_at timestamptz not null default now()
);

alter table public.user_plan_entitlements
  add column if not exists trial_started_at timestamptz not null default now();

alter table public.user_plan_entitlements
  add column if not exists trial_ends_at timestamptz not null default (now() + interval '14 days');

alter table public.user_plan_entitlements enable row level security;

drop policy if exists user_plan_entitlements_select_own on public.user_plan_entitlements;
create policy user_plan_entitlements_select_own
on public.user_plan_entitlements
for select
to authenticated
using (user_id = auth.uid());

create or replace function public.get_effective_plan(target_user_id uuid)
returns table(
  plan text,
  monthly_limit integer,
  can_share boolean,
  can_export boolean,
  is_trial boolean,
  trial_ends_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $function$
  with plan_source as (
    select
      target.user_id,
      coalesce(upe.plan, 'free') as stored_plan,
      upe.monthly_limit,
      upe.can_share,
      upe.can_export,
      coalesce(upe.trial_ends_at, p.created_at + interval '14 days') as effective_trial_ends_at
    from (select target_user_id as user_id) target
    left join public.user_plan_entitlements upe on upe.user_id = target.user_id
    left join public.profiles p on p.id = target.user_id
  )
  select
    case
      when stored_plan = 'free' and effective_trial_ends_at > now() then 'trial'
      else stored_plan
    end as plan,
    case
      when stored_plan = 'free' and effective_trial_ends_at > now() then null
      when stored_plan = 'free' then 8
      else monthly_limit
    end as monthly_limit,
    case
      when stored_plan = 'free' and effective_trial_ends_at > now() then true
      when stored_plan = 'free' then false
      else true
    end as can_share,
    case
      when stored_plan = 'free' and effective_trial_ends_at > now() then true
      when stored_plan = 'free' then false
      else true
    end as can_export,
    (stored_plan = 'free' and effective_trial_ends_at > now()) as is_trial,
    effective_trial_ends_at as trial_ends_at
  from plan_source;
$function$;

create or replace function public.get_my_plan_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  effective record;
  used_count integer := 0;
  active_club uuid;
  club_activity_count integer := 0;
  hint text := '';
begin
  select * into effective
  from public.get_effective_plan(auth.uid())
  limit 1;

  select count(*) into used_count
  from public.debriefs d
  where d.author_user_id = auth.uid()
    and d.created_at >= date_trunc('month', now());

  active_club := public.get_user_active_club_id(auth.uid());
  if active_club is not null then
    select count(*) into club_activity_count
    from public.debriefs d
    where d.club_id = active_club
      and d.author_user_id <> auth.uid()
      and d.created_at >= date_trunc('month', now());

    if club_activity_count > 0 then
      hint := 'Other people in your club are building their training notes this month too.';
    end if;
  end if;

  return jsonb_build_object(
    'plan', coalesce(effective.plan, 'free'),
    'monthly_limit', coalesce(effective.monthly_limit, 8),
    'used_this_month', used_count,
    'can_share', coalesce(effective.can_share, false),
    'can_export', coalesce(effective.can_export, false),
    'is_trial', coalesce(effective.is_trial, false),
    'trial_ends_at', effective.trial_ends_at,
    'club_activity_hint', hint
  );
end;
$function$;

create or replace function public.enforce_debrief_monthly_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  effective record;
  used_count integer := 0;
begin
  select * into effective
  from public.get_effective_plan(new.author_user_id)
  limit 1;

  if coalesce(effective.monthly_limit, 0) <= 0 then
    return new;
  end if;

  select count(*) into used_count
  from public.debriefs d
  where d.author_user_id = new.author_user_id
    and d.created_at >= date_trunc('month', now());

  if used_count >= effective.monthly_limit then
    raise exception 'Monthly debrief limit reached for this plan.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$function$;

drop trigger if exists enforce_debrief_monthly_limit_before_insert on public.debriefs;
create trigger enforce_debrief_monthly_limit_before_insert
before insert on public.debriefs
for each row
execute function public.enforce_debrief_monthly_limit();

create or replace function public.enforce_paid_sharing()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  effective record;
  author_id uuid;
begin
  author_id := coalesce(new.author_user_id, old.author_user_id);

  select * into effective
  from public.get_effective_plan(author_id)
  limit 1;

  if not coalesce(effective.can_share, false) then
    raise exception 'Sharing is available on paid plans.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$function$;

drop trigger if exists enforce_paid_sharing_before_insert on public.debrief_shares;
create trigger enforce_paid_sharing_before_insert
before insert on public.debrief_shares
for each row
execute function public.enforce_paid_sharing();

create or replace function public.enforce_paid_visibility()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  effective record;
begin
  if new.visibility is distinct from 'shared'::public.debrief_visibility then
    return new;
  end if;

  select * into effective
  from public.get_effective_plan(new.author_user_id)
  limit 1;

  if not coalesce(effective.can_share, false) then
    raise exception 'Sharing is available on paid plans.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$function$;

drop trigger if exists enforce_paid_visibility_before_update on public.debriefs;
create trigger enforce_paid_visibility_before_update
before update of visibility on public.debriefs
for each row
execute function public.enforce_paid_visibility();

grant execute on function public.get_effective_plan(uuid) to authenticated, service_role;
grant execute on function public.get_my_plan_status() to authenticated;
