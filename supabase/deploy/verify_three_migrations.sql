\set ON_ERROR_STOP 0
\pset tuples_only off
\pset format aligned

\echo '============================================================'
\echo 'MIGRATION VERIFICATION -- muriyar-ta-dev'
\echo '============================================================'

-- ---------------------------------------------------------------------------
-- A. MIGRATION LEDGER
-- ---------------------------------------------------------------------------

\echo ''
\echo '-- A. MIGRATION LEDGER'

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
\echo '-- B. 20261001000000 -- age column'

SELECT
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='raw_submissions' AND column_name='age')
  THEN 'PASS' ELSE 'FAIL' END
  || ' | B01 | raw_submissions.age column exists'
  || CASE WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns
       WHERE table_schema='public' AND table_name='raw_submissions' AND column_name='age')
     THEN ' | detail: column not found -- migration NOT applied' ELSE '' END AS result;

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

SELECT
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.check_constraints cc
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = cc.constraint_name
    WHERE ccu.table_schema='public' AND ccu.table_name='raw_submissions' AND ccu.column_name='age'
      AND cc.check_clause LIKE '%10%' AND cc.check_clause LIKE '%99%'
  ) THEN 'PASS' ELSE 'FAIL' END
  || ' | B04 | age CHECK constraint (10-99) exists on raw_submissions'
  || CASE WHEN NOT EXISTS (
       SELECT 1 FROM information_schema.check_constraints cc
       JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = cc.constraint_name
       WHERE ccu.table_schema='public' AND ccu.table_name='raw_submissions' AND ccu.column_name='age'
         AND cc.check_clause LIKE '%10%' AND cc.check_clause LIKE '%99%'
     ) THEN ' | detail: constraint not found -- migration may not be applied OR deploy omitted it; see B04b'
     ELSE '' END AS result;

\echo 'INFO | B04b | Age constraint text -- compare with migration (10-99 range) or note absence'
SELECT cc.constraint_name, cc.check_clause
FROM information_schema.check_constraints cc
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = cc.constraint_name
WHERE ccu.table_schema='public' AND ccu.table_name='raw_submissions' AND ccu.column_name='age';

\echo ''
\echo '-- B. 20261001000000 -- research consent v2'

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

\echo 'INFO | B09b | research-v2 translation text -- compare EN/FR against expected text'
SELECT t.language_code, left(t.statement_text, 120) AS statement_text_preview
FROM public.research_consent_version_translations t
JOIN public.research_consent_versions v USING (research_consent_version_id)
WHERE v.version_number='research-v2'
ORDER BY t.language_code;

\echo ''
\echo '-- B. 20261001000000 -- submit_story signature'

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
     ) THEN ' | detail: 8-arg overload not found -- check B10b for existing signatures'
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
     ) THEN ' | detail: 7-arg overload still present -- migration may not have run'
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
     ) THEN ' | detail: prosrc does not contain new.age -- trigger not updated'
     ELSE '' END AS result;

\echo 'INFO | B13b | protect_raw_submission_original() -- age context in source'
SELECT substring(p.prosrc FROM position('new.age' IN p.prosrc) - 40 FOR 120) AS age_context
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='protect_raw_submission_original'
  AND p.prosrc LIKE '%new.age%';

-- ---------------------------------------------------------------------------
-- C. MIGRATION 20261001120000
-- ---------------------------------------------------------------------------

\echo ''
\echo '-- C. 20261001120000 -- analytics_event_type enum'

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
\echo '-- C. 20261001120000 -- record_event() function'

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

\echo 'INFO | C10 | record_event() source -- compare slug validation logic'
\echo 'INFO | C10 | 20261001120000: loose UUID/email rejection'
\echo 'INFO | C10 | 20261001130000: strict slug regex ^[a-z0-9_-]{1,60}$'
SELECT p.prosrc AS record_event_source
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='record_event';

\echo ''
\echo '-- C. 20261001120000 -- build_daily_metric_snapshots'

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

\echo 'INFO | C14b | build_daily_metric_snapshots() source -- confirm analytics extension blocks'
SELECT p.prosrc AS snapshot_source
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='build_daily_metric_snapshots';

-- ---------------------------------------------------------------------------
-- D. MIGRATION 20261001130000
-- ---------------------------------------------------------------------------

\echo ''
\echo '-- D. 20261001130000 -- slug validation in record_event'

SELECT
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='record_event'
      AND p.prosrc LIKE '%[a-z0-9_-]{1,60}%')
  THEN 'PASS' ELSE 'FAIL' END
  || ' | D01 | record_event() contains strict slug regex ^[a-z0-9_-]{1,60}$'
  || CASE WHEN NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND p.proname='record_event'
         AND p.prosrc LIKE '%[a-z0-9_-]{1,60}%')
     THEN ' | detail: strict slug regex not found -- 20261001130000 may not be applied'
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
     THEN ' | detail: old UUID regex still present -- 20261001130000 not applied'
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
     THEN ' | detail: old @ check still present -- body is at 20261001120000 version'
     ELSE '' END AS result;

-- ---------------------------------------------------------------------------
-- E. SUMMARY
-- ---------------------------------------------------------------------------

\echo ''
\echo '-- E. SUMMARY'
\echo ''
\echo '  20261001000000: checks B01-B13'
\echo '  20261001120000: checks C01-C14'
\echo '  20261001130000: checks D01-D03'
\echo ''
\echo 'PASS on all checks for a migration = safe to record as applied.'
\echo 'Any FAIL = DO NOT mark that migration applied.'
\echo ''
\echo '============================================================'
\echo 'END OF VERIFICATION'
\echo '============================================================'
