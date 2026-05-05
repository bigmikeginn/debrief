-- Debrief Beta v1: targeted sharing
-- Run after 001_schema.sql through 005_debrief_favourites.sql.

alter type public.share_scope add value if not exists 'user';

alter table public.debrief_shares
  add column if not exists recipient_user_id uuid references public.profiles(id) on delete cascade;

create index if not exists idx_debrief_shares_recipient_active
  on public.debrief_shares(recipient_user_id, created_at desc)
  where revoked_at is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'debrief_shares_scope_recipient_check'
  ) then
    alter table public.debrief_shares
      add constraint debrief_shares_scope_recipient_check
      check (
        (scope::text = 'club' and recipient_user_id is null)
        or (scope::text = 'user' and recipient_user_id is not null)
      );
  end if;
end $$;

drop policy if exists profiles_select_same_club on public.profiles;
create policy profiles_select_same_club
on public.profiles
for select
using (
  id = auth.uid()
  or exists (
    select 1
    from public.club_memberships me
    join public.club_memberships them
      on them.club_id = me.club_id
    where me.user_id = auth.uid()
      and me.status = 'active'
      and them.user_id = profiles.id
      and them.status = 'active'
  )
);

create or replace function public.has_viewable_share(target_debrief_id uuid, target_club_id uuid)
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
      and (
        (
          ds.scope::text = 'club'
          and public.viewer_opted_in_shared()
          and public.is_active_member_of_club(target_club_id)
        )
        or (
          ds.scope::text = 'user'
          and ds.recipient_user_id = auth.uid()
        )
      )
  );
$$;

drop policy if exists debriefs_select_policy on public.debriefs;
create policy debriefs_select_policy
on public.debriefs
for select
using (
  author_user_id = auth.uid()
  or (
    visibility = 'shared'
    and public.is_active_member_of_club(club_id)
    and public.has_viewable_share(id, club_id)
  )
);

drop policy if exists shares_select_viewable_debrief on public.debrief_shares;
create policy shares_select_viewable_debrief
on public.debrief_shares
for select
using (
  author_user_id = auth.uid()
  or recipient_user_id = auth.uid()
  or (
    scope::text = 'club'
    and revoked_at is null
    and public.viewer_opted_in_shared()
    and exists (
      select 1
      from public.debriefs d
      where d.id = debrief_id
        and public.is_active_member_of_club(d.club_id)
    )
  )
);

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
      and (
        scope::text = 'club'
        or (
          scope::text = 'user'
          and recipient_user_id is not null
          and exists (
            select 1
            from public.club_memberships cm
            where cm.club_id = d.club_id
              and cm.user_id = recipient_user_id
              and cm.status = 'active'
          )
        )
      )
  )
);

drop policy if exists shares_update_author_only on public.debrief_shares;
create policy shares_update_author_only
on public.debrief_shares
for update
using (author_user_id = auth.uid())
with check (author_user_id = auth.uid());
