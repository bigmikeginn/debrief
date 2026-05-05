-- Debrief Beta v1 RLS Policies
-- Run this after 001_schema.sql.

-- =========
-- Helper functions
-- =========
create or replace function public.is_active_member_of_club(target_club_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.club_memberships cm
    where cm.club_id = target_club_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
  );
$$;

create or replace function public.is_club_admin(target_club_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.club_memberships cm
    where cm.club_id = target_club_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
      and cm.role = 'admin'
  );
$$;

create or replace function public.viewer_opted_in_shared()
returns boolean
language sql
stable
as $$
  select coalesce(
    (
      select ufp.show_shared_notes
      from public.user_feed_preferences ufp
      where ufp.user_id = auth.uid()
    ),
    false
  );
$$;

create or replace function public.has_active_share(target_debrief_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.debrief_shares ds
    where ds.debrief_id = target_debrief_id
      and ds.revoked_at is null
  );
$$;

-- =========
-- Enable RLS
-- =========
alter table public.profiles enable row level security;
alter table public.clubs enable row level security;
alter table public.club_memberships enable row level security;
alter table public.telegram_links enable row level security;
alter table public.debriefs enable row level security;
alter table public.debrief_shares enable row level security;
alter table public.user_feed_preferences enable row level security;
alter table public.ai_runs enable row level security;

-- =========
-- Profiles
-- =========
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
using (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

-- =========
-- Clubs
-- =========
drop policy if exists clubs_select_members on public.clubs;
create policy clubs_select_members
on public.clubs
for select
using (public.is_active_member_of_club(id));

-- =========
-- Club memberships
-- =========
drop policy if exists memberships_select_same_club on public.club_memberships;
create policy memberships_select_same_club
on public.club_memberships
for select
using (
  exists (
    select 1
    from public.club_memberships me
    where me.club_id = club_memberships.club_id
      and me.user_id = auth.uid()
      and me.status = 'active'
  )
);

drop policy if exists memberships_insert_admin on public.club_memberships;
create policy memberships_insert_admin
on public.club_memberships
for insert
with check (public.is_club_admin(club_id));

drop policy if exists memberships_update_admin on public.club_memberships;
create policy memberships_update_admin
on public.club_memberships
for update
using (public.is_club_admin(club_id))
with check (public.is_club_admin(club_id));

drop policy if exists memberships_delete_admin on public.club_memberships;
create policy memberships_delete_admin
on public.club_memberships
for delete
using (public.is_club_admin(club_id));

-- =========
-- Telegram links
-- =========
drop policy if exists telegram_links_select_own on public.telegram_links;
create policy telegram_links_select_own
on public.telegram_links
for select
using (user_id = auth.uid());

drop policy if exists telegram_links_insert_own on public.telegram_links;
create policy telegram_links_insert_own
on public.telegram_links
for insert
with check (user_id = auth.uid());

drop policy if exists telegram_links_update_own on public.telegram_links;
create policy telegram_links_update_own
on public.telegram_links
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists telegram_links_delete_own on public.telegram_links;
create policy telegram_links_delete_own
on public.telegram_links
for delete
using (user_id = auth.uid());

-- =========
-- Debriefs
-- =========
drop policy if exists debriefs_select_policy on public.debriefs;
create policy debriefs_select_policy
on public.debriefs
for select
using (
  author_user_id = auth.uid()
  or (
    visibility = 'shared'
    and public.viewer_opted_in_shared()
    and public.is_active_member_of_club(club_id)
    and public.has_active_share(id)
  )
);

drop policy if exists debriefs_insert_own on public.debriefs;
create policy debriefs_insert_own
on public.debriefs
for insert
with check (
  author_user_id = auth.uid()
  and public.is_active_member_of_club(club_id)
);

drop policy if exists debriefs_update_own on public.debriefs;
create policy debriefs_update_own
on public.debriefs
for update
using (author_user_id = auth.uid())
with check (author_user_id = auth.uid());

drop policy if exists debriefs_delete_own on public.debriefs;
create policy debriefs_delete_own
on public.debriefs
for delete
using (author_user_id = auth.uid());

-- =========
-- Debrief shares
-- =========
drop policy if exists shares_select_viewable_debrief on public.debrief_shares;
create policy shares_select_viewable_debrief
on public.debrief_shares
for select
using (author_user_id = auth.uid());

drop policy if exists shares_insert_author_only on public.debrief_shares;
create policy shares_insert_author_only
on public.debrief_shares
for insert
with check (
  author_user_id = auth.uid()
  and exists (
    select 1
    from public.debriefs d
    where d.id = debrief_id
      and d.author_user_id = auth.uid()
  )
);

drop policy if exists shares_update_author_only on public.debrief_shares;
create policy shares_update_author_only
on public.debrief_shares
for update
using (author_user_id = auth.uid())
with check (author_user_id = auth.uid());

drop policy if exists shares_delete_author_only on public.debrief_shares;
create policy shares_delete_author_only
on public.debrief_shares
for delete
using (author_user_id = auth.uid());

-- =========
-- User feed preferences
-- =========
drop policy if exists feed_pref_select_own on public.user_feed_preferences;
create policy feed_pref_select_own
on public.user_feed_preferences
for select
using (user_id = auth.uid());

drop policy if exists feed_pref_insert_own on public.user_feed_preferences;
create policy feed_pref_insert_own
on public.user_feed_preferences
for insert
with check (user_id = auth.uid());

drop policy if exists feed_pref_update_own on public.user_feed_preferences;
create policy feed_pref_update_own
on public.user_feed_preferences
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- =========
-- AI runs
-- =========
drop policy if exists ai_runs_select_own_debrief on public.ai_runs;
create policy ai_runs_select_own_debrief
on public.ai_runs
for select
using (
  debrief_id is null
  or exists (
    select 1
    from public.debriefs d
    where d.id = ai_runs.debrief_id
      and d.author_user_id = auth.uid()
  )
);

