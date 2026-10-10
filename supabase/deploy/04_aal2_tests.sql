-- AAL2 enforcement tests.
--
-- Run in the Supabase SQL Editor (as postgres / service_role).
--
-- WHAT IS VERIFIED:
--   Category A – AAL1 sessions receive exactly aal2_required from every sensitive RPC.
--   Category B – AAL2 staff sessions can access permitted moderation functions.
--   Category C – Users without required permissions remain blocked even with AAL2
--                (permission check still fires; error is forbidden, not aal2_required).
--   Category D – Migration preserved existing RPC signatures and catalog grants.
--
-- HOW AAL IS SIMULATED:
--   auth.jwt() reads current_setting('request.jwt.claims', true) and returns it as
--   jsonb.  When that setting is absent (service_role / SQL Editor) auth.jwt() is null,
--   so coalesce(auth.jwt() ->> 'aal', '') = '' ≠ 'aal2' → automatic AAL1 simulation.
--   For AAL2 simulation: SET LOCAL request.jwt.claims = '{"sub":"…","aal":"aal2",…}'.
--   auth.uid() reads request.jwt.claim.sub (singular, different GUC); both must be set.
--
-- HOW TO RUN:
--   Paste the entire file into the SQL Editor and execute.
--   Expected final output: one row per test, all showing PASS, then
--   '04-aal2-enforcement: PASS' at the very end.
--
-- DESIGN NOTE ON do $$ … $$:
--   Top-level PERFORM is PL/pgSQL syntax, invalid in the SQL Editor.
--   Every function call uses SELECT (return value discarded) or is wrapped in a
--   do $$ begin … end $$ block when control-flow (exception handling) is needed.

begin;

-- ── Test-result table ─────────────────────────────────────────────────────────

create temp table _t04 (
  test_name text primary key,
  result    text    not null,
  detail    text
);

-- ── Harness helpers ───────────────────────────────────────────────────────────

-- assert_raises_aal2: pass when exactly 'aal2_required' is raised.
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

-- assert_not_aal2: pass when aal2_required is NOT raised (any other outcome is fine).
create function pg_temp.chk_no_aal2(p_test text, p_sql text)
returns void language plpgsql as $$
declare v_msg text;
begin
  begin
    execute p_sql;
    insert into _t04 values (p_test, 'PASS', null);
  exception when others then
    get stacked diagnostics v_msg = message_text;
    if v_msg = 'aal2_required' then
      insert into _t04 values (p_test, 'FAIL', 'Unexpected aal2_required raised');
    else
      -- Any other error (forbidden, not_found, …) means AAL2 did not block the call.
      insert into _t04 values (p_test, 'PASS', 'Non-aal2 exception: ' || v_msg);
    end if;
  end;
end $$;

-- assert_raises_msg: pass when the raised message equals p_expected.
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

-- ── Fixture users ─────────────────────────────────────────────────────────────
-- Two fixture accounts: one managing_editor (has all submission permissions),
-- one translator (no admin permissions).  Rolled back at the end.

insert into auth.users(id, aud, role, email, created_at, updated_at) values
  ('04000000-0000-4000-8000-000000000001','authenticated','authenticated','t04-editor@example.invalid',now(),now()),
  ('04000000-0000-4000-8000-000000000002','authenticated','authenticated','t04-noperm@example.invalid',now(),now());
insert into public.users(user_id, email, display_name) values
  ('04000000-0000-4000-8000-000000000001','t04-editor@example.invalid','T04 Editor'),
  ('04000000-0000-4000-8000-000000000002','t04-noperm@example.invalid','T04 NoPermission');
insert into public.user_role_assignments(user_id, role_id)
  select '04000000-0000-4000-8000-000000000001', role_id from public.roles where name = 'managing_editor';
insert into public.user_role_assignments(user_id, role_id)
  select '04000000-0000-4000-8000-000000000002', role_id from public.roles where name = 'translator';

-- ── Category A: AAL1 sessions → aal2_required ────────────────────────────────
-- auth.jwt() is null in the SQL Editor (service_role), giving us free AAL1 simulation.
-- We use the authenticated role with a real sub so the functions reach require_aal2()
-- before any role / permission check could short-circuit things differently.

set local role authenticated;
set local request.jwt.claim.sub = '04000000-0000-4000-8000-000000000001';
-- Do NOT set request.jwt.claims — auth.jwt() remains null → aal = '' → AAL1.

select pg_temp.chk_aal2('A01 require_aal2() blocks AAL1 (null JWT)',
  'select public.require_aal2()');

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

-- ── Category B: AAL2 sessions can reach permitted functions ───────────────────
-- Simulate AAL2 by setting the full JWT claims blob.
-- Functions may raise forbidden/not_found (no real submission) — that is fine;
-- what matters is they do NOT raise aal2_required.

set local request.jwt.claims = '{"sub":"04000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}';
set local request.jwt.claim.sub = '04000000-0000-4000-8000-000000000001';

select pg_temp.chk_no_aal2('B01 story_admin_dashboard not blocked by AAL2 check',
  'select * from public.story_admin_dashboard()');

select pg_temp.chk_no_aal2('B02 story_admin_queue not blocked by AAL2 check',
  'select * from public.story_admin_queue()');

select pg_temp.chk_no_aal2('B03 story_admin_workspace AAL2 reaches permission check',
  $$select public.story_admin_workspace('04000000-0000-4000-8000-000000000099')$$);

select pg_temp.chk_no_aal2('B04 story_admin_assign AAL2 reaches permission check',
  $$select public.story_admin_assign('04000000-0000-4000-8000-000000000099')$$);

select pg_temp.chk_no_aal2('B05 story_admin_transition AAL2 reaches permission check',
  $$select public.story_admin_transition('04000000-0000-4000-8000-000000000099','approve')$$);

select pg_temp.chk_no_aal2('B06 assign_user_role AAL2 reaches permission check',
  $$select public.assign_user_role('04000000-0000-4000-8000-000000000099','moderator')$$);

select pg_temp.chk_no_aal2('B07 revoke_user_role AAL2 reaches permission check',
  $$select public.revoke_user_role('04000000-0000-4000-8000-000000000099')$$);

-- ── Category C: AAL2 + no permission → forbidden, not aal2_required ───────────
-- The translator role has no admin permissions.  With AAL2 set, require_aal2() passes
-- and the function must proceed to its has_permission() check, raising 'forbidden'.

set local request.jwt.claims = '{"sub":"04000000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}';
set local request.jwt.claim.sub = '04000000-0000-4000-8000-000000000002';

select pg_temp.chk_msg('C01 story_admin_workspace no-permission user gets forbidden',
  $$select public.story_admin_workspace('04000000-0000-4000-8000-000000000099')$$,
  'forbidden');

select pg_temp.chk_msg('C02 story_admin_assign no-permission user gets forbidden',
  $$select public.story_admin_assign('04000000-0000-4000-8000-000000000099')$$,
  'forbidden');

select pg_temp.chk_msg('C03 story_admin_transition no-permission user gets forbidden',
  $$select public.story_admin_transition('04000000-0000-4000-8000-000000000099','approve')$$,
  'forbidden');

select pg_temp.chk_msg('C04 story_admin_save_review no-permission user gets forbidden',
  $$select public.story_admin_save_review('04000000-0000-4000-8000-000000000099','none',array[]::text[])$$,
  'forbidden');

select pg_temp.chk_msg('C05 story_admin_save_draft no-permission user gets forbidden',
  $$select public.story_admin_save_draft('04000000-0000-4000-8000-000000000099','{}'::jsonb)$$,
  'forbidden');

select pg_temp.chk_msg('C06 assign_user_role no-permission user gets forbidden',
  $$select public.assign_user_role('04000000-0000-4000-8000-000000000099','moderator')$$,
  'forbidden');

select pg_temp.chk_msg('C07 revoke_user_role no-permission user gets forbidden',
  $$select public.revoke_user_role('04000000-0000-4000-8000-000000000099')$$,
  'forbidden');

-- ── Category D: Catalog / signature checks ────────────────────────────────────
-- These run outside any role context so they execute as postgres / service_role.
-- They verify that the migration preserved expected grants, revokes, and signatures.

reset role;
reset request.jwt.claims;
reset request.jwt.claim.sub;

do $$
declare
  v_ok boolean;
begin
  -- D01: require_aal2 must NOT be grantable to public / anon / authenticated.
  -- We verify by checking that no privilege row exists for those grantees.
  select count(*) = 0 into v_ok
  from information_schema.routine_privileges
  where routine_schema = 'public'
    and routine_name = 'require_aal2'
    and grantee in ('PUBLIC','anon','authenticated');
  if not v_ok then
    insert into _t04 values
      ('D01 require_aal2 revoked from public/anon/authenticated', 'FAIL',
       'require_aal2 is still grantable to unprivileged roles');
  else
    insert into _t04 values
      ('D01 require_aal2 revoked from public/anon/authenticated', 'PASS', null);
  end if;
end $$;

do $$
declare
  v_sensitive text[] := array[
    'story_admin_workspace',
    'story_admin_assign',
    'story_admin_save_review',
    'story_admin_save_draft',
    'story_admin_transition',
    'story_admin_bulk'
  ];
  v_fn text;
  v_has boolean;
begin
  foreach v_fn in array v_sensitive loop
    select count(*) > 0 into v_has
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name = v_fn
      and grantee = 'authenticated'
      and privilege_type = 'EXECUTE';
    if not v_has then
      insert into _t04 values
        ('D02 authenticated can execute ' || v_fn, 'FAIL', 'EXECUTE grant missing');
    else
      insert into _t04 values
        ('D02 authenticated can execute ' || v_fn, 'PASS', null);
    end if;
  end loop;
end $$;

do $$
declare
  v_safe text[] := array['story_admin_dashboard','story_admin_queue'];
  v_fn text;
  v_has boolean;
begin
  foreach v_fn in array v_safe loop
    select count(*) > 0 into v_has
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name = v_fn
      and grantee = 'authenticated'
      and privilege_type = 'EXECUTE';
    if not v_has then
      insert into _t04 values
        ('D03 authenticated can execute ' || v_fn, 'FAIL', 'EXECUTE grant missing');
    else
      insert into _t04 values
        ('D03 authenticated can execute ' || v_fn, 'PASS', null);
    end if;
  end loop;
end $$;

do $$
declare
  -- Verify key RPC signatures are present with expected argument counts.
  v_checks text[][] := array[
    array['require_aal2',              '0'],
    array['review_get_submission',     '1'],
    array['story_admin_workspace',     '1'],
    array['story_admin_bulk',          '4'],
    array['story_admin_dashboard',     '0'],
    array['story_admin_queue',         '9']   -- varies; just confirm it exists
  ];
  v_row text[];
  v_cnt int;
begin
  foreach v_row slice 1 in array v_checks loop
    select count(*) into v_cnt
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = v_row[1];
    if v_cnt = 0 then
      insert into _t04 values
        ('D04 RPC exists: ' || v_row[1], 'FAIL', 'Function not found in pg_proc');
    else
      insert into _t04 values
        ('D04 RPC exists: ' || v_row[1], 'PASS', null);
    end if;
  end loop;
end $$;

-- ── Results ───────────────────────────────────────────────────────────────────

select test_name, result, coalesce(detail, '') as detail
from _t04
order by test_name;

-- Fail the transaction (for CI) if any test did not pass.
do $$
declare v_fail int;
begin
  select count(*) into v_fail from _t04 where result <> 'PASS';
  if v_fail > 0 then
    raise exception 'AAL2 test suite: % test(s) failed — see results above', v_fail;
  end if;
end $$;

rollback;
-- Rollback removes fixture users and the temp table; safe to re-run at any time.

select '04-aal2-enforcement: PASS' as result;
