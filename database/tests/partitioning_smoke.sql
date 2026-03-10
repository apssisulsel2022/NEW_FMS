do $$
declare
  tbl text;
  has_default bool;
begin
  foreach tbl in array array['audit_log', 'match_event_stream', 'tracking_frames', 'media_access_log', 'outbox_events']
  loop
    select exists (
      select 1
      from pg_class parent
      join pg_namespace ns on ns.oid = parent.relnamespace
      join pg_inherits i on i.inhparent = parent.oid
      join pg_class child on child.oid = i.inhrelid
      where ns.nspname = 'public'
        and parent.relname = tbl
        and child.relname = tbl || '_default'
    ) into has_default;

    if not has_default then
      raise exception 'missing default partition for public.%', tbl;
    end if;
  end loop;
end $$;

