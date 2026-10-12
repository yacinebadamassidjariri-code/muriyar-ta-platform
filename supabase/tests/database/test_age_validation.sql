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
-- ── Rollback safety ───────────────────────────────────────────────────────────
--
-- All database changes (raw_submissions inserts) occur inside an explicit
-- BEGIN / ROLLBACK block.  Results are emitted via RAISE NOTICE, which
-- sends output to the client immediately and is never rolled back.  If
-- execution fails at any point — crash, connection loss, unexpected error —
-- the transaction is automatically aborted and no rows remain.
--
-- There is no temp table, no region marker, and no DELETE needed.
-- The only persistent side effect is the NOTICE output itself.
--
-- ── How to read results ───────────────────────────────────────────────────────
--
-- psql prints NOTICE lines as:
--   NOTICE:  PASS | P1 | prerequisite: supported_languages.en active
--   NOTICE:  FAIL | B15 | ... | detail: ...
--   NOTICE:  SKIP | B16 | ...
--
-- Pipeline-friendly: grep '^NOTICE' | sed 's/NOTICE:  //' to strip the prefix.
--
-- ── Usage ─────────────────────────────────────────────────────────────────────
--
--   psql "$DB_URL" -v ON_ERROR_STOP=1 \
--     -f supabase/tests/database/test_age_validation.sql 2>&1 | \
--     grep '^NOTICE' | sed 's/NOTICE:  //'
--
-- ON_ERROR_STOP=1 causes psql to exit immediately on any SQL error, which
-- also causes the open transaction to be rolled back by the server.

BEGIN;

DO $$
DECLARE
  _story       text    := repeat('X', 55);   -- 55 chars; passes the 50-char minimum
  _cnt_before  bigint;
  _cnt_after   bigint;
  _sqlerrm     text;
  _prereqs_ok  boolean;
  _lang_ok     boolean;
  _consent_ok  boolean;
  _key_ok      boolean;
BEGIN

  -- ── Prerequisites ──────────────────────────────────────────────────────────
  --
  -- Checked first; if any fails, B-tests emit SKIP and the DO block returns.
  -- RAISE NOTICE is non-transactional: these lines reach the client even after
  -- the outer ROLLBACK.

  SELECT EXISTS (
    SELECT 1 FROM public.supported_languages
    WHERE language_code = 'en' AND is_active
  ) INTO _lang_ok;

  IF _lang_ok THEN
    RAISE NOTICE 'PASS | P1 | prerequisite: supported_languages.en active';
  ELSE
    RAISE NOTICE 'FAIL | P1 | prerequisite: supported_languages.en active | detail: language ''en'' is absent or inactive — seed supported_languages before running age tests';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.consent_versions WHERE is_active
  ) INTO _consent_ok;

  IF _consent_ok THEN
    RAISE NOTICE 'PASS | P2 | prerequisite: active consent_version exists';
  ELSE
    RAISE NOTICE 'FAIL | P2 | prerequisite: active consent_version exists | detail: no active row in consent_versions — seed consent data before running age tests';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'story_body_key'
      AND nullif(decrypted_secret, '') IS NOT NULL
  ) INTO _key_ok;

  IF _key_ok THEN
    RAISE NOTICE 'PASS | P3 | prerequisite: vault key story_body_key accessible';
  ELSE
    RAISE NOTICE 'FAIL | P3 | prerequisite: vault key story_body_key accessible | detail: no non-empty story_body_key in vault.decrypted_secrets — configure vault before running age tests';
  END IF;

  _prereqs_ok := _lang_ok AND _consent_ok AND _key_ok;

  -- ── B15: null age → age_required ─────────────────────────────────────────

  IF NOT _prereqs_ok THEN
    RAISE NOTICE 'SKIP | B15 | null age raises age_required | prerequisite failed — see P1/P2/P3';
  ELSE
    BEGIN
      PERFORM public.submit_story(
        p_body          => _story,
        p_language_code => 'en',
        p_consent       => true,
        p_age           => null
      );
      -- No exception raised — the null-age guard is missing or broken.
      RAISE NOTICE 'FAIL | B15 | null age raises age_required | detail: submit_story() returned without raising an exception — age_required not enforced';
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS _sqlerrm = MESSAGE_TEXT;
      IF _sqlerrm = 'age_required' THEN
        RAISE NOTICE 'PASS | B15 | null age raises age_required';
      ELSE
        RAISE NOTICE 'FAIL | B15 | null age raises age_required | detail: unexpected exception — %', _sqlerrm;
      END IF;
    END;
  END IF;

  -- ── B16: age 0 → INSERT succeeds ─────────────────────────────────────────

  IF NOT _prereqs_ok THEN
    RAISE NOTICE 'SKIP | B16 | age 0 accepted — row inserted | prerequisite failed — see P1/P2/P3';
  ELSE
    SELECT COUNT(*) INTO _cnt_before FROM public.raw_submissions;
    BEGIN
      PERFORM public.submit_story(
        p_body          => _story,
        p_language_code => 'en',
        p_consent       => true,
        p_age           => 0::smallint
      );
      SELECT COUNT(*) INTO _cnt_after FROM public.raw_submissions;
      IF _cnt_after = _cnt_before + 1 THEN
        RAISE NOTICE 'PASS | B16 | age 0 accepted — row inserted';
      ELSE
        RAISE NOTICE 'FAIL | B16 | age 0 accepted — row inserted | detail: row count did not increase (before=%, after=%)', _cnt_before, _cnt_after;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS _sqlerrm = MESSAGE_TEXT;
      RAISE NOTICE 'FAIL | B16 | age 0 accepted — row inserted | detail: unexpected exception — %', _sqlerrm;
    END;
  END IF;

  -- ── B17a: age 9 → INSERT succeeds ────────────────────────────────────────

  IF NOT _prereqs_ok THEN
    RAISE NOTICE 'SKIP | B17a | age 9 accepted — row inserted | prerequisite failed — see P1/P2/P3';
  ELSE
    SELECT COUNT(*) INTO _cnt_before FROM public.raw_submissions;
    BEGIN
      PERFORM public.submit_story(
        p_body          => _story,
        p_language_code => 'en',
        p_consent       => true,
        p_age           => 9::smallint
      );
      SELECT COUNT(*) INTO _cnt_after FROM public.raw_submissions;
      IF _cnt_after = _cnt_before + 1 THEN
        RAISE NOTICE 'PASS | B17a | age 9 accepted — row inserted';
      ELSE
        RAISE NOTICE 'FAIL | B17a | age 9 accepted — row inserted | detail: row count did not increase (before=%, after=%)', _cnt_before, _cnt_after;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS _sqlerrm = MESSAGE_TEXT;
      RAISE NOTICE 'FAIL | B17a | age 9 accepted — row inserted | detail: unexpected exception — %', _sqlerrm;
    END;
  END IF;

  -- ── B17b: age 100 → INSERT succeeds ──────────────────────────────────────

  IF NOT _prereqs_ok THEN
    RAISE NOTICE 'SKIP | B17b | age 100 accepted — row inserted | prerequisite failed — see P1/P2/P3';
  ELSE
    SELECT COUNT(*) INTO _cnt_before FROM public.raw_submissions;
    BEGIN
      PERFORM public.submit_story(
        p_body          => _story,
        p_language_code => 'en',
        p_consent       => true,
        p_age           => 100::smallint
      );
      SELECT COUNT(*) INTO _cnt_after FROM public.raw_submissions;
      IF _cnt_after = _cnt_before + 1 THEN
        RAISE NOTICE 'PASS | B17b | age 100 accepted — row inserted';
      ELSE
        RAISE NOTICE 'FAIL | B17b | age 100 accepted — row inserted | detail: row count did not increase (before=%, after=%)', _cnt_before, _cnt_after;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS _sqlerrm = MESSAGE_TEXT;
      RAISE NOTICE 'FAIL | B17b | age 100 accepted — row inserted | detail: unexpected exception — %', _sqlerrm;
    END;
  END IF;

END;
$$;

ROLLBACK;   -- removes every raw_submissions row inserted above;
            -- NOTICE output already reached the client and is unaffected
