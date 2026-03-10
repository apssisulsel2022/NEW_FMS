create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'fms_status') then
    create type public.fms_status as enum ('active', 'inactive', 'archived', 'deleted');
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  name text not null unique
);

create trigger roles_set_updated_at
before update on public.roles
for each row execute function public.set_updated_at();

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  full_name text,
  avatar_url text
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  unique (user_id, role_id)
);

create index if not exists user_roles_user_id_idx on public.user_roles(user_id);
create index if not exists user_roles_role_id_idx on public.user_roles(role_id);

create trigger user_roles_set_updated_at
before update on public.user_roles
for each row execute function public.set_updated_at();

create table if not exists public.event_organizers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  owner_user_id uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  slug text not null unique
);

create index if not exists event_organizers_owner_user_id_idx on public.event_organizers(owner_user_id);

create trigger event_organizers_set_updated_at
before update on public.event_organizers
for each row execute function public.set_updated_at();

create table if not exists public.event_organizer_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'staff',
  unique (event_organizer_id, user_id)
);

create index if not exists event_organizer_members_event_organizer_id_idx on public.event_organizer_members(event_organizer_id);
create index if not exists event_organizer_members_user_id_idx on public.event_organizer_members(user_id);

create trigger event_organizer_members_set_updated_at
before update on public.event_organizer_members
for each row execute function public.set_updated_at();

create or replace function public.is_event_organizer_member(p_event_organizer_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.event_organizer_members m
    where m.event_organizer_id = p_event_organizer_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

create table if not exists public.competition_categories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  name text not null,
  slug text not null,
  unique (event_organizer_id, slug)
);

create index if not exists competition_categories_event_organizer_id_idx on public.competition_categories(event_organizer_id);

create trigger competition_categories_set_updated_at
before update on public.competition_categories
for each row execute function public.set_updated_at();

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  category_id uuid references public.competition_categories(id) on delete set null,
  name text not null,
  slug text not null,
  season text,
  start_date date,
  end_date date,
  published_at timestamptz,
  unique (event_organizer_id, slug)
);

create index if not exists competitions_event_organizer_id_idx on public.competitions(event_organizer_id);
create index if not exists competitions_category_id_idx on public.competitions(category_id);

create trigger competitions_set_updated_at
before update on public.competitions
for each row execute function public.set_updated_at();

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  competition_id uuid not null references public.competitions(id) on delete cascade,
  name text not null,
  slug text not null,
  logo_path text,
  unique (competition_id, slug)
);

create index if not exists teams_event_organizer_id_idx on public.teams(event_organizer_id);
create index if not exists teams_competition_id_idx on public.teams(competition_id);

create trigger teams_set_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  nationality text,
  gender text,
  photo_path text
);

create index if not exists players_event_organizer_id_idx on public.players(event_organizer_id);

create trigger players_set_updated_at
before update on public.players
for each row execute function public.set_updated_at();

create table if not exists public.team_players (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  jersey_number int,
  position text,
  start_date date,
  end_date date,
  unique (team_id, player_id)
);

create index if not exists team_players_event_organizer_id_idx on public.team_players(event_organizer_id);
create index if not exists team_players_team_id_idx on public.team_players(team_id);
create index if not exists team_players_player_id_idx on public.team_players(player_id);

create trigger team_players_set_updated_at
before update on public.team_players
for each row execute function public.set_updated_at();

create table if not exists public.referees (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  full_name text not null,
  email text,
  phone text
);

create index if not exists referees_event_organizer_id_idx on public.referees(event_organizer_id);

create trigger referees_set_updated_at
before update on public.referees
for each row execute function public.set_updated_at();

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  competition_id uuid not null references public.competitions(id) on delete cascade,
  home_team_id uuid not null references public.teams(id) on delete restrict,
  away_team_id uuid not null references public.teams(id) on delete restrict,
  scheduled_at timestamptz,
  venue text,
  match_status text not null default 'scheduled',
  home_score int not null default 0,
  away_score int not null default 0,
  published_report boolean not null default false
);

create index if not exists matches_event_organizer_id_idx on public.matches(event_organizer_id);
create index if not exists matches_competition_id_idx on public.matches(competition_id);
create index if not exists matches_home_team_id_idx on public.matches(home_team_id);
create index if not exists matches_away_team_id_idx on public.matches(away_team_id);

create trigger matches_set_updated_at
before update on public.matches
for each row execute function public.set_updated_at();

create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  player_id uuid references public.players(id) on delete set null,
  event_type text not null,
  minute int,
  second int,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null
);

create index if not exists match_events_event_organizer_id_idx on public.match_events(event_organizer_id);
create index if not exists match_events_match_id_idx on public.match_events(match_id);
create index if not exists match_events_team_id_idx on public.match_events(team_id);
create index if not exists match_events_player_id_idx on public.match_events(player_id);

create trigger match_events_set_updated_at
before update on public.match_events
for each row execute function public.set_updated_at();

create table if not exists public.lineups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  formation text,
  lineup jsonb not null default '{}'::jsonb,
  unique (match_id, team_id)
);

create index if not exists lineups_event_organizer_id_idx on public.lineups(event_organizer_id);
create index if not exists lineups_match_id_idx on public.lineups(match_id);
create index if not exists lineups_team_id_idx on public.lineups(team_id);

create trigger lineups_set_updated_at
before update on public.lineups
for each row execute function public.set_updated_at();

create table if not exists public.standings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  competition_id uuid not null references public.competitions(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  played int not null default 0,
  wins int not null default 0,
  draws int not null default 0,
  losses int not null default 0,
  goals_for int not null default 0,
  goals_against int not null default 0,
  goal_diff int not null default 0,
  points int not null default 0,
  unique (competition_id, team_id)
);

create index if not exists standings_event_organizer_id_idx on public.standings(event_organizer_id);
create index if not exists standings_competition_id_idx on public.standings(competition_id);
create index if not exists standings_team_id_idx on public.standings(team_id);

create trigger standings_set_updated_at
before update on public.standings
for each row execute function public.set_updated_at();

create table if not exists public.player_statistics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  competition_id uuid references public.competitions(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  stats jsonb not null default '{}'::jsonb
);

create index if not exists player_statistics_event_organizer_id_idx on public.player_statistics(event_organizer_id);
create index if not exists player_statistics_competition_id_idx on public.player_statistics(competition_id);
create index if not exists player_statistics_player_id_idx on public.player_statistics(player_id);
create index if not exists player_statistics_team_id_idx on public.player_statistics(team_id);

create trigger player_statistics_set_updated_at
before update on public.player_statistics
for each row execute function public.set_updated_at();

create table if not exists public.competition_statistics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  competition_id uuid not null references public.competitions(id) on delete cascade,
  stats jsonb not null default '{}'::jsonb,
  unique (competition_id)
);

create index if not exists competition_statistics_event_organizer_id_idx on public.competition_statistics(event_organizer_id);
create index if not exists competition_statistics_competition_id_idx on public.competition_statistics(competition_id);

create trigger competition_statistics_set_updated_at
before update on public.competition_statistics
for each row execute function public.set_updated_at();

create table if not exists public.generated_media (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  competition_id uuid references public.competitions(id) on delete cascade,
  match_id uuid references public.matches(id) on delete cascade,
  media_type text not null,
  storage_path text not null,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists generated_media_event_organizer_id_idx on public.generated_media(event_organizer_id);
create index if not exists generated_media_competition_id_idx on public.generated_media(competition_id);
create index if not exists generated_media_match_id_idx on public.generated_media(match_id);

create trigger generated_media_set_updated_at
before update on public.generated_media
for each row execute function public.set_updated_at();

create table if not exists public.player_verifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  verification_type text not null,
  document_path text,
  ai_result jsonb not null default '{}'::jsonb,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz
);

create index if not exists player_verifications_event_organizer_id_idx on public.player_verifications(event_organizer_id);
create index if not exists player_verifications_player_id_idx on public.player_verifications(player_id);

create trigger player_verifications_set_updated_at
before update on public.player_verifications
for each row execute function public.set_updated_at();

create table if not exists public.face_recognition_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  match_id uuid references public.matches(id) on delete set null,
  input_path text,
  result jsonb not null default '{}'::jsonb
);

create index if not exists face_recognition_logs_event_organizer_id_idx on public.face_recognition_logs(event_organizer_id);
create index if not exists face_recognition_logs_player_id_idx on public.face_recognition_logs(player_id);
create index if not exists face_recognition_logs_match_id_idx on public.face_recognition_logs(match_id);

create trigger face_recognition_logs_set_updated_at
before update on public.face_recognition_logs
for each row execute function public.set_updated_at();

create table if not exists public.automation_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  competition_id uuid references public.competitions(id) on delete cascade,
  job_type text not null,
  job_status text not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  attempts int not null default 0,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text
);

create index if not exists automation_jobs_event_organizer_id_idx on public.automation_jobs(event_organizer_id);
create index if not exists automation_jobs_competition_id_idx on public.automation_jobs(competition_id);
create index if not exists automation_jobs_job_status_run_after_idx on public.automation_jobs(job_status, run_after);

create trigger automation_jobs_set_updated_at
before update on public.automation_jobs
for each row execute function public.set_updated_at();

create or replace function public.enqueue_competition_publish_jobs()
returns trigger
language plpgsql
as $$
begin
  if (old.published_at is null and new.published_at is not null) then
    insert into public.automation_jobs (event_organizer_id, competition_id, job_type, payload)
    values
      (new.event_organizer_id, new.id, 'fixture_generate', '{}'::jsonb),
      (new.event_organizer_id, new.id, 'standings_initialize', '{}'::jsonb),
      (new.event_organizer_id, new.id, 'website_enable', '{}'::jsonb),
      (new.event_organizer_id, new.id, 'media_enable', '{}'::jsonb);
  end if;
  return new;
end;
$$;

drop trigger if exists competitions_enqueue_publish_jobs on public.competitions;
create trigger competitions_enqueue_publish_jobs
after update of published_at on public.competitions
for each row execute function public.enqueue_competition_publish_jobs();

alter table public.roles enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.event_organizers enable row level security;
alter table public.event_organizer_members enable row level security;
alter table public.competition_categories enable row level security;
alter table public.competitions enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.team_players enable row level security;
alter table public.referees enable row level security;
alter table public.matches enable row level security;
alter table public.match_events enable row level security;
alter table public.lineups enable row level security;
alter table public.standings enable row level security;
alter table public.player_statistics enable row level security;
alter table public.competition_statistics enable row level security;
alter table public.generated_media enable row level security;
alter table public.player_verifications enable row level security;
alter table public.face_recognition_logs enable row level security;
alter table public.automation_jobs enable row level security;

create policy roles_read_authenticated
on public.roles
for select
to authenticated
using (true);

create policy profiles_read_self
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy profiles_upsert_self
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy profiles_update_self
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy user_roles_read_self
on public.user_roles
for select
to authenticated
using (user_id = auth.uid());

create policy event_organizers_create_owner
on public.event_organizers
for insert
to authenticated
with check (owner_user_id = auth.uid());

create policy event_organizers_read_member
on public.event_organizers
for select
to authenticated
using (public.is_event_organizer_member(id) or owner_user_id = auth.uid());

create policy event_organizers_update_owner
on public.event_organizers
for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy event_organizer_members_read_member
on public.event_organizer_members
for select
to authenticated
using (public.is_event_organizer_member(event_organizer_id));

create policy event_organizer_members_manage_owner
on public.event_organizer_members
for all
to authenticated
using (
  exists (
    select 1
    from public.event_organizers eo
    where eo.id = event_organizer_members.event_organizer_id
      and eo.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.event_organizers eo
    where eo.id = event_organizer_members.event_organizer_id
      and eo.owner_user_id = auth.uid()
  )
);

create policy competition_categories_crud_member
on public.competition_categories
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy competitions_crud_member
on public.competitions
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy competitions_read_public_published
on public.competitions
for select
to anon
using (published_at is not null and status = 'active');

create policy teams_crud_member
on public.teams
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy teams_read_public_published
on public.teams
for select
to anon
using (
  exists (
    select 1
    from public.competitions c
    where c.id = teams.competition_id
      and c.published_at is not null
      and c.status = 'active'
  )
);

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

create policy referees_crud_member
on public.referees
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy matches_crud_member
on public.matches
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy matches_read_public_published
on public.matches
for select
to anon
using (
  exists (
    select 1
    from public.competitions c
    where c.id = matches.competition_id
      and c.published_at is not null
      and c.status = 'active'
  )
);

create policy match_events_crud_member
on public.match_events
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy match_events_read_public_published
on public.match_events
for select
to anon
using (
  exists (
    select 1
    from public.matches m
    join public.competitions c on c.id = m.competition_id
    where m.id = match_events.match_id
      and c.published_at is not null
      and c.status = 'active'
  )
);

create policy lineups_crud_member
on public.lineups
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy standings_crud_member
on public.standings
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy standings_read_public_published
on public.standings
for select
to anon
using (
  exists (
    select 1
    from public.competitions c
    where c.id = standings.competition_id
      and c.published_at is not null
      and c.status = 'active'
  )
);

create policy player_statistics_crud_member
on public.player_statistics
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy competition_statistics_crud_member
on public.competition_statistics
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy generated_media_crud_member
on public.generated_media
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy player_verifications_crud_member
on public.player_verifications
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy face_recognition_logs_crud_member
on public.face_recognition_logs
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy automation_jobs_crud_member
on public.automation_jobs
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

insert into public.roles (name)
values
  ('super_admin'),
  ('event_organizer'),
  ('team_manager'),
  ('referee'),
  ('public_viewer')
on conflict (name) do nothing;
