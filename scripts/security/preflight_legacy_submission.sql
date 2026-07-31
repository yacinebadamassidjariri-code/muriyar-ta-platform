\set ON_ERROR_STOP on

-- Read-only guard for the one-time M-53 Production remediation.

begin transaction read only;

do $preflight$
declare
  v_total integer;
  v_key_count integer;
  v_plaintext_rows integer := 0;
  v_body text;
  r record;
begin
  select count(*) into v_total from public.raw_submissions;
  if v_total <> 1 then
    raise exception 'm53_preflight_expected_one_submission_found_%', v_total;
  end if;

  select count(*) into v_key_count
  from vault.secrets
  where name = 'story_body_key';
  if v_key_count <> 0 then
    raise exception 'm53_preflight_expected_no_story_body_key_found_%', v_key_count;
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'audit.audit_log'::regclass
      and tgname = 'audit_log_no_modify'
      and not tgisinternal
  ) then
    raise exception 'm53_preflight_audit_immutability_missing';
  end if;

  if exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.raw_submissions'::regclass
      and tgname = 'protect_raw_submission_original'
      and not tgisinternal
  ) then
    raise exception 'm53_preflight_canonical_immutability_already_active';
  end if;

  for r in
    select submission_id, body_text, char_count
    from public.raw_submissions
  loop
    begin
      v_body := convert_from(r.body_text, 'UTF8');
    exception when others then
      raise exception 'm53_preflight_story_not_plain_utf8_%', r.submission_id;
    end;
    if char_length(btrim(v_body)) <> r.char_count then
      raise exception 'm53_preflight_story_length_mismatch_%', r.submission_id;
    end if;
    v_plaintext_rows := v_plaintext_rows + 1;
  end loop;

  if v_plaintext_rows <> 1 then
    raise exception 'm53_preflight_expected_one_plaintext_row_found_%',
      v_plaintext_rows;
  end if;

  raise notice
    'M-53 preflight passed: submissions=%, plaintext_rows=%, vault_keys=%',
    v_total, v_plaintext_rows, v_key_count;
end;
$preflight$;

rollback;
