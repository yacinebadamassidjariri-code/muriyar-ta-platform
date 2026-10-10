-- =====================================================================
-- 01_preflight.sql — Production safety checks (READ-ONLY)
-- Run this BEFORE 02_production_migration.sql.
-- All queries are SELECT / DO-assert only. Nothing is modified.
--
-- HOW TO USE:
--   Paste into Supabase SQL Editor and run. Compare each result set
--   against the "Expected" comment. Abort if any check fails.
-- =====================================================================


-- ── Check 1: submit_story — exactly one function, 6 parameters ──────────────
-- Expected: 1 row, pronargs = 6
-- The 8-param version must NOT exist yet. If you see pronargs = 8, stop —
-- the migration has already been (partially) applied.

select
  pronargs,
  pg_get_function_arguments(oid) as arg_list,
  prosecdef as is_security_definer
from pg_proc
where proname = 'submit_story'
  and pronamespace = 'public'::regnamespace
order by pronargs;


-- ── Check 2: Research consent tables must be absent ─────────────────────────
-- Expected: 0 rows
-- If either table exists, stop — migration has already been (partially) applied.

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'research_consent_versions',
    'research_consent_version_translations'
  );


-- ── Check 3: age column must be absent ──────────────────────────────────────
-- Expected: 0 rows

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'raw_submissions'
  and column_name = 'age';


-- ── Check 4: Existing submissions intact ────────────────────────────────────
-- Expected: count = 5
-- Record the latest submission_timestamp so you can confirm no rows
-- disappear after migration.

select
  count(*)                  as total_submissions,
  max(submission_timestamp) as latest_submission
from public.raw_submissions;


-- ── Check 5: Encryption key configured ──────────────────────────────────────
-- Expected: 1 row, status = 'configured'
-- The secret value is NEVER displayed — only its presence is confirmed.

select
  name,
  case
    when decrypted_secret is not null and length(decrypted_secret) > 0
    then 'configured'
    else 'missing_or_empty'
  end as status
from vault.decrypted_secrets
where name = 'story_body_key';


-- ── Check 6: Encryption guard in current submit_story body ──────────────────
-- Expected: contains 'encryption_unavailable', does NOT contain 'convert_to'
-- This confirms production already has the hard-fail version, so the migration
-- must also hard-fail (no plaintext fallback).

select
  case when prosrc like '%encryption_unavailable%' then 'PRESENT' else 'MISSING' end
    as hard_encryption_guard,
  case when prosrc like '%convert_to%'             then 'PRESENT' else 'ABSENT'  end
    as plaintext_fallback
from pg_proc
where proname = 'submit_story'
  and pronamespace = 'public'::regnamespace;


-- ── Check 7: Immutability trigger attached ──────────────────────────────────
-- Expected: at least trg_rawsub_protect (BEFORE UPDATE)
-- and trg_rawsub_intake (BEFORE INSERT) are present.

select
  trigger_name,
  event_manipulation,
  action_timing
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table   = 'raw_submissions'
order by trigger_name;


-- ── Check 8: Active publication consent version exists ──────────────────────
-- Expected: 1 row, is_active = true

select consent_version_id, version_label, is_active, effective_from
from public.consent_versions
where is_active = true;


-- ── Check 9: protect_raw_submission_original current field coverage ──────────
-- Expected: prosrc contains all of: submission_id, body_text, consent_given,
--           research_consent_given (NOT present yet — confirms we are pre-migration),
--           age (NOT present yet — confirms we are pre-migration)
-- After migration both research_consent_given and age must appear.

select
  case when prosrc like '%submission_id%'         then 'yes' else 'NO' end as has_submission_id,
  case when prosrc like '%body_text%'             then 'yes' else 'NO' end as has_body_text,
  case when prosrc like '%consent_given%'         then 'yes' else 'NO' end as has_consent_given,
  case when prosrc like '%research_consent_given%' then 'yes — ALREADY APPLIED' else 'not yet (expected)' end
    as has_research_consent,
  case when prosrc like '%age%'                   then 'yes — ALREADY APPLIED' else 'not yet (expected)' end
    as has_age
from pg_proc
where proname = 'protect_raw_submission_original'
  and pronamespace = 'public'::regnamespace;


-- ── Check 10: RLS and grants on raw_submissions ──────────────────────────────
-- Expected: relrowsecurity = true; anon/authenticated should NOT have
-- direct INSERT/SELECT grants (access only through SECURITY DEFINER RPCs).

select
  relname,
  relrowsecurity as rls_enabled,
  relforcerowsecurity as rls_forced
from pg_class
where relname = 'raw_submissions'
  and relnamespace = 'public'::regnamespace;

-- Current direct privileges (expect none for anon/authenticated on raw_submissions):
select grantee, privilege_type, is_grantable
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name   = 'raw_submissions'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type;


-- ── Check 11: Migration history — last applied migration ────────────────────
-- Expected: the most recent row should be a migration before
--           20260914143308 (separate_research_consent).
-- Confirms the four missing migrations are indeed absent.
-- Note: supabase_migrations.schema_migrations has columns (version, name) only.

select version, name
from supabase_migrations.schema_migrations
order by version desc
limit 10;


-- ── Check 12: Smoke-test string length pre-validation ───────────────────────
-- Expected: 84 (>= 50 minimum). Confirms the smoke-test body in 03_postflight
-- will clear the char_length check in submit_story.

select char_length(btrim(
  'This is a production smoke test with enough characters to clear the minimum length.'
)) as test_string_length;


-- =====================================================================
-- STOP HERE. Review all results before running 02_production_migration.sql.
-- All checks must pass (match expected values) before proceeding.
-- =====================================================================
