do $$
begin
  if not exists (select 1 from pg_type where typname = 'team_member_role') then
    create type public.team_member_role as enum ('captain', 'manager', 'player');
  end if;
end $$;

create table if not exists public.team_profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  owner_user_id uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  slug text not null,
  description text,
  logo_path text,
  contact_email text,
  contact_phone text,
  meta jsonb not null default '{}'::jsonb,
  unique (owner_user_id, slug)
);

create index if not exists team_profiles_owner_user_id_idx on public.team_profiles(owner_user_id);
create index if not exists team_profiles_name_idx on public.team_profiles using gin (to_tsvector('simple', name));

create trigger team_profiles_set_updated_at
before update on public.team_profiles
for each row execute function public.set_updated_at();

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  team_profile_id uuid not null references public.team_profiles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.team_member_role not null default 'player',
  joined_at timestamptz not null default now(),
  unique (team_profile_id, user_id)
);

create index if not exists team_members_team_profile_id_idx on public.team_members(team_profile_id);
create index if not exists team_members_user_id_idx on public.team_members(user_id);

create trigger team_members_set_updated_at
before update on public.team_members
for each row execute function public.set_updated_at();

create table if not exists public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  team_profile_id uuid not null references public.team_profiles(id) on delete cascade,
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  invited_email text,
  invited_user_id uuid references public.profiles(id) on delete set null,
  role public.team_member_role not null default 'player',
  token_hash text not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  meta jsonb not null default '{}'::jsonb
);

create unique index if not exists team_invitations_token_hash_uq on public.team_invitations(token_hash);
create index if not exists team_invitations_team_profile_id_idx on public.team_invitations(team_profile_id, created_at desc);
create index if not exists team_invitations_invited_user_id_idx on public.team_invitations(invited_user_id, created_at desc);

create trigger team_invitations_set_updated_at
before update on public.team_invitations
for each row execute function public.set_updated_at();

alter table public.teams
  add column if not exists team_profile_id uuid references public.team_profiles(id) on delete set null;

create index if not exists teams_team_profile_id_idx on public.teams(team_profile_id);

alter table public.competition_participants
  add column if not exists team_profile_id uuid references public.team_profiles(id) on delete set null;

drop index if exists competition_participants_unique_team;
drop index if exists competition_participants_unique_player;
drop index if exists competition_participants_unique_user;

alter table public.competition_participants
  drop constraint if exists competition_participants_one_ref_ck;

alter table public.competition_participants
  add constraint competition_participants_one_ref_ck
  check (
    (participant_type = 'team' and team_profile_id is not null and player_id is null and user_id is null)
    or
    (participant_type = 'player' and player_id is not null and team_profile_id is null and user_id is null)
    or
    (participant_type = 'user' and user_id is not null and team_profile_id is null and player_id is null)
  );

create unique index if not exists competition_participants_unique_team_profile
on public.competition_participants(competition_id, team_profile_id)
where team_profile_id is not null;

create unique index if not exists competition_participants_unique_player
on public.competition_participants(competition_id, player_id)
where player_id is not null;

create unique index if not exists competition_participants_unique_user
on public.competition_participants(competition_id, user_id)
where user_id is not null;

create or replace function public.is_team_member(p_team_profile_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_profile_id = p_team_profile_id
      and tm.user_id = auth.uid()
      and tm.status = 'active'
  );
$$;

alter table public.team_profiles enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invitations enable row level security;

create policy team_profiles_read_member
on public.team_profiles
for select
to authenticated
using (public.is_team_member(id));

create policy team_profiles_insert_authenticated
on public.team_profiles
for insert
to authenticated
with check (owner_user_id = auth.uid());

create policy team_profiles_update_member
on public.team_profiles
for update
to authenticated
using (public.is_team_member(id))
with check (public.is_team_member(id));

create policy team_profiles_delete_member
on public.team_profiles
for delete
to authenticated
using (public.is_team_member(id));

create policy team_members_crud_member
on public.team_members
for all
to authenticated
using (public.is_team_member(team_profile_id))
with check (public.is_team_member(team_profile_id));

create policy team_invitations_crud_member
on public.team_invitations
for all
to authenticated
using (public.is_team_member(team_profile_id))
with check (public.is_team_member(team_profile_id));

drop trigger if exists audit_team_profiles on public.team_profiles;
create trigger audit_team_profiles
after insert or update or delete on public.team_profiles
for each row execute function public.audit_row_change();

drop trigger if exists audit_team_members on public.team_members;
create trigger audit_team_members
after insert or update or delete on public.team_members
for each row execute function public.audit_row_change();

drop trigger if exists audit_team_invitations on public.team_invitations;
create trigger audit_team_invitations
after insert or update or delete on public.team_invitations
for each row execute function public.audit_row_change();

