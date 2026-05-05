create or replace function public.get_my_telegram_link_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := auth.jwt() ->> 'email';
  link_row record;
begin
  if current_user_id is null then
    raise exception 'You must be logged in.';
  end if;

  select linked_at, is_active
  into link_row
  from public.telegram_links
  where user_id = current_user_id
    and is_active = true
  order by linked_at desc
  limit 1;

  return jsonb_build_object(
    'email', current_email,
    'is_linked', link_row.linked_at is not null,
    'linked_at', link_row.linked_at
  );
end;
$$;

grant execute on function public.get_my_telegram_link_status() to authenticated;

create or replace function public.get_my_debrief_history(limit_count integer default 25, offset_count integer default 0)
returns table (
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
  technique_type public.technique_type,
  key_points text[],
  reflections text,
  raw_notes text,
  summary_text text,
  visibility public.debrief_visibility
)
language sql
stable
security definer
set search_path = public
as $$
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
  order by d.created_at desc
  limit greatest(1, least(limit_count, 100))
  offset greatest(0, offset_count);
$$;

grant execute on function public.get_my_debrief_history(integer, integer) to authenticated;
