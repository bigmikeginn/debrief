create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_club_id uuid;
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

  select id
  into default_club_id
  from public.clubs
  order by created_at asc
  limit 1;

  if default_club_id is not null then
    insert into public.club_memberships (club_id, user_id, role, status)
    values (default_club_id, new.id, 'student', 'active')
    on conflict (club_id, user_id) do update
    set status = 'active';
  end if;

  return new;
end;
$$;

insert into public.club_memberships (club_id, user_id, role, status)
select first_club.id, profiles.id, 'student', 'active'
from public.profiles
cross join lateral (
  select id
  from public.clubs
  order by created_at asc
  limit 1
) as first_club
where not exists (
  select 1
  from public.club_memberships memberships
  where memberships.user_id = profiles.id
);
