do $$
declare
  t record;
  pk_name text;
  uq_name text;
  id_uq_exists boolean;
begin
  for t in
    select *
    from (values
      ('public', 'role_permissions', array['role_id','permission_id']),
      ('public', 'media_asset_tags', array['asset_id','tag_id']),
      ('public', 'media_collection_items', array['collection_id','asset_id']),
      ('public', 'competition_group_teams', array['competition_group_id','team_id']),
      ('public', 'round_matches', array['competition_round_id','match_id']),
      ('public', 'competition_sponsors', array['competition_id','sponsor_id'])
    ) as v(schema_name, table_name, cols)
  loop
    select conname into pk_name
    from pg_constraint c
    join pg_class r on r.oid = c.conrelid
    join pg_namespace n on n.oid = r.relnamespace
    where n.nspname = t.schema_name
      and r.relname = t.table_name
      and c.contype = 'p';

    select conname into uq_name
    from pg_constraint c
    join pg_class r on r.oid = c.conrelid
    join pg_namespace n on n.oid = r.relnamespace
    where n.nspname = t.schema_name
      and r.relname = t.table_name
      and c.contype = 'u'
      and (select array_agg(att.attname order by k.n)
           from unnest(c.conkey) with ordinality as k(attnum, n)
           join pg_attribute att on att.attrelid = r.oid and att.attnum = k.attnum
          ) = t.cols;

    if pk_name is null or uq_name is null then
      raise exception 'expected PK and unique constraint not found for %.%', t.schema_name, t.table_name;
    end if;

    select exists (
      select 1
      from pg_constraint c
      join pg_class r on r.oid = c.conrelid
      join pg_namespace n on n.oid = r.relnamespace
      where n.nspname = t.schema_name
        and r.relname = t.table_name
        and c.contype in ('u', 'p')
        and (select array_agg(att.attname order by k.n)
             from unnest(c.conkey) with ordinality as k(attnum, n)
             join pg_attribute att on att.attrelid = r.oid and att.attnum = k.attnum
            ) = array['id']
    ) into id_uq_exists;

    if not id_uq_exists then
      execute format('alter table %I.%I add constraint %I unique (id)', t.schema_name, t.table_name, t.table_name || '_id_key');
    end if;

    execute format('alter table %I.%I drop constraint %I', t.schema_name, t.table_name, pk_name);
    execute format('alter table %I.%I add constraint %I primary key (%s)',
      t.schema_name,
      t.table_name,
      pk_name,
      (
        select string_agg(format('%I', col), ', ')
        from unnest(t.cols) as col
      )
    );
  end loop;
end $$;
