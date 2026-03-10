create index concurrently if not exists match_events_match_id_created_at_idx
on public.match_events(match_id, created_at asc);

create index concurrently if not exists generated_media_event_organizer_created_at_idx
on public.generated_media(event_organizer_id, created_at desc);

create index concurrently if not exists media_assets_event_organizer_created_at_idx
on public.media_assets(event_organizer_id, created_at desc);

create index concurrently if not exists player_statistics_tenant_player_created_at_idx
on public.player_statistics(event_organizer_id, player_id, created_at desc);

create index concurrently if not exists player_verifications_tenant_player_created_at_idx
on public.player_verifications(event_organizer_id, player_id, created_at desc);

