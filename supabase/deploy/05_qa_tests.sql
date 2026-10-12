-- =====================================================================
-- Ask Muriyar Ta — Q&A Test Suite
-- Feature branch: feature/ask-muriyar-ta
--
-- Run in the Supabase SQL Editor (postgres / service_role) AFTER applying:
--   20261010000000_aal2_enforcement.sql
--   20261010100000_qa_schema.sql
--   20261010100001_qa_rpcs.sql
--   20261010100003_qa_security_corrections.sql
--
-- WHAT IS VERIFIED:
--   Category A – Encryption safety: missing vault key raises
--                encryption_key_unavailable, never stores or returns
--                plaintext.
--   Category B – submit_question() validation gates: consent, length,
--                language, topic, follow-up target, rate limit.
--   Category C – AAL2 guards on review_get_question() and
--                question_publish().
--   Category D – Permission gates: question.raw.read, question.review,
--                question.disposition, question.answer, question.publish.
--   Category E – State machine: valid transitions, note required for
--                REJECTED/NEEDS_EDIT, PUBLISHED only via question_publish().
--   Category F – Publish flow: requires ANSWERED state, answer must exist,
--                question_display and slug required.
--   Category G – Catalog checks: RPCs exist, EXECUTE grants correct.
--   Category H – audit.scrub() field coverage.
--
-- HOW AAL IS SIMULATED:
--   Same as 04_aal2_tests.sql:
--   AAL1: leave request.jwt.claims unset (null JWT → aal = '' ≠ 'aal2').
--   AAL2: SET LOCAL request.jwt.claims = '{"sub":"…","aal":"aal2","role":"authenticated"}'.
--   auth.uid() reads request.jwt.claim.sub; both GUCs must be set for AAL2.
--
-- ENCRYPTION KEY SIMULATION:
--   submit_question() and review_get_question() read vault.decrypted_secrets
--   via SECURITY DEFINER (search_path includes vault). The harness uses two
--   strategies to simulate a missing key:
--   Strategy 1 (preferred): temporarily rename the secret in vault.secrets
--                           so vault.decrypted_secrets has no matching row.
--   Strategy 2 (fallback):  if vault extension is not available, use a
--                           fixture row with question_text = '' (empty bytes)
--                           and verify pgp_sym_decrypt raises.
--   In development: vault.create_secret must have been called with
--   'question_body_key' for categories C–F to pass.
--
-- TOTAL TESTS: 63
--   A01-A03 (3) + B01-B08 (8) + C01-C03 (3) + D01-D08 (8) +
--   E01-E09 (9) + F01-F07 (7) + G01-G18 (18) + H01-H07 (7) = 63
--
-- =====================================================================

begin;

-- ── Test-result table ─────────────────────────────────────────────────────────

create temp table _t05 (
  test_name text primary key,
  result    text    not null,
  detail    text
);

-- ── Harness helpers ───────────────────────────────────────────────────────────

-- assert_raises: PASS when exactly p_expected is raised.
create function pg_temp.chk_msg(p_test text, p_sql text, p_expected text)
returns void language plpgsql as $$
declare v_msg text;
begin
  begin
    execute p_sql;
    insert into _t05 values (p_test, 'FAIL', 'No exception raised; expected: ' || p_expected);
    return;
  exception when others then
    get stacked diagnostics v_msg = message_text;
    if v_msg = p_expected then
      insert into _t05 values (p_test, 'PASS', null);
    else
      insert into _t05 values (p_test, 'FAIL',
        'Got: ' || coalesce(v_msg, '<null>') || ' — expected: ' || p_expected);
    end if;
  end;
end $$;

-- assert_raises_aal2: PASS only when exactly 'aal2_required' is raised.
create function pg_temp.chk_aal2(p_test text, p_sql text)
returns void language plpgsql as $$
begin
  perform pg_temp.chk_msg(p_test, p_sql, 'aal2_required');
end $$;

-- assert_past_aal2: PASS when 'forbidden' or 'not_found' is raised (AAL2 cleared).
create function pg_temp.chk_past_aal2(p_test text, p_sql text)
returns void language plpgsql as $$
declare v_msg text;
begin
  begin
    execute p_sql;
    insert into _t05 values (p_test, 'PASS', 'Executed without error');
  exception when others then
    get stacked diagnostics v_msg = message_text;
    if v_msg in ('forbidden', 'not_found', 'encryption_key_unavailable') then
      insert into _t05 values (p_test, 'PASS', 'Reached inner check: ' || v_msg);
    elsif v_msg = 'aal2_required' then
      insert into _t05 values (p_test, 'FAIL', 'Unexpected aal2_required — AAL2 gate not cleared');
    else
      insert into _t05 values (p_test, 'FAIL',
        'Unexpected error (not forbidden/not_found/encryption_key_unavailable): ' || v_msg);
    end if;
  end;
end $$;

-- assert_no_raise: PASS when the SQL executes without exception.
create function pg_temp.chk_ok(p_test text, p_sql text)
returns void language plpgsql as $$
declare v_msg text;
begin
  begin
    execute p_sql;
    insert into _t05 values (p_test, 'PASS', null);
  exception when others then
    get stacked diagnostics v_msg = message_text;
    insert into _t05 values (p_test, 'FAIL', 'Unexpected exception: ' || v_msg);
  end;
end $$;

-- assert_true: PASS when the scalar SQL expression evaluates to true.
create function pg_temp.chk_true(p_test text, p_sql text, p_fail_detail text default null)
returns void language plpgsql as $$
declare v_ok boolean; v_msg text;
begin
  begin
    execute p_sql into v_ok;
    if coalesce(v_ok, false) then
      insert into _t05 values (p_test, 'PASS', null);
    else
      insert into _t05 values (p_test, 'FAIL', coalesce(p_fail_detail, 'Expression returned false or null'));
    end if;
  exception when others then
    get stacked diagnostics v_msg = message_text;
    insert into _t05 values (p_test, 'FAIL', 'Unexpected exception: ' || v_msg);
  end;
end $$;

-- ── Fixture accounts ──────────────────────────────────────────────────────────
-- managing_editor: question.queue.read, question.raw.read, question.review,
--                  question.disposition, question.answer, question.publish — full access.
-- moderator:       question.queue.read, question.review, question.answer — limited.
-- translator:      admin.access only — no Q&A permissions.
-- anon_user:       used to test submit_question (anon/authenticated without MFA).

insert into auth.users(id, aud, role, email, created_at, updated_at) values
  ('05000000-0000-4000-8000-000000000001',
   'authenticated','authenticated','t05-editor@example.invalid',now(),now()),
  ('05000000-0000-4000-8000-000000000002',
   'authenticated','authenticated','t05-moderator@example.invalid',now(),now()),
  ('05000000-0000-4000-8000-000000000003',
   'authenticated','authenticated','t05-noperm@example.invalid',now(),now()),
  ('05000000-0000-4000-8000-000000000004',
   'authenticated','authenticated','t05-submitter@example.invalid',now(),now());

insert into public.users(user_id, email, display_name) values
  ('05000000-0000-4000-8000-000000000001','t05-editor@example.invalid','T05 Editor'),
  ('05000000-0000-4000-8000-000000000002','t05-moderator@example.invalid','T05 Moderator'),
  ('05000000-0000-4000-8000-000000000003','t05-noperm@example.invalid','T05 NoPermission'),
  ('05000000-0000-4000-8000-000000000004','t05-submitter@example.invalid','T05 Submitter');

insert into public.user_role_assignments(user_id, role_id)
  select '05000000-0000-4000-8000-000000000001', role_id
  from public.roles where name = 'managing_editor';

insert into public.user_role_assignments(user_id, role_id)
  select '05000000-0000-4000-8000-000000000002', role_id
  from public.roles where name = 'moderator';

insert into public.user_role_assignments(user_id, role_id)
  select '05000000-0000-4000-8000-000000000003', role_id
  from public.roles where name = 'translator';

-- No role assignment for t05-submitter: tests anonymous submission path.

-- Fixture: active consent version (use existing or insert a test one).
-- We insert only if one is not already present, so as not to disturb production consent data.
do $$
begin
  if not exists (select 1 from public.consent_versions where is_active) then
    insert into public.consent_versions (version_number, statement_text, is_active, effective_from)
    values ('TEST-1.0', 'Test consent statement (fixture only)', true, now() - interval '1 day');
  end if;
end $$;

-- Verify fixture setup.
do $$
declare
  v_editor int; v_mod int; v_trans int;
begin
  select count(*) into v_editor
  from public.user_role_assignments ura
  join public.roles r on r.role_id = ura.role_id
  where ura.user_id = '05000000-0000-4000-8000-000000000001' and r.name = 'managing_editor';

  select count(*) into v_mod
  from public.user_role_assignments ura
  join public.roles r on r.role_id = ura.role_id
  where ura.user_id = '05000000-0000-4000-8000-000000000002' and r.name = 'moderator';

  select count(*) into v_trans
  from public.user_role_assignments ura
  join public.roles r on r.role_id = ura.role_id
  where ura.user_id = '05000000-0000-4000-8000-000000000003' and r.name = 'translator';

  if v_editor = 0 then
    raise exception 'SETUP FAIL: managing_editor role assignment missing';
  end if;
  if v_mod = 0 then
    raise exception 'SETUP FAIL: moderator role assignment missing';
  end if;
  if v_trans = 0 then
    raise exception 'SETUP FAIL: translator role assignment missing';
  end if;
end $$;

-- ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
-- CATEGORY A: Encryption safety — missing vault key cannot cause plaintext storage
-- ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
--
-- These tests prove the security property: a missing or unreachable vault key
-- MUST raise encryption_key_unavailable (SQLSTATE 58000) and MUST NOT store
-- or return any question text.
--
-- Strategy: temporarily rename 'question_body_key' in vault.secrets so that
-- vault.decrypted_secrets returns no matching row. The insert in submit_question()
-- and the decrypt in review_get_question() must both fail with the named error,
-- never succeed silently or fall back to plaintext.
--
-- If the vault.secrets table is inaccessible (e.g. insufficient privilege on
-- the secrets table from this test user), we record SKIP for that sub-test.
-- The test runner does not fail on SKIP — it only fails on FAIL.
-- However: A01 and A02 are run as postgres/service_role and MUST pass.
--
-- Subtests:
--   A01 submit_question raises encryption_key_unavailable when key is absent.
--       Proves: no plaintext fallback in submit_question() (correction 1).
--   A02 review_get_question raises encryption_key_unavailable when key is absent.
--       Proves: no plaintext fallback in review_get_question() (correction 2).
--   A03 raw_questions contains no plaintext question_text after A01 attempt.
--       Proves: the insert in A01 did not silently store anything.
-- ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄

-- Rename the vault key so it cannot be found during A01/A02.
-- We do this as postgres (service_role) since only that role can touch vault.secrets.
reset role;
reset request.jwt.claims;
reset request.jwt.claim.sub;

-- Record the fixture question count before A01 to detect spurious inserts.
create temp table _a_count_before as
  select count(*) as n from public.raw_questions;

do $$
declare v_exists boolean;
begin
  select exists(
    select 1 from vault.secrets where name = 'question_body_key'
  ) into v_exists;

  if v_exists then
    -- Temporarily rename so vault.decrypted_secrets has no 'question_body_key' row.
    update vault.secrets set name = '__t05_key_hidden__' where name = 'question_body_key';
  end if;
  -- If the key is already absent, the test is even more direct.
end $$;

-- A01: submit_question() with no key must raise encryption_key_unavailable.
-- submit_question is granted to anon — test as anon with no JWT (AAL not required for submit).
set local role anon;
reset request.jwt.claims;
reset request.jwt.claim.sub;

select pg_temp.chk_msg(
  'A01 submit_question raises encryption_key_unavailable when vault key absent',
  $$select public.submit_question(
    'This is a test question that is exactly fifty characters long for the test',
    'en', true, 'en', null, null
  )$$,
  'encryption_key_unavailable'
);

-- A02: review_get_question() with no key must raise encryption_key_unavailable.
-- First insert a test question as postgres (bypassing submit_question) so we have a row,
-- then test the decrypt path.
reset role;

-- Insert a question directly as a fixture (bypassing submit_question entirely).
-- The question_text is stored as pgp_sym_encrypt output from a known key — but
-- since we hide the key, review_get_question must fail before decrypting.
-- We store raw bytes that look encrypted (a fake bytea) to test the key-check path.
-- The important behavior is: missing key → error BEFORE any decrypt attempt.
insert into public.raw_questions (
  raw_question_id,
  question_text,
  char_count,
  language_code,
  consent_given,
  consent_version_id,
  consent_timestamp,
  consent_language,
  current_state
) select
  '05000000-0000-4000-8000-000000000099'::uuid,
  convert_to('FIXTURE:NOT_REAL_CIPHERTEXT', 'UTF8'),   -- not real ciphertext
  30,
  'en',
  true,
  consent_version_id,
  now(),
  'en',
  'PENDING'
from public.consent_versions where is_active limit 1;

-- Set up AAL2 as managing_editor so permission check passes; key check fires next.
set local role authenticated;
set local request.jwt.claim.sub = '05000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"05000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}';

select pg_temp.chk_msg(
  'A02 review_get_question raises encryption_key_unavailable when vault key absent',
  $$select * from public.review_get_question('05000000-0000-4000-8000-000000000099')$$,
  'encryption_key_unavailable'
);

-- A03: No rows inserted by the A01 attempt (submit_question aborted).
-- The row count in raw_questions must be exactly _a_count_before.n + 1
-- (we inserted one fixture row for A02, but A01 should have added 0).
reset role;
reset request.jwt.claims;
reset request.jwt.claim.sub;

select pg_temp.chk_true(
  'A03 submit_question with missing key inserts no row (plaintext not stored)',
  $$select (select count(*) from public.raw_questions)
       = (select n from _a_count_before) + 1$$,
  'Row count after A01+A02 fixture != before+1; A01 may have stored a row'
);

-- Restore the vault key name.
do $$
begin
  update vault.secrets set name = 'question_body_key' where name = '__t05_key_hidden__';
end $$;

-- Clean up A02 fixture row.
delete from public.raw_questions where raw_question_id = '05000000-0000-4000-8000-000000000099';

-- ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
-- CATEGORY B: submit_question() validation gates
-- ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
-- submit_question is granted to anon and authenticated — no AAL required.
-- Tests run as anon to mirror real public usage.

set local role anon;
reset request.jwt.claims;
reset request.jwt.claim.sub;

select pg_temp.chk_msg(
  'B01 submit_question: consent=false raises consent_required',
  $$select public.submit_question(
    'This question is long enough to pass the minimum character count requirement here',
    'en', false, null, null, null)$$,
  'consent_required'
);

select pg_temp.chk_msg(
  'B02 submit_question: consent=null raises consent_required',
  $$select public.submit_question(
    'This question is long enough to pass the minimum character count requirement here',
    'en', null, null, null, null)$$,
  'consent_required'
);

select pg_temp.chk_msg(
  'B03 submit_question: question < 50 chars raises too_short',
  $$select public.submit_question('Too short', 'en', true, null, null, null)$$,
  'too_short'
);

select pg_temp.chk_msg(
  'B04 submit_question: question > 800 chars raises too_long',
  $$select public.submit_question(
    repeat('a', 801),
    'en', true, null, null, null)$$,
  'too_long'
);

select pg_temp.chk_msg(
  'B05 submit_question: unsupported language code raises unsupported_language',
  $$select public.submit_question(
    'This question is long enough to pass the minimum character count requirement here',
    'xx-INVALID', true, null, null, null)$$,
  'unsupported_language'
);

select pg_temp.chk_msg(
  'B06 submit_question: inactive topic raises invalid_topic',
  $$select public.submit_question(
    'This question is long enough to pass the minimum character count requirement here',
    'en', true, null,
    '05000000-0000-0000-0000-000000000099'::uuid,  -- nonexistent topic
    null)$$,
  'invalid_topic'
);

select pg_temp.chk_msg(
  'B07 submit_question: nonexistent follow_up_to raises invalid_follow_up_target',
  $$select public.submit_question(
    'This question is long enough to pass the minimum character count requirement here',
    'en', true, null, null,
    '05000000-0000-0000-0000-000000000088'::uuid)$$,  -- nonexistent published_qa_id
  'invalid_follow_up_target'
);

-- B08: successful submit with vault key present.
-- This also verifies the encrypted path works end-to-end.
-- The assertion is just that no exception is raised.
reset role;
reset request.jwt.claims;
reset request.jwt.claim.sub;

-- Verify vault key exists before running B08. If not, skip gracefully.
do $$
declare v_key_present boolean;
begin
  select exists(
    select 1 from vault.secrets where name = 'question_body_key'
  ) into v_key_present;

  if not v_key_present then
    insert into _t05 values (
      'B08 submit_question succeeds with vault key present (encrypted)',
      'FAIL',
      'PRECONDITION: question_body_key not found in vault.secrets — '
      'run: select vault.create_secret(''<key>'', ''question_body_key'') before this test'
    );
  end if;
end $$;

set local role anon;
reset request.jwt.claims;
reset request.jwt.claim.sub;

-- Only runs B08 if it was not already inserted by the vault check above.
do $$
begin
  if not exists (select 1 from _t05 where test_name like 'B08%') then
    begin
      perform public.submit_question(
        'This is a full test question that meets the minimum length and is used to verify encrypted storage',
        'en', true, null, null, null
      );
      insert into _t05 values (
        'B08 submit_question succeeds with vault key present (encrypted)',
        'PASS', null
      );
    exception when others then
      declare v_msg text;
      begin
        get stacked diagnostics v_msg = message_text;
        insert into _t05 values (
          'B08 submit_question succeeds with vault key present (encrypted)',
          'FAIL', 'Unexpected exception: ' || v_msg
        );
      end;
    end;
  end if;
end $$;

-- ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
-- CATEGORY C: AAL2 guards on review_get_question() and question_publish()
-- ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄

-- C01: review_get_question blocks AAL1 (no JWT claims set).
set local role authenticated;
set local request.jwt.claim.sub = '05000000-0000-4000-8000-000000000001';
-- No jwt.claims → auth.jwt() → null → aal = '' → aal2_required.
reset request.jwt.claims;

select pg_temp.chk_aal2(
  'C01 review_get_question blocks AAL1',
  $$select * from public.review_get_question('05000000-0000-4000-8000-000000000099')$$
);

-- C02: question_publish blocks AAL1.
select pg_temp.chk_aal2(
  'C02 question_publish blocks AAL1',
  $$select public.question_publish(
    '05000000-0000-4000-8000-000000000099',
    'Test display question?',
    'test-slug-c02',
    false)$$
);

-- C03: review_get_question with AAL2 passes the AAL gate (reaches permission or row check).
set local request.jwt.claims = '{"sub":"05000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}';

select pg_temp.chk_past_aal2(
  'C03 review_get_question with AAL2 clears the AAL gate (reaches permission/row check)',
  $$select * from public.review_get_question('05000000-0000-4000-8000-000000000099')$$
);

-- ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
-- CATEGORY D: Permission gates
-- ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
-- translator has admin.access only — no Q&A permissions at all.

-- D01: review_get_question: no question.raw.read → forbidden (AAL2 set).
set local role authenticated;
set local request.jwt.claim.sub = '05000000-0000-4000-8000-000000000003';
set local request.jwt.claims = '{"sub":"05000000-0000-4000-8000-000000000003","aal":"aal2","role":"authenticated"}';

select pg_temp.chk_msg(
  'D01 review_get_question no question.raw.read → forbidden',
  $$select * from public.review_get_question('05000000-0000-4000-8000-000000000099')$$,
  'forbidden'
);

-- D02: question_set_state: no question.review → forbidden.
select pg_temp.chk_msg(
  'D02 question_set_state no question.review → forbidden',
  $$select public.question_set_state(
    '05000000-0000-4000-8000-000000000099',
    'IN_REVIEW', null, false)$$,
  'forbidden'
);

-- D03: question_assign: no question.disposition → forbidden.
select pg_temp.chk_msg(
  'D03 question_assign no question.disposition → forbidden',
  $$select public.question_assign(
    '05000000-0000-4000-8000-000000000099',
    '05000000-0000-4000-8000-000000000001',
    null)$$,
  'forbidden'
);

-- D04: question_save_answer: no question.answer → forbidden.
select pg_temp.chk_msg(
  'D04 question_save_answer no question.answer → forbidden',
  $$select public.question_save_answer(
    '05000000-0000-4000-8000-000000000099',
    'Answer text here', null)$$,
  'forbidden'
);

-- D05: question_publish: no question.publish → forbidden (AAL2 set).
select pg_temp.chk_msg(
  'D05 question_publish no question.publish → forbidden',
  $$select public.question_publish(
    '05000000-0000-4000-8000-000000000099',
    'Display question?', 'test-slug-d05', false)$$,
  'forbidden'
);

-- D06: moderator HAS question.review — should reach row check (not_found), not forbidden.
set local role authenticated;
set local request.jwt.claim.sub = '05000000-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"sub":"05000000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}';

select pg_temp.chk_msg(
  'D06 moderator question.review granted — question_set_state reaches not_found (permission cleared)',
  $$select public.question_set_state(
    '05000000-0000-4000-8000-000000000099',
    'IN_REVIEW', null, false)$$,
  'not_found'
);

-- D07: managing_editor HAS question.raw.read — with AAL2, review_get_question reaches row check.
set local role authenticated;
set local request.jwt.claim.sub = '05000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"05000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}';

select pg_temp.chk_past_aal2(
  'D07 managing_editor question.raw.read granted — review_get_question reaches row/key check',
  $$select * from public.review_get_question('05000000-0000-4000-8000-000000000099')$$
);

-- D08: moderator does NOT have question.disposition — question_assign → forbidden.
set local role authenticated;
set local request.jwt.claim.sub = '05000000-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"sub":"05000000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}';

select pg_temp.chk_msg(
  'D08 moderator no question.disposition → question_assign forbidden',
  $$select public.question_assign(
    '05000000-0000-4000-8000-000000000099',
    '05000000-0000-4000-8000-000000000002',
    null)$$,
  'forbidden'
);

-- ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
-- CATEGORY E: State machine transitions
-- ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
-- Insert a fixture question for state machine tests.
-- Done as postgres (service_role) — bypasses submit_question() validation.

reset role;
reset request.jwt.claims;
reset request.jwt.claim.sub;

insert into public.raw_questions (
  raw_question_id,
  question_text,
  char_count,
  language_code,
  consent_given,
  consent_version_id,
  consent_timestamp,
  consent_language,
  current_state
)
select
  '05000000-0000-4000-8000-000000000011'::uuid,
  pgp_sym_encrypt(
    'This is a state machine test question used for category E tests only.',
    (select decrypted_secret from vault.decrypted_secrets where name = 'question_body_key' limit 1)
  ),
  68,
  'en',
  true,
  consent_version_id,
  now(),
  'en',
  'PENDING'
from public.consent_versions where is_active limit 1
on conflict (raw_question_id) do nothing;

-- If vault key is absent, insert with dummy bytes and tests will document behavior.
do $$
begin
  if not exists (
    select 1 from public.raw_questions
    where raw_question_id = '05000000-0000-4000-8000-000000000011'
  ) then
    insert into public.raw_questions (
      raw_question_id, question_text, char_count, language_code,
      consent_given, consent_version_id, consent_timestamp, consent_language, current_state
    )
    select '05000000-0000-4000-8000-000000000011'::uuid,
      convert_to('FALLBACK_NO_KEY', 'UTF8'), 20, 'en', true,
      consent_version_id, now(), 'en', 'PENDING'
    from public.consent_versions where is_active limit 1;
  end if;
end $$;

-- E tests use managing_editor (has question.review + question.disposition).
set local role authenticated;
set local request.jwt.claim.sub = '05000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"05000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}';

-- E01: Invalid state string raises invalid_state.
select pg_temp.chk_msg(
  'E01 question_set_state invalid state raises invalid_state',
  $$select public.question_set_state(
    '05000000-0000-4000-8000-000000000011',
    'NOT_A_STATE', null, false)$$,
  'invalid_state'
);

-- E02: Attempt to transition to PUBLISHED via question_set_state raises use_question_publish_rpc.
select pg_temp.chk_msg(
  'E02 question_set_state to PUBLISHED raises use_question_publish_rpc',
  $$select public.question_set_state(
    '05000000-0000-4000-8000-000000000011',
    'PUBLISHED', null, false)$$,
  'use_question_publish_rpc'
);

-- E03: REJECTED without a note raises note_required.
select pg_temp.chk_msg(
  'E03 question_set_state REJECTED without note raises note_required',
  $$select public.question_set_state(
    '05000000-0000-4000-8000-000000000011',
    'REJECTED', null, false)$$,
  'note_required'
);

-- E04: NEEDS_EDIT without a note raises note_required.
select pg_temp.chk_msg(
  'E04 question_set_state NEEDS_EDIT without note raises note_required',
  $$select public.question_set_state(
    '05000000-0000-4000-8000-000000000011',
    'NEEDS_EDIT', '', false)$$,
  'note_required'
);

-- E05: Valid transition PENDING → IN_REVIEW (no note required).
select pg_temp.chk_ok(
  'E05 question_set_state PENDING → IN_REVIEW succeeds',
  $$select public.question_set_state(
    '05000000-0000-4000-8000-000000000011',
    'IN_REVIEW', null, false)$$
);

-- E06: Verify state was actually updated.
select pg_temp.chk_true(
  'E06 raw_questions.current_state updated to IN_REVIEW after E05',
  $$select current_state = 'IN_REVIEW'
    from public.raw_questions
    where raw_question_id = '05000000-0000-4000-8000-000000000011'$$
);

-- E07: Transition recorded in qa_state_transitions.
select pg_temp.chk_true(
  'E07 qa_state_transitions has record for E05 PENDING → IN_REVIEW',
  $$select exists(
    select 1 from public.qa_state_transitions
    where raw_question_id = '05000000-0000-4000-8000-000000000011'
      and from_state = 'PENDING'
      and to_state   = 'IN_REVIEW'
  )$$
);

-- E08: REJECTED with a note succeeds.
select pg_temp.chk_ok(
  'E08 question_set_state REJECTED with note succeeds',
  $$select public.question_set_state(
    '05000000-0000-4000-8000-000000000011',
    'REJECTED', 'Test rejection note for category E', false)$$
);

-- E09: Moderator (no question.disposition) cannot escalate — escalation requires disposition.
set local role authenticated;
set local request.jwt.claim.sub = '05000000-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"sub":"05000000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}';

-- Insert a second fixture for E09 (PENDING state needed for moderator scope).
reset role;
insert into public.raw_questions (
  raw_question_id, question_text, char_count, language_code,
  consent_given, consent_version_id, consent_timestamp, consent_language, current_state
)
select '05000000-0000-4000-8000-000000000012'::uuid,
  coalesce(
    pgp_sym_encrypt(
      'E09 escalation fixture question text, long enough for testing purposes only.',
      (select decrypted_secret from vault.decrypted_secrets where name = 'question_body_key' limit 1)
    ),
    convert_to('E09_FALLBACK', 'UTF8')
  ),
  70, 'en', true, consent_version_id, now(), 'en', 'PENDING'
from public.consent_versions where is_active limit 1
on conflict (raw_question_id) do nothing;

set local role authenticated;
set local request.jwt.claim.sub = '05000000-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"sub":"05000000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}';

select pg_temp.chk_msg(
  'E09 moderator cannot escalate (no question.disposition) → forbidden',
  $$select public.question_set_state(
    '05000000-0000-4000-8000-000000000012',
    'IN_REVIEW', 'escalation attempt', true)$$,
  'forbidden'
);

-- ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
-- CATEGORY F: question_publish() — full publish flow
-- ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
-- Insert a fixture question in ANSWERED state with an associated answer.

reset role;
reset request.jwt.claims;
reset request.jwt.claim.sub;

insert into public.raw_questions (
  raw_question_id, question_text, char_count, language_code,
  consent_given, consent_version_id, consent_timestamp, consent_language, current_state
)
select '05000000-0000-4000-8000-000000000020'::uuid,
  coalesce(
    pgp_sym_encrypt(
      'Category F fixture for publish flow. This question is long enough for testing.',
      (select decrypted_secret from vault.decrypted_secrets where name = 'question_body_key' limit 1)
    ),
    convert_to('F_FIXTURE_NO_KEY', 'UTF8')
  ),
  76, 'en', true, consent_version_id, now(), 'en', 'ANSWERED'
from public.consent_versions where is_active limit 1
on conflict (raw_question_id) do nothing;

-- Upsert answer for F fixture.
insert into public.question_answers (
  raw_question_id, answer_text, answer_author_id, attribution_label, language_code
) values (
  '05000000-0000-4000-8000-000000000020',
  'This is a test answer for the publish flow test.',
  '05000000-0000-4000-8000-000000000001',
  'Muriyar Ta Team',
  'en'
) on conflict (raw_question_id) do update
  set answer_text = excluded.answer_text;

-- F01: question_publish without AAL2 raises aal2_required.
set local role authenticated;
set local request.jwt.claim.sub = '05000000-0000-4000-8000-000000000001';
reset request.jwt.claims;

select pg_temp.chk_aal2(
  'F01 question_publish without AAL2 raises aal2_required',
  $$select public.question_publish(
    '05000000-0000-4000-8000-000000000020',
    'Display question?', 't05-f01-slug', false)$$
);

-- Set up AAL2 managing_editor for F02–F07.
set local request.jwt.claims = '{"sub":"05000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}';

-- F02: question_publish on question not in ANSWERED state raises question_not_answered.
-- Use fixture E011 which was transitioned to REJECTED in E08.
select pg_temp.chk_msg(
  'F02 question_publish on non-ANSWERED state raises question_not_answered',
  $$select public.question_publish(
    '05000000-0000-4000-8000-000000000011',
    'Display question?', 't05-f02-slug', false)$$,
  'question_not_answered'
);

-- F03: question_publish with blank question_display raises question_display_required.
select pg_temp.chk_msg(
  'F03 question_publish with blank question_display raises question_display_required',
  $$select public.question_publish(
    '05000000-0000-4000-8000-000000000020',
    '   ', 't05-f03-slug', false)$$,
  'question_display_required'
);

-- F04: question_publish with blank slug raises slug_required.
select pg_temp.chk_msg(
  'F04 question_publish with blank slug raises slug_required',
  $$select public.question_publish(
    '05000000-0000-4000-8000-000000000020',
    'What should I do?', '   ', false)$$,
  'slug_required'
);

-- F05: question_publish succeeds with valid inputs.
-- Captures published_qa_id in a temp variable for F06/F07.
create temp table _f05_result (pub_id uuid);

do $$
declare v_pub_id uuid; v_msg text;
begin
  begin
    select public.question_publish(
      '05000000-0000-4000-8000-000000000020',
      'What do I do when I need advice?',
      't05-f05-publish-slug',
      false
    ) into v_pub_id;

    insert into _t05 values (
      'F05 question_publish succeeds with valid ANSWERED question',
      'PASS', 'published_qa_id: ' || v_pub_id::text
    );
    insert into _f05_result values (v_pub_id);
  exception when others then
    get stacked diagnostics v_msg = message_text;
    insert into _t05 values (
      'F05 question_publish succeeds with valid ANSWERED question',
      'FAIL', 'Unexpected exception: ' || v_msg
    );
  end;
end $$;

-- F06: After publish, raw_questions.current_state = PUBLISHED.
select pg_temp.chk_true(
  'F06 raw_questions.current_state = PUBLISHED after successful question_publish',
  $$select current_state = 'PUBLISHED'
    from public.raw_questions
    where raw_question_id = '05000000-0000-4000-8000-000000000020'$$
);

-- F07: published_qa row exists with the correct slug.
select pg_temp.chk_true(
  'F07 published_qa row has correct slug after question_publish',
  $$select exists(
    select 1 from public.published_qa
    where slug = 't05-f05-publish-slug'
      and raw_question_id = '05000000-0000-4000-8000-000000000020'
  )$$
);

-- ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
-- CATEGORY G: Catalog checks — RPCs exist and grants are correct
-- ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄

reset role;
reset request.jwt.claims;
reset request.jwt.claim.sub;

-- G01-G07: Q&A RPCs must exist in pg_proc.
do $$
declare
  v_fns text[] := array[
    'submit_question',
    'review_get_question',
    'question_set_state',
    'question_assign',
    'question_save_answer',
    'question_publish',
    'purge_rejected_questions'
  ];
  v_fn text; v_cnt int; v_idx int := 1;
begin
  foreach v_fn in array v_fns loop
    select count(*) into v_cnt
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = v_fn;
    insert into _t05 values (
      'G0' || v_idx || ' RPC exists in pg_proc: ' || v_fn,
      case when v_cnt > 0 then 'PASS' else 'FAIL' end,
      case when v_cnt > 0 then null else 'Function not found in public schema' end
    );
    v_idx := v_idx + 1;
  end loop;
end $$;

-- G08-G13: RPCs that authenticated users should be able to call.
do $$
declare
  v_fns text[] := array[
    'review_get_question',
    'question_set_state',
    'question_assign',
    'question_save_answer',
    'question_publish'
  ];
  v_fn text; v_has boolean; v_idx int := 8;
begin
  foreach v_fn in array v_fns loop
    select count(*) > 0 into v_has
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name = v_fn
      and grantee = 'authenticated'
      and privilege_type = 'EXECUTE';
    insert into _t05 values (
      'G' || lpad(v_idx::text, 2, '0') || ' authenticated EXECUTE on ' || v_fn,
      case when v_has then 'PASS' else 'FAIL' end,
      case when v_has then null else 'EXECUTE grant missing for authenticated' end
    );
    v_idx := v_idx + 1;
  end loop;
end $$;

-- G13: submit_question must also be granted to anon (public submission).
do $$
declare v_anon boolean; v_auth boolean;
begin
  select count(*) > 0 into v_anon
  from information_schema.routine_privileges
  where routine_schema = 'public'
    and routine_name = 'submit_question'
    and grantee = 'anon'
    and privilege_type = 'EXECUTE';

  select count(*) > 0 into v_auth
  from information_schema.routine_privileges
  where routine_schema = 'public'
    and routine_name = 'submit_question'
    and grantee = 'authenticated'
    and privilege_type = 'EXECUTE';

  insert into _t05 values (
    'G13 submit_question EXECUTE granted to anon',
    case when v_anon then 'PASS' else 'FAIL' end,
    case when v_anon then null else 'EXECUTE grant missing for anon' end
  );
  insert into _t05 values (
    'G14 submit_question EXECUTE granted to authenticated',
    case when v_auth then 'PASS' else 'FAIL' end,
    case when v_auth then null else 'EXECUTE grant missing for authenticated' end
  );
end $$;

-- G15-G18: Key tables must exist.
do $$
declare
  v_tables text[] := array['raw_questions','qa_state_transitions','question_answers','published_qa'];
  v_tbl text; v_has boolean; v_idx int := 15;
begin
  foreach v_tbl in array v_tables loop
    select exists(
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = v_tbl
    ) into v_has;
    insert into _t05 values (
      'G' || v_idx || ' table exists: public.' || v_tbl,
      case when v_has then 'PASS' else 'FAIL' end,
      case when v_has then null else 'Table not found' end
    );
    v_idx := v_idx + 1;
  end loop;
end $$;

-- ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
-- CATEGORY H: audit.scrub() field coverage
-- ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
-- Verifies that audit.scrub() strips the expected set of PII fields.
-- The canonical field list (from 20260722050100) plus 'question_text'
-- is the definitive contract.

reset role;
reset request.jwt.claims;
reset request.jwt.claim.sub;

-- H01: question_text is stripped.
select pg_temp.chk_true(
  'H01 audit.scrub strips question_text',
  $$select audit.scrub('{"question_text":"secret","other":"keep"}'::jsonb)
         = '{"other":"keep"}'::jsonb$$
);

-- H02: body is stripped (restored field from canonical version).
select pg_temp.chk_true(
  'H02 audit.scrub strips body (canonical field restored)',
  $$select audit.scrub('{"body":"secret","other":"keep"}'::jsonb)
         = '{"other":"keep"}'::jsonb$$
);

-- H03: body_text is stripped.
select pg_temp.chk_true(
  'H03 audit.scrub strips body_text',
  $$select audit.scrub('{"body_text":"secret","other":"keep"}'::jsonb)
         = '{"other":"keep"}'::jsonb$$
);

-- H04: contact_email is stripped (restored field).
select pg_temp.chk_true(
  'H04 audit.scrub strips contact_email (canonical field restored)',
  $$select audit.scrub('{"contact_email":"secret","other":"keep"}'::jsonb)
         = '{"other":"keep"}'::jsonb$$
);

-- H05: internal_notes is stripped (restored field).
select pg_temp.chk_true(
  'H05 audit.scrub strips internal_notes (canonical field restored)',
  $$select audit.scrub('{"internal_notes":"secret","other":"keep"}'::jsonb)
         = '{"other":"keep"}'::jsonb$$
);

-- H06: Non-PII fields are preserved (no over-stripping).
select pg_temp.chk_true(
  'H06 audit.scrub preserves non-PII fields',
  $$select audit.scrub('{"entity_id":"123","action":"READ","question_state":"PENDING"}'::jsonb)
         = '{"entity_id":"123","action":"READ","question_state":"PENDING"}'::jsonb$$
);

-- H07: scrub is idempotent (applying it twice gives the same result).
select pg_temp.chk_true(
  'H07 audit.scrub is idempotent',
  $$select audit.scrub(audit.scrub('{"question_text":"x","body":"y","entity_id":"z"}'::jsonb))
         = audit.scrub('{"question_text":"x","body":"y","entity_id":"z"}'::jsonb)$$
);

-- ── Results ───────────────────────────────────────────────────────────────────

select
  'RESULT: ' || result || ' | ' || test_name ||
    case when detail <> '' then ' | ' || detail else '' end as test_output
from (
  select test_name, result, coalesce(detail, '') as detail
  from _t05
  order by test_name
) t;

-- ── CI summary line ───────────────────────────────────────────────────────────
-- Format: SUITE: pass=N fail=N total=N
-- The apply workflow greps for this line to determine pass/fail.

select
  'SUITE: pass=' || sum(case when result = 'PASS' then 1 else 0 end) ||
         ' fail=' || sum(case when result <> 'PASS' then 1 else 0 end) ||
         ' total=' || count(*) as suite_summary
from _t05;

rollback;
-- Rollback removes all fixture data:
--   auth.users (t05-*)
--   public.users (t05-*)
--   user_role_assignments (t05-*)
--   raw_questions (t05 fixtures)
--   question_answers (t05 fixtures)
--   published_qa (t05 fixtures)
--   qa_state_transitions (t05 fixtures)
-- Any vault.secrets rename (A01 key hide) is also rolled back.
-- Safe to re-run at any time without side effects.
-- ON_ERROR_STOP=1 stops psql on unexpected SQL errors outside PL/pgSQL handlers.

select '05-qa-tests: results above' as result;
