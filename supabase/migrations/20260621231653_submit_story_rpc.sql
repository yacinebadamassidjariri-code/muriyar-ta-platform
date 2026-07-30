-- =====================================================================
-- Migration 0012 — Anonymous story intake RPC (MVP)
-- Provides the single, controlled write path into raw_submissions for the
-- public /submit form. SECURITY DEFINER (owned by postgres) so it satisfies the
-- require_service_role() guard (0011) and bypasses RLS, while remaining callable
-- by anon. The existing enforce_submission_intake() / set_resolved_at() triggers
-- still run, forcing current_state = 'PENDING'.
-- =====================================================================

create or replace function public.submit_story(
  p_body            text,
  p_language_code   text,
  p_consent         boolean,
  p_consent_language text default null
) returns void
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_consent_version_id integer;
  v_char_count integer := char_length(btrim(coalesce(p_body, '')));
  v_key text;
begin
  -- Server-side validation (defence in depth; the app validates too).
  if coalesce(p_consent, false) is not true then
    raise exception 'consent_required' using errcode = '23514';
  end if;
  if v_char_count < 50 then
    raise exception 'too_short' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.supported_languages
    where language_code = p_language_code and is_active
  ) then
    raise exception 'unsupported_language' using errcode = '23503';
  end if;

  -- Record the consent version currently in force (FR-SS-13..17).
  select consent_version_id into v_consent_version_id
  from public.consent_versions
  where is_active
  order by effective_from desc
  limit 1;
  if v_consent_version_id is null then
    raise exception 'no_active_consent';
  end if;

  -- Encrypt the body with the Vault-managed key when configured (recommended).
  -- Configure once:  select vault.create_secret('<long-random-string>', 'story_body_key');
  -- Falls back to UTF-8 bytes only if the secret is absent (dev convenience).
  begin
    select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'story_body_key' limit 1;
  exception when others then
    v_key := null;
  end;

  insert into public.raw_submissions (
    submission_type, language_code, body_text,
    consent_given, consent_version_id, consent_timestamp, consent_language,
    submission_timestamp, char_count
    -- current_state is forced to 'PENDING' by enforce_submission_intake()
  ) values (
    'text', p_language_code,
    case when v_key is not null
      then pgp_sym_encrypt(p_body, v_key)
      else convert_to(p_body, 'UTF8')
    end,
    true, v_consent_version_id, now(), coalesce(p_consent_language, p_language_code),
    now(), v_char_count
  );
end;
$$;

revoke all on function public.submit_story(text, text, boolean, text) from public;
grant execute on function public.submit_story(text, text, boolean, text) to anon, authenticated;

-- Moderation read path (future): pgp_sym_decrypt(body_text, '<story_body_key>')
-- when encrypted, else convert_from(body_text, 'UTF8').
