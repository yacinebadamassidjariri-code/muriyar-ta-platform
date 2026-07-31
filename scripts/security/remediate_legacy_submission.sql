\set ON_ERROR_STOP on

-- M-53 one-time legacy submission remediation.
--
-- This is intentionally not a migration. Run it once, through psql, only after
-- a verified backup and an exact one-row preflight. It creates the Vault key
-- and rewrites the legacy UTF-8 byte payload in one transaction. It never
-- selects the key or narrative into client output.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
select pg_advisory_xact_lock(hashtextextended('muriyar-ta:m53:legacy-submission', 0));

do $m53$
declare
  v_total integer;
  v_key_count integer;
  v_key text;
  v_existing_encrypted integer := 0;
  v_remediated integer := 0;
  v_decrypted text;
  v_rows integer;
  r record;
begin
  select count(*) into v_total from public.raw_submissions;
  if v_total <> 1 then
    raise exception 'm53_preflight_expected_one_submission_found_%', v_total;
  end if;

  select count(*) into v_key_count
  from vault.secrets
  where name = 'story_body_key';
  if v_key_count > 1 then
    raise exception 'm53_preflight_duplicate_story_body_keys';
  end if;

  if v_key_count = 0 then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(48), 'base64'),
      'story_body_key',
      'Muriyar Ta anonymous story body encryption key'
    );
  end if;

  select decrypted_secret into strict v_key
  from vault.decrypted_secrets
  where name = 'story_body_key';
  if nullif(v_key, '') is null then
    raise exception 'm53_story_body_key_unavailable';
  end if;

  for r in
    select submission_id, body_text, char_count
    from public.raw_submissions
    order by submission_id
    for update
  loop
    if r.body_text is null then
      raise exception 'm53_null_story_body_%', r.submission_id;
    end if;

    begin
      v_decrypted := extensions.pgp_sym_decrypt(r.body_text, v_key);
      v_existing_encrypted := v_existing_encrypted + 1;
    exception when others then
      begin
        v_decrypted := convert_from(r.body_text, 'UTF8');
      exception when others then
        raise exception 'm53_unknown_story_encoding_%', r.submission_id;
      end;

      if char_length(btrim(v_decrypted)) <> r.char_count then
        raise exception 'm53_story_length_mismatch_%', r.submission_id;
      end if;

      update public.raw_submissions
      set body_text = extensions.pgp_sym_encrypt(v_decrypted, v_key)
      where submission_id = r.submission_id
        and body_text = r.body_text;
      get diagnostics v_rows = row_count;
      if v_rows <> 1 then
        raise exception 'm53_concurrent_story_update_%', r.submission_id;
      end if;

      insert into audit.audit_log(
        actor_user_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        metadata
      ) values (
        null,
        'break_glass_operator',
        'security.legacy_submission.encrypted',
        'raw_submissions',
        r.submission_id::text,
        jsonb_build_object(
          'algorithm', 'OpenPGP symmetric encryption',
          'key_source', 'Supabase Vault',
          'previous_encoding', 'UTF-8 bytes',
          'remediation', 'M-53'
        )
      );
      v_remediated := v_remediated + 1;
    end;
  end loop;

  if v_remediated = 0 and v_existing_encrypted <> 1 then
    raise exception 'm53_postflight_unexpected_encryption_state';
  end if;
  if v_remediated > 1 then
    raise exception 'm53_postflight_too_many_rows_remediated_%', v_remediated;
  end if;

  for r in
    select submission_id, body_text, char_count
    from public.raw_submissions
  loop
    begin
      v_decrypted := extensions.pgp_sym_decrypt(r.body_text, v_key);
    exception when others then
      raise exception 'm53_postflight_decryption_failed_%', r.submission_id;
    end;

    if char_length(btrim(v_decrypted)) <> r.char_count then
      raise exception 'm53_postflight_story_length_mismatch_%', r.submission_id;
    end if;
    if r.body_text = convert_to(v_decrypted, 'UTF8') then
      raise exception 'm53_postflight_plaintext_bytes_remain_%', r.submission_id;
    end if;
  end loop;

  raise notice
    'M-53 remediation verified: total=%, remediated=%, already_encrypted=%',
    v_total, v_remediated, v_existing_encrypted;
end;
$m53$;

commit;
