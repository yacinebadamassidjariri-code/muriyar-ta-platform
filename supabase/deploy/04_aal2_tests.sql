-- AAL2 enforcement tests.
--
-- These tests run in the Supabase SQL Editor (as postgres / service_role)
-- where auth.jwt() returns null. Because require_aal2() reads
-- auth.jwt() ->> 'aal' and null is coerced to '' which is not equal to
-- 'aal2', every call with no live user JWT is treated as AAL1. This lets
-- the SQL Editor serve as a reliable AAL1 simulation.
--
-- What is verified:
--   1. require_aal2() raises an exception with message 'aal2_required'.
--   2. Every content-decrypting / sensitive RPC raises 'aal2_required' before
--      any permission check (i.e. even with no row to check against).
--   3. Safe (non-content) RPCs (dashboard, queue) are NOT blocked.
--
-- To run: paste the whole file into the Supabase SQL Editor and execute.
-- Expected final output: a results table showing PASS for every test.

begin;

-- ---------------------------------------------------------------------------
-- Test harness
-- ---------------------------------------------------------------------------
create temp table if not exists _aal2_test_results (
  test_name text,
  result text,
  detail text default null
);

create or replace function pg_temp.assert_raises_aal2(
  p_test text,
  p_sql text
)
returns void language plpgsql as $$
declare
  v_msg text;
begin
  begin
    execute p_sql;
    insert into _aal2_test_results(test_name, result, detail)
      values (p_test, 'FAIL', 'No exception was raised; expected aal2_required');
    return;
  exception when others then
    get stacked diagnostics v_msg = message_text;
    if v_msg = 'aal2_required' then
      insert into _aal2_test_results(test_name, result)
        values (p_test, 'PASS');
    else
      insert into _aal2_test_results(test_name, result, detail)
        values (p_test, 'FAIL', 'Got: ' || v_msg || ' — expected: aal2_required');
    end if;
  end;
end;
$$;

create or replace function pg_temp.assert_does_not_raise_aal2(
  p_test text,
  p_sql text
)
returns void language plpgsql as $$
declare
  v_msg text;
begin
  begin
    execute p_sql;
    insert into _aal2_test_results(test_name, result)
      values (p_test, 'PASS');
  exception when others then
    get stacked diagnostics v_msg = message_text;
    if v_msg = 'aal2_required' then
      insert into _aal2_test_results(test_name, result, detail)
        values (p_test, 'FAIL', 'Unexpected aal2_required raised');
    else
      -- Any other exception (e.g. 'forbidden') is acceptable — the function
      -- reached its permission check, meaning AAL2 did not block it.
      insert into _aal2_test_results(test_name, result)
        values (p_test, 'PASS');
    end if;
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- T01: require_aal2() itself
-- ---------------------------------------------------------------------------
perform pg_temp.assert_raises_aal2(
  'T01 require_aal2() blocks null JWT',
  'select public.require_aal2()'
);

-- ---------------------------------------------------------------------------
-- T02–T04: Legacy review RPCs
-- ---------------------------------------------------------------------------
perform pg_temp.assert_raises_aal2(
  'T02 review_get_submission blocks AAL1',
  $$select * from public.review_get_submission('00000000-0000-0000-0000-000000000000')$$
);

perform pg_temp.assert_raises_aal2(
  'T03 review_get_submission_location blocks AAL1',
  $$select * from public.review_get_submission_location('00000000-0000-0000-0000-000000000000', 'test_reason')$$
);

perform pg_temp.assert_raises_aal2(
  'T04 review_get_submission_break_glass blocks AAL1',
  $$select * from public.review_get_submission_break_glass('00000000-0000-0000-0000-000000000000', 'break_glass_audit_test')$$
);

-- ---------------------------------------------------------------------------
-- T05–T06: Disposition and notes
-- ---------------------------------------------------------------------------
perform pg_temp.assert_raises_aal2(
  'T05 review_set_disposition blocks AAL1',
  $$select public.review_set_disposition('00000000-0000-0000-0000-000000000000', 'approve')$$
);

perform pg_temp.assert_raises_aal2(
  'T06 review_add_note blocks AAL1',
  $$select public.review_add_note('00000000-0000-0000-0000-000000000000', 'test note')$$
);

-- ---------------------------------------------------------------------------
-- T07–T08: Role management
-- ---------------------------------------------------------------------------
perform pg_temp.assert_raises_aal2(
  'T07 assign_user_role blocks AAL1',
  $$select public.assign_user_role('00000000-0000-0000-0000-000000000000', 'moderator')$$
);

perform pg_temp.assert_raises_aal2(
  'T08 revoke_user_role blocks AAL1',
  $$select public.revoke_user_role('00000000-0000-0000-0000-000000000000')$$
);

-- ---------------------------------------------------------------------------
-- T09–T13: Story CMS RPCs
-- ---------------------------------------------------------------------------
perform pg_temp.assert_raises_aal2(
  'T09 story_admin_workspace blocks AAL1',
  $$select public.story_admin_workspace('00000000-0000-0000-0000-000000000000')$$
);

perform pg_temp.assert_raises_aal2(
  'T10 story_admin_assign blocks AAL1',
  $$select public.story_admin_assign('00000000-0000-0000-0000-000000000000')$$
);

perform pg_temp.assert_raises_aal2(
  'T11 story_admin_save_review blocks AAL1',
  $$select public.story_admin_save_review('00000000-0000-0000-0000-000000000000', 'none', array[]::text[])$$
);

perform pg_temp.assert_raises_aal2(
  'T12 story_admin_save_draft blocks AAL1',
  $$select public.story_admin_save_draft('00000000-0000-0000-0000-000000000000', '{}'::jsonb)$$
);

perform pg_temp.assert_raises_aal2(
  'T13 story_admin_transition blocks AAL1',
  $$select public.story_admin_transition('00000000-0000-0000-0000-000000000000', 'approve')$$
);

perform pg_temp.assert_raises_aal2(
  'T14 story_admin_bulk blocks AAL1',
  $$select public.story_admin_bulk(array['00000000-0000-0000-0000-000000000000']::uuid[], 'approve')$$
);

-- ---------------------------------------------------------------------------
-- T15–T16: Safe RPCs must NOT be blocked (these contain no body decryption)
-- ---------------------------------------------------------------------------
perform pg_temp.assert_does_not_raise_aal2(
  'T15 story_admin_dashboard is NOT blocked by AAL2 check',
  'select * from public.story_admin_dashboard()'
);

perform pg_temp.assert_does_not_raise_aal2(
  'T16 story_admin_queue is NOT blocked by AAL2 check',
  'select * from public.story_admin_queue()'
);

-- ---------------------------------------------------------------------------
-- Results
-- ---------------------------------------------------------------------------
select test_name, result, coalesce(detail, '') as detail
from _aal2_test_results
order by test_name;

-- Fail the whole transaction if any test failed (lets CI catch it).
do $$
declare v_failures integer;
begin
  select count(*) into v_failures from _aal2_test_results where result <> 'PASS';
  if v_failures > 0 then
    raise exception 'AAL2 test suite: % test(s) failed — see _aal2_test_results', v_failures;
  end if;
end;
$$;

rollback;
-- Rollback keeps the database clean; the results table is temp and disappears.
-- Re-run at any time without side effects.
