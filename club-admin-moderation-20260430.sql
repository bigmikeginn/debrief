-- Club admin moderation.
-- Admins can view active club members and remove a participant from their club.
-- Removal deactivates club membership and pulls that member's club-shared posts back to private.

alter table public.club_memberships
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.get_club_members_for_admin(target_club_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $function$
begin
  if auth.uid() is null then
    raise exception 'You must be logged in.';
  end if;

  if not public.is_club_admin(target_club_id) then
    raise exception 'Only club admins can view club members.';
  end if;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'user_id', cm.user_id,
          'role', cm.role,
          'status', cm.status,
          'display_name', p.display_name,
          'email', p.email
        )
        order by
          case when cm.role = 'admin' then 0 else 1 end,
          coalesce(p.display_name, p.email, cm.user_id::text)
      )
      from public.club_memberships cm
      left join public.profiles p on p.id = cm.user_id
      where cm.club_id = target_club_id
        and cm.status = 'active'
    ),
    '[]'::jsonb
  );
end;
$function$;

create or replace function public.remove_club_member(target_club_id uuid, target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  current_user_id uuid := auth.uid();
  target_membership record;
  active_admin_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'You must be logged in.';
  end if;

  if target_user_id = current_user_id then
    raise exception 'Admins cannot remove themselves from a club.';
  end if;

  if not public.is_club_admin(target_club_id) then
    raise exception 'Only club admins can remove members.';
  end if;

  select cm.user_id, cm.role, cm.status
  into target_membership
  from public.club_memberships cm
  where cm.club_id = target_club_id
    and cm.user_id = target_user_id
  limit 1;

  if target_membership.user_id is null then
    raise exception 'That person is not in this club.';
  end if;

  if target_membership.status is distinct from 'active' then
    raise exception 'That person is already inactive in this club.';
  end if;

  if target_membership.role = 'admin' then
    select count(*) into active_admin_count
    from public.club_memberships cm
    where cm.club_id = target_club_id
      and cm.role = 'admin'
      and cm.status = 'active';

    if active_admin_count <= 1 then
      raise exception 'A club must keep at least one active admin.';
    end if;
  end if;

  update public.club_memberships
  set status = 'inactive',
      role = case when role = 'admin' then 'student'::public.membership_role else role end,
      updated_at = now()
  where club_id = target_club_id
    and user_id = target_user_id;

  update public.user_feed_preferences
  set active_club_id = public.get_user_active_club_id(target_user_id),
      updated_at = now()
  where user_id = target_user_id
    and active_club_id = target_club_id;

  update public.debrief_shares ds
  set revoked_at = now()
  from public.debriefs d
  where ds.debrief_id = d.id
    and ds.author_user_id = target_user_id
    and d.club_id = target_club_id
    and ds.revoked_at is null;

  update public.debriefs
  set visibility = 'private'
  where club_id = target_club_id
    and author_user_id = target_user_id
    and visibility = 'shared';

  return public.get_my_club_context();
end;
$function$;

grant execute on function public.get_club_members_for_admin(uuid) to authenticated;
grant execute on function public.remove_club_member(uuid, uuid) to authenticated;
