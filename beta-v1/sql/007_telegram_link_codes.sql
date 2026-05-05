create table if not exists public.telegram_link_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index if not exists idx_telegram_link_codes_user_active
on public.telegram_link_codes(user_id, expires_at desc)
where used_at is null;

alter table public.telegram_link_codes enable row level security;

drop policy if exists telegram_link_codes_select_own on public.telegram_link_codes;
create policy telegram_link_codes_select_own
on public.telegram_link_codes
for select
using (auth.uid() = user_id);

drop policy if exists telegram_link_codes_insert_own on public.telegram_link_codes;
create policy telegram_link_codes_insert_own
on public.telegram_link_codes
for insert
with check (auth.uid() = user_id);

drop policy if exists telegram_link_codes_update_own on public.telegram_link_codes;
create policy telegram_link_codes_update_own
on public.telegram_link_codes
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
