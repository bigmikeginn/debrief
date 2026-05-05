-- Debrief Beta v1: universal parse pipeline + async parse queue
-- Run after 001_schema.sql, 002_rls.sql, and 003_debrief_parsing_and_search.sql.

create extension if not exists vector;

alter table public.debriefs
  add column if not exists note_title text,
  add column if not exists note_summary text,
  add column if not exists topic_primary text,
  add column if not exists topic_secondary text,
  add column if not exists topic_tags text[] not null default '{}',
  add column if not exists action_items text[] not null default '{}',
  add column if not exists domain text,
  add column if not exists parse_status text not null default 'queued'
    check (parse_status in ('queued', 'ready', 'refining', 'needs_review', 'failed')),
  add column if not exists parse_stage smallint not null default 0
    check (parse_stage >= 0 and parse_stage <= 2),
  add column if not exists parse_confidence numeric(4,3),
  add column if not exists parse_attempts integer not null default 0
    check (parse_attempts >= 0),
  add column if not exists needs_review boolean not null default false,
  add column if not exists parser_version text not null default 'v2-universal',
  add column if not exists last_parsed_at timestamptz,
  add column if not exists embedding vector(1536);

update public.debriefs
set note_title = coalesce(
      nullif(note_title, ''),
      nullif(technique, ''),
      left(coalesce(cleaned_text, raw_notes, raw_input), 96)
    ),
    note_summary = coalesce(
      nullif(note_summary, ''),
      nullif(summary_text, ''),
      left(coalesce(reflections, cleaned_text, raw_notes, raw_input), 220)
    ),
    domain = coalesce(
      nullif(domain, ''),
      case
        when coalesce(technique_type::text, '') <> '' then 'martial_arts'
        else 'general'
      end
    ),
    topic_primary = coalesce(
      nullif(topic_primary, ''),
      nullif(technique_type::text, ''),
      'general'
    ),
    topic_secondary = coalesce(
      nullif(topic_secondary, ''),
      nullif(technique, ''),
      'note'
    ),
    parse_status = coalesce(parse_status, 'queued'),
    parse_stage = coalesce(parse_stage, 0),
    parse_attempts = coalesce(parse_attempts, 0),
    needs_review = coalesce(needs_review, false),
    parser_version = coalesce(nullif(parser_version, ''), 'v2-universal')
where note_title is null
   or note_summary is null
   or topic_primary is null
   or topic_secondary is null
   or domain is null
   or parse_status is null
   or parse_stage is null
   or parse_attempts is null
   or needs_review is null
   or parser_version is null;

create index if not exists idx_debriefs_parse_status on public.debriefs(parse_status);
create index if not exists idx_debriefs_domain on public.debriefs(domain);
create index if not exists idx_debriefs_topic_primary on public.debriefs(topic_primary);
create index if not exists idx_debriefs_topic_secondary on public.debriefs(topic_secondary);
create index if not exists idx_debriefs_topic_tags on public.debriefs using gin (topic_tags);
create index if not exists idx_debriefs_action_items on public.debriefs using gin (action_items);
create index if not exists idx_debriefs_embedding on public.debriefs
  using hnsw (embedding vector_cosine_ops);

create table if not exists public.parse_jobs (
  id uuid primary key default gen_random_uuid(),
  debrief_id uuid not null references public.debriefs(id) on delete cascade,
  stage smallint not null default 1
    check (stage >= 1 and stage <= 2),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'retry', 'done', 'failed')),
  attempts integer not null default 0
    check (attempts >= 0),
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_parse_jobs_status_run_after on public.parse_jobs(status, run_after);
create index if not exists idx_parse_jobs_debrief on public.parse_jobs(debrief_id);
create unique index if not exists idx_parse_jobs_open_unique
  on public.parse_jobs(debrief_id, stage)
  where status in ('queued', 'running', 'retry');

drop trigger if exists parse_jobs_touch_updated_at on public.parse_jobs;
create trigger parse_jobs_touch_updated_at
before update on public.parse_jobs
for each row execute function public.touch_updated_at();
