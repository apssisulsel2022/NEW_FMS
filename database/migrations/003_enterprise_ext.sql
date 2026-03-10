create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  name text not null,
  website text,
  logo_asset_id uuid references public.media_assets(id) on delete set null,
  unique (event_organizer_id, name)
);

create index if not exists sponsors_event_organizer_id_idx on public.sponsors(event_organizer_id);
create index if not exists sponsors_logo_asset_id_idx on public.sponsors(logo_asset_id);

create trigger sponsors_set_updated_at
before update on public.sponsors
for each row execute function public.set_updated_at();

create table if not exists public.competition_sponsors (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  competition_id uuid not null references public.competitions(id) on delete cascade,
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  tier text,
  unique (competition_id, sponsor_id)
);

create index if not exists competition_sponsors_event_organizer_id_idx on public.competition_sponsors(event_organizer_id);
create index if not exists competition_sponsors_competition_id_idx on public.competition_sponsors(competition_id);
create index if not exists competition_sponsors_sponsor_id_idx on public.competition_sponsors(sponsor_id);

create trigger competition_sponsors_set_updated_at
before update on public.competition_sponsors
for each row execute function public.set_updated_at();

create table if not exists public.competition_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  competition_id uuid not null references public.competitions(id) on delete cascade,
  doc_type text not null,
  asset_id uuid not null references public.media_assets(id) on delete cascade,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists competition_documents_event_organizer_id_idx on public.competition_documents(event_organizer_id);
create index if not exists competition_documents_competition_id_idx on public.competition_documents(competition_id);
create index if not exists competition_documents_asset_id_idx on public.competition_documents(asset_id);

create trigger competition_documents_set_updated_at
before update on public.competition_documents
for each row execute function public.set_updated_at();

create table if not exists public.competition_announcements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  competition_id uuid not null references public.competitions(id) on delete cascade,
  title text not null,
  body text,
  published_at timestamptz
);

create index if not exists competition_announcements_event_organizer_id_idx on public.competition_announcements(event_organizer_id);
create index if not exists competition_announcements_competition_id_idx on public.competition_announcements(competition_id);
create index if not exists competition_announcements_published_at_idx on public.competition_announcements(published_at desc);

create trigger competition_announcements_set_updated_at
before update on public.competition_announcements
for each row execute function public.set_updated_at();

create table if not exists public.team_home_venues (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete cascade,
  is_primary boolean not null default false,
  unique (team_id, venue_id)
);

create index if not exists team_home_venues_event_organizer_id_idx on public.team_home_venues(event_organizer_id);
create index if not exists team_home_venues_team_id_idx on public.team_home_venues(team_id);
create index if not exists team_home_venues_venue_id_idx on public.team_home_venues(venue_id);

create trigger team_home_venues_set_updated_at
before update on public.team_home_venues
for each row execute function public.set_updated_at();

create table if not exists public.team_addresses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  address_line1 text,
  address_line2 text,
  city text,
  region text,
  postal_code text,
  country text
);

create index if not exists team_addresses_event_organizer_id_idx on public.team_addresses(event_organizer_id);
create index if not exists team_addresses_team_id_idx on public.team_addresses(team_id);

create trigger team_addresses_set_updated_at
before update on public.team_addresses
for each row execute function public.set_updated_at();

create table if not exists public.team_contacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  contact_type text not null,
  value text not null
);

create index if not exists team_contacts_event_organizer_id_idx on public.team_contacts(event_organizer_id);
create index if not exists team_contacts_team_id_idx on public.team_contacts(team_id);

create trigger team_contacts_set_updated_at
before update on public.team_contacts
for each row execute function public.set_updated_at();

create table if not exists public.team_social_links (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  platform text not null,
  url text not null,
  unique (team_id, platform)
);

create index if not exists team_social_links_event_organizer_id_idx on public.team_social_links(event_organizer_id);
create index if not exists team_social_links_team_id_idx on public.team_social_links(team_id);

create trigger team_social_links_set_updated_at
before update on public.team_social_links
for each row execute function public.set_updated_at();

create table if not exists public.team_seasons (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete restrict,
  unique (team_id, season_id)
);

create index if not exists team_seasons_event_organizer_id_idx on public.team_seasons(event_organizer_id);
create index if not exists team_seasons_team_id_idx on public.team_seasons(team_id);
create index if not exists team_seasons_season_id_idx on public.team_seasons(season_id);

create trigger team_seasons_set_updated_at
before update on public.team_seasons
for each row execute function public.set_updated_at();

create table if not exists public.player_agents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  full_name text not null,
  email text,
  phone text
);

create index if not exists player_agents_event_organizer_id_idx on public.player_agents(event_organizer_id);

create trigger player_agents_set_updated_at
before update on public.player_agents
for each row execute function public.set_updated_at();

create table if not exists public.player_agent_links (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  agent_id uuid not null references public.player_agents(id) on delete cascade,
  starts_at timestamptz,
  ends_at timestamptz,
  unique (player_id, agent_id)
);

create index if not exists player_agent_links_event_organizer_id_idx on public.player_agent_links(event_organizer_id);
create index if not exists player_agent_links_player_id_idx on public.player_agent_links(player_id);
create index if not exists player_agent_links_agent_id_idx on public.player_agent_links(agent_id);

create trigger player_agent_links_set_updated_at
before update on public.player_agent_links
for each row execute function public.set_updated_at();

create table if not exists public.player_contracts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  starts_on date,
  ends_on date,
  contract_type text,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists player_contracts_event_organizer_id_idx on public.player_contracts(event_organizer_id);
create index if not exists player_contracts_player_id_idx on public.player_contracts(player_id);
create index if not exists player_contracts_team_id_idx on public.player_contracts(team_id);

create trigger player_contracts_set_updated_at
before update on public.player_contracts
for each row execute function public.set_updated_at();

create table if not exists public.player_contract_terms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  contract_id uuid not null references public.player_contracts(id) on delete cascade,
  term_key text not null,
  term_value text,
  unique (contract_id, term_key)
);

create index if not exists player_contract_terms_event_organizer_id_idx on public.player_contract_terms(event_organizer_id);
create index if not exists player_contract_terms_contract_id_idx on public.player_contract_terms(contract_id);

create trigger player_contract_terms_set_updated_at
before update on public.player_contract_terms
for each row execute function public.set_updated_at();

create table if not exists public.player_transfers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  from_team_id uuid references public.teams(id) on delete set null,
  to_team_id uuid references public.teams(id) on delete set null,
  transfer_date date,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists player_transfers_event_organizer_id_idx on public.player_transfers(event_organizer_id);
create index if not exists player_transfers_player_id_idx on public.player_transfers(player_id);

create trigger player_transfers_set_updated_at
before update on public.player_transfers
for each row execute function public.set_updated_at();

create table if not exists public.player_transfer_fees (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  transfer_id uuid not null references public.player_transfers(id) on delete cascade,
  currency text,
  amount numeric,
  paid_at timestamptz,
  unique (transfer_id)
);

create index if not exists player_transfer_fees_event_organizer_id_idx on public.player_transfer_fees(event_organizer_id);
create index if not exists player_transfer_fees_transfer_id_idx on public.player_transfer_fees(transfer_id);

create trigger player_transfer_fees_set_updated_at
before update on public.player_transfer_fees
for each row execute function public.set_updated_at();

create table if not exists public.match_shots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  player_id uuid references public.players(id) on delete set null,
  minute int,
  second int,
  outcome text,
  xg numeric,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists match_shots_event_organizer_id_idx on public.match_shots(event_organizer_id);
create index if not exists match_shots_match_id_idx on public.match_shots(match_id);

create trigger match_shots_set_updated_at
before update on public.match_shots
for each row execute function public.set_updated_at();

create table if not exists public.match_fouls (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  player_id uuid references public.players(id) on delete set null,
  minute int,
  second int,
  foul_type text,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists match_fouls_event_organizer_id_idx on public.match_fouls(event_organizer_id);
create index if not exists match_fouls_match_id_idx on public.match_fouls(match_id);

create trigger match_fouls_set_updated_at
before update on public.match_fouls
for each row execute function public.set_updated_at();

create table if not exists public.match_penalty_shootouts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  home_score int not null default 0,
  away_score int not null default 0,
  unique (match_id)
);

create index if not exists match_penalty_shootouts_event_organizer_id_idx on public.match_penalty_shootouts(event_organizer_id);
create index if not exists match_penalty_shootouts_match_id_idx on public.match_penalty_shootouts(match_id);

create trigger match_penalty_shootouts_set_updated_at
before update on public.match_penalty_shootouts
for each row execute function public.set_updated_at();

create table if not exists public.match_penalty_kicks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  shootout_id uuid not null references public.match_penalty_shootouts(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  kick_order int not null,
  outcome text not null,
  unique (shootout_id, kick_order)
);

create index if not exists match_penalty_kicks_event_organizer_id_idx on public.match_penalty_kicks(event_organizer_id);
create index if not exists match_penalty_kicks_shootout_id_idx on public.match_penalty_kicks(shootout_id);

create trigger match_penalty_kicks_set_updated_at
before update on public.match_penalty_kicks
for each row execute function public.set_updated_at();

create table if not exists public.match_state_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  snapshot_type text not null,
  minute int,
  second int,
  state jsonb not null default '{}'::jsonb
);

create index if not exists match_state_snapshots_event_organizer_id_idx on public.match_state_snapshots(event_organizer_id);
create index if not exists match_state_snapshots_match_id_idx on public.match_state_snapshots(match_id);

create trigger match_state_snapshots_set_updated_at
before update on public.match_state_snapshots
for each row execute function public.set_updated_at();

create table if not exists public.match_clock_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  clock_action text not null,
  minute int,
  second int,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists match_clock_events_event_organizer_id_idx on public.match_clock_events(event_organizer_id);
create index if not exists match_clock_events_match_id_idx on public.match_clock_events(match_id);

create trigger match_clock_events_set_updated_at
before update on public.match_clock_events
for each row execute function public.set_updated_at();

create table if not exists public.tracking_entities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  entity_type text not null,
  team_id uuid references public.teams(id) on delete set null,
  player_id uuid references public.players(id) on delete set null
);

create index if not exists tracking_entities_event_organizer_id_idx on public.tracking_entities(event_organizer_id);
create index if not exists tracking_entities_match_id_idx on public.tracking_entities(match_id);

create trigger tracking_entities_set_updated_at
before update on public.tracking_entities
for each row execute function public.set_updated_at();

create table if not exists public.tracking_frames (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  frame_ts timestamptz not null,
  payload jsonb not null default '{}'::jsonb,
  primary key (id, created_at)
) partition by range (created_at);

create table if not exists public.tracking_frames_default
partition of public.tracking_frames default;

create index if not exists tracking_frames_event_organizer_id_created_at_idx on public.tracking_frames(event_organizer_id, created_at desc);
create index if not exists tracking_frames_match_id_frame_ts_idx on public.tracking_frames(match_id, frame_ts desc);

create table if not exists public.stat_sources (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  code text not null unique,
  name text not null
);

create trigger stat_sources_set_updated_at
before update on public.stat_sources
for each row execute function public.set_updated_at();

create table if not exists public.stats_ingestions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  source_id uuid references public.stat_sources(id) on delete set null,
  ingestion_type text not null,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists stats_ingestions_event_organizer_id_idx on public.stats_ingestions(event_organizer_id);
create index if not exists stats_ingestions_source_id_idx on public.stats_ingestions(source_id);

create trigger stats_ingestions_set_updated_at
before update on public.stats_ingestions
for each row execute function public.set_updated_at();

create table if not exists public.stats_ingestion_rows (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  ingestion_id uuid not null references public.stats_ingestions(id) on delete cascade,
  row_key text,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists stats_ingestion_rows_event_organizer_id_idx on public.stats_ingestion_rows(event_organizer_id);
create index if not exists stats_ingestion_rows_ingestion_id_idx on public.stats_ingestion_rows(ingestion_id);

create trigger stats_ingestion_rows_set_updated_at
before update on public.stats_ingestion_rows
for each row execute function public.set_updated_at();

create table if not exists public.derived_metrics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  code text not null unique,
  name text not null,
  expression text not null
);

create trigger derived_metrics_set_updated_at
before update on public.derived_metrics
for each row execute function public.set_updated_at();

create table if not exists public.leaderboards (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  competition_id uuid references public.competitions(id) on delete cascade,
  name text not null,
  definition jsonb not null default '{}'::jsonb
);

create index if not exists leaderboards_event_organizer_id_idx on public.leaderboards(event_organizer_id);
create index if not exists leaderboards_competition_id_idx on public.leaderboards(competition_id);

create trigger leaderboards_set_updated_at
before update on public.leaderboards
for each row execute function public.set_updated_at();

create table if not exists public.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  leaderboard_id uuid not null references public.leaderboards(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  player_id uuid references public.players(id) on delete set null,
  rank int not null,
  value numeric,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists leaderboard_entries_event_organizer_id_idx on public.leaderboard_entries(event_organizer_id);
create index if not exists leaderboard_entries_leaderboard_id_rank_idx on public.leaderboard_entries(leaderboard_id, rank);

create trigger leaderboard_entries_set_updated_at
before update on public.leaderboard_entries
for each row execute function public.set_updated_at();

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid references public.event_organizers(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  channel text not null,
  title text,
  body text,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz
);

create index if not exists notifications_event_organizer_id_idx on public.notifications(event_organizer_id);
create index if not exists notifications_user_id_idx on public.notifications(user_id);

create trigger notifications_set_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid references public.event_organizers(id) on delete cascade,
  notification_id uuid not null references public.notifications(id) on delete cascade,
  provider text,
  provider_message_id text,
  delivery_status text not null default 'queued',
  last_error text
);

create index if not exists notification_deliveries_event_organizer_id_idx on public.notification_deliveries(event_organizer_id);
create index if not exists notification_deliveries_notification_id_idx on public.notification_deliveries(notification_id);

create trigger notification_deliveries_set_updated_at
before update on public.notification_deliveries
for each row execute function public.set_updated_at();

create table if not exists public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  url text not null,
  secret_hash text,
  subscribed_events text[] not null default '{}'::text[]
);

create index if not exists webhook_endpoints_event_organizer_id_idx on public.webhook_endpoints(event_organizer_id);

create trigger webhook_endpoints_set_updated_at
before update on public.webhook_endpoints
for each row execute function public.set_updated_at();

create table if not exists public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  endpoint_id uuid not null references public.webhook_endpoints(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  attempt int not null default 0,
  delivery_status text not null default 'queued',
  last_error text,
  delivered_at timestamptz
);

create index if not exists webhook_deliveries_event_organizer_id_idx on public.webhook_deliveries(event_organizer_id);
create index if not exists webhook_deliveries_endpoint_id_idx on public.webhook_deliveries(endpoint_id);
create index if not exists webhook_deliveries_delivery_status_idx on public.webhook_deliveries(delivery_status);

create trigger webhook_deliveries_set_updated_at
before update on public.webhook_deliveries
for each row execute function public.set_updated_at();

create table if not exists public.outbox_events (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_organizer_id uuid references public.event_organizers(id) on delete cascade,
  topic text not null,
  payload jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  primary key (id, created_at)
) partition by range (created_at);

create table if not exists public.outbox_events_default
partition of public.outbox_events default;

create index if not exists outbox_events_topic_created_at_idx on public.outbox_events(topic, created_at desc);
create index if not exists outbox_events_event_organizer_id_created_at_idx on public.outbox_events(event_organizer_id, created_at desc);

create table if not exists public.inbox_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid references public.event_organizers(id) on delete cascade,
  source text not null,
  source_event_id text not null,
  topic text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  unique (source, source_event_id)
);

create index if not exists inbox_events_event_organizer_id_idx on public.inbox_events(event_organizer_id);
create index if not exists inbox_events_topic_idx on public.inbox_events(topic);

create trigger inbox_events_set_updated_at
before update on public.inbox_events
for each row execute function public.set_updated_at();

create table if not exists public.ai_models (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid references public.event_organizers(id) on delete cascade,
  name text not null,
  version text,
  model_type text,
  storage_path text,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists ai_models_event_organizer_id_idx on public.ai_models(event_organizer_id);

create trigger ai_models_set_updated_at
before update on public.ai_models
for each row execute function public.set_updated_at();

create table if not exists public.ai_inference_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid references public.event_organizers(id) on delete cascade,
  model_id uuid references public.ai_models(id) on delete set null,
  job_type text not null,
  job_status text not null default 'queued',
  input jsonb not null default '{}'::jsonb,
  attempts int not null default 0,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text
);

create index if not exists ai_inference_jobs_event_organizer_id_idx on public.ai_inference_jobs(event_organizer_id);
create index if not exists ai_inference_jobs_model_id_idx on public.ai_inference_jobs(model_id);
create index if not exists ai_inference_jobs_job_status_run_after_idx on public.ai_inference_jobs(job_status, run_after);

create trigger ai_inference_jobs_set_updated_at
before update on public.ai_inference_jobs
for each row execute function public.set_updated_at();

create table if not exists public.ai_inference_results (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid references public.event_organizers(id) on delete cascade,
  job_id uuid not null references public.ai_inference_jobs(id) on delete cascade,
  output jsonb not null default '{}'::jsonb,
  unique (job_id)
);

create index if not exists ai_inference_results_event_organizer_id_idx on public.ai_inference_results(event_organizer_id);
create index if not exists ai_inference_results_job_id_idx on public.ai_inference_results(job_id);

create trigger ai_inference_results_set_updated_at
before update on public.ai_inference_results
for each row execute function public.set_updated_at();

create table if not exists public.media_transcodes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  job_id uuid references public.media_processing_jobs(id) on delete set null,
  asset_id uuid not null references public.media_assets(id) on delete cascade,
  variant_id uuid references public.media_asset_variants(id) on delete set null,
  transcode_status text not null default 'queued',
  meta jsonb not null default '{}'::jsonb
);

create index if not exists media_transcodes_event_organizer_id_idx on public.media_transcodes(event_organizer_id);
create index if not exists media_transcodes_asset_id_idx on public.media_transcodes(asset_id);

create trigger media_transcodes_set_updated_at
before update on public.media_transcodes
for each row execute function public.set_updated_at();

create table if not exists public.media_thumbnails (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  asset_id uuid not null references public.media_assets(id) on delete cascade,
  variant_id uuid references public.media_asset_variants(id) on delete set null,
  time_ms int,
  unique (asset_id, time_ms)
);

create index if not exists media_thumbnails_event_organizer_id_idx on public.media_thumbnails(event_organizer_id);
create index if not exists media_thumbnails_asset_id_idx on public.media_thumbnails(asset_id);

create trigger media_thumbnails_set_updated_at
before update on public.media_thumbnails
for each row execute function public.set_updated_at();

create table if not exists public.media_captions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  asset_id uuid not null references public.media_assets(id) on delete cascade,
  language text not null,
  storage_path text not null,
  unique (asset_id, language)
);

create index if not exists media_captions_event_organizer_id_idx on public.media_captions(event_organizer_id);
create index if not exists media_captions_asset_id_idx on public.media_captions(asset_id);

create trigger media_captions_set_updated_at
before update on public.media_captions
for each row execute function public.set_updated_at();

create table if not exists public.media_rights_holders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  name text not null,
  unique (event_organizer_id, name)
);

create index if not exists media_rights_holders_event_organizer_id_idx on public.media_rights_holders(event_organizer_id);

create trigger media_rights_holders_set_updated_at
before update on public.media_rights_holders
for each row execute function public.set_updated_at();

create table if not exists public.media_rights (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  asset_id uuid not null references public.media_assets(id) on delete cascade,
  rights_holder_id uuid references public.media_rights_holders(id) on delete set null,
  license_type text,
  starts_at timestamptz,
  ends_at timestamptz,
  regions text[] not null default '{}'::text[]
);

create index if not exists media_rights_event_organizer_id_idx on public.media_rights(event_organizer_id);
create index if not exists media_rights_asset_id_idx on public.media_rights(asset_id);

create trigger media_rights_set_updated_at
before update on public.media_rights
for each row execute function public.set_updated_at();

create table if not exists public.disciplinary_cases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  competition_id uuid references public.competitions(id) on delete set null,
  match_id uuid references public.matches(id) on delete set null,
  subject_type text not null,
  subject_player_id uuid references public.players(id) on delete set null,
  subject_team_id uuid references public.teams(id) on delete set null,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  details jsonb not null default '{}'::jsonb
);

create index if not exists disciplinary_cases_event_organizer_id_idx on public.disciplinary_cases(event_organizer_id);
create index if not exists disciplinary_cases_competition_id_idx on public.disciplinary_cases(competition_id);
create index if not exists disciplinary_cases_match_id_idx on public.disciplinary_cases(match_id);

create trigger disciplinary_cases_set_updated_at
before update on public.disciplinary_cases
for each row execute function public.set_updated_at();

create table if not exists public.disciplinary_actions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  case_id uuid not null references public.disciplinary_cases(id) on delete cascade,
  action_type text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  details jsonb not null default '{}'::jsonb
);

create index if not exists disciplinary_actions_event_organizer_id_idx on public.disciplinary_actions(event_organizer_id);
create index if not exists disciplinary_actions_case_id_idx on public.disciplinary_actions(case_id);

create trigger disciplinary_actions_set_updated_at
before update on public.disciplinary_actions
for each row execute function public.set_updated_at();

create table if not exists public.awards (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  competition_id uuid references public.competitions(id) on delete set null,
  name text not null,
  award_type text not null
);

create index if not exists awards_event_organizer_id_idx on public.awards(event_organizer_id);
create index if not exists awards_competition_id_idx on public.awards(competition_id);

create trigger awards_set_updated_at
before update on public.awards
for each row execute function public.set_updated_at();

create table if not exists public.award_recipients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  award_id uuid not null references public.awards(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  player_id uuid references public.players(id) on delete set null,
  season_id uuid references public.seasons(id) on delete set null,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists award_recipients_event_organizer_id_idx on public.award_recipients(event_organizer_id);
create index if not exists award_recipients_award_id_idx on public.award_recipients(award_id);

create trigger award_recipients_set_updated_at
before update on public.award_recipients
for each row execute function public.set_updated_at();

alter table public.sponsors enable row level security;
alter table public.competition_sponsors enable row level security;
alter table public.competition_documents enable row level security;
alter table public.competition_announcements enable row level security;
alter table public.team_home_venues enable row level security;
alter table public.team_addresses enable row level security;
alter table public.team_contacts enable row level security;
alter table public.team_social_links enable row level security;
alter table public.team_seasons enable row level security;
alter table public.player_agents enable row level security;
alter table public.player_agent_links enable row level security;
alter table public.player_contracts enable row level security;
alter table public.player_contract_terms enable row level security;
alter table public.player_transfers enable row level security;
alter table public.player_transfer_fees enable row level security;
alter table public.match_shots enable row level security;
alter table public.match_fouls enable row level security;
alter table public.match_penalty_shootouts enable row level security;
alter table public.match_penalty_kicks enable row level security;
alter table public.match_state_snapshots enable row level security;
alter table public.match_clock_events enable row level security;
alter table public.tracking_entities enable row level security;
alter table public.tracking_frames enable row level security;
alter table public.stat_sources enable row level security;
alter table public.stats_ingestions enable row level security;
alter table public.stats_ingestion_rows enable row level security;
alter table public.derived_metrics enable row level security;
alter table public.leaderboards enable row level security;
alter table public.leaderboard_entries enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.webhook_endpoints enable row level security;
alter table public.webhook_deliveries enable row level security;
alter table public.outbox_events enable row level security;
alter table public.inbox_events enable row level security;
alter table public.ai_models enable row level security;
alter table public.ai_inference_jobs enable row level security;
alter table public.ai_inference_results enable row level security;
alter table public.media_transcodes enable row level security;
alter table public.media_thumbnails enable row level security;
alter table public.media_captions enable row level security;
alter table public.media_rights_holders enable row level security;
alter table public.media_rights enable row level security;
alter table public.disciplinary_cases enable row level security;
alter table public.disciplinary_actions enable row level security;
alter table public.awards enable row level security;
alter table public.award_recipients enable row level security;

create policy sponsors_crud_member
on public.sponsors
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy competition_sponsors_crud_member
on public.competition_sponsors
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy competition_documents_crud_member
on public.competition_documents
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy competition_announcements_crud_member
on public.competition_announcements
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy team_home_venues_crud_member
on public.team_home_venues
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy team_addresses_crud_member
on public.team_addresses
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy team_contacts_crud_member
on public.team_contacts
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy team_social_links_crud_member
on public.team_social_links
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy team_seasons_crud_member
on public.team_seasons
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy player_agents_crud_member
on public.player_agents
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy player_agent_links_crud_member
on public.player_agent_links
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy player_contracts_crud_member
on public.player_contracts
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy player_contract_terms_crud_member
on public.player_contract_terms
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy player_transfers_crud_member
on public.player_transfers
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy player_transfer_fees_crud_member
on public.player_transfer_fees
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy match_shots_crud_member
on public.match_shots
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy match_fouls_crud_member
on public.match_fouls
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy match_penalty_shootouts_crud_member
on public.match_penalty_shootouts
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy match_penalty_kicks_crud_member
on public.match_penalty_kicks
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy match_state_snapshots_crud_member
on public.match_state_snapshots
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy match_clock_events_crud_member
on public.match_clock_events
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy tracking_entities_crud_member
on public.tracking_entities
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy tracking_frames_crud_member
on public.tracking_frames
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy stat_sources_read_authenticated
on public.stat_sources
for select
to authenticated
using (true);

create policy stat_sources_manage_super_admin
on public.stat_sources
for insert, update, delete
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

create policy stats_ingestions_crud_member
on public.stats_ingestions
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy stats_ingestion_rows_crud_member
on public.stats_ingestion_rows
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy derived_metrics_read_authenticated
on public.derived_metrics
for select
to authenticated
using (true);

create policy derived_metrics_manage_super_admin
on public.derived_metrics
for insert, update, delete
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

create policy leaderboards_crud_member
on public.leaderboards
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy leaderboard_entries_crud_member
on public.leaderboard_entries
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy notifications_read_self
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

create policy notifications_manage_member
on public.notifications
for insert, update, delete
to authenticated
using (event_organizer_id is null or public.is_event_organizer_member(event_organizer_id))
with check (event_organizer_id is null or public.is_event_organizer_member(event_organizer_id));

create policy notification_deliveries_manage_member
on public.notification_deliveries
for all
to authenticated
using (event_organizer_id is null or public.is_event_organizer_member(event_organizer_id))
with check (event_organizer_id is null or public.is_event_organizer_member(event_organizer_id));

create policy webhook_endpoints_crud_member
on public.webhook_endpoints
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy webhook_deliveries_crud_member
on public.webhook_deliveries
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy outbox_events_read_member
on public.outbox_events
for select
to authenticated
using (event_organizer_id is null or public.is_event_organizer_member(event_organizer_id));

create policy outbox_events_insert_member
on public.outbox_events
for insert
to authenticated
with check (event_organizer_id is null or public.is_event_organizer_member(event_organizer_id));

create policy inbox_events_crud_member
on public.inbox_events
for all
to authenticated
using (event_organizer_id is null or public.is_event_organizer_member(event_organizer_id))
with check (event_organizer_id is null or public.is_event_organizer_member(event_organizer_id));

create policy ai_models_crud_member
on public.ai_models
for all
to authenticated
using (event_organizer_id is null or public.is_event_organizer_member(event_organizer_id))
with check (event_organizer_id is null or public.is_event_organizer_member(event_organizer_id));

create policy ai_inference_jobs_crud_member
on public.ai_inference_jobs
for all
to authenticated
using (event_organizer_id is null or public.is_event_organizer_member(event_organizer_id))
with check (event_organizer_id is null or public.is_event_organizer_member(event_organizer_id));

create policy ai_inference_results_crud_member
on public.ai_inference_results
for all
to authenticated
using (event_organizer_id is null or public.is_event_organizer_member(event_organizer_id))
with check (event_organizer_id is null or public.is_event_organizer_member(event_organizer_id));

create policy media_transcodes_crud_member
on public.media_transcodes
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy media_thumbnails_crud_member
on public.media_thumbnails
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy media_captions_crud_member
on public.media_captions
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy media_rights_holders_crud_member
on public.media_rights_holders
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy media_rights_crud_member
on public.media_rights
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy disciplinary_cases_crud_member
on public.disciplinary_cases
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy disciplinary_actions_crud_member
on public.disciplinary_actions
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy awards_crud_member
on public.awards
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

create policy award_recipients_crud_member
on public.award_recipients
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));

