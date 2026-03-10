select '# Data Dictionary (Generated)' as line;
select '' as line;
select 'Generated at: ' || now()::text as line;
select '' as line;
select '## Tables' as line;
select '' as line;
select '- ' || table_schema || '.' || table_name as line
from information_schema.tables
where table_schema in ('public')
  and table_type = 'BASE TABLE'
order by table_schema, table_name;

select '' as line;
select '## Columns' as line;
select '' as line;

select
  '### ' || c.table_schema || '.' || c.table_name || e'\n\n' ||
  string_agg(
    '- ' || c.column_name || ' ' || c.data_type ||
    case when c.is_nullable = 'NO' then ' not null' else '' end ||
    case when c.column_default is not null then ' default ' || c.column_default else '' end,
    e'\n'
    order by c.ordinal_position
  ) as line
from information_schema.columns c
join information_schema.tables t
  on t.table_schema = c.table_schema
 and t.table_name = c.table_name
where c.table_schema in ('public')
  and t.table_type = 'BASE TABLE'
group by c.table_schema, c.table_name
order by c.table_schema, c.table_name;
