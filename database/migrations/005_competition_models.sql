do $$
begin
  if not exists (select 1 from pg_type where typname = 'competition_format_type') then
    create type public.competition_format_type as enum ('single_elimination', 'double_elimination', 'round_robin', 'league', 'group_stage', 'swiss', 'hybrid');
  end if;

  if not exists (select 1 from pg_type where typname = 'organizer_accreditation_status') then
    create type public.organizer_accreditation_status as enum ('unverified', 'pending', 'verified', 'suspended');
  end if;
end $$;

alter table public.event_organizers
  add column if not exists legal_name text,
  add column if not exists website text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists address text,
  add column if not exists country text,
  add column if not exists accreditation_status public.organizer_accreditation_status not null default 'unverified',
  add column if not exists accredited_at timestamptz,
  add column if not exists accreditation_meta jsonb not null default '{}'::jsonb;

create table if not exists public.competition_formats (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid references public.event_organizers(id) on delete cascade,
  code text not null,
  name text not null,
  format_type public.competition_format_type not null,
  rules jsonb not null default '{}'::jsonb,
  unique (event_organizer_id, code)
);

create index if not exists competition_formats_event_organizer_id_idx on public.competition_formats(event_organizer_id);
create index if not exists competition_formats_format_type_idx on public.competition_formats(format_type);
create unique index if not exists competition_formats_global_code_uq
on public.competition_formats(code)
where event_organizer_id is null;

create trigger competition_formats_set_updated_at
before update on public.competition_formats
for each row execute function public.set_updated_at();

create table if not exists public.competition_format_rules (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid references public.event_organizers(id) on delete cascade,
  format_id uuid not null references public.competition_formats(id) on delete cascade,
  rule_key text not null,
  rule_value jsonb,
  unique (format_id, rule_key)
);

create index if not exists competition_format_rules_event_organizer_id_idx on public.competition_format_rules(event_organizer_id);
create index if not exists competition_format_rules_format_id_idx on public.competition_format_rules(format_id);

create trigger competition_format_rules_set_updated_at
before update on public.competition_format_rules
for each row execute function public.set_updated_at();

create or replace function public.sync_competition_format_rule_tenant()
returns trigger
language plpgsql
as $$
begin
  select event_organizer_id into new.event_organizer_id
  from public.competition_formats
  where id = new.format_id;
  return new;
end;
$$;

drop trigger if exists competition_format_rules_sync_tenant on public.competition_format_rules;
create trigger competition_format_rules_sync_tenant
before insert or update of format_id on public.competition_format_rules
for each row execute function public.sync_competition_format_rule_tenant();

alter table public.competitions
  add column if not exists competition_format_id uuid references public.competition_formats(id) on delete set null;

create index if not exists competitions_competition_format_id_idx on public.competitions(competition_format_id);

create or replace function public.validate_competition_format_tenant()
returns trigger
language plpgsql
as $$
declare
  v_format_tenant uuid;
begin
  if new.competition_format_id is null then
    return new;
  end if;

  select event_organizer_id into v_format_tenant
  from public.competition_formats
  where id = new.competition_format_id;

  if v_format_tenant is null then
    return new;
  end if;

  if v_format_tenant <> new.event_organizer_id then
    raise exception 'competition_format tenant mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists competitions_validate_competition_format_tenant on public.competitions;
create trigger competitions_validate_competition_format_tenant
before insert or update of competition_format_id, event_organizer_id on public.competitions
for each row execute function public.validate_competition_format_tenant();

alter table public.competition_categories
  add column if not exists category_type text,
  add column if not exists discipline text,
  add column if not exists age_group_min int,
  add column if not exists age_group_max int,
  add column if not exists skill_level text,
  add column if not exists gender text,
  add column if not exists meta jsonb not null default '{}'::jsonb;

alter table public.seasons
  add column if not exists registration_opens_at timestamptz,
  add column if not exists registration_closes_at timestamptz,
  add column if not exists timezone text,
  add column if not exists scheduling_constraints jsonb not null default '{}'::jsonb;

alter table public.competition_categories
  add constraint if not exists competition_categories_age_group_ck
  check (age_group_min is null or age_group_max is null or age_group_min <= age_group_max);

alter table public.seasons
  add constraint if not exists seasons_registration_window_ck
  check (registration_opens_at is null or registration_closes_at is null or registration_opens_at <= registration_closes_at);

create table if not exists public.organizer_hosting_records (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.fms_status not null default 'active',
  event_organizer_id uuid not null references public.event_organizers(id) on delete cascade,
  competition_id uuid references public.competitions(id) on delete set null,
  hosted_at timestamptz,
  details jsonb not null default '{}'::jsonb
);

create index if not exists organizer_hosting_records_event_organizer_id_idx on public.organizer_hosting_records(event_organizer_id);
create index if not exists organizer_hosting_records_competition_id_idx on public.organizer_hosting_records(competition_id);
create index if not exists organizer_hosting_records_hosted_at_idx on public.organizer_hosting_records(hosted_at desc);

create trigger organizer_hosting_records_set_updated_at
before update on public.organizer_hosting_records
for each row execute function public.set_updated_at();

create or replace function public.audit_row_change()
returns trigger
language plpgsql
as $$
declare
  v_action text;
  v_entity_id uuid;
  v_event_organizer_id uuid;
  v_payload jsonb;
begin
  if (tg_op = 'INSERT') then
    v_action := 'insert';
    v_entity_id := new.id;
    v_payload := to_jsonb(new);
    v_event_organizer_id := (v_payload->>'event_organizer_id')::uuid;
    if v_event_organizer_id is null and tg_table_name = 'event_organizers' then
      v_event_organizer_id := new.id;
    end if;
  elsif (tg_op = 'UPDATE') then
    v_action := 'update';
    v_entity_id := new.id;
    v_payload := to_jsonb(new);
    v_event_organizer_id := (v_payload->>'event_organizer_id')::uuid;
    if v_event_organizer_id is null and tg_table_name = 'event_organizers' then
      v_event_organizer_id := new.id;
    end if;
  elsif (tg_op = 'DELETE') then
    v_action := 'delete';
    v_entity_id := old.id;
    v_payload := to_jsonb(old);
    v_event_organizer_id := (v_payload->>'event_organizer_id')::uuid;
    if v_event_organizer_id is null and tg_table_name = 'event_organizers' then
      v_event_organizer_id := old.id;
    end if;
  end if;

  if v_event_organizer_id is not null
     and not public.is_event_organizer_member(v_event_organizer_id)
     and not public.is_super_admin() then
    v_event_organizer_id := null;
  end if;

  insert into public.audit_log (event_organizer_id, actor_user_id, action, entity_type, entity_id, details)
  values (
    v_event_organizer_id,
    auth.uid(),
    v_action,
    tg_table_name,
    v_entity_id,
    jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new))
  );

  if (tg_op = 'DELETE') then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists audit_event_organizers on public.event_organizers;
create trigger audit_event_organizers
after insert or update or delete on public.event_organizers
for each row execute function public.audit_row_change();

drop trigger if exists audit_competition_categories on public.competition_categories;
create trigger audit_competition_categories
after insert or update or delete on public.competition_categories
for each row execute function public.audit_row_change();

drop trigger if exists audit_seasons on public.seasons;
create trigger audit_seasons
after insert or update or delete on public.seasons
for each row execute function public.audit_row_change();

drop trigger if exists audit_competition_formats on public.competition_formats;
create trigger audit_competition_formats
after insert or update or delete on public.competition_formats
for each row execute function public.audit_row_change();

drop trigger if exists audit_competition_format_rules on public.competition_format_rules;
create trigger audit_competition_format_rules
after insert or update or delete on public.competition_format_rules
for each row execute function public.audit_row_change();

drop trigger if exists audit_organizer_hosting_records on public.organizer_hosting_records;
create trigger audit_organizer_hosting_records
after insert or update or delete on public.organizer_hosting_records
for each row execute function public.audit_row_change();

alter table public.competition_formats enable row level security;
alter table public.competition_format_rules enable row level security;
alter table public.organizer_hosting_records enable row level security;

create policy competition_formats_read_authenticated
on public.competition_formats
for select
to authenticated
using (event_organizer_id is null or public.is_event_organizer_member(event_organizer_id));

create policy competition_formats_crud_member
on public.competition_formats
for insert, update, delete
to authenticated
using (event_organizer_id is not null and public.is_event_organizer_member(event_organizer_id))
with check (event_organizer_id is not null and public.is_event_organizer_member(event_organizer_id));

create policy competition_formats_manage_global_super_admin
on public.competition_formats
for insert, update, delete
to authenticated
using (event_organizer_id is null and public.is_super_admin())
with check (event_organizer_id is null and public.is_super_admin());

create policy competition_format_rules_read_authenticated
on public.competition_format_rules
for select
to authenticated
using (event_organizer_id is null or public.is_event_organizer_member(event_organizer_id));

create policy competition_format_rules_crud_member
on public.competition_format_rules
for insert, update, delete
to authenticated
using (event_organizer_id is not null and public.is_event_organizer_member(event_organizer_id))
with check (event_organizer_id is not null and public.is_event_organizer_member(event_organizer_id));

create policy competition_format_rules_manage_global_super_admin
on public.competition_format_rules
for insert, update, delete
to authenticated
using (event_organizer_id is null and public.is_super_admin())
with check (event_organizer_id is null and public.is_super_admin());

create policy organizer_hosting_records_crud_member
on public.organizer_hosting_records
for all
to authenticated
using (public.is_event_organizer_member(event_organizer_id))
with check (public.is_event_organizer_member(event_organizer_id));
