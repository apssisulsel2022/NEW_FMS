create index concurrently if not exists competitions_event_organizer_id_created_at_idx
on public.competitions(event_organizer_id, created_at desc);

create index concurrently if not exists teams_competition_id_created_at_idx
on public.teams(competition_id, created_at desc);

create index concurrently if not exists matches_competition_id_scheduled_at_idx
on public.matches(competition_id, scheduled_at asc nulls last);

create index concurrently if not exists matches_competition_id_match_status_scheduled_at_idx
on public.matches(competition_id, match_status, scheduled_at asc nulls last);

create index concurrently if not exists standings_competition_rank_idx
on public.standings(competition_id, points desc, goal_diff desc, goals_for desc, team_id);

create index concurrently if not exists players_event_organizer_name_idx
on public.players(event_organizer_id, last_name, first_name);

create index concurrently if not exists notifications_user_id_created_at_idx
on public.notifications(user_id, created_at desc);

create index concurrently if not exists automation_jobs_tenant_status_run_after_idx
on public.automation_jobs(event_organizer_id, job_status, run_after asc);

create index concurrently if not exists media_processing_jobs_tenant_status_run_after_idx
on public.media_processing_jobs(event_organizer_id, job_status, run_after asc);

create index concurrently if not exists ai_inference_jobs_tenant_status_run_after_idx
on public.ai_inference_jobs(event_organizer_id, job_status, run_after asc);

create index concurrently if not exists webhook_deliveries_tenant_status_created_at_idx
on public.webhook_deliveries(event_organizer_id, delivery_status, created_at asc);

