\set ON_ERROR_STOP on

-- Read-only M-53 verification. Returns counts and booleans only; never the key
-- or narrative. The transaction is read-only to prevent accidental mutation.

begin transaction read only;

do $verify$
declare
  v_key text;
  v_total integer := 0;
  v_verified integer := 0;
  v_decrypted text;
  r record;
begin
  select decrypted_secret into strict v_key
  from vault.decrypted_secrets
  where name = 'story_body_key';
  if nullif(v_key, '') is null then
    raise exception 'm53_story_body_key_unavailable';
  end if;

  for r in
    select submission_id, body_text, char_count
    from public.raw_submissions
  loop
    v_total := v_total + 1;
    begin
      v_decrypted := extensions.pgp_sym_decrypt(r.body_text, v_key);
    exception when others then
      raise exception 'm53_encrypted_body_verification_failed_%', r.submission_id;
    end;
    if char_length(btrim(v_decrypted)) <> r.char_count then
      raise exception 'm53_decrypted_length_mismatch_%', r.submission_id;
    end if;
    if r.body_text = convert_to(v_decrypted, 'UTF8') then
      raise exception 'm53_plaintext_bytes_detected_%', r.submission_id;
    end if;
    v_verified := v_verified + 1;
  end loop;

  if v_total = 0 or v_verified <> v_total then
    raise exception 'm53_submission_encryption_incomplete';
  end if;

  raise notice 'M-53 encryption verification passed: rows=%', v_verified;
end;
$verify$;

rollback;
