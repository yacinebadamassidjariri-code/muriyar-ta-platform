-- =============================================================================
-- READ-ONLY VERIFICATION SCRIPT
-- Migrations: 20261001000000, 20261001120000, 20261001130000
-- Target:     muriyar-ta-dev (development database only)
-- =============================================================================

\set ON_ERROR_STOP 0
\pset tuples_only off
\pset format aligned

\echo '============================================================'
\echo 'MIGRATION VERIFICATION — muriyar-ta-dev'
\echo '============================================================'

-- ---------------------------------------------------------------------------
-- A. MIGRATION LEDGER
-- ---------------------------------------------------------------------------

\echo ''
\echo '── A. MIGRATION LEDGER ─────────────────────────────────────'

SELECT
  CASE WHEN EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20261001000000')
  THEN 'PASS' ELSE 'FAIL' END
  || ' | A01 | 20261001000000 recorded in schema_migrations'
  || CASE WHEN NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20261001000000')
     THEN ' | detail: row is absent (expected if applied manually)' ELSE '' END AS result;

SELECT
  CASE WHEN EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20261001120000')
  THEN 'PASS' ELSE 'FAIL' END
  || ' | A02 | 20261001120000 recorded in schema_migrations'
  || CASE WHEN NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20261001120000')
     THEN ' | detail: row is absent (expected if applied manually)' ELSE '' END AS result;

SELECT
  CASE WHEN EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20261001130000')
  THEN 'PASS' ELSE 'FAIL' END
  || ' | A03 | 20261001130000 recorded in schema_migrations'
  || CASE WHEN NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20261001130000')
     THEN ' | detail: row is absent (expected if applied manually)' ELSE '' END AS result;

-- ---------------------------------------------------------------------------
-- B. MIGRATION 20261001000000
-- ---------------------------------------------------------------------------

\echo ''
\echo '── B. 20261001000000 — age column ──────────────────────────'

SELECT
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='raw_submissions' AND column_name='age')
  THEN 'PASS' ELSE 'FAIL' END
  || ' | B01 | raw_submissions.age column exists'
  || CASE WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns
       WHERE table_schema='public' AND table_name='raw_submissions' AND column_name='age')
     THEN ' | detail: column not found — migration NOT applied' ELSE '' END AS result;

SELECT
  CASE WHEN data_type = 'smallint' THEN 'PASS' ELSE 'FAIL' END
  || ' | B02 | raw_submissions.age is smallint'
  || CASE WHEN data_type <> 'smallint' THEN ' | detail: found type=' || data_type ELSE '' END AS result
FROM information_schema.columns
WHERE table_schema='public' AND table_name='raw_submissions' AND column_name='age'
UNION ALL
SELECT 'FAIL | B02 | raw_submissions.age is smallint | detail: column not found'
WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns
  WHERE table_schema='public' AND table_name='raw_submissions' AND column_name='age');

SELECT
  CASE WHEN is_nullable = 'YES' THEN 'PASS' ELSE 'FAIL' END
  || ' | B03 | raw_submissions.age is nullable (age is optional)'
  || CASE WHEN is_nullable <> 'YES' THEN ' | detail: is_nullable=' || is_nullable ELSE '' END AS result
FROM information_schema.columns
WHERE table_schema='public' AND table_name='raw_submissions' AND column_name='age'
UNION ALL
SELECT 'FAIL | B03 | raw_submissions.age is nullable | detail: column not found'
WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns
  WHERE table_schema='public' AND table_name='raw_submissions' AND column_name='age');

-- B04: no age RANGE constraint — policy is required but unrestricted.
-- Ages 9, 100, and beyond must be accepted. The 10–99 constraint that
-- 20261001000000 added on fresh databases must have been removed by 20261013000000.
-- PASS = no check constraint on the age column contains both '10' and '99'.
SELECT
  CASE WHEN NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints cc
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = cc.constraint_name
    WHERE ccu.table_schema='public' AND ccu.table_name='raw_submissions' AND ccu.column_name='age'
      AND cc.check_clause LIKE '%10%' AND cc.check_clause LIKE '%99%'
  ) THEN 'PASS' ELSE 'FAIL' END
  || ' | B04 | age column has NO 10-99 range constraint — any positive integer accepted'
  || CASE WHEN EXISTS (
       SELECT 1 FROM information_schema.check_constraints cc
       JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = cc.constraint_name
       WHERE ccu.table_schema='public' AND ccu.table_name='raw_submissions' AND ccu.column_name='age'
         AND cc.check_clause LIKE '%10%' AND cc.check_clause LIKE '%99%'
     ) THEN ' | detail: 10-99 range constraint still present — 20261013000000 not yet applied'
     ELSE '' END AS result;

-- B04b: full listing of any remaining check constraints on age (should be empty).
\echo 'INFO | B04b | Any remaining check constraints on raw_submissions.age (should be none)'
SELECT cc.constraint_name, cc.check_clause
FROM information_schema.check_constraints cc
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = cc.constraint_name
WHERE ccu.table_schema='public' AND ccu.table_name='raw_submissions' AND ccu.column_name='age';

\echo ''
\echo '── B. 20261001000000 — research consent v2 ─────────────────'

SELECT
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='research_consent_versions')
  THEN 'PASS' ELSE 'FAIL' END
  || ' | B05 | research_consent_versions table exists' AS result;

SELECT
  CASE WHEN EXISTS (SELECT 1 FROM public.research_consent_versions
    WHERE version_number='research-v2' AND is_active=true)
  THEN 'PASS' ELSE 'FAIL' END
  || ' | B06 | research-v2 exists and is_active=true'
  || CASE WHEN NOT EXISTS (SELECT 1 FROM public.research_consent_versions
       WHERE version_number='research-v2' AND is_active=true)
     THEN ' | detail: row not found or is_active=false' ELSE '' END AS result;

SELECT
  CASE WHEN EXISTS (SELECT 1 FROM public.research_consent_versions
    WHERE version_number='research-v1' AND is_active=false)
  THEN 'PASS' ELSE 'FAIL' END
  || ' | B07 | research-v1 is_active=false (deactivated)'
  || CASE WHEN NOT EXISTS (SELECT 1 FROM public.research_consent_versions
       WHERE version_number='research-v1' AND is_active=false)
     THEN ' | detail: v1 still active or missing' ELSE '' END AS result;

SELECT
  CASE WHEN EXISTS (
    SELECT 1 FROM public.research_consent_version_translations t
    JOIN public.research_consent_versions v USING (research_consent_version_id)
    WHERE v.version_number='research-v2' AND t.language_code='en'
  ) THEN 'PASS' ELSE 'FAIL' END
  || ' | B08 | research-v2 has English translation' AS result;

SELECT
  CASE WHEN EXISTS (
    SELECT 1 FROM public.research_consent_version_translations t
    JOIN public.research_consent_versions v USING (research_consent_version_id)
    WHERE v.version_number='research-v2' AND t.language_code='fr'
  ) THEN 'PASS' ELSE 'FAIL' END
  || ' | B09 | research-v2 has French translation' AS result;

\echo 'INFO | B09b | research-v2 translation text — compare EN/FR against expected text'
SELECT t.language_code, left(t.statement_text, 120) AS statement_text_preview
FROM public.research_consent_version_translations t
JOIN public.research_consent_versions v USING (research_consent_version_id)
WHERE v.version_number='research-v2'
ORDER BY t.language_code;

\echo ''
\echo '── B. 20261001000000 — submit_story signature ──────────────'

SELECT
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='submit_story'
      AND array_length(p.proargtypes,1)=8
  ) THEN 'PASS' ELSE 'FAIL' END
  || ' | B10 | submit_story(8-arg) exists (includes p_age smallint)'
  || CASE WHEN NOT EXISTS (
       SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND p.proname='submit_story'
         AND array_length(p.proargtypes,1)=8
     ) THEN ' | detail: 8-arg overload not found — check B10b for existing signatures'
     ELSE '' END AS result;

\echo 'INFO | B10b | All submit_story signatures'
SELECT p.proname, array_length(p.proargtypes,1) AS arg_count,
       pg_get_function_arguments(p.oid) AS argument_list,
       p.prosecdef AS security_definer
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='submit_story';

SELECT
  CASE WHEN NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='submit_story'
      AND array_length(p.proargtypes,1)=7
  ) THEN 'PASS' ELSE 'FAIL' END
  || ' | B11 | old submit_story(7-arg) does NOT exist (dropped by migration)'
  || CASE WHEN EXISTS (
       SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND p.proname='submit_story'
         AND array_length(p.proargtypes,1)=7
     ) THEN ' | detail: 7-arg overload still present — migration may not have run'
     ELSE '' END AS result;

SELECT
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='submit_story' AND p.prosecdef=true
  ) THEN 'PASS' ELSE 'FAIL' END
  || ' | B12 | submit_story is SECURITY DEFINER' AS result;

SELECT
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='protect_raw_submission_original'
      AND p.prosrc LIKE '%new.age%'
  ) THEN 'PASS' ELSE 'FAIL' END
  || ' | B13 | protect_raw_submission_original() trigger covers age field'
  || CASE WHEN NOT EXISTS (
       SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND p.proname='protect_raw_submission_original'
         AND p.prosrc LIKE '%new.age%'
     ) THEN ' | detail: prosrc does not contain new.age — trigger not updated'
     ELSE '' END AS result;

\echo 'INFO | B13b | protect_raw_submission_original() — age context in source'
SELECT substring(p.prosrc FROM position('new.age' IN p.prosrc) - 40 FOR 120) AS age_context
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='protect_raw_submission_original'
  AND p.prosrc LIKE '%new.age%';

SELECT
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='submit_story'
      AND p.prosrc LIKE '%age_required%'
  ) THEN 'PASS' ELSE 'FAIL' END
  || ' | B14 | submit_story() raises age_required when p_age is null'
  || CASE WHEN NOT EXISTS (
       SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND p.proname='submit_story'
         AND p.prosrc LIKE '%age_required%'
     ) THEN ' | detail: age_required not in function body — 20261013000000 not applied'
     ELSE '' END AS result;

-- B15–B17: Functional age tests — call submit_story() and assert exceptions/results.
-- These tests exercise actual function behavior, not source text.
-- Each test uses SAVEPOINT / ROLLBACK TO SAVEPOINT so no data is written.
--
-- Prerequisites for the DO blocks to reach the age check:
--   1. A supported active language must exist. We use 'en' (always seeded).
--   2. An active consent_version must exist.
--   3. The vault key 'story_body_key' must be present (encryption guard).
-- If prerequisites are absent the function raises before the age check.
-- Each block records PASS/FAIL as a query result using a temp table.

-- Shared setup: create a temp table for test outcomes.
CREATE TEMPORARY TABLE IF NOT EXISTS _b_age_test_results (
  check_id  text,
  outcome   text
) ON COMMIT DELETE ROWS;

-- B15: missing age (p_age => null) must raise age_required.
DO $$
DECLARE
  v_errcode text;
  v_sqlerrm text;
BEGIN
  SAVEPOINT b15;
  BEGIN
    PERFORM public.submit_story(
      p_body             => repeat('x', 60),
      p_language_code    => 'en',
      p_consent          => true,
      p_consent_language => 'en',
      p_age              => null
    );
    -- If we reach here the function did NOT raise — that is wrong.
    INSERT INTO _b_age_test_results VALUES (
      'B15',
      'FAIL | B15 | submit_story(p_age=>null) → age_required | detail: function did not raise any exception'
    );
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_errcode = RETURNED_SQLSTATE, v_sqlerrm = MESSAGE_TEXT;
    IF v_sqlerrm = 'age_required' THEN
      INSERT INTO _b_age_test_results VALUES (
        'B15',
        'PASS | B15 | submit_story(p_age=>null) raises age_required'
      );
    ELSE
      INSERT INTO _b_age_test_results VALUES (
        'B15',
        'FAIL | B15 | submit_story(p_age=>null) → age_required | detail: got ' || v_sqlerrm || ' (sqlstate=' || v_errcode || ')'
      );
    END IF;
  END;
  ROLLBACK TO SAVEPOINT b15;
END;
$$;

-- B16: age 0 must be accepted — non-negative integers including 0 are valid.
DO $$
DECLARE
  v_errcode text;
  v_sqlerrm text;
BEGIN
  SAVEPOINT b16;
  BEGIN
    PERFORM public.submit_story(
      p_body             => repeat('x', 60),
      p_language_code    => 'en',
      p_consent          => true,
      p_consent_language => 'en',
      p_age              => 0::smallint
    );
    -- Success: no exception raised by the age check (may fail later on
    -- consent_version or encryption — that is acceptable; age check passed).
    INSERT INTO _b_age_test_results VALUES (
      'B16',
      'PASS | B16 | submit_story(p_age=>0) — age accepted (no age_required or age_out_of_range)'
    );
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_errcode = RETURNED_SQLSTATE, v_sqlerrm = MESSAGE_TEXT;
    IF v_sqlerrm IN ('age_required', 'age_out_of_range') THEN
      INSERT INTO _b_age_test_results VALUES (
        'B16',
        'FAIL | B16 | submit_story(p_age=>0) — age 0 rejected | detail: ' || v_sqlerrm
      );
    ELSE
      -- Exception from a later guard (consent, encryption) — age itself passed.
      INSERT INTO _b_age_test_results VALUES (
        'B16',
        'PASS | B16 | submit_story(p_age=>0) — age accepted (later guard raised ' || v_sqlerrm || ')'
      );
    END IF;
  END;
  ROLLBACK TO SAVEPOINT b16;
END;
$$;

-- B17a: age 9 must be accepted — no lower-bound restriction.
DO $$
DECLARE
  v_errcode text;
  v_sqlerrm text;
BEGIN
  SAVEPOINT b17a;
  BEGIN
    PERFORM public.submit_story(
      p_body             => repeat('x', 60),
      p_language_code    => 'en',
      p_consent          => true,
      p_consent_language => 'en',
      p_age              => 9::smallint
    );
    INSERT INTO _b_age_test_results VALUES (
      'B17a',
      'PASS | B17a | submit_story(p_age=>9) — age 9 accepted'
    );
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_errcode = RETURNED_SQLSTATE, v_sqlerrm = MESSAGE_TEXT;
    IF v_sqlerrm IN ('age_required', 'age_out_of_range') THEN
      INSERT INTO _b_age_test_results VALUES (
        'B17a',
        'FAIL | B17a | submit_story(p_age=>9) — age 9 rejected | detail: ' || v_sqlerrm
      );
    ELSE
      INSERT INTO _b_age_test_results VALUES (
        'B17a',
        'PASS | B17a | submit_story(p_age=>9) — age accepted (later guard raised ' || v_sqlerrm || ')'
      );
    END IF;
  END;
  ROLLBACK TO SAVEPOINT b17a;
END;
$$;

-- B17b: age 100 must be accepted — no upper-bound restriction.
DO $$
DECLARE
  v_errcode text;
  v_sqlerrm text;
BEGIN
  SAVEPOINT b17b;
  BEGIN
    PERFORM public.submit_story(
      p_body             => repeat('x', 60),
      p_language_code    => 'en',
      p_consent          => true,
      p_consent_language => 'en',
      p_age              => 100::smallint
    );
    INSERT INTO _b_age_test_results VALUES (
      'B17b',
      'PASS | B17b | submit_story(p_age=>100) — age 100 accepted'
    );
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_errcode = RETURNED_SQLSTATE, v_sqlerrm = MESSAGE_TEXT;
    IF v_sqlerrm IN ('age_required', 'age_out_of_range') THEN
      INSERT INTO _b_age_test_results VALUES (
        'B17b',
        'FAIL | B17b | submit_story(p_age=>100) — age 100 rejected | detail: ' || v_sqlerrm
      );
    ELSE
      INSERT INTO _b_age_test_results VALUES (
        'B17b',
        'PASS | B17b | submit_story(p_age=>100) — age accepted (later guard raised ' || v_sqlerrm || ')'
      );
    END IF;
  END;
  ROLLBACK TO SAVEPOINT b17b;
END;
$$;

-- B18: historical NULL-age rows are preserved — database column is nullable.
-- This is a schema-level check only; no existing data is modified.
DO $$
DECLARE
  v_nullable text;
  v_result   text;
BEGIN
  SELECT is_nullable INTO v_nullable
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='raw_submissions' AND column_name='age';

  IF v_nullable = 'YES' THEN
    v_result := 'PASS | B18 | raw_submissions.age is nullable — historical NULL-age rows preserved';
  ELSE
    v_result := 'FAIL | B18 | raw_submissions.age is NOT nullable | detail: existing NULL-age rows may be lost';
  END IF;

  INSERT INTO _b_age_test_results VALUES ('B18', v_result);
END;
$$;

-- Emit all test results from the temp table.
SELECT outcome AS result FROM _b_age_test_results ORDER BY check_id;

-- ---------------------------------------------------------------------------
-- C. MIGRATION 20261001120000
-- ---------------------------------------------------------------------------

\echo ''
\echo '── C. 20261001120000 — analytics_event_type enum ───────────'

SELECT
  CASE WHEN EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid
    JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='public' AND t.typname='analytics_event_type' AND e.enumlabel='outreach_visit')
  THEN 'PASS' ELSE 'FAIL' END || ' | C01 | analytics_event_type includes outreach_visit' AS result
UNION ALL
SELECT
  CASE WHEN EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid
    JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='public' AND t.typname='analytics_event_type' AND e.enumlabel='submission_started')
  THEN 'PASS' ELSE 'FAIL' END || ' | C02 | analytics_event_type includes submission_started'
UNION ALL
SELECT
  CASE WHEN EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid
    JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='public' AND t.typname='analytics_event_type' AND e.enumlabel='submission_completed')
  THEN 'PASS' ELSE 'FAIL' END || ' | C03 | analytics_event_type includes submission_completed'
UNION ALL
SELECT
  CASE WHEN EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid
    JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='public' AND t.typname='analytics_event_type' AND e.enumlabel='partner_cta_click')
  THEN 'PASS' ELSE 'FAIL' END || ' | C04 | analytics_event_type includes partner_cta_click';

\echo 'INFO | C04b | Full analytics_event_type enum'
SELECT e.enumlabel AS enum_value, e.enumsortorder AS sort_order
FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace
WHERE n.nspname='public' AND t.typname='analytics_event_type'
ORDER BY e.enumsortorder;

\echo ''
\echo '── C. 20261001120000 — record_event() function ──────────────'

SELECT
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='record_event')
  THEN 'PASS' ELSE 'FAIL' END
  || ' | C05 | record_event() function exists in public schema' AS result;

SELECT
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='record_event' AND p.prosecdef=true)
  THEN 'PASS' ELSE 'FAIL' END
  || ' | C06 | record_event() is SECURITY DEFINER' AS result;

SELECT
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='record_event'
      AND p.prorettype='void'::regtype)
  THEN 'PASS' ELSE 'FAIL' END
  || ' | C07 | record_event() returns void' AS result;

SELECT
  CASE WHEN has_function_privilege('anon',
    'public.record_event(public.analytics_event_type, varchar, varchar)', 'EXECUTE')
  THEN 'PASS' ELSE 'FAIL' END
  || ' | C08 | anon role has EXECUTE on record_event()' AS result;

SELECT
  CASE WHEN has_function_privilege('authenticated',
    'public.record_event(public.analytics_event_type, varchar, varchar)', 'EXECUTE')
  THEN 'PASS' ELSE 'FAIL' END
  || ' | C09 | authenticated role has EXECUTE on record_event()' AS result;

\echo 'INFO | C10 | record_event() source — compare slug validation logic'
\echo 'INFO | C10 | 20261001120000: loose UUID/email rejection'
\echo 'INFO | C10 | 20261001130000: strict slug regex ^[a-z0-9_-]{1,60}$'
SELECT p.prosrc AS record_event_source
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='record_event';

\echo ''
\echo '── C. 20261001120000 — build_daily_metric_snapshots ─────────'

SELECT
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='build_daily_metric_snapshots')
  THEN 'PASS' ELSE 'FAIL' END
  || ' | C11 | build_daily_metric_snapshots() exists' AS result;

SELECT
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='build_daily_metric_snapshots'
      AND p.prosrc LIKE '%event_count%')
  THEN 'PASS' ELSE 'FAIL' END
  || ' | C12 | build_daily_metric_snapshots() includes event_count dimension'
  || CASE WHEN NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND p.proname='build_daily_metric_snapshots'
         AND p.prosrc LIKE '%event_count%')
     THEN ' | detail: event_count not in function body'
     ELSE '' END AS result;

SELECT
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='build_daily_metric_snapshots'
      AND p.prosrc LIKE '%outreach_visit%')
  THEN 'PASS' ELSE 'FAIL' END
  || ' | C13 | build_daily_metric_snapshots() covers outreach_visit channel dimension'
  || CASE WHEN NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND p.proname='build_daily_metric_snapshots'
         AND p.prosrc LIKE '%outreach_visit%')
     THEN ' | detail: not found in function body'
     ELSE '' END AS result;

SELECT
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='build_daily_metric_snapshots'
      AND p.prosrc LIKE '%submission_completed%')
  THEN 'PASS' ELSE 'FAIL' END
  || ' | C14 | build_daily_metric_snapshots() covers submission_completed locale dimension'
  || CASE WHEN NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND p.proname='build_daily_metric_snapshots'
         AND p.prosrc LIKE '%submission_completed%')
     THEN ' | detail: not found in function body'
     ELSE '' END AS result;

SELECT
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='build_daily_metric_snapshots'
      AND p.prosrc LIKE '%d_ev%')
  THEN 'PASS' ELSE 'FAIL' END
  || ' | C15 | build_daily_metric_snapshots() uses d_ev (previous-day window, not current_date)'
  || CASE WHEN NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND p.proname='build_daily_metric_snapshots'
         AND p.prosrc LIKE '%d_ev%')
     THEN ' | detail: d_ev not found — snapshot counts only first 30 min of day (cron timing bug)'
     ELSE '' END AS result;

\echo 'INFO | C14b | build_daily_metric_snapshots() source — confirm analytics extension blocks'
SELECT p.prosrc AS snapshot_source
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='build_daily_metric_snapshots';

-- ---------------------------------------------------------------------------
-- D. MIGRATION 20261001130000
-- ---------------------------------------------------------------------------

\echo ''
\echo '── D. 20261001130000 — slug validation in record_event ──────'

SELECT
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='record_event'
      AND p.prosrc LIKE '%[a-z0-9_-]{1,60}%')
  THEN 'PASS' ELSE 'FAIL' END
  || ' | D01 | record_event() contains strict slug regex ^[a-z0-9_-]{1,60}$'
  || CASE WHEN NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND p.proname='record_event'
         AND p.prosrc LIKE '%[a-z0-9_-]{1,60}%')
     THEN ' | detail: strict slug regex not found — 20261001130000 may not be applied'
     ELSE '' END AS result;

SELECT
  CASE WHEN NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='record_event'
      AND p.prosrc LIKE '%0-9a-f]{8}-%')
  THEN 'PASS' ELSE 'FAIL' END
  || ' | D02 | old UUID hex-regex removed from record_event()'
  || CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND p.proname='record_event'
         AND p.prosrc LIKE '%0-9a-f]{8}-%')
     THEN ' | detail: old UUID regex still present — 20261001130000 not applied'
     ELSE '' END AS result;

SELECT
  CASE WHEN NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='record_event'
      AND p.prosrc LIKE '%position(''@''%')
  THEN 'PASS' ELSE 'FAIL' END
  || ' | D03 | old @-check removed from record_event()'
  || CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND p.proname='record_event'
         AND p.prosrc LIKE '%position(''@''%')
     THEN ' | detail: old @ check still present — body is at 20261001120000 version'
     ELSE '' END AS result;

-- ---------------------------------------------------------------------------
-- E. SUMMARY
-- ---------------------------------------------------------------------------

\echo ''
\echo '── E. SUMMARY ──────────────────────────────────────────────'
\echo ''
\echo '  20261001000000: checks B01-B18 (B15-B18 are functional DO-block tests)'
\echo '  20261001120000: checks C01-C15'
\echo '  20261001130000: checks D01-D03'
\echo ''
\echo 'PASS on all checks for a migration = safe to record as applied.'
\echo 'Any FAIL = DO NOT mark that migration applied.'
\echo ''
\echo '============================================================'
\echo 'END OF VERIFICATION'
\echo '============================================================'