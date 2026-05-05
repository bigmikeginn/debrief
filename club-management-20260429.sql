alter table public.user_feed_preferences
  add column if not exists active_club_id uuid references public.clubs(id);

create table if not exists public.club_invites (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  code text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz
);

alter table public.club_invites enable row level security;

drop policy if exists club_invites_select_admin on public.club_invites;
create policy club_invites_select_admin
  on public.club_invites
  for select
  using (public.is_club_admin(club_id));

create index if not exists club_invites_club_active_idx
  on public.club_invites (club_id, revoked_at, expires_at);

create or replace function public.slugify_club_name(raw_name text)
returns text
language sql
immutable
as $function$
  select trim(both '-' from regexp_replace(lower(coalesce(raw_name, 'club')), '[^a-z0-9]+', '-', 'g'));
$function$;

create or replace function public.generate_club_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $function$
declare
  candidate text;
begin
  loop
    candidate := upper(substr(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 4) || '-' || substr(md5(clock_timestamp()::text || gen_random_uuid()::text), 1, 4));
    exit when not exists (
      select 1
      from public.club_invites ci
      where replace(ci.code, '-', '') = replace(candidate, '-', '')
    );
  end loop;

  return candidate;
end;
$function$;

create or replace function public.ensure_club_invite(target_club_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $function$
declare
  current_user_id uuid := auth.uid();
  active_code text;
begin
  if current_user_id is null then
    raise exception 'You must be logged in.';
  end if;

  if not public.is_club_admin(target_club_id) then
    raise exception 'Only club admins can manage invite codes.';
  end if;

  select ci.code
  into active_code
  from public.club_invites ci
  where ci.club_id = target_club_id
    and ci.revoked_at is null
    and (ci.expires_at is null or ci.expires_at > now())
  order by ci.created_at desc
  limit 1;

  if active_code is null then
    active_code := public.generate_club_invite_code();
    insert into public.club_invites (club_id, code, created_by)
    values (target_club_id, active_code, current_user_id);
  end if;

  return active_code;
end;
$function$;

create or replace function public.get_user_active_club_id(target_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $function$
  select coalesce(
    (
      select ufp.active_club_id
      from public.user_feed_preferences ufp
      join public.club_memberships cm
        on cm.club_id = ufp.active_club_id
       and cm.user_id = target_user_id
       and cm.status = 'active'
      where ufp.user_id = target_user_id
      limit 1
    ),
    (
      select cm.club_id
      from public.club_memberships cm
      where cm.user_id = target_user_id
        and cm.status = 'active'
      order by cm.created_at asc
      limit 1
    )
  );
$function$;

create or replace function public.set_my_active_club(target_club_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'You must be logged in.';
  end if;

  if not exists (
    select 1
    from public.club_memberships cm
    where cm.club_id = target_club_id
      and cm.user_id = current_user_id
      and cm.status = 'active'
  ) then
    raise exception 'You are not an active member of that club.';
  end if;

  insert into public.user_feed_preferences (user_id, active_club_id)
  values (current_user_id, target_club_id)
  on conflict (user_id) do update
  set active_club_id = excluded.active_club_id,
      updated_at = now();

  return public.get_my_club_context();
end;
$function$;

create or replace function public.get_my_club_context()
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  current_user_id uuid := auth.uid();
  active_id uuid;
  clubs_payload jsonb;
begin
  if current_user_id is null then
    raise exception 'You must be logged in.';
  end if;

  active_id := public.get_user_active_club_id(current_user_id);

  if active_id is not null then
    insert into public.user_feed_preferences (user_id, active_club_id)
    values (current_user_id, active_id)
    on conflict (user_id) do update
    set active_club_id = excluded.active_club_id,
        updated_at = now()
    where public.user_feed_preferences.active_club_id is distinct from excluded.active_club_id;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'slug', c.slug,
        'role', cm.role,
        'status', cm.status,
        'is_active', c.id = active_id,
        'invite_code', case
          when cm.role = 'admin' then public.ensure_club_invite(c.id)
          else null
        end
      )
      order by (c.id = active_id) desc, c.name asc
    ),
    '[]'::jsonb
  )
  into clubs_payload
  from public.club_memberships cm
  join public.clubs c on c.id = cm.club_id
  where cm.user_id = current_user_id
    and cm.status = 'active';

  return jsonb_build_object(
    'active_club_id', active_id,
    'clubs', clubs_payload
  );
end;
$function$;

create or replace function public.create_club(club_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  current_user_id uuid := auth.uid();
  clean_name text := trim(coalesce(club_name, ''));
  base_slug text;
  final_slug text;
  suffix integer := 1;
  new_club_id uuid;
begin
  if current_user_id is null then
    raise exception 'You must be logged in.';
  end if;

  if length(clean_name) < 2 then
    raise exception 'Enter a club name.';
  end if;

  base_slug := public.slugify_club_name(clean_name);
  if base_slug = '' then
    base_slug := 'club';
  end if;
  final_slug := base_slug;

  while exists (select 1 from public.clubs c where c.slug = final_slug) loop
    suffix := suffix + 1;
    final_slug := base_slug || '-' || suffix::text;
  end loop;

  insert into public.clubs (name, slug)
  values (clean_name, final_slug)
  returning id into new_club_id;

  insert into public.club_memberships (club_id, user_id, role, status)
  values (new_club_id, current_user_id, 'admin', 'active')
  on conflict (club_id, user_id) do update
  set role = 'admin',
      status = 'active';

  insert into public.user_feed_preferences (user_id, active_club_id)
  values (current_user_id, new_club_id)
  on conflict (user_id) do update
  set active_club_id = excluded.active_club_id,
      updated_at = now();

  perform public.ensure_club_invite(new_club_id);

  return public.get_my_club_context();
end;
$function$;

create or replace function public.join_club_with_invite(invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  current_user_id uuid := auth.uid();
  normalized_code text := upper(regexp_replace(coalesce(invite_code, ''), '[^a-zA-Z0-9]', '', 'g'));
  target_invite record;
begin
  if current_user_id is null then
    raise exception 'You must be logged in.';
  end if;

  if length(normalized_code) < 6 then
    raise exception 'Enter a valid invite code.';
  end if;

  select ci.club_id
  into target_invite
  from public.club_invites ci
  where replace(upper(ci.code), '-', '') = normalized_code
    and ci.revoked_at is null
    and (ci.expires_at is null or ci.expires_at > now())
  order by ci.created_at desc
  limit 1;

  if target_invite.club_id is null then
    raise exception 'That invite code is not active.';
  end if;

  insert into public.club_memberships (club_id, user_id, role, status)
  values (target_invite.club_id, current_user_id, 'student', 'active')
  on conflict (club_id, user_id) do update
  set status = 'active';

  insert into public.user_feed_preferences (user_id, active_club_id)
  values (current_user_id, target_invite.club_id)
  on conflict (user_id) do update
  set active_club_id = excluded.active_club_id,
      updated_at = now();

  return public.get_my_club_context();
end;
$function$;

update public.user_feed_preferences ufp
set active_club_id = public.get_user_active_club_id(ufp.user_id)
where ufp.active_club_id is null;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
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

  select id
  into default_club_id
  from public.clubs
  order by created_at asc
  limit 1;

  insert into public.user_feed_preferences (user_id, active_club_id)
  values (new.id, default_club_id)
  on conflict (user_id) do nothing;

  if default_club_id is not null then
    insert into public.club_memberships (club_id, user_id, role, status)
    values (default_club_id, new.id, 'student', 'active')
    on conflict (club_id, user_id) do update
    set status = 'active';
  end if;

  return new;
end;
$function$;

grant execute on function public.get_my_club_context() to authenticated;
grant execute on function public.create_club(text) to authenticated;
grant execute on function public.join_club_with_invite(text) to authenticated;
grant execute on function public.set_my_active_club(uuid) to authenticated;
grant execute on function public.ensure_club_invite(uuid) to authenticated;
grant execute on function public.get_user_active_club_id(uuid) to authenticated, service_role;

create or replace function public.get_my_debrief_history(limit_count integer DEFAULT 25, offset_count integer DEFAULT 0)
returns table(
  id uuid,
  club_id uuid,
  author_user_id uuid,
  created_at timestamptz,
  debrief_date date,
  note_title text,
  note_summary text,
  domain text,
  topic_primary text,
  topic_secondary text,
  topic_tags text[],
  action_items text[],
  parse_status text,
  parse_stage smallint,
  parse_confidence numeric,
  needs_review boolean,
  technique text,
  technique_type technique_type,
  key_points text[],
  reflections text,
  raw_notes text,
  summary_text text,
  visibility debrief_visibility
)
language sql
stable
security definer
set search_path = public
as $function$
  select
    d.id,
    d.club_id,
    d.author_user_id,
    d.created_at,
    d.debrief_date,
    d.note_title,
    d.note_summary,
    d.domain,
    d.topic_primary,
    d.topic_secondary,
    d.topic_tags,
    d.action_items,
    d.parse_status,
    d.parse_stage,
    d.parse_confidence,
    d.needs_review,
    d.technique,
    d.technique_type,
    d.key_points,
    d.reflections,
    d.raw_notes,
    d.summary_text,
    d.visibility
  from public.debriefs d
  where d.author_user_id = auth.uid()
    and (
      public.get_user_active_club_id(auth.uid()) is null
      or d.club_id = public.get_user_active_club_id(auth.uid())
    )
  order by d.created_at desc
  limit greatest(1, least(limit_count, 100))
  offset greatest(0, offset_count);
$function$;
