\set ON_ERROR_STOP on

\if :{?event_organizer_id}
\else
\set event_organizer_id '00000000-0000-0000-0000-000000000000'
\endif

\if :{?competition_id}
\else
\set competition_id '00000000-0000-0000-0000-000000000000'
\endif

\if :{?match_id}
\else
\set match_id '00000000-0000-0000-0000-000000000000'
\endif

\if :{?team_id}
\else
\set team_id '00000000-0000-0000-0000-000000000000'
\endif

\if :{?player_id}
\else
\set player_id '00000000-0000-0000-0000-000000000000'
\endif

select 1 as op;

select * from public.competitions
where event_organizer_id = :'event_organizer_id'
order by created_at desc
limit 50;

select * from public.teams
where competition_id = :'competition_id'
order by created_at desc
limit 50;

select * from public.matches
where competition_id = :'competition_id'
order by scheduled_at asc nulls last
limit 100;

select * from public.standings
where competition_id = :'competition_id'
order by points desc, goal_diff desc, goals_for desc
limit 50;

select * from public.match_events
where match_id = :'match_id'
order by created_at asc
limit 200;

insert into public.match_event_stream (event_organizer_id, match_id, team_id, player_id, minute, second, payload)
values (:'event_organizer_id', :'match_id', :'team_id', :'player_id', 12, 34, '{}'::jsonb);

select * from public.match_event_stream
where match_id = :'match_id'
order by created_at desc
limit 200;

update public.matches
set home_score = home_score + 1, match_status = 'live'
where id = :'match_id';

select * from public.match_lineups_v2
where match_id = :'match_id'
order by team_id;

select * from public.match_lineup_players
where match_lineup_id in (
  select id from public.match_lineups_v2 where match_id = :'match_id'
)
order by created_at asc;

insert into public.media_access_log (event_organizer_id, asset_id, viewer_user_id, bytes_served)
values (:'event_organizer_id', null, null, 1024);

select * from public.media_assets
where event_organizer_id = :'event_organizer_id'
order by created_at desc
limit 50;

select * from public.media_asset_variants
where asset_id in (
  select id from public.media_assets where event_organizer_id = :'event_organizer_id' order by created_at desc limit 10
)
order by created_at desc;

select * from public.player_statistics
where event_organizer_id = :'event_organizer_id'
  and player_id = :'player_id'
order by created_at desc
limit 10;

select * from public.match_player_statistics_v2
where match_id = :'match_id'
order by created_at asc;

select * from public.match_team_statistics
where match_id = :'match_id'
order by team_id;

select * from public.player_contracts
where event_organizer_id = :'event_organizer_id'
  and player_id = :'player_id'
order by created_at desc
limit 20;

select * from public.player_transfers
where event_organizer_id = :'event_organizer_id'
  and player_id = :'player_id'
order by transfer_date desc nulls last, created_at desc
limit 20;

select * from public.player_medical_records
where event_organizer_id = :'event_organizer_id'
  and player_id = :'player_id'
order by recorded_at desc
limit 20;

select * from public.audit_log
where event_organizer_id = :'event_organizer_id'
order by created_at desc
limit 200;

select * from public.webhook_deliveries
where event_organizer_id = :'event_organizer_id'
  and delivery_status in ('queued', 'failed')
order by created_at asc
limit 100;

select * from public.media_processing_jobs
where event_organizer_id = :'event_organizer_id'
  and job_status in ('queued', 'running')
order by run_after asc
limit 100;

select * from public.automation_jobs
where event_organizer_id = :'event_organizer_id'
  and job_status in ('queued', 'running')
order by run_after asc
limit 100;

select * from public.notifications
where user_id = auth.uid()
order by created_at desc
limit 50;

