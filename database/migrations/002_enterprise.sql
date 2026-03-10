do $$
begin
  if not exists (select 1 from pg_type where typname = 'match_status_enum') then
    create type public.match_status_enum as enum ('scheduled', 'live', 'finished', 'cancelled', 'postponed');
  end if;
  if not exists (select 1 from pg_type where typname = 'competition_stage_type') then
    create type public.competition_stage_type as enum ('league', 'group', 'knockout', 'playoff');
  end if;
  if not exists (select 1 from pg_type where typname = 'media_asset_type') then
    create type public.media_asset_type as enum ('image', 'video', 'audio', 'document');
  end if;
end $$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and ur.status = 'active'
      and r.name = 'super_admin'
  );
$$;

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  code text not null unique,
  description text
);

create trigger permissions_set_updated_at
before update on public.permissions
for each row execute function public.set_updated_at();

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  unique (role_id, permission_id)
);

create index if not exists role_permissions_role_id_idx on public.role_permissions(role_id);
create index if not exists role_permissions_permission_id_idx on public.role_permissions(permission_id);

create trigger role_permissions_set_updated_at
before update on public.role_permissions
for each row execute function public.set_updated_at();

create table if not exists public.event_organizer_roles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  name text not null,
  unique (event_organizer_id, name)
);

create index if not exists event_organizer_roles_event_organizer_id_idx on public.event_organizer_roles(event_organizer_id);

create trigger event_organizer_roles_set_updated_at
before update on public.event_organizer_roles
for each row execute function public.set_updated_at();

create table if not exists public.event_organizer_user_roles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_organizer_role_id uuid not null references public.event_organizer_roles(id) on delete cascade,
  unique (event_organizer_id, user_id, event_organizer_role_id)
);

create index if not exists event_organizer_user_roles_event_organizer_id_idx on public.event_organizer_user_roles(event_organizer_id);
create index if not exists event_organizer_user_roles_user_id_idx on public.event_organizer_user_roles(user_id);
create index if not exists event_organizer_user_roles_event_organizer_role_id_idx on public.event_organizer_user_roles(event_organizer_role_id);

create trigger event_organizer_user_roles_set_updated_at
before update on public.event_organizer_user_roles
for each row execute function public.set_updated_at();

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  name text not null,
  key_hash text not null,
  last_used_at timestamptz,
  expires_at timestamptz
);

create index if not exists api_keys_event_organizer_id_idx on public.api_keys(event_organizer_id);
create index if not exists api_keys_key_hash_idx on public.api_keys(key_hash);

create trigger api_keys_set_updated_at
before update on public.api_keys
for each row execute function public.set_updated_at();

create table if not exists public.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  request_key text not null,
  request_hash text not null,
  response_status int,
  response_body jsonb,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  unique (event_organizer_id, request_key)
);

create index if not exists idempotency_keys_event_organizer_id_idx on public.idempotency_keys(event_organizer_id);
create index if not exists idempotency_keys_user_id_idx on public.idempotency_keys(user_id);
create index if not exists idempotency_keys_expires_at_idx on public.idempotency_keys(expires_at);

create trigger idempotency_keys_set_updated_at
before update on public.idempotency_keys
for each row execute function public.set_updated_at();

create table if not exists public.tenant_settings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  unique (event_organizer_id)
);

create index if not exists tenant_settings_event_organizer_id_idx on public.tenant_settings(event_organizer_id);

create trigger tenant_settings_set_updated_at
before update on public.tenant_settings
for each row execute function public.set_updated_at();

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid references public.event_organizers(id) on delete cascade,
  key text not null,
  enabled boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  unique (event_organizer_id, key)
);

create index if not exists feature_flags_event_organizer_id_idx on public.feature_flags(event_organizer_id);
create index if not exists feature_flags_key_idx on public.feature_flags(key);

create trigger feature_flags_set_updated_at
before update on public.feature_flags
for each row execute function public.set_updated_at();

create table if not exists public.audit_log (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_organizer_id uuid references public.event_organizers(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  request_id uuid,
  ip inet,
  user_agent text,
  details jsonb not null default '{}'::jsonb,
  primary key (id, created_at)
) partition by range (created_at);

create table if not exists public.audit_log_default
partition of public.audit_log default;

create index if not exists audit_log_event_organizer_id_created_at_idx on public.audit_log(event_organizer_id, created_at desc);
create index if not exists audit_log_actor_user_id_created_at_idx on public.audit_log(actor_user_id, created_at desc);
create index if not exists audit_log_entity_type_entity_id_created_at_idx on public.audit_log(entity_type, entity_id, created_at desc);

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  name text not null,
  address text,
  city text,
  country text,
  latitude double precision,
  longitude double precision,
  unique (event_organizer_id, name)
);

create index if not exists venues_event_organizer_id_idx on public.venues(event_organizer_id);

create trigger venues_set_updated_at
before update on public.venues
for each row execute function public.set_updated_at();

create table if not exists public.venue_fields (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete cascade,
  name text not null,
  surface_type text,
  length_m numeric,
  width_m numeric,
  unique (venue_id, name)
);

create index if not exists venue_fields_event_organizer_id_idx on public.venue_fields(event_organizer_id);
create index if not exists venue_fields_venue_id_idx on public.venue_fields(venue_id);

create trigger venue_fields_set_updated_at
before update on public.venue_fields
for each row execute function public.set_updated_at();

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  name text not null,
  starts_on date,
  ends_on date,
  unique (event_organizer_id, name)
);

create index if not exists seasons_event_organizer_id_idx on public.seasons(event_organizer_id);

create trigger seasons_set_updated_at
before update on public.seasons
for each row execute function public.set_updated_at();

create table if not exists public.competition_seasons (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  competition_id uuid not null references public.competitions(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete restrict,
  unique (competition_id, season_id)
);

create index if not exists competition_seasons_event_organizer_id_idx on public.competition_seasons(event_organizer_id);
create index if not exists competition_seasons_competition_id_idx on public.competition_seasons(competition_id);
create index if not exists competition_seasons_season_id_idx on public.competition_seasons(season_id);

create trigger competition_seasons_set_updated_at
before update on public.competition_seasons
for each row execute function public.set_updated_at();

create table if not exists public.competition_stages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  competition_id uuid not null references public.competitions(id) on delete cascade,
  stage_type public.competition_stage_type not null default 'league',
  name text not null,
  stage_order int not null default 0,
  unique (competition_id, name)
);

create index if not exists competition_stages_event_organizer_id_idx on public.competition_stages(event_organizer_id);
create index if not exists competition_stages_competition_id_idx on public.competition_stages(competition_id);

create trigger competition_stages_set_updated_at
before update on public.competition_stages
for each row execute function public.set_updated_at();

create table if not exists public.competition_groups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  competition_stage_id uuid not null references public.competition_stages(id) on delete cascade,
  name text not null,
  group_order int not null default 0,
  unique (competition_stage_id, name)
);

create index if not exists competition_groups_event_organizer_id_idx on public.competition_groups(event_organizer_id);
create index if not exists competition_groups_competition_stage_id_idx on public.competition_groups(competition_stage_id);

create trigger competition_groups_set_updated_at
before update on public.competition_groups
for each row execute function public.set_updated_at();

create table if not exists public.competition_group_teams (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  competition_group_id uuid not null references public.competition_groups(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  seed int,
  unique (competition_group_id, team_id)
);

create index if not exists competition_group_teams_event_organizer_id_idx on public.competition_group_teams(event_organizer_id);
create index if not exists competition_group_teams_competition_group_id_idx on public.competition_group_teams(competition_group_id);
create index if not exists competition_group_teams_team_id_idx on public.competition_group_teams(team_id);

create trigger competition_group_teams_set_updated_at
before update on public.competition_group_teams
for each row execute function public.set_updated_at();

create table if not exists public.competition_rounds (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  competition_stage_id uuid not null references public.competition_stages(id) on delete cascade,
  name text not null,
  round_order int not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  unique (competition_stage_id, name)
);

create index if not exists competition_rounds_event_organizer_id_idx on public.competition_rounds(event_organizer_id);
create index if not exists competition_rounds_competition_stage_id_idx on public.competition_rounds(competition_stage_id);

create trigger competition_rounds_set_updated_at
before update on public.competition_rounds
for each row execute function public.set_updated_at();

create table if not exists public.round_matches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  competition_round_id uuid not null references public.competition_rounds(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  match_order int not null default 0,
  unique (competition_round_id, match_id)
);

create index if not exists round_matches_event_organizer_id_idx on public.round_matches(event_organizer_id);
create index if not exists round_matches_competition_round_id_idx on public.round_matches(competition_round_id);
create index if not exists round_matches_match_id_idx on public.round_matches(match_id);

create trigger round_matches_set_updated_at
before update on public.round_matches
for each row execute function public.set_updated_at();

create table if not exists public.team_staff_roles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  name text not null,
  unique (event_organizer_id, name)
);

create index if not exists team_staff_roles_event_organizer_id_idx on public.team_staff_roles(event_organizer_id);

create trigger team_staff_roles_set_updated_at
before update on public.team_staff_roles
for each row execute function public.set_updated_at();

create table if not exists public.team_staff_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  staff_role_id uuid not null references public.team_staff_roles(id) on delete restrict,
  full_name text not null,
  email text,
  phone text
);

create index if not exists team_staff_members_event_organizer_id_idx on public.team_staff_members(event_organizer_id);
create index if not exists team_staff_members_team_id_idx on public.team_staff_members(team_id);
create index if not exists team_staff_members_staff_role_id_idx on public.team_staff_members(staff_role_id);

create trigger team_staff_members_set_updated_at
before update on public.team_staff_members
for each row execute function public.set_updated_at();

create table if not exists public.player_positions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  code text not null unique,
  name text not null
);

create trigger player_positions_set_updated_at
before update on public.player_positions
for each row execute function public.set_updated_at();

create table if not exists public.player_position_links (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  position_id uuid not null references public.player_positions(id) on delete restrict,
  is_primary boolean not null default false,
  unique (player_id, position_id)
);

create index if not exists player_position_links_event_organizer_id_idx on public.player_position_links(event_organizer_id);
create index if not exists player_position_links_player_id_idx on public.player_position_links(player_id);
create index if not exists player_position_links_position_id_idx on public.player_position_links(position_id);

create trigger player_position_links_set_updated_at
before update on public.player_position_links
for each row execute function public.set_updated_at();

create table if not exists public.player_addresses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  address_line1 text,
  address_line2 text,
  city text,
  region text,
  postal_code text,
  country text
);

create index if not exists player_addresses_event_organizer_id_idx on public.player_addresses(event_organizer_id);
create index if not exists player_addresses_player_id_idx on public.player_addresses(player_id);

create trigger player_addresses_set_updated_at
before update on public.player_addresses
for each row execute function public.set_updated_at();

create table if not exists public.player_emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  full_name text not null,
  relationship text,
  phone text,
  email text
);

create index if not exists player_emergency_contacts_event_organizer_id_idx on public.player_emergency_contacts(event_organizer_id);
create index if not exists player_emergency_contacts_player_id_idx on public.player_emergency_contacts(player_id);

create trigger player_emergency_contacts_set_updated_at
before update on public.player_emergency_contacts
for each row execute function public.set_updated_at();

create table if not exists public.player_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  doc_type text not null,
  storage_path text not null,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists player_documents_event_organizer_id_idx on public.player_documents(event_organizer_id);
create index if not exists player_documents_player_id_idx on public.player_documents(player_id);

create trigger player_documents_set_updated_at
before update on public.player_documents
for each row execute function public.set_updated_at();

create table if not exists public.player_medical_records (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  record_type text not null,
  recorded_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb
);

create index if not exists player_medical_records_event_organizer_id_idx on public.player_medical_records(event_organizer_id);
create index if not exists player_medical_records_player_id_idx on public.player_medical_records(player_id);
create index if not exists player_medical_records_recorded_at_idx on public.player_medical_records(recorded_at desc);

create trigger player_medical_records_set_updated_at
before update on public.player_medical_records
for each row execute function public.set_updated_at();

create table if not exists public.player_injuries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  injury_type text not null,
  occurred_at timestamptz,
  recovered_at timestamptz,
  details jsonb not null default '{}'::jsonb
);

create index if not exists player_injuries_event_organizer_id_idx on public.player_injuries(event_organizer_id);
create index if not exists player_injuries_player_id_idx on public.player_injuries(player_id);
create index if not exists player_injuries_occurred_at_idx on public.player_injuries(occurred_at desc);

create trigger player_injuries_set_updated_at
before update on public.player_injuries
for each row execute function public.set_updated_at();

create table if not exists public.player_suspensions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  reason text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists player_suspensions_event_organizer_id_idx on public.player_suspensions(event_organizer_id);
create index if not exists player_suspensions_player_id_idx on public.player_suspensions(player_id);

create trigger player_suspensions_set_updated_at
before update on public.player_suspensions
for each row execute function public.set_updated_at();

create table if not exists public.player_biometrics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  biometric_type text not null,
  encrypted_payload bytea,
  meta jsonb not null default '{}'::jsonb,
  unique (player_id, biometric_type)
);

create index if not exists player_biometrics_event_organizer_id_idx on public.player_biometrics(event_organizer_id);
create index if not exists player_biometrics_player_id_idx on public.player_biometrics(player_id);

create trigger player_biometrics_set_updated_at
before update on public.player_biometrics
for each row execute function public.set_updated_at();

create table if not exists public.match_periods (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  period_number int not null,
  starts_at timestamptz,
  ends_at timestamptz,
  unique (match_id, period_number)
);

create index if not exists match_periods_event_organizer_id_idx on public.match_periods(event_organizer_id);
create index if not exists match_periods_match_id_idx on public.match_periods(match_id);

create trigger match_periods_set_updated_at
before update on public.match_periods
for each row execute function public.set_updated_at();

create table if not exists public.match_official_roles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  code text not null unique,
  name text not null
);

create trigger match_official_roles_set_updated_at
before update on public.match_official_roles
for each row execute function public.set_updated_at();

create table if not exists public.match_official_assignments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  referee_id uuid not null references public.referees(id) on delete restrict,
  official_role_id uuid not null references public.match_official_roles(id) on delete restrict,
  unique (match_id, referee_id, official_role_id)
);

create index if not exists match_official_assignments_event_organizer_id_idx on public.match_official_assignments(event_organizer_id);
create index if not exists match_official_assignments_match_id_idx on public.match_official_assignments(match_id);
create index if not exists match_official_assignments_referee_id_idx on public.match_official_assignments(referee_id);

create trigger match_official_assignments_set_updated_at
before update on public.match_official_assignments
for each row execute function public.set_updated_at();

create table if not exists public.match_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  submitted_by uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz,
  report jsonb not null default '{}'::jsonb,
  unique (match_id)
);

create index if not exists match_reports_event_organizer_id_idx on public.match_reports(event_organizer_id);
create index if not exists match_reports_match_id_idx on public.match_reports(match_id);

create trigger match_reports_set_updated_at
before update on public.match_reports
for each row execute function public.set_updated_at();

create table if not exists public.match_lineups_v2 (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  formation text,
  unique (match_id, team_id)
);

create index if not exists match_lineups_v2_event_organizer_id_idx on public.match_lineups_v2(event_organizer_id);
create index if not exists match_lineups_v2_match_id_idx on public.match_lineups_v2(match_id);
create index if not exists match_lineups_v2_team_id_idx on public.match_lineups_v2(team_id);

create trigger match_lineups_v2_set_updated_at
before update on public.match_lineups_v2
for each row execute function public.set_updated_at();

create table if not exists public.match_lineup_players (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  match_lineup_id uuid not null references public.match_lineups_v2(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete restrict,
  jersey_number int,
  position_code text,
  is_starting boolean not null default true,
  unique (match_lineup_id, player_id)
);

create index if not exists match_lineup_players_event_organizer_id_idx on public.match_lineup_players(event_organizer_id);
create index if not exists match_lineup_players_match_lineup_id_idx on public.match_lineup_players(match_lineup_id);
create index if not exists match_lineup_players_player_id_idx on public.match_lineup_players(player_id);

create trigger match_lineup_players_set_updated_at
before update on public.match_lineup_players
for each row execute function public.set_updated_at();

create table if not exists public.match_substitutions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_out_id uuid references public.players(id) on delete set null,
  player_in_id uuid references public.players(id) on delete set null,
  minute int,
  second int,
  reason text
);

create index if not exists match_substitutions_event_organizer_id_idx on public.match_substitutions(event_organizer_id);
create index if not exists match_substitutions_match_id_idx on public.match_substitutions(match_id);
create index if not exists match_substitutions_team_id_idx on public.match_substitutions(team_id);

create trigger match_substitutions_set_updated_at
before update on public.match_substitutions
for each row execute function public.set_updated_at();

create table if not exists public.match_goals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  scoring_team_id uuid not null references public.teams(id) on delete cascade,
  scorer_player_id uuid references public.players(id) on delete set null,
  assist_player_id uuid references public.players(id) on delete set null,
  minute int,
  second int,
  is_own_goal boolean not null default false,
  is_penalty boolean not null default false
);

create index if not exists match_goals_event_organizer_id_idx on public.match_goals(event_organizer_id);
create index if not exists match_goals_match_id_idx on public.match_goals(match_id);
create index if not exists match_goals_scoring_team_id_idx on public.match_goals(scoring_team_id);

create trigger match_goals_set_updated_at
before update on public.match_goals
for each row execute function public.set_updated_at();

create table if not exists public.match_cards (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  card_type text not null,
  minute int,
  second int,
  reason text
);

create index if not exists match_cards_event_organizer_id_idx on public.match_cards(event_organizer_id);
create index if not exists match_cards_match_id_idx on public.match_cards(match_id);
create index if not exists match_cards_team_id_idx on public.match_cards(team_id);
create index if not exists match_cards_player_id_idx on public.match_cards(player_id);

create trigger match_cards_set_updated_at
before update on public.match_cards
for each row execute function public.set_updated_at();

create table if not exists public.match_event_types (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  code text not null unique,
  name text not null
);

create trigger match_event_types_set_updated_at
before update on public.match_event_types
for each row execute function public.set_updated_at();

create table if not exists public.match_event_stream (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  event_type_id uuid references public.match_event_types(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  player_id uuid references public.players(id) on delete set null,
  minute int,
  second int,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  primary key (id, created_at)
) partition by range (created_at);

create table if not exists public.match_event_stream_default
partition of public.match_event_stream default;

create index if not exists match_event_stream_event_organizer_id_created_at_idx on public.match_event_stream(event_organizer_id, created_at desc);
create index if not exists match_event_stream_match_id_created_at_idx on public.match_event_stream(match_id, created_at desc);

create table if not exists public.stat_units (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  code text not null unique,
  name text not null
);

create trigger stat_units_set_updated_at
before update on public.stat_units
for each row execute function public.set_updated_at();

create table if not exists public.stat_categories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  code text not null unique,
  name text not null
);

create trigger stat_categories_set_updated_at
before update on public.stat_categories
for each row execute function public.set_updated_at();

create table if not exists public.stat_definitions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  category_id uuid references public.stat_categories(id) on delete set null,
  unit_id uuid references public.stat_units(id) on delete set null,
  code text not null unique,
  name text not null,
  description text
);

create index if not exists stat_definitions_category_id_idx on public.stat_definitions(category_id);
create index if not exists stat_definitions_unit_id_idx on public.stat_definitions(unit_id);

create trigger stat_definitions_set_updated_at
before update on public.stat_definitions
for each row execute function public.set_updated_at();

create table if not exists public.match_team_statistics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  stats jsonb not null default '{}'::jsonb,
  unique (match_id, team_id)
);

create index if not exists match_team_statistics_event_organizer_id_idx on public.match_team_statistics(event_organizer_id);
create index if not exists match_team_statistics_match_id_idx on public.match_team_statistics(match_id);
create index if not exists match_team_statistics_team_id_idx on public.match_team_statistics(team_id);

create trigger match_team_statistics_set_updated_at
before update on public.match_team_statistics
for each row execute function public.set_updated_at();

create table if not exists public.match_player_statistics_v2 (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  player_id uuid not null references public.players(id) on delete cascade,
  stats jsonb not null default '{}'::jsonb,
  unique (match_id, player_id)
);

create index if not exists match_player_statistics_v2_event_organizer_id_idx on public.match_player_statistics_v2(event_organizer_id);
create index if not exists match_player_statistics_v2_match_id_idx on public.match_player_statistics_v2(match_id);
create index if not exists match_player_statistics_v2_player_id_idx on public.match_player_statistics_v2(player_id);

create trigger match_player_statistics_v2_set_updated_at
before update on public.match_player_statistics_v2
for each row execute function public.set_updated_at();

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  asset_type public.media_asset_type not null,
  content_type text,
  storage_bucket text,
  storage_path text not null,
  checksum text,
  bytes bigint,
  width int,
  height int,
  duration_ms int,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists media_assets_event_organizer_id_idx on public.media_assets(event_organizer_id);
create index if not exists media_assets_asset_type_idx on public.media_assets(asset_type);
create index if not exists media_assets_storage_path_idx on public.media_assets(storage_path);

create trigger media_assets_set_updated_at
before update on public.media_assets
for each row execute function public.set_updated_at();

create table if not exists public.media_asset_variants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  asset_id uuid not null references public.media_assets(id) on delete cascade,
  variant_key text not null,
  storage_path text not null,
  bytes bigint,
  width int,
  height int,
  duration_ms int,
  meta jsonb not null default '{}'::jsonb,
  unique (asset_id, variant_key)
);

create index if not exists media_asset_variants_event_organizer_id_idx on public.media_asset_variants(event_organizer_id);
create index if not exists media_asset_variants_asset_id_idx on public.media_asset_variants(asset_id);

create trigger media_asset_variants_set_updated_at
before update on public.media_asset_variants
for each row execute function public.set_updated_at();

create table if not exists public.media_asset_links (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  asset_id uuid not null references public.media_assets(id) on delete cascade,
  competition_id uuid references public.competitions(id) on delete cascade,
  match_id uuid references public.matches(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade
);

create index if not exists media_asset_links_event_organizer_id_idx on public.media_asset_links(event_organizer_id);
create index if not exists media_asset_links_asset_id_idx on public.media_asset_links(asset_id);
create index if not exists media_asset_links_competition_id_idx on public.media_asset_links(competition_id);
create index if not exists media_asset_links_match_id_idx on public.media_asset_links(match_id);
create index if not exists media_asset_links_team_id_idx on public.media_asset_links(team_id);
create index if not exists media_asset_links_player_id_idx on public.media_asset_links(player_id);

create trigger media_asset_links_set_updated_at
before update on public.media_asset_links
for each row execute function public.set_updated_at();

create table if not exists public.media_tags (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  name text not null,
  unique (event_organizer_id, name)
);

create index if not exists media_tags_event_organizer_id_idx on public.media_tags(event_organizer_id);

create trigger media_tags_set_updated_at
before update on public.media_tags
for each row execute function public.set_updated_at();

create table if not exists public.media_asset_tags (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  asset_id uuid not null references public.media_assets(id) on delete cascade,
  tag_id uuid not null references public.media_tags(id) on delete cascade,
  unique (asset_id, tag_id)
);

create index if not exists media_asset_tags_event_organizer_id_idx on public.media_asset_tags(event_organizer_id);
create index if not exists media_asset_tags_asset_id_idx on public.media_asset_tags(asset_id);
create index if not exists media_asset_tags_tag_id_idx on public.media_asset_tags(tag_id);

create trigger media_asset_tags_set_updated_at
before update on public.media_asset_tags
for each row execute function public.set_updated_at();

create table if not exists public.media_collections (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  name text not null,
  description text
);

create index if not exists media_collections_event_organizer_id_idx on public.media_collections(event_organizer_id);

create trigger media_collections_set_updated_at
before update on public.media_collections
for each row execute function public.set_updated_at();

create table if not exists public.media_collection_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  collection_id uuid not null references public.media_collections(id) on delete cascade,
  asset_id uuid not null references public.media_assets(id) on delete cascade,
  item_order int not null default 0,
  unique (collection_id, asset_id)
);

create index if not exists media_collection_items_event_organizer_id_idx on public.media_collection_items(event_organizer_id);
create index if not exists media_collection_items_collection_id_idx on public.media_collection_items(collection_id);
create index if not exists media_collection_items_asset_id_idx on public.media_collection_items(asset_id);

create trigger media_collection_items_set_updated_at
before update on public.media_collection_items
for each row execute function public.set_updated_at();

create table if not exists public.media_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  asset_id uuid not null references public.media_assets(id) on delete cascade,
  job_type text not null,
  job_status text not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  attempts int not null default 0,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text
);

create index if not exists media_processing_jobs_event_organizer_id_idx on public.media_processing_jobs(event_organizer_id);
create index if not exists media_processing_jobs_asset_id_idx on public.media_processing_jobs(asset_id);
create index if not exists media_processing_jobs_job_status_run_after_idx on public.media_processing_jobs(job_status, run_after);

create trigger media_processing_jobs_set_updated_at
before update on public.media_processing_jobs
for each row execute function public.set_updated_at();

create table if not exists public.media_access_log (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_organizer_id uuid references public.event_organizers(id) on delete cascade,
  asset_id uuid references public.media_assets(id) on delete set null,
  viewer_user_id uuid references public.profiles(id) on delete set null,
  ip inet,
  user_agent text,
  referrer text,
  bytes_served bigint,
  primary key (id, created_at)
) partition by range (created_at);

create table if not exists public.media_access_log_default
partition of public.media_access_log default;

create index if not exists media_access_log_event_organizer_id_created_at_idx on public.media_access_log(event_organizer_id, created_at desc);
create index if not exists media_access_log_asset_id_created_at_idx on public.media_access_log(asset_id, created_at desc);

alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.event_organizer_roles enable row level security;
alter table public.event_organizer_user_roles enable row level security;
alter table public.api_keys enable row level security;
alter table public.idempotency_keys enable row level security;
alter table public.tenant_settings enable row level security;
alter table public.feature_flags enable row level security;
alter table public.audit_log enable row level security;
alter table public.venues enable row level security;
alter table public.venue_fields enable row level security;
alter table public.seasons enable row level security;
alter table public.competition_seasons enable row level security;
alter table public.competition_stages enable row level security;
alter table public.competition_groups enable row level security;
alter table public.competition_group_teams enable row level security;
alter table public.competition_rounds enable row level security;
alter table public.round_matches enable row level security;
alter table public.team_staff_roles enable row level security;
alter table public.team_staff_members enable row level security;
alter table public.player_positions enable row level security;
alter table public.player_position_links enable row level security;
alter table public.player_addresses enable row level security;
alter table public.player_emergency_contacts enable row level security;
alter table public.player_documents enable row level security;
alter table public.player_medical_records enable row level security;
alter table public.player_injuries enable row level security;
alter table public.player_suspensions enable row level security;
alter table public.player_biometrics enable row level security;
alter table public.match_periods enable row level security;
alter table public.match_official_roles enable row level security;
alter table public.match_official_assignments enable row level security;
alter table public.match_reports enable row level security;
alter table public.match_lineups_v2 enable row level security;
alter table public.match_lineup_players enable row level security;
alter table public.match_substitutions enable row level security;
alter table public.match_goals enable row level security;
alter table public.match_cards enable row level security;
alter table public.match_event_types enable row level security;
alter table public.match_event_stream enable row level security;
alter table public.stat_units enable row level security;
alter table public.stat_categories enable row level security;
alter table public.stat_definitions enable row level security;
alter table public.match_team_statistics enable row level security;
alter table public.match_player_statistics_v2 enable row level security;
alter table public.media_assets enable row level security;
alter table public.media_asset_variants enable row level security;
alter table public.media_asset_links enable row level security;
alter table public.media_tags enable row level security;
alter table public.media_asset_tags enable row level security;
alter table public.media_collections enable row level security;
alter table public.media_collection_items enable row level security;
alter table public.media_processing_jobs enable row level security;
alter table public.media_access_log enable row level security;

create policy permissions_manage_super_admin
on public.permissions
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

create policy role_permissions_manage_super_admin
on public.role_permissions
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

create policy event_organizer_roles_crud_member
on public.event_organizer_roles
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy event_organizer_user_roles_crud_member
on public.event_organizer_user_roles
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy api_keys_crud_member
on public.api_keys
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy idempotency_keys_crud_member
on public.idempotency_keys
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy tenant_settings_crud_member
on public.tenant_settings
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy feature_flags_crud_member
on public.feature_flags
for all
to authenticated
using (event_organizer_id is null or public.is_event_organizer_member(event_organizer_id))
with check (event_organizer_id is null or public.is_event_organizer_member(event_organizer_id));

create policy audit_log_read_member
on public.audit_log
for select
to authenticated
using (event_organizer_id is null or public.is_event_organizer_member(event_organizer_id));

create policy audit_log_insert_member
on public.audit_log
for insert
to authenticated
with check (event_organizer_id is null or public.is_event_organizer_member(event_organizer_id));

create policy venues_crud_member
on public.venues
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy venue_fields_crud_member
on public.venue_fields
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy seasons_crud_member
on public.seasons
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy competition_seasons_crud_member
on public.competition_seasons
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy competition_stages_crud_member
on public.competition_stages
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy competition_groups_crud_member
on public.competition_groups
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy competition_group_teams_crud_member
on public.competition_group_teams
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy competition_rounds_crud_member
on public.competition_rounds
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy round_matches_crud_member
on public.round_matches
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy team_staff_roles_crud_member
on public.team_staff_roles
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy team_staff_members_crud_member
on public.team_staff_members
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy player_positions_read_authenticated
on public.player_positions
for select
to authenticated
using (true);

create policy player_positions_manage_super_admin
on public.player_positions
for insert, update, delete
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

create policy player_position_links_crud_member
on public.player_position_links
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy player_addresses_crud_member
on public.player_addresses
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy player_emergency_contacts_crud_member
on public.player_emergency_contacts
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy player_documents_crud_member
on public.player_documents
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy player_medical_records_crud_member
on public.player_medical_records
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy player_injuries_crud_member
on public.player_injuries
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy player_suspensions_crud_member
on public.player_suspensions
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy player_biometrics_crud_member
on public.player_biometrics
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy match_periods_crud_member
on public.match_periods
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy match_official_roles_read_authenticated
on public.match_official_roles
for select
to authenticated
using (true);

create policy match_official_roles_manage_super_admin
on public.match_official_roles
for insert, update, delete
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

create policy match_official_assignments_crud_member
on public.match_official_assignments
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy match_reports_crud_member
on public.match_reports
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy match_lineups_v2_crud_member
on public.match_lineups_v2
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy match_lineup_players_crud_member
on public.match_lineup_players
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy match_substitutions_crud_member
on public.match_substitutions
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy match_goals_crud_member
on public.match_goals
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy match_cards_crud_member
on public.match_cards
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy match_event_types_read_authenticated
on public.match_event_types
for select
to authenticated
using (true);

create policy match_event_types_manage_super_admin
on public.match_event_types
for insert, update, delete
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

create policy match_event_stream_crud_member
on public.match_event_stream
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy stat_units_read_authenticated
on public.stat_units
for select
to authenticated
using (true);

create policy stat_units_manage_super_admin
on public.stat_units
for insert, update, delete
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

create policy stat_categories_read_authenticated
on public.stat_categories
for select
to authenticated
using (true);

create policy stat_categories_manage_super_admin
on public.stat_categories
for insert, update, delete
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

create policy stat_definitions_read_authenticated
on public.stat_definitions
for select
to authenticated
using (true);

create policy stat_definitions_manage_super_admin
on public.stat_definitions
for insert, update, delete
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

create policy match_team_statistics_crud_member
on public.match_team_statistics
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy match_player_statistics_v2_crud_member
on public.match_player_statistics_v2
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy media_assets_crud_member
on public.media_assets
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy media_asset_variants_crud_member
on public.media_asset_variants
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy media_asset_links_crud_member
on public.media_asset_links
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy media_tags_crud_member
on public.media_tags
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy media_asset_tags_crud_member
on public.media_asset_tags
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy media_collections_crud_member
on public.media_collections
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy media_collection_items_crud_member
on public.media_collection_items
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy media_processing_jobs_crud_member
on public.media_processing_jobs
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy media_access_log_read_member
on public.media_access_log
for select
to authenticated
using (event_organizer_id is null or public.is_event_organizer_member(event_organizer_id));

insert into public.match_official_roles (code, name)
values
  ('referee', 'Referee'),
  ('assistant_referee', 'Assistant Referee'),
  ('fourth_official', 'Fourth Official'),
  ('var', 'VAR')
on conflict (code) do nothing;

