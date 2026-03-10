alter table public.players
  add column if not exists nik_encrypted text,
  add column if not exists nik_hmac text,
  add column if not exists nik_last4 text,
  add column if not exists nik_set_at timestamptz;

alter table public.players
  add constraint if not exists players_nik_last4_ck
  check (nik_last4 is null or nik_last4 ~ '^[0-9]{4}$');

alter table public.players
  add constraint if not exists players_nik_fields_ck
  check (
    (nik_hmac is null and nik_encrypted is null and nik_last4 is null and nik_set_at is null)
    or
    (nik_hmac is not null and nik_encrypted is not null and nik_last4 is not null and nik_set_at is not null)
  );

create unique index if not exists players_event_organizer_nik_hmac_uq
on public.players(event_organizer_id, nik_hmac)
where nik_hmac is not null;

