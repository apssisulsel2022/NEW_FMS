do $$
begin
  if not exists (select 1 from pg_type where typname = 'competition_state') then
    create type public.competition_state as enum ('draft', 'preview', 'published', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'participant_type') then
    create type public.participant_type as enum ('team', 'player', 'user');
  end if;

  if not exists (select 1 from pg_type where typname = 'import_job_status') then
    create type public.import_job_status as enum ('queued', 'running', 'completed', 'failed');
  end if;
end $$;

alter table public.competitions
  add column if not exists description text,
  add column if not exists description_i18n jsonb not null default '{}'::jsonb,
  add column if not exists name_i18n jsonb not null default '{}'::jsonb,
  add column if not exists registration_opens_at timestamptz,
  add column if not exists registration_closes_at timestamptz,
  add column if not exists participant_limit int,
  add column if not exists prize_structure jsonb not null default '{}'::jsonb,
  add column if not exists eligibility_criteria jsonb not null default '{}'::jsonb,
  add column if not exists judging_criteria jsonb not null default '{}'::jsonb,
  add column if not exists entry_fee_cents int,
  add column if not exists currency text,
  add column if not exists allow_public_registration boolean not null default false,
  add column if not exists default_locale text not null default 'en',
  add column if not exists state public.competition_state not null default 'draft';

alter table public.competitions
  add constraint if not exists competitions_registration_window_ck
  check (registration_opens_at is null or registration_closes_at is null or registration_opens_at <= registration_closes_at);

alter table public.competitions
  add constraint if not exists competitions_participant_limit_ck
  check (participant_limit is null or participant_limit >= 2);

create index if not exists competitions_state_idx on public.competitions(state);
create index if not exists competitions_registration_closes_at_idx on public.competitions(registration_closes_at);

create table if not exists public.competition_templates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid references public.event_organizers(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  payload jsonb not null default '{}'::jsonb,
  unique (event_organizer_id, code)
);

create unique index if not exists competition_templates_global_code_uq
on public.competition_templates(code)
where event_organizer_id is null;

create index if not exists competition_templates_event_organizer_id_idx
on public.competition_templates(event_organizer_id);

create trigger competition_templates_set_updated_at
before update on public.competition_templates
for each row execute function public.set_updated_at();

create table if not exists public.competition_drafts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  template_id uuid references public.competition_templates(id) on delete set null,
  step int not null default 1,
  payload jsonb not null default '{}'::jsonb,
  preview_enabled boolean not null default false,
  published_competition_id uuid references public.competitions(id) on delete set null
);

create index if not exists competition_drafts_event_organizer_id_idx
on public.competition_drafts(event_organizer_id, updated_at desc);
create index if not exists competition_drafts_created_by_user_id_idx
on public.competition_drafts(created_by_user_id, updated_at desc);

create trigger competition_drafts_set_updated_at
before update on public.competition_drafts
for each row execute function public.set_updated_at();

create table if not exists public.competition_participants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  competition_id uuid not null references public.competitions(id) on delete cascade,
  participant_type public.participant_type not null default 'team',
  team_id uuid references public.teams(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  registered_at timestamptz not null default now(),
  registration_status text not null default 'registered',
  payment_status text not null default 'not_required',
  external_ref text,
  meta jsonb not null default '{}'::jsonb
);

alter table public.competition_participants
  add constraint if not exists competition_participants_one_ref_ck
  check (
    (participant_type = 'team' and team_id is not null and player_id is null and user_id is null)
    or
    (participant_type = 'player' and player_id is not null and team_id is null and user_id is null)
    or
    (participant_type = 'user' and user_id is not null and team_id is null and player_id is null)
  );

create unique index if not exists competition_participants_unique_team
on public.competition_participants(competition_id, team_id)
where team_id is not null;
create unique index if not exists competition_participants_unique_player
on public.competition_participants(competition_id, player_id)
where player_id is not null;
create unique index if not exists competition_participants_unique_user
on public.competition_participants(competition_id, user_id)
where user_id is not null;

create index if not exists competition_participants_event_organizer_id_idx
on public.competition_participants(event_organizer_id, competition_id, created_at desc);

create trigger competition_participants_set_updated_at
before update on public.competition_participants
for each row execute function public.set_updated_at();

create table if not exists public.competition_participant_import_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  competition_id uuid not null references public.competitions(id) on delete cascade,
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  job_status public.import_job_status not null default 'queued',
  source_type text not null default 'csv',
  source_meta jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb
);

create index if not exists competition_participant_import_jobs_event_organizer_id_idx
on public.competition_participant_import_jobs(event_organizer_id, created_at desc);
create index if not exists competition_participant_import_jobs_competition_id_idx
on public.competition_participant_import_jobs(competition_id, created_at desc);

create trigger competition_participant_import_jobs_set_updated_at
before update on public.competition_participant_import_jobs
for each row execute function public.set_updated_at();

create table if not exists public.competition_status_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  competition_id uuid not null references public.competitions(id) on delete cascade,
  from_state public.competition_state,
  to_state public.competition_state not null,
  actor_user_id uuid references public.profiles(id) on delete set null,
  details jsonb not null default '{}'::jsonb
);

create index if not exists competition_status_history_competition_id_idx
on public.competition_status_history(competition_id, created_at desc);

create or replace function public.track_competition_state_change()
returns trigger
language plpgsql
as $$
begin
  if new.state is distinct from old.state then
    insert into public.competition_status_history (event_organizer_id, competition_id, from_state, to_state, actor_user_id, details)
    values (
      new.event_organizer_id,
      new.id,
      old.state,
      new.state,
      auth.uid(),
      jsonb_build_object('published_at', new.published_at)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists competitions_track_state_change on public.competitions;
create trigger competitions_track_state_change
after update of state on public.competitions
for each row execute function public.track_competition_state_change();

create or replace view public.competition_analytics_summary as
select
  c.id as competition_id,
  c.event_organizer_id,
  c.state,
  c.published_at,
  c.registration_opens_at,
  c.registration_closes_at,
  (select count(*) from public.competition_participants p where p.competition_id = c.id and p.status = 'active') as participants_total,
  (select count(*) from public.competition_participants p where p.competition_id = c.id and p.status = 'active' and p.participant_type = 'team') as teams_total,
  (select count(*) from public.competition_participants p where p.competition_id = c.id and p.status = 'active' and p.participant_type = 'player') as players_total,
  (select count(*) from public.matches m where m.competition_id = c.id and m.status = 'active') as matches_total,
  (select count(*) from public.notifications n where n.event_organizer_id = c.event_organizer_id and (n.payload->>'competitionId')::uuid = c.id) as notifications_total
from public.competitions c;

alter table public.competition_templates enable row level security;
alter table public.competition_drafts enable row level security;
alter table public.competition_participants enable row level security;
alter table public.competition_participant_import_jobs enable row level security;
alter table public.competition_status_history enable row level security;

alter table public.competitions enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.players enable row level security;
alter table public.team_players enable row level security;

create policy competitions_read_published_anon
on public.competitions
for select
to anon
using (published_at is not null);

create policy competitions_crud_member
on public.competitions
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy teams_read_published_anon
on public.teams
for select
to anon
using (exists (select 1 from public.competitions c where c.id = teams.competition_id and c.published_at is not null));

create policy teams_crud_member
on public.teams
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy matches_read_published_anon
on public.matches
for select
to anon
using (exists (select 1 from public.competitions c where c.id = matches.competition_id and c.published_at is not null));

create policy matches_crud_member
on public.matches
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy players_crud_member
on public.players
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy team_players_crud_member
on public.team_players
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy competition_templates_read_authenticated
on public.competition_templates
for select
to authenticated
using (event_organizer_id is null or public.is_event_organizer_member(event_organizer_id));

create policy competition_templates_crud_member
on public.competition_templates
for insert, update, delete
to authenticated
using (event_organizer_id is not null and public.is_event_organizer_member(event_organizer_id))
with check (event_organizer_id is not null and public.is_event_organizer_member(event_organizer_id));

create policy competition_templates_manage_global_super_admin
on public.competition_templates
for insert, update, delete
to authenticated
using (event_organizer_id is null and public.is_super_admin())
with check (event_organizer_id is null and public.is_super_admin());

create policy competition_drafts_crud_member
on public.competition_drafts
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy competition_participants_crud_member
on public.competition_participants
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy competition_participant_import_jobs_crud_member
on public.competition_participant_import_jobs
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy competition_status_history_read_member
on public.competition_status_history
for select
to authenticated
using (public.is_event_organizer_member(event_organizer_id));

create policy competition_status_history_insert_member
on public.competition_status_history
for insert
to authenticated
with check (public.is_event_organizer_member(event_organizer_id));

drop trigger if exists audit_competitions on public.competitions;
create trigger audit_competitions
after insert or update or delete on public.competitions
for each row execute function public.audit_row_change();

drop trigger if exists audit_competition_templates on public.competition_templates;
create trigger audit_competition_templates
after insert or update or delete on public.competition_templates
for each row execute function public.audit_row_change();

drop trigger if exists audit_competition_drafts on public.competition_drafts;
create trigger audit_competition_drafts
after insert or update or delete on public.competition_drafts
for each row execute function public.audit_row_change();

drop trigger if exists audit_competition_participants on public.competition_participants;
create trigger audit_competition_participants
after insert or update or delete on public.competition_participants
for each row execute function public.audit_row_change();

drop trigger if exists audit_competition_participant_import_jobs on public.competition_participant_import_jobs;
create trigger audit_competition_participant_import_jobs
after insert or update or delete on public.competition_participant_import_jobs
for each row execute function public.audit_row_change();

