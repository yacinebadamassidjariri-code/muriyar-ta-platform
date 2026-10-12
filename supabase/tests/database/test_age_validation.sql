-- test_age_validation.sql
--
-- Functional tests for the age validation policy introduced in
-- 20261013000000_age_required_and_constraint.sql.
--
-- Policy under test:
--   • p_age IS NULL   → raises age_required
--   • p_age = 0       → INSERT succeeds (any non-negative integer)
--   • p_age = 9       → INSERT succeeds
--   • p_age = 100     → INSERT succeeds
--
-- Structure:
--   All tests run inside a single DO block in autocommit mode (no outer
--   BEGIN/ROLLBACK wrapper).  Each success-path test uses a nested
--   plpgsql block with EXCEPTION WHEN OTHERS, which creates an implicit
--   sub-transaction; exception handlers roll back only that sub-block,
--   not the outer DO block.  After every test that inserts a row, the
--   row is removed with DELETE (keyed on submission_timestamp) so that
--   no test data is left in raw_submissions when the script finishes.
--
-- HOW TO READ RESULTS:
--   PASS | <id> | description
--   FAIL | <id> | description | detail
--   SKIP | <id> | reason

-- ── 0. Results table ──────────────────────────────────────────────────────────
CREATE TEMPORARY TABLE IF NOT EXISTS _age_test_results (
  check_id   text PRIMARY KEY,
  outcome    text NOT NULL
);

DELETE FROM _age_test_results;

-- ── 1 + 2. Prerequisites and functional tests (single DO block) ───────────────

DO $$
DECLARE
  -- _test_marker is stored in region (plaintext) so DELETEs can target test rows.
  _story       text := repeat('X', 55);  -- 55 chars clears the 50-char minimum
  _test_marker text := '_age_test_';   -- stored in region (plaintext) for cleanup
  _cnt_before  bigint;
  _cnt_after   bigint;
  _sqlerrm     text;
  _prereqs_ok  boolean;
  _lang_ok     boolean;
  _consent_ok  boolean;
  _key_ok      boolean;
BEGIN

  -- ── Prerequisites ──────────────────────────────────────────────────────────

  SELECT EXISTS (
    SELECT 1 FROM public.supported_languages
    WHERE language_code = 'en' AND is_active
  ) INTO _lang_ok;

  INSERT INTO _age_test_results VALUES (
    'P1',
    CASE WHEN _lang_ok
      THEN 'PASS | P1 | prerequisite: supported_languages.en active'
      ELSE 'FAIL | P1 | prerequisite: supported_languages.en active'
           || ' | detail: language ''en'' absent or inactive'
    END
  );

  SELECT EXISTS (
    SELECT 1 FROM public.consent_versions WHERE is_active
  ) INTO _consent_ok;

  INSERT INTO _age_test_results VALUES (
    'P2',
    CASE WHEN _consent_ok
      THEN 'PASS | P2 | prerequisite: active consent_version exists'
      ELSE 'FAIL | P2 | prerequisite: active consent_version exists'
           || ' | detail: no active row in consent_versions'
    END
  );

  SELECT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'story_body_key' AND nullif(decrypted_secret, '') IS NOT NULL
  ) INTO _key_ok;

  INSERT INTO _age_test_results VALUES (
    'P3',
    CASE WHEN _key_ok
      THEN 'PASS | P3 | prerequisite: vault key story_body_key accessible'
      ELSE 'FAIL | P3 | prerequisite: vault key story_body_key accessible'
           || ' | detail: no non-empty story_body_key in vault'
    END
  );

  _prereqs_ok := _lang_ok AND _consent_ok AND _key_ok;

  -- ── B15: null age → age_required ─────────────────────────────────────────

  IF NOT _prereqs_ok THEN
    INSERT INTO _age_test_results VALUES (
      'B15', 'SKIP | B15 | null age raises age_required | prerequisite failed — see P1/P2/P3'
    );
  ELSE
    BEGIN
      PERFORM public.submit_story(
        p_body          => _story,
        p_language_code => 'en',
        p_consent       => true,
        p_age           => null
      );
      -- No exception: wrong
      INSERT INTO _age_test_results VALUES (
        'B15',
        'FAIL | B15 | null age raises age_required'
          || ' | detail: no exception was raised — age_required not enforced'
      );
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS _sqlerrm = MESSAGE_TEXT;
      IF _sqlerrm = 'age_required' THEN
        INSERT INTO _age_test_results VALUES (
          'B15', 'PASS | B15 | null age raises age_required'
        );
      ELSE
        INSERT INTO _age_test_results VALUES (
          'B15',
          'FAIL | B15 | null age raises age_required'
            || ' | detail: unexpected exception — ' || _sqlerrm
        );
      END IF;
    END;
  END IF;

  -- ── B16: age 0 → INSERT succeeds ─────────────────────────────────────────

  IF NOT _prereqs_ok THEN
    INSERT INTO _age_test_results VALUES (
      'B16', 'SKIP | B16 | age 0 accepted — row inserted | prerequisite failed'
    );
  ELSE
    SELECT COUNT(*) INTO _cnt_before FROM public.raw_submissions;
    BEGIN
      PERFORM public.submit_story(
        p_body          => _story,
        p_language_code => 'en',
        p_consent       => true,
        p_region        => _test_marker,
        p_age           => 0::smallint
      );
      SELECT COUNT(*) INTO _cnt_after FROM public.raw_submissions;
      -- Clean up the test row (marker stored in plaintext region column)
      DELETE FROM public.raw_submissions
        WHERE region = _test_marker AND age = 0;
      IF _cnt_after = _cnt_before + 1 THEN
        INSERT INTO _age_test_results VALUES (
          'B16', 'PASS | B16 | age 0 accepted — row inserted'
        );
      ELSE
        INSERT INTO _age_test_results VALUES (
          'B16',
          'FAIL | B16 | age 0 accepted — row inserted'
            || ' | detail: row count did not increase (before=' || _cnt_before
            || ' after=' || _cnt_after || ')'
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS _sqlerrm = MESSAGE_TEXT;
      INSERT INTO _age_test_results VALUES (
        'B16',
        'FAIL | B16 | age 0 accepted — row inserted'
          || ' | detail: unexpected exception — ' || _sqlerrm
      );
    END;
  END IF;

  -- ── B17a: age 9 → INSERT succeeds ────────────────────────────────────────

  IF NOT _prereqs_ok THEN
    INSERT INTO _age_test_results VALUES (
      'B17a', 'SKIP | B17a | age 9 accepted — row inserted | prerequisite failed'
    );
  ELSE
    SELECT COUNT(*) INTO _cnt_before FROM public.raw_submissions;
    BEGIN
      PERFORM public.submit_story(
        p_body          => _story,
        p_language_code => 'en',
        p_consent       => true,
        p_region        => _test_marker,
        p_age           => 9::smallint
      );
      SELECT COUNT(*) INTO _cnt_after FROM public.raw_submissions;
      DELETE FROM public.raw_submissions
        WHERE region = _test_marker AND age = 9;
      IF _cnt_after = _cnt_before + 1 THEN
        INSERT INTO _age_test_results VALUES (
          'B17a', 'PASS | B17a | age 9 accepted — row inserted'
        );
      ELSE
        INSERT INTO _age_test_results VALUES (
          'B17a',
          'FAIL | B17a | age 9 accepted — row inserted'
            || ' | detail: row count did not increase (before=' || _cnt_before
            || ' after=' || _cnt_after || ')'
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS _sqlerrm = MESSAGE_TEXT;
      INSERT INTO _age_test_results VALUES (
        'B17a',
        'FAIL | B17a | age 9 accepted — row inserted'
          || ' | detail: unexpected exception — ' || _sqlerrm
      );
    END;
  END IF;

  -- ── B17b: age 100 → INSERT succeeds ──────────────────────────────────────

  IF NOT _prereqs_ok THEN
    INSERT INTO _age_test_results VALUES (
      'B17b', 'SKIP | B17b | age 100 accepted — row inserted | prerequisite failed'
    );
  ELSE
    SELECT COUNT(*) INTO _cnt_before FROM public.raw_submissions;
    BEGIN
      PERFORM public.submit_story(
        p_body          => _story,
        p_language_code => 'en',
        p_consent       => true,
        p_region        => _test_marker,
        p_age           => 100::smallint
      );
      SELECT COUNT(*) INTO _cnt_after FROM public.raw_submissions;
      DELETE FROM public.raw_submissions
        WHERE region = _test_marker AND age = 100;
      IF _cnt_after = _cnt_before + 1 THEN
        INSERT INTO _age_test_results VALUES (
          'B17b', 'PASS | B17b | age 100 accepted — row inserted'
        );
      ELSE
        INSERT INTO _age_test_results VALUES (
          'B17b',
          'FAIL | B17b | age 100 accepted — row inserted'
            || ' | detail: row count did not increase (before=' || _cnt_before
            || ' after=' || _cnt_after || ')'
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS _sqlerrm = MESSAGE_TEXT;
      INSERT INTO _age_test_results VALUES (
        'B17b',
        'FAIL | B17b | age 100 accepted — row inserted'
          || ' | detail: unexpected exception — ' || _sqlerrm
      );
    END;
  END IF;

END;
$$;

-- ── 3. Results ────────────────────────────────────────────────────────────────

SELECT outcome AS result
FROM _age_test_results
ORDER BY check_id;
