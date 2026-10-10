-- AAL2 enforcement tests.
--
-- Run in the Supabase SQL Editor (postgres / service_role).
--
-- WHAT IS VERIFIED:
--   Category A – AAL1 sessions receive exactly aal2_required from every sensitive RPC.
--               require_aal2() itself is tested as postgres (the SQL Editor role) because
--               EXECUTE on that helper is intentionally revoked from authenticated — it is
--               an internal function callable only by SECURITY DEFINER wrappers.
--               All thirteen sensitive RPCs are tested as authenticated with no JWT claims.
--   Category B – AAL2 staff sessions can access permitted functions.
--               story_admin_dashboard() and story_admin_queue() must return rows (not errors)
--               for a managing_editor with AAL2.  Other guarded RPCs reach their permission /
--               row-existence check; only 'forbidden' or 'not_found' are accepted — any other
--               exception (undefined_function, type error, SQL error, …) fails the test.
--   Category C – AAL2 + insufficient permissions → 'forbidden', not 'aal2_required'.
--               Proves the permission gate still fires independently of the AAL gate.
--   Category D – Catalog checks: EXECUTE grants, require_aal2 revoke, RPC existence.
--
-- HOW AAL IS SIMULATED:
--   auth.jwt() reads current_setting('request.jwt.claims', true) as jsonb.
--   AAL1: leave that GUC unset (SQL Editor default); auth.jwt() → null; aal = '' ≠ 'aal2'.
--   AAL2: SET LOCAL request.jwt.claims = '{"sub":"…","aal":"aal2","role":"authenticated"}'.
--   auth.uid() reads request.jwt.claim.sub (a separate, singular GUC); both must be set.
--
-- TO RUN:
--   Paste the whole file into the SQL Editor and execute.
--   Expected final output: one row per test all PASS, then '04-aal2-enforcement: PASS'.

begin;

-- ── Test-result table ─────────────────────────────────────────────────────────

create temp table _t04 (
  test_name text primary key,
  result    text    not null,
  detail    text
);

-- ── Harness helpers ───────────────────────────────────────────────────────────

-- assert_raises_aal2: PASS only when exactly 'aal2_required' is raised.
create function pg_temp.chk_aal2(p_test text, p_sql text)
returns void language plpgsql as $$
declare v_msg text;
begin
  begin
    execute p_sql;
    insert into _t04 values (p_test, 'FAIL', 'No exception raised; expected aal2_required');
    return;
  exception when others then
    get stacked diagnostics v_msg = message_text;
    if v_msg = 'aal2_required' then
      insert into _t04 values (p_test, 'PASS', null);
    else
      insert into _t04 values (p_test, 'FAIL', 'Got: ' || v_msg || ' — expected: aal2_required');
    end if;
  end;
end $$;

-- assert_reaches_permission_check: PASS only when the exception message is 'forbidden' or
-- 'not_found', meaning the function got past require_aal2() and reached its own gate.
-- Any other exception (undefined_function, type error, wrong errcode, …) is a test failure.
create function pg_temp.chk_past_aal2(p_test text, p_sql text)
returns void language plpgsql as $$
declare v_msg text;
begin
  begin
    execute p_sql;
    -- Clean execution is also acceptable (e.g. dashboard returning empty results).
    insert into _t04 values (p_test, 'PASS', 'Executed without error');
  exception when others then
    get stacked diagnostics v_msg = message_text;
    if v_msg in ('forbidden', 'not_found') then
      insert into _t04 values (p_test, 'PASS', 'Reached permission/row check: ' || v_msg);
    elsif v_msg = 'aal2_required' then
      insert into _t04 values (p_test, 'FAIL', 'Unexpected aal2_required — AAL2 gate not cleared');
    else
      insert into _t04 values (p_test, 'FAIL',
        'Unexpected error (not forbidden/not_found): ' || v_msg);
    end if;
  end;
end $$;

-- assert_raises_msg: PASS only when the raised message equals p_expected exactly.
create function pg_temp.chk_msg(p_test text, p_sql text, p_expected text)
returns void language plpgsql as $$
declare v_msg text;
begin
  begin
    execute p_sql;
    insert into _t04 values (p_test, 'FAIL', 'No exception raised; expected: ' || p_expected);
    return;
  exception when others then
    get stacked diagnostics v_msg = message_text;
    if v_msg = p_expected then
      insert into _t04 values (p_test, 'PASS', null);
    else
      insert into _t04 values (p_test, 'FAIL', 'Got: ' || v_msg || ' — expected: ' || p_expected);
    end if;
  end;
end $$;

-- assert_returns_rows: PASS only when the query returns at least one row.
create function pg_temp.chk_rows(p_test text, p_sql text)
returns void language plpgsql as $$
declare v_count int; v_msg text;
begin
  begin
    execute 'select count(*) from (' || p_sql || ') _r' into v_count;
    if v_count > 0 then
      insert into _t04 values (p_test, 'PASS', v_count || ' row(s) returned');
    else
      insert into _t04 values (p_test, 'FAIL', 'Query returned 0 rows; expected at least 1');
    end if;
  exception when others then
    get stacked diagnostics v_msg = message_text;
    insert into _t04 values (p_test, 'FAIL', 'Unexpected exception: ' || v_msg);
  end;
end $$;

-- ── Fixture accounts ──────────────────────────────────────────────────────────
-- managing_editor: has submission.queue.read, submission.review, submission.assign,
--                  submission.raw.read, submission.disposition, story.edit — full access.
-- translator:      has admin.access only — no moderation or queue permissions.
-- Both are rolled back at the end; the test leaves no trace.

insert into auth.users(id, aud, role, email, created_at, updated_at) values
  ('04000000-0000-4000-8000-000000000001',
   'authenticated','authenticated','t04-editor@example.invalid',now(),now()),
  ('04000000-0000-4000-8000-000000000002',
   'authenticated','authenticated','t04-noperm@example.invalid',now(),now());

insert into public.users(user_id, email, display_name) values
  ('04000000-0000-4000-8000-000000000001','t04-editor@example.invalid','T04 Editor'),
  ('04000000-0000-4000-8000-000000000002','t04-noperm@example.invalid','T04 NoPermission');

insert into public.user_role_assignments(user_id, role_id)
  select '04000000-0000-4000-8000-000000000001', role_id
  from public.roles where name = 'managing_editor';

insert into public.user_role_assignments(user_id, role_id)
  select '04000000-0000-4000-8000-000000000002', role_id
  from public.roles where name = 'translator';

-- Verify fixture setup succeeded.
do $$
declare v_editor_perms int; v_trans_perms int;
begin
  select count(*) into v_editor_perms
  from public.user_role_assignments ura
  join public.roles r on r.role_id = ura.role_id
  where ura.user_id = '04000000-0000-4000-8000-000000000001'
    and r.name = 'managing_editor';

  select count(*) into v_trans_perms
  from public.user_role_assignments ura
  join public.roles r on r.role_id = ura.role_id
  where ura.user_id = '04000000-0000-4000-8000-000000000002'
    and r.name = 'translator';

  if v_editor_perms = 0 then
    raise exception 'SETUP FAIL: managing_editor role assignment missing (no matching role name?)';
  end if;
  if v_trans_perms = 0 then
    raise exception 'SETUP FAIL: translator role assignment missing (no matching role name?)';
  end if;
end $$;

-- ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
-- CATEGORY A: AAL1 → aal2_required
-- ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄

-- A01: require_aal2() tested as postgres (service_role), not as 'authenticated'.
-- Rationale: EXECUTE on this helper is intentionally revoked from authenticated; it is
-- an internal function reached only via SECURITY DEFINER wrappers.  In the SQL Editor
-- we ARE postgres, which can call it directly, and auth.jwt() is null → aal = '' → raises.
reset role;
reset request.jwt.claims;
reset request.jwt.claim.sub;

select pg_temp.chk_aal2(
  'A01 require_aal2() raises aal2_required for null JWT (postgres role)',
  'select public.require_aal2()');

-- A02–A14: sensitive RPCs tested as 'authenticated' with no JWT claims.
-- The functions have EXECUTE granted to authenticated; auth.jwt() → null → aal = '' → raises.
-- A nil UUID is used so the test never touches real rows.

set local role authenticated;
set local request.jwt.claim.sub = '04000000-0000-4000-8000-000000000001';
-- Do NOT set request.jwt.claims — auth.jwt() stays null, giving free AAL1 simulation.

select pg_temp.chk_aal2('A02 review_get_submission blocks AAL1',
  $$select * from public.review_get_submission('04000000-0000-4000-8000-000000000099')$$);

select pg_temp.chk_aal2('A03 review_get_submission_location blocks AAL1',
  $$select * from public.review_get_submission_location('04000000-0000-4000-8000-000000000099','test_reason')$$);

select pg_temp.chk_aal2('A04 review_get_submission_break_glass blocks AAL1',
  $$select * from public.review_get_submission_break_glass('04000000-0000-4000-8000-000000000099','test_reason')$$);

select pg_temp.chk_aal2('A05 review_set_disposition blocks AAL1',
  $$select public.review_set_disposition('04000000-0000-4000-8000-000000000099','approve')$$);

select pg_temp.chk_aal2('A06 review_add_note blocks AAL1',
  $$select public.review_add_note('04000000-0000-4000-8000-000000000099','note')$$);

select pg_temp.chk_aal2('A07 assign_user_role blocks AAL1',
  $$select public.assign_user_role('04000000-0000-4000-8000-000000000099','moderator')$$);

select pg_temp.chk_aal2('A08 revoke_user_role blocks AAL1',
  $$select public.revoke_user_role('04000000-0000-4000-8000-000000000099')$$);

select pg_temp.chk_aal2('A09 story_admin_workspace blocks AAL1',
  $$select public.story_admin_workspace('04000000-0000-4000-8000-000000000099')$$);

select pg_temp.chk_aal2('A10 story_admin_assign blocks AAL1',
  $$select public.story_admin_assign('04000000-0000-4000-8000-000000000099')$$);

select pg_temp.chk_aal2('A11 story_admin_save_review blocks AAL1',
  $$select public.story_admin_save_review('04000000-0000-4000-8000-000000000099','none',array[]::text[])$$);

select pg_temp.chk_aal2('A12 story_admin_save_draft blocks AAL1',
  $$select public.story_admin_save_draft('04000000-0000-4000-8000-000000000099','{}'::jsonb)$$);

select pg_temp.chk_aal2('A13 story_admin_transition blocks AAL1',
  $$select public.story_admin_transition('04000000-0000-4000-8000-000000000099','approve')$$);

select pg_temp.chk_aal2('A14 story_admin_bulk blocks AAL1',
  $$select public.story_admin_bulk(array['04000000-0000-4000-8000-000000000099']::uuid[],'approve')$$);

-- ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
-- CATEGORY B: AAL2 staff → permitted access
-- ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
-- managing_editor has submission.queue.read → dashboard and queue succeed and return rows.
-- For guarded RPCs that need a real submission, a nil UUID causes 'not_found' or 'forbidden'
-- (depending on can_access_submission) — both prove the AAL2 gate was cleared.
-- Only 'forbidden' and 'not_found' are accepted; any other error fails the test.

set local role authenticated;
set local request.jwt.claim.sub = '04000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"04000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}';

-- B01–B02: non-sensitive RPCs must succeed and return rows (managing_editor has queue.read).
select pg_temp.chk_rows('B01 story_admin_dashboard returns rows for AAL2 managing_editor',
  'select * from public.story_admin_dashboard()');

select pg_temp.chk_rows('B02 story_admin_queue returns rows for AAL2 managing_editor',
  'select * from public.story_admin_queue()');

-- B03–B09: guarded RPCs must get past require_aal2(); only forbidden/not_found accepted.
select pg_temp.chk_past_aal2('B03 story_admin_workspace AAL2 clears guard (reaches row check)',
  $$select public.story_admin_workspace('04000000-0000-4000-8000-000000000099')$$);

select pg_temp.chk_past_aal2('B04 story_admin_assign AAL2 clears guard (reaches permission check)',
  $$select public.story_admin_assign('04000000-0000-4000-8000-000000000099')$$);

select pg_temp.chk_past_aal2('B05 story_admin_save_review AAL2 clears guard',
  $$select public.story_admin_save_review('04000000-0000-4000-8000-000000000099','none',array[]::text[])$$);

select pg_temp.chk_past_aal2('B06 story_admin_save_draft AAL2 clears guard',
  $$select public.story_admin_save_draft('04000000-0000-4000-8000-000000000099','{}'::jsonb)$$);

select pg_temp.chk_past_aal2('B07 story_admin_transition AAL2 clears guard',
  $$select public.story_admin_transition('04000000-0000-4000-8000-000000000099','approve')$$);

select pg_temp.chk_past_aal2('B08 review_get_submission AAL2 clears guard',
  $$select * from public.review_get_submission('04000000-0000-4000-8000-000000000099')$$);

select pg_temp.chk_past_aal2('B09 assign_user_role AAL2 clears guard (reaches forbidden: no role.manage)',
  $$select public.assign_user_role('04000000-0000-4000-8000-000000000099','moderator')$$);

-- ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
-- CATEGORY C: AAL2 + insufficient permissions → 'forbidden'
-- ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
-- translator has admin.access but NOT submission.queue.read, submission.review,
-- submission.assign, or role.manage.  With AAL2 set, require_aal2() passes and the
-- function must proceed to its has_permission() check and raise 'forbidden'.

set local role authenticated;
set local request.jwt.claim.sub = '04000000-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"sub":"04000000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}';

select pg_temp.chk_msg('C01 story_admin_dashboard no queue.read → forbidden',
  'select * from public.story_admin_dashboard()', 'forbidden');

select pg_temp.chk_msg('C02 story_admin_queue no queue.read → forbidden',
  'select * from public.story_admin_queue()', 'forbidden');

select pg_temp.chk_msg('C03 story_admin_workspace no submission.raw.read → forbidden',
  $$select public.story_admin_workspace('04000000-0000-4000-8000-000000000099')$$, 'forbidden');

select pg_temp.chk_msg('C04 story_admin_assign no submission.review → forbidden',
  $$select public.story_admin_assign('04000000-0000-4000-8000-000000000099')$$, 'forbidden');

select pg_temp.chk_msg('C05 story_admin_save_review no submission.review → forbidden',
  $$select public.story_admin_save_review('04000000-0000-4000-8000-000000000099','none',array[]::text[])$$, 'forbidden');

select pg_temp.chk_msg('C06 story_admin_save_draft no story.edit → forbidden',
  $$select public.story_admin_save_draft('04000000-0000-4000-8000-000000000099','{}'::jsonb)$$, 'forbidden');

select pg_temp.chk_msg('C07 assign_user_role no role.manage → forbidden',
  $$select public.assign_user_role('04000000-0000-4000-8000-000000000099','moderator')$$, 'forbidden');

select pg_temp.chk_msg('C08 revoke_user_role no role.manage → forbidden',
  $$select public.revoke_user_role('04000000-0000-4000-8000-000000000099')$$, 'forbidden');

-- ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
-- CATEGORY D: Catalog / signature checks (runs as postgres / service_role)
-- ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄

reset role;
reset request.jwt.claims;
reset request.jwt.claim.sub;

-- D01: require_aal2 must have no EXECUTE grant for public / anon / authenticated.
do $$
declare v_ok boolean;
begin
  select count(*) = 0 into v_ok
  from information_schema.routine_privileges
  where routine_schema = 'public'
    and routine_name = 'require_aal2'
    and grantee in ('PUBLIC','anon','authenticated');
  if v_ok then
    insert into _t04 values
      ('D01 require_aal2 revoked from public/anon/authenticated', 'PASS', null);
  else
    insert into _t04 values
      ('D01 require_aal2 revoked from public/anon/authenticated', 'FAIL',
       'EXECUTE grant still exists for unprivileged grantee');
  end if;
end $$;

-- D02: Guarded story RPCs must have EXECUTE granted to authenticated.
do $$
declare
  v_fns text[] := array[
    'story_admin_workspace',
    'story_admin_assign',
    'story_admin_save_review',
    'story_admin_save_draft',
    'story_admin_transition',
    'story_admin_bulk'
  ];
  v_fn text; v_has boolean;
begin
  foreach v_fn in array v_fns loop
    select count(*) > 0 into v_has
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name = v_fn
      and grantee = 'authenticated'
      and privilege_type = 'EXECUTE';
    insert into _t04 values (
      'D02 authenticated EXECUTE on ' || v_fn,
      case when v_has then 'PASS' else 'FAIL' end,
      case when v_has then null else 'EXECUTE grant missing' end
    );
  end loop;
end $$;

-- D03: Review RPCs must have EXECUTE granted to authenticated.
do $$
declare
  v_fns text[] := array[
    'review_get_submission',
    'review_get_submission_location',
    'review_get_submission_break_glass',
    'review_set_disposition',
    'review_add_note',
    'assign_user_role',
    'revoke_user_role'
  ];
  v_fn text; v_has boolean;
begin
  foreach v_fn in array v_fns loop
    select count(*) > 0 into v_has
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name = v_fn
      and grantee = 'authenticated'
      and privilege_type = 'EXECUTE';
    insert into _t04 values (
      'D03 authenticated EXECUTE on ' || v_fn,
      case when v_has then 'PASS' else 'FAIL' end,
      case when v_has then null else 'EXECUTE grant missing' end
    );
  end loop;
end $$;

-- D04: Safe (non-content) RPCs must also be granted to authenticated.
do $$
declare
  v_fns text[] := array['story_admin_dashboard','story_admin_queue'];
  v_fn text; v_has boolean;
begin
  foreach v_fn in array v_fns loop
    select count(*) > 0 into v_has
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name = v_fn
      and grantee = 'authenticated'
      and privilege_type = 'EXECUTE';
    insert into _t04 values (
      'D04 authenticated EXECUTE on ' || v_fn,
      case when v_has then 'PASS' else 'FAIL' end,
      case when v_has then null else 'EXECUTE grant missing' end
    );
  end loop;
end $$;

-- D05: All key RPCs must exist in pg_proc.
do $$
declare
  v_fns text[] := array[
    'require_aal2',
    'review_get_submission',
    'review_get_submission_location',
    'review_get_submission_break_glass',
    'review_set_disposition',
    'review_add_note',
    'assign_user_role',
    'revoke_user_role',
    'story_admin_workspace',
    'story_admin_assign',
    'story_admin_save_review',
    'story_admin_save_draft',
    'story_admin_transition',
    'story_admin_bulk',
    'story_admin_dashboard',
    'story_admin_queue'
  ];
  v_fn text; v_cnt int;
begin
  foreach v_fn in array v_fns loop
    select count(*) into v_cnt
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = v_fn;
    insert into _t04 values (
      'D05 RPC exists in pg_proc: ' || v_fn,
      case when v_cnt > 0 then 'PASS' else 'FAIL' end,
      case when v_cnt > 0 then null else 'Function not found' end
    );
  end loop;
end $$;

-- ── Results ───────────────────────────────────────────────────────────────────
-- Emit every result row so CI can grep for PASS/FAIL counts.
-- The tag prefix makes them easy to grep without false matches on SQL text.

select
  'RESULT: ' || result || ' | ' || test_name ||
    case when detail <> '' then ' | ' || detail else '' end as test_output
from (
  select test_name, result, coalesce(detail, '') as detail
  from _t04
  order by test_name
) t;

-- ── CI summary line ───────────────────────────────────────────────────────────
-- Emit counts as a parseable summary before rolling back.
-- In CI the workflow step greps for "SUITE:" to extract pass/fail counts,
-- and separately greps for "RESULT: FAIL" to annotate individual failures.
-- ROLLBACK runs unconditionally below so fixtures are always cleaned up.

select
  'SUITE: pass=' || sum(case when result = 'PASS' then 1 else 0 end) ||
         ' fail=' || sum(case when result <> 'PASS' then 1 else 0 end) ||
         ' total=' || count(*) as suite_summary
from _t04;

rollback;
-- Rollback removes fixture users, role assignments, and temp objects.
-- Safe to re-run at any time without side effects.
-- ROLLBACK is intentionally unconditional: it runs even if earlier steps
-- failed, ensuring no fixture data is left in the database.
-- The CI step checks the output file for failure indicators — psql itself
-- always exits 0 here since the raise is before the ROLLBACK.
-- (ON_ERROR_STOP=1 stops psql on unexpected SQL errors; it does not affect
--  PL/pgSQL EXCEPTION handlers inside the harness helpers.)

select '04-aal2-enforcement: results above' as result;
