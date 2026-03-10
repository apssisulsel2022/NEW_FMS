do $$
begin
  if not exists (select 1 from pg_type where typname = 'roster_player_status') then
    create type public.roster_player_status as enum ('active', 'injured', 'suspended', 'inactive');
  end if;
end $$;

alter table public.players
  add column if not exists player_code text not null default replace(gen_random_uuid()::text, '-', ''),
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_phone text,
  add column if not exists primary_position text,
  add column if not exists jersey_number_preference int,
  add column if not exists jersey_numbers_preference int[] not null default '{}'::int[];

create unique index if not exists players_event_organizer_player_code_uq
on public.players(event_organizer_id, player_code);

create unique index if not exists players_event_organizer_email_uq
on public.players(event_organizer_id, lower(email))
where email is not null;

create index if not exists players_name_search_idx
on public.players using gin (to_tsvector('simple', coalesce(first_name,'') || ' ' || coalesce(last_name,'')));

alter table public.team_players
  add column if not exists roster_status public.roster_player_status not null default 'active';

alter table public.team_players
  add constraint if not exists team_players_jersey_number_ck
  check (jersey_number is null or (jersey_number >= 1 and jersey_number <= 99));

alter table public.team_players
  drop constraint if exists team_players_team_id_player_id_key;

drop index if exists team_players_team_id_player_id_key;

create unique index if not exists team_players_active_player_uq
on public.team_players(team_id, player_id)
where end_date is null and status = 'active';

create unique index if not exists team_players_active_jersey_uq
on public.team_players(team_id, jersey_number)
where end_date is null and status = 'active' and jersey_number is not null;

create index if not exists team_players_team_id_roster_status_idx
on public.team_players(team_id, roster_status, end_date);

create index if not exists team_players_team_id_position_idx
on public.team_players(team_id, position);

drop trigger if exists audit_players on public.players;
create trigger audit_players
after insert or update or delete on public.players
for each row execute function public.audit_row_change();

drop trigger if exists audit_team_players on public.team_players;
create trigger audit_team_players
after insert or update or delete on public.team_players
for each row execute function public.audit_row_change();

alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.team_players enable row level security;

create policy teams_read_team_member
on public.teams
for select
to authenticated
using (teams.team_profile_id is not null and public.is_team_member(teams.team_profile_id));

create policy team_players_read_team_member
on public.team_players
for select
to authenticated
using (
  exists (
    select 1
    from public.teams t
    where t.id = team_players.team_id
      and t.team_profile_id is not null
      and public.is_team_member(t.team_profile_id)
  )
);

create policy team_players_manage_team_admin
on public.team_players
for insert, update, delete
to authenticated
using (
  exists (
    select 1
    from public.teams t
    join public.team_members tm on tm.team_profile_id = t.team_profile_id
    where t.id = team_players.team_id
      and tm.user_id = auth.uid()
      and tm.status = 'active'
      and tm.role in ('captain','manager')
  )
)
with check (
  exists (
    select 1
    from public.teams t
    join public.team_members tm on tm.team_profile_id = t.team_profile_id
    where t.id = team_players.team_id
      and tm.user_id = auth.uid()
      and tm.status = 'active'
      and tm.role in ('captain','manager')
  )
);

create policy players_read_team_member
on public.players
for select
to authenticated
using (
  exists (
    select 1
    from public.team_players tp
    join public.teams t on t.id = tp.team_id
    where tp.player_id = players.id
      and t.team_profile_id is not null
      and public.is_team_member(t.team_profile_id)
  )
);

create policy players_manage_team_admin
on public.players
for insert, update, delete
to authenticated
using (
  exists (
    select 1
    from public.team_members tm
    join public.teams t on t.team_profile_id = tm.team_profile_id
    where tm.user_id = auth.uid()
      and tm.status = 'active'
      and tm.role in ('captain','manager')
      and t.event_organizer_id = players.event_organizer_id
  )
)
with check (
  exists (
    select 1
    from public.team_members tm
    join public.teams t on t.team_profile_id = tm.team_profile_id
    where tm.user_id = auth.uid()
      and tm.status = 'active'
      and tm.role in ('captain','manager')
      and t.event_organizer_id = players.event_organizer_id
  )
);

