do $$
begin
  if not exists (select 1 from pg_type where typname = 'player_verification_status') then
    create type public.player_verification_status as enum ('draft', 'submitted', 'in_review', 'approved', 'rejected', 'appealed');
  end if;

  if not exists (select 1 from pg_type where typname = 'player_verification_doc_type') then
    create type public.player_verification_doc_type as enum ('government_id_front', 'government_id_back', 'selfie', 'live_capture');
  end if;

  if not exists (select 1 from pg_type where typname = 'player_verification_ai_status') then
    create type public.player_verification_ai_status as enum ('not_started', 'queued', 'completed', 'failed');
  end if;
end $$;

alter table public.players
  add column if not exists verification_status text not null default 'unverified',
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists last_verification_request_id uuid;

create index if not exists players_verification_status_idx on public.players(event_organizer_id, verification_status);

create table if not exists public.player_verification_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  team_profile_id uuid references public.team_profiles(id) on delete set null,
  player_id uuid not null references public.players(id) on delete cascade,
  workflow_status public.player_verification_status not null default 'draft',
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  submitted_at timestamptz,
  ai_status public.player_verification_ai_status not null default 'not_started',
  ai_result jsonb not null default '{}'::jsonb,
  decided_at timestamptz,
  decided_by_user_id uuid references public.profiles(id) on delete set null,
  decision text,
  decision_reason text,
  decision_notes text,
  appeal_message text,
  appeal_submitted_at timestamptz,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists player_verification_requests_event_organizer_id_idx
on public.player_verification_requests(event_organizer_id, workflow_status, created_at desc);
create index if not exists player_verification_requests_team_profile_id_idx
on public.player_verification_requests(team_profile_id, workflow_status, created_at desc);
create index if not exists player_verification_requests_player_id_idx
on public.player_verification_requests(player_id, created_at desc);

create trigger player_verification_requests_set_updated_at
before update on public.player_verification_requests
for each row execute function public.set_updated_at();

create table if not exists public.player_verification_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  request_id uuid not null references public.player_verification_requests(id) on delete cascade,
  doc_type public.player_verification_doc_type not null,
  content_encrypted text not null,
  content_sha256 text not null,
  mime_type text,
  file_name text,
  file_size_bytes int,
  captured_at timestamptz,
  uploaded_by_user_id uuid references public.profiles(id) on delete set null,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists player_verification_documents_request_id_idx
on public.player_verification_documents(request_id, created_at desc);
create index if not exists player_verification_documents_event_organizer_id_idx
on public.player_verification_documents(event_organizer_id, created_at desc);

create trigger player_verification_documents_set_updated_at
before update on public.player_verification_documents
for each row execute function public.set_updated_at();

create table if not exists public.player_verification_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  request_id uuid not null references public.player_verification_requests(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb
);

create index if not exists player_verification_events_request_id_idx
on public.player_verification_events(request_id, created_at desc);

create or replace view public.player_verification_metrics_summary as
select
  r.event_organizer_id,
  count(*) filter (where r.workflow_status = 'submitted' or r.workflow_status = 'in_review' or r.workflow_status = 'appealed') as pending_total,
  count(*) filter (where r.workflow_status = 'approved') as approved_total,
  count(*) filter (where r.workflow_status = 'rejected') as rejected_total,
  avg(extract(epoch from (r.decided_at - r.submitted_at))) filter (where r.decided_at is not null and r.submitted_at is not null) as avg_time_seconds,
  count(*) filter (where r.decided_by_user_id is not null) as decided_total
from public.player_verification_requests r
group by r.event_organizer_id;

alter table public.player_verification_requests enable row level security;
alter table public.player_verification_documents enable row level security;
alter table public.player_verification_events enable row level security;

create policy player_verification_requests_crud_member
on public.player_verification_requests
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy player_verification_requests_team_read
on public.player_verification_requests
for select
to authenticated
using (team_profile_id is not null and public.is_team_member(team_profile_id));

create policy player_verification_requests_team_insert
on public.player_verification_requests
for insert
to authenticated
with check (team_profile_id is not null and public.is_team_member(team_profile_id));

create policy player_verification_requests_team_update
on public.player_verification_requests
for update
to authenticated
using (team_profile_id is not null and public.is_team_member(team_profile_id))
with check (team_profile_id is not null and public.is_team_member(team_profile_id));

create policy player_verification_documents_crud_member
on public.player_verification_documents
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy player_verification_documents_team_read
on public.player_verification_documents
for select
to authenticated
using (
  exists (
    select 1
    from public.player_verification_requests r
    where r.id = player_verification_documents.request_id
      and r.team_profile_id is not null
      and public.is_team_member(r.team_profile_id)
  )
);

create policy player_verification_documents_team_insert
on public.player_verification_documents
for insert
to authenticated
with check (
  exists (
    select 1
    from public.player_verification_requests r
    where r.id = player_verification_documents.request_id
      and r.team_profile_id is not null
      and public.is_team_member(r.team_profile_id)
  )
);

create policy player_verification_events_read_member
on public.player_verification_events
for select
to authenticated
using (public.is_event_organizer_member(event_organizer_id));

create policy player_verification_events_insert_member
on public.player_verification_events
for insert
to authenticated
with check (public.is_event_organizer_member(event_organizer_id));

drop trigger if exists audit_player_verification_requests on public.player_verification_requests;
create trigger audit_player_verification_requests
after insert or update or delete on public.player_verification_requests
for each row execute function public.audit_row_change();

drop trigger if exists audit_player_verification_documents on public.player_verification_documents;
create trigger audit_player_verification_documents
after insert or update or delete on public.player_verification_documents
for each row execute function public.audit_row_change();

drop trigger if exists audit_player_verification_events on public.player_verification_events;
create trigger audit_player_verification_events
after insert or update or delete on public.player_verification_events
for each row execute function public.audit_row_change();

