do $$
declare
  has_tbl boolean;
  has_rls boolean;
  has_trg boolean;
begin
  select exists (select 1 from pg_type where typname = 'competition_format_type') into has_tbl;
  if not has_tbl then
    raise exception 'missing type competition_format_type';
  end if;

  select exists (select 1 from pg_type where typname = 'organizer_accreditation_status') into has_tbl;
  if not has_tbl then
    raise exception 'missing type organizer_accreditation_status';
  end if;

  select exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'competition_formats'
  ) into has_tbl;
  if not has_tbl then
    raise exception 'missing table public.competition_formats';
  end if;

  select relrowsecurity into has_rls
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'competition_formats';
  if has_rls is distinct from true then
    raise exception 'RLS not enabled on public.competition_formats';
  end if;

  select exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'competitions'
      and t.tgname = 'competitions_validate_competition_format_tenant'
  ) into has_trg;
  if not has_trg then
    raise exception 'missing trigger competitions_validate_competition_format_tenant';
  end if;
end $$;

