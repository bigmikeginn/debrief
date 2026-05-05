create or replace function public.is_active_member_of_club(target_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
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
security definer
set search_path = public
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

drop policy if exists memberships_select_same_club on public.club_memberships;
create policy memberships_select_same_club
on public.club_memberships
for select
using (
  user_id = auth.uid()
  or public.is_active_member_of_club(club_id)
);
