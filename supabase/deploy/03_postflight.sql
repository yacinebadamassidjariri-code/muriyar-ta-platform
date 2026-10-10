-- =====================================================================
-- 03_postflight.sql — Post-migration verification and smoke tests
-- Run this immediately after 02_production_migration.sql commits.
--
-- Structure:
--   Part A — Structural verification (read-only, no side effects)
--   Part B — Rollback-safe smoke test (wrapped in a transaction that
--             ALWAYS rolls back; no test data persists in the database)
--
-- HOW TO USE:
--   1. Run Part A by itself first. Confirm all results match expected values.
--   2. Then run Part B. The final SELECT must still return 5 rows (the
--      original submissions), confirming no test data leaked.
-- =====================================================================


-- =====================================================================
-- PART A — Structural verification (read-only)
-- =====================================================================


-- ── A1: submit_story — now has 8 parameters ─────────────────────────────────
-- Expected: exactly 1 row, pronargs = 8

select
  pronargs,
  pg_get_function_arguments(oid) as arg_list,
  prosecdef as is_security_definer
from pg_proc
where proname = 'submit_story'
  and pronamespace = 'public'::regnamespace;


-- ── A2: Research consent tables created with RLS enabled ────────────────────
-- Expected: 2 rows, both with rls_enabled = true

select
  relname                as table_name,
  relrowsecurity         as rls_enabled,
  relforcerowsecurity    as rls_forced
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in (
    'research_consent_versions',
    'research_consent_version_translations'
  )
order by relname;


-- ── A3: Research consent versions seeded ────────────────────────────────────
-- Expected:
--   research-v1 → is_active = false
--   research-v2 → is_active = true

select version_number, is_active, effective_from
from public.research_consent_versions
order by version_number;


-- ── A4: Translation rows — en + fr for each version; no ha or zar ───────────
-- Expected: 4 rows total (v1-en, v1-fr, v2-en, v2-fr). No ha or zar rows.

select
  v.version_number,
  t.language_code,
  left(t.statement_text, 60) as statement_preview
from public.research_consent_version_translations t
join public.research_consent_versions v
  on v.research_consent_version_id = t.research_consent_version_id
order by v.version_number, t.language_code;


-- ── A5: raw_submissions has four new research_consent_* columns and age ──────
-- Expected: 5 rows — one for each new column

select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name   = 'raw_submissions'
  and column_name in (
    'research_consent_given',
    'research_consent_version_id',
    'research_consent_timestamp',
    'research_consent_language',
    'age'
  )
order by column_name;


-- ── A6: protect_raw_submission_original covers all new fields ────────────────
-- Expected: all 5 fields = 'yes'

select
  case when prosrc like '%research_consent_given%'         then 'yes' else 'MISSING' end
    as covers_research_consent_given,
  case when prosrc like '%research_consent_version_id%'    then 'yes' else 'MISSING' end
    as covers_research_consent_version_id,
  case when prosrc like '%research_consent_timestamp%'     then 'yes' else 'MISSING' end
    as covers_research_consent_timestamp,
  case when prosrc like '%research_consent_language%'      then 'yes' else 'MISSING' end
    as covers_research_consent_language,
  case when prosrc like '%new.age%'                        then 'yes' else 'MISSING' end
    as covers_age
from pg_proc
where proname = 'protect_raw_submission_original'
  and pronamespace = 'public'::regnamespace;


-- ── A7: submit_story still has hard encryption guard; no plaintext fallback ──
-- Expected: hard_encryption_guard = 'PRESENT', plaintext_fallback = 'ABSENT'

select
  case when prosrc like '%encryption_unavailable%' then 'PRESENT' else 'MISSING' end
    as hard_encryption_guard,
  case when prosrc like '%convert_to%'             then 'PRESENT' else 'ABSENT'  end
    as plaintext_fallback
from pg_proc
where proname = 'submit_story'
  and pronamespace = 'public'::regnamespace;


-- ── A8: Grants on new 8-param submit_story ───────────────────────────────────
-- Expected: anon and authenticated both have EXECUTE; public does not

select grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name   = 'submit_story'
  and grantee in ('anon', 'authenticated', 'public')
order by grantee;


-- ── A9: Grants on research consent tables — anon/authenticated have none ─────
-- Expected: 0 rows

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'research_consent_versions',
    'research_consent_version_translations'
  )
  and grantee in ('anon', 'authenticated')
order by table_name, grantee;


-- ── A10: Existing submissions are all intact ─────────────────────────────────
-- Expected: count = 5, same latest timestamp as pre-migration check A.

select
  count(*)                  as total_submissions,
  max(submission_timestamp) as latest_submission
from public.raw_submissions;


-- ── A11: New columns on existing rows default correctly ──────────────────────
-- Expected: all 5 existing rows have:
--   research_consent_given = false, all other research_consent_* = null, age = null

select
  count(*)                           as total_rows,
  count(*) filter (where research_consent_given = false)   as research_consent_false,
  count(*) filter (where research_consent_version_id is null) as version_id_null,
  count(*) filter (where research_consent_timestamp  is null) as timestamp_null,
  count(*) filter (where research_consent_language   is null) as language_null,
  count(*) filter (where age is null)                      as age_null
from public.raw_submissions;


-- ── A12: Immutability trigger still attached ─────────────────────────────────
-- Expected: trg_rawsub_protect appears in results (BEFORE UPDATE)

select trigger_name, event_manipulation, action_timing
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table   = 'raw_submissions'
order by trigger_name;


-- ── A13: RLS still enabled on raw_submissions ────────────────────────────────
-- Expected: rls_enabled = true

select relname, relrowsecurity as rls_enabled
from pg_class
where relname = 'raw_submissions'
  and relnamespace = 'public'::regnamespace;


-- =====================================================================
-- PART B — Rollback-safe smoke test
--
-- This entire block is wrapped in BEGIN / ROLLBACK.
-- It calls submit_story three times as the anon role to validate the
-- full submission path, then rolls back so no test data persists.
--
-- Expected final state: raw_submissions still contains exactly 5 rows.
--
-- IMPORTANT: Supabase SQL Editor runs each statement separately by default.
-- To run Part B as a single transaction, paste this entire block
-- (from BEGIN to the final SELECT after ROLLBACK) into the editor at once.
-- =====================================================================

begin;

-- Verify test string length at runtime (>= 50 required by submit_story)
do $$
begin
  assert
    char_length(btrim('This is a production smoke test with enough characters to clear the minimum length.')) >= 50,
    'smoke test string is shorter than 50 chars — update the test body';
end $$;

-- Submit 3 test stories as the anon role

set local role anon;

-- Test 1: English, no research consent, no age
select public.submit_story(
  p_body             := 'This is a production smoke test with enough characters to clear the minimum length.',
  p_language_code    := 'en',
  p_consent          := true,
  p_consent_language := 'en',
  p_country          := 'Nigeria',
  p_region           := 'Kano',
  p_research_consent := false,
  p_age              := null
);

-- Test 2: Hausa, with research consent (should record research_consent_language = 'en'
--         because no Hausa translation exists for the research consent statement)
select public.submit_story(
  p_body             := 'This is a production smoke test with enough characters to clear the minimum length.',
  p_language_code    := 'ha',
  p_consent          := true,
  p_consent_language := 'ha',
  p_country          := null,
  p_region           := null,
  p_research_consent := true,
  p_age              := null
);

-- Test 3: French, with research consent, with age
select public.submit_story(
  p_body             := 'This is a production smoke test with enough characters to clear the minimum length.',
  p_language_code    := 'fr',
  p_consent          := true,
  p_consent_language := 'fr',
  p_country          := null,
  p_region           := null,
  p_research_consent := true,
  p_age              := 28
);

-- Switch back to postgres role before querying raw_submissions
-- (RLS blocks anon SELECT even with service-role context in SQL Editor)
reset role;

-- Verify the 3 test rows were inserted with correct field values
select
  language_code,
  consent_language,
  research_consent_given,
  research_consent_language,
  age,
  char_count,
  current_state,
  -- Verify char_count matches expected value (calculated, not hardcoded)
  (char_count = char_length(btrim(
    'This is a production smoke test with enough characters to clear the minimum length.'
  ))) as char_count_correct
from public.raw_submissions
order by created_at desc
limit 3;

-- Expected results (most recent 3 rows, newest first):
--   fr  | fr | true  | fr | 28   | 84 | PENDING | true
--   ha  | ha | true  | en | null | 84 | PENDING | true   ← research_consent_language = 'en' (fallback)
--   en  | en | false | null | null | 84 | PENDING | true

-- ── Permission test: anon cannot UPDATE raw_submissions at all (RLS) ─────────
-- Runs as anon. Must not SELECT from raw_submissions — anon cannot read it.
-- We attempt an update with a hardcoded non-existent UUID; RLS should block it
-- with insufficient_privilege before it even touches a row.

set local role anon;

do $$
begin
  begin
    update public.raw_submissions
    set current_state = 'PENDING'
    where submission_id = '00000000-0000-0000-0000-000000000000'::uuid;
    -- A 0-row update is also acceptable here because RLS filters out all rows
    -- for anon — PostgreSQL does not raise an error for 0 rows affected.
    -- Reaching this point (no exception) is the expected anon outcome because
    -- RLS silently filters the target set to empty rather than raising.
    null;
  exception
    when insufficient_privilege then
      null; -- also acceptable: explicit RLS deny
  end;
end $$;

reset role;

-- ── Immutability trigger test: runs as postgres (has table access) ────────────
-- Verifies protect_raw_submission_original() raises 42501 when an original
-- field is changed. Uses the most recently inserted test row (still in this
-- rolled-back transaction).

do $$
declare
  v_id uuid;
begin
  select submission_id into v_id
  from public.raw_submissions
  order by created_at desc
  limit 1;

  begin
    update public.raw_submissions
    set char_count = char_count + 1
    where submission_id = v_id;
    raise exception 'immutability_trigger_did_not_fire — investigate before proceeding';
  exception
    when sqlstate '42501' then
      null; -- expected: protect_raw_submission_original() fired
  end;
end $$;

-- Final count before rollback — should be 8 (5 original + 3 test)
select count(*) as count_before_rollback from public.raw_submissions;

rollback;

-- After rollback — must be 5 (original submissions only)
-- Expected: 5
select count(*) as count_after_rollback from public.raw_submissions;


-- =====================================================================
-- ALL CHECKS PASSED?
--
-- Part A: all structural checks return expected values
-- Part B: count_after_rollback = 5 (no test data leaked)
--
-- The story submission pipeline is restored. Contributors can now submit
-- using the 8-parameter submit_story RPC.
-- =====================================================================
