-- Debrief Beta v1: saved/favourite debriefs
-- Run after 001_schema.sql, 002_rls.sql, 003_debrief_parsing_and_search.sql, and 004_parse_pipeline.sql.

create table if not exists public.debrief_favourites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  debrief_id uuid not null references public.debriefs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, debrief_id)
);

create index if not exists idx_debrief_favourites_user_created
  on public.debrief_favourites(user_id, created_at desc);

create index if not exists idx_debrief_favourites_debrief
  on public.debrief_favourites(debrief_id);

alter table public.debrief_favourites enable row level security;

drop policy if exists favourites_select_own on public.debrief_favourites;
create policy favourites_select_own
on public.debrief_favourites
for select
using (user_id = auth.uid());

drop policy if exists favourites_insert_viewable_debrief on public.debrief_favourites;
create policy favourites_insert_viewable_debrief
on public.debrief_favourites
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.debriefs d
    where d.id = debrief_id
  )
);

drop policy if exists favourites_delete_own on public.debrief_favourites;
create policy favourites_delete_own
on public.debrief_favourites
for delete
using (user_id = auth.uid());
