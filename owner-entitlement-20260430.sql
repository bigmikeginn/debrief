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

insert into public.user_plan_entitlements (
  user_id,
  plan,
  monthly_limit,
  can_share,
  can_export,
  trial_started_at,
  trial_ends_at,
  updated_at
)
select
  p.id,
  'club',
  null,
  true,
  true,
  coalesce(p.created_at, now()),
  '2099-12-31 23:59:59+00'::timestamptz,
  now()
from public.profiles p
where lower(p.email) = 'bigmikeginn@gmail.com'
on conflict (user_id) do update set
  plan = excluded.plan,
  monthly_limit = excluded.monthly_limit,
  can_share = excluded.can_share,
  can_export = excluded.can_export,
  trial_ends_at = excluded.trial_ends_at,
  updated_at = now();

select
  p.email,
  e.plan,
  e.monthly_limit,
  e.can_share,
  e.can_export,
  e.trial_ends_at
from public.profiles p
join public.user_plan_entitlements e on e.user_id = p.id
where lower(p.email) = 'bigmikeginn@gmail.com';
