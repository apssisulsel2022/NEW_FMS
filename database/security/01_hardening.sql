create extension if not exists "pgcrypto";

create or replace function public.require_setting(p_key text)
returns text
language plpgsql
stable
as $$
declare
  v text;
begin
  v := current_setting(p_key, true);
  if v is null or length(v) = 0 then
    raise exception 'Missing required setting: %', p_key;
  end if;
  return v;
end;
$$;

create or replace function public.encrypt_jsonb(p_payload jsonb)
returns bytea
language sql
stable
as $$
  select pgp_sym_encrypt(p_payload::text, public.require_setting('app.encryption_key'))::bytea;
$$;

create or replace function public.decrypt_jsonb(p_cipher bytea)
returns jsonb
language sql
stable
as $$
  select pgp_sym_decrypt(p_cipher, public.require_setting('app.encryption_key'))::jsonb;
$$;

revoke all on function public.encrypt_jsonb(jsonb) from public;
revoke all on function public.decrypt_jsonb(bytea) from public;
grant execute on function public.encrypt_jsonb(jsonb) to authenticated;
grant execute on function public.decrypt_jsonb(bytea) to authenticated;

