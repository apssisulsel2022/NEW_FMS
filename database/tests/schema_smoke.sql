do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pgcrypto') then
    raise exception 'pgcrypto extension missing';
  end if;

  if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'competitions') then
    raise exception 'missing table public.competitions';
  end if;

  if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'match_event_stream') then
    raise exception 'missing table public.match_event_stream';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_policy p on p.polrelid = c.oid
    where n.nspname = 'public'
      and c.relname = 'match_event_stream'
  ) then
    raise exception 'missing RLS policies on public.match_event_stream';
  end if;
end $$;

