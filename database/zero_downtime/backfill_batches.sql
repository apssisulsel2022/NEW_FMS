do $$
declare
  batch_size int := 5000;
  updated_rows int := 0;
begin
  loop
    with cte as (
      select id, created_at
      from public.match_event_stream
      where source is null
      order by created_at asc
      limit batch_size
    )
    update public.match_event_stream m
    set source = 'legacy'
    from cte
    where m.id = cte.id
      and m.created_at = cte.created_at;

    get diagnostics updated_rows = row_count;
    exit when updated_rows = 0;
    perform pg_sleep(0.05);
  end loop;
end $$;

