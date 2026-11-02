-- Phase 3B hardening — Research consent gate for brief approval and publication.
--
-- Purpose:
--   Institutional briefs that reference contributor evidence must not be
--   approved or published unless EVERY linked evidence item is:
--     1. Flagged as ELIGIBLE (not EXCLUDED, INELIGIBLE, or still UNDER_REVIEW)
--     2. Human-reviewed and completed
--     3. Marked included (inclusion_decision = true)
--     4. Has current, active research consent (consent_active_at_review = true,
--        revalidated within the last 90 days, no withdrawal recorded)
--     5. Has no outstanding re-identification risk flag
--
--   Briefs with is_sample = true (illustrative, no real contributor evidence)
--   are exempt from these checks. An illustrative brief must never have
--   real evidence links — see the constraint added below.
--
--   This replaces the previous brief_transition() with a version that adds
--   an evidence pre-flight check before any APPROVE or PUBLISH transition.
--
-- NOT YET APPLIED TO PRODUCTION. Apply only after full staging rehearsal.

begin;

-- ============================================================================
-- 1. Constraint: sample briefs must not have real evidence links
-- ============================================================================
-- A CHECK constraint on the join table would require a foreign-key lookup;
-- instead enforce via a trigger on brief_evidence_links.

create or replace function public.prevent_evidence_on_sample_brief()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select is_sample from public.institutional_briefs where brief_id = new.brief_id) then
    raise exception 'cannot_link_evidence_to_sample_brief'
      using errcode = '23514',
            detail = 'Sample/illustrative briefs must not reference real contributor evidence.';
  end if;
  return new;
end;
$$;

drop trigger if exists no_evidence_on_sample_briefs on public.brief_evidence_links;
create trigger no_evidence_on_sample_briefs
  before insert or update on public.brief_evidence_links
  for each row execute function public.prevent_evidence_on_sample_brief();

-- ============================================================================
-- 2. Helper: assert_brief_consent_cleared(p_brief_id)
--
--   Raises a descriptive exception if the brief cannot proceed to approval
--   or publication. Returns void on success.
--   Called inside brief_transition(); can also be called independently for
--   pre-flight UI checks (returns JSON summary via the _check variant below).
-- ============================================================================

create or replace function public.assert_brief_consent_cleared(p_brief_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sample       boolean;
  v_link_count   integer;
  v_fail_reasons text[];
  rec            record;
begin
  -- Sample briefs are exempt from evidence consent checks.
  select is_sample into v_sample
  from public.institutional_briefs
  where brief_id = p_brief_id;

  if v_sample then
    return;
  end if;

  -- Collect all failure reasons across evidence links.
  v_fail_reasons := array[]::text[];

  for rec in
    select
      link_id,
      eligibility,
      human_review_completed,
      inclusion_decision,
      consent_active_at_review,
      research_consent_verified_at,
      reidentification_risk_flagged,
      consent_withdrawn_at
    from public.brief_evidence_links
    where brief_id = p_brief_id
  loop
    v_link_count := coalesce(v_link_count, 0) + 1;

    if rec.eligibility <> 'ELIGIBLE' then
      v_fail_reasons := v_fail_reasons || format(
        'link %s: eligibility is %s (must be ELIGIBLE)',
        rec.link_id, rec.eligibility
      );
    end if;

    if not coalesce(rec.human_review_completed, false) then
      v_fail_reasons := v_fail_reasons || format(
        'link %s: human review not completed',
        rec.link_id
      );
    end if;

    if rec.inclusion_decision is null or not rec.inclusion_decision then
      v_fail_reasons := v_fail_reasons || format(
        'link %s: inclusion decision is %s (must be true)',
        rec.link_id, coalesce(rec.inclusion_decision::text, 'null')
      );
    end if;

    if not coalesce(rec.consent_active_at_review, false) then
      v_fail_reasons := v_fail_reasons || format(
        'link %s: consent was not active at last review',
        rec.link_id
      );
    end if;

    -- Consent must have been re-verified within the last 90 days.
    if rec.research_consent_verified_at is null
       or rec.research_consent_verified_at < now() - interval '90 days' then
      v_fail_reasons := v_fail_reasons || format(
        'link %s: consent verification is stale or absent (last: %s)',
        rec.link_id,
        coalesce(rec.research_consent_verified_at::text, 'never')
      );
    end if;

    if rec.consent_withdrawn_at is not null then
      v_fail_reasons := v_fail_reasons || format(
        'link %s: consent was withdrawn at %s',
        rec.link_id, rec.consent_withdrawn_at
      );
    end if;

    if rec.reidentification_risk_flagged then
      v_fail_reasons := v_fail_reasons || format(
        'link %s: re-identification risk is flagged and unresolved',
        rec.link_id
      );
    end if;
  end loop;

  if cardinality(v_fail_reasons) > 0 then
    raise exception 'consent_gate_failed'
      using errcode = '23514',
            detail = array_to_string(v_fail_reasons, '; ');
  end if;
end;
$$;

revoke all on function public.assert_brief_consent_cleared(uuid)
  from public, anon, authenticated;
grant execute on function public.assert_brief_consent_cleared(uuid)
  to authenticated;

-- ============================================================================
-- 3. Check variant: returns JSON rather than raising
--    Used by the admin UI pre-flight summary panel.
-- ============================================================================

create or replace function public.check_brief_consent_status(p_brief_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sample     boolean;
  v_total      integer := 0;
  v_blocked    integer := 0;
  v_issues     jsonb   := '[]'::jsonb;
  rec          record;
  link_issues  text[];
begin
  perform public.require_aal2();
  if not public.has_permission('insight.brief.edit')
     and not public.has_permission('insight.brief.publish') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select is_sample into v_sample
  from public.institutional_briefs
  where brief_id = p_brief_id;

  if v_sample then
    return jsonb_build_object(
      'brief_id', p_brief_id,
      'is_sample', true,
      'consent_gate_required', false,
      'cleared', true,
      'total_links', 0,
      'blocked_links', 0,
      'issues', '[]'::jsonb
    );
  end if;

  for rec in
    select
      link_id,
      eligibility,
      human_review_completed,
      inclusion_decision,
      consent_active_at_review,
      research_consent_verified_at,
      reidentification_risk_flagged,
      consent_withdrawn_at
    from public.brief_evidence_links
    where brief_id = p_brief_id
  loop
    v_total := v_total + 1;
    link_issues := array[]::text[];

    if rec.eligibility <> 'ELIGIBLE' then
      link_issues := link_issues || ('eligibility: ' || rec.eligibility);
    end if;
    if not coalesce(rec.human_review_completed, false) then
      link_issues := link_issues || 'human_review_not_completed';
    end if;
    if rec.inclusion_decision is null or not rec.inclusion_decision then
      link_issues := link_issues || ('inclusion_decision: ' || coalesce(rec.inclusion_decision::text, 'null'));
    end if;
    if not coalesce(rec.consent_active_at_review, false) then
      link_issues := link_issues || 'consent_not_active';
    end if;
    if rec.research_consent_verified_at is null
       or rec.research_consent_verified_at < now() - interval '90 days' then
      link_issues := link_issues || ('consent_stale: last_verified=' || coalesce(rec.research_consent_verified_at::text, 'never'));
    end if;
    if rec.consent_withdrawn_at is not null then
      link_issues := link_issues || ('consent_withdrawn_at=' || rec.consent_withdrawn_at::text);
    end if;
    if rec.reidentification_risk_flagged then
      link_issues := link_issues || 'reidentification_risk_unresolved';
    end if;

    if cardinality(link_issues) > 0 then
      v_blocked := v_blocked + 1;
      v_issues := v_issues || jsonb_build_object(
        'link_id', rec.link_id,
        'issues', to_jsonb(link_issues)
      );
    end if;
  end loop;

  return jsonb_build_object(
    'brief_id',             p_brief_id,
    'is_sample',            false,
    'consent_gate_required', true,
    'cleared',              v_blocked = 0,
    'total_links',          v_total,
    'blocked_links',        v_blocked,
    'issues',               v_issues
  );
end;
$$;

revoke all on function public.check_brief_consent_status(uuid)
  from public, anon, authenticated;
grant execute on function public.check_brief_consent_status(uuid)
  to authenticated;

-- ============================================================================
-- 4. Replace brief_transition() with consent-gated version
-- ============================================================================

create or replace function public.brief_transition(
  p_brief_id uuid,
  p_action   text,
  p_note     text default null
)
returns text
language plpgsql
security definer
set search_path = public, audit
as $$
declare
  v_row  public.institutional_briefs%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_to   text;
begin
  perform public.require_aal2();

  -- Load and lock the brief row.
  select * into v_row
  from public.institutional_briefs
  where brief_id = p_brief_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;

  case p_action

    when 'submit_review' then
      if not public.has_permission('insight.brief.edit') then
        raise exception 'forbidden' using errcode = '42501';
      end if;
      if v_row.status <> 'DRAFT' then
        raise exception 'invalid_transition' using errcode = '22023';
      end if;
      v_to := 'IN_REVIEW';
      update public.institutional_briefs
      set status                   = 'IN_REVIEW',
          submitted_for_review_at  = now(),
          submitted_for_review_by  = auth.uid()
      where brief_id = p_brief_id;

    when 'approve' then
      if not public.has_permission('insight.brief.publish') then
        raise exception 'forbidden' using errcode = '42501';
      end if;
      if v_row.status <> 'IN_REVIEW' then
        raise exception 'invalid_transition' using errcode = '22023';
      end if;
      -- *** CONSENT GATE — must pass before APPROVE ***
      perform public.assert_brief_consent_cleared(p_brief_id);
      v_to := 'APPROVED';
      update public.institutional_briefs
      set status      = 'APPROVED',
          approved_at = now(),
          approved_by = auth.uid()
      where brief_id = p_brief_id;

    when 'publish' then
      if not public.has_permission('insight.brief.publish') then
        raise exception 'forbidden' using errcode = '42501';
      end if;
      if v_row.status not in ('APPROVED', 'IN_REVIEW') then
        raise exception 'invalid_transition' using errcode = '22023';
      end if;
      if v_row.title is null or char_length(trim(v_row.title)) = 0 then
        raise exception 'title_required' using errcode = '23514';
      end if;
      -- *** CONSENT GATE — must pass before PUBLISH (re-check even if APPROVED) ***
      perform public.assert_brief_consent_cleared(p_brief_id);
      v_to := 'PUBLISHED';
      update public.institutional_briefs
      set status       = 'PUBLISHED',
          published_at = now(),
          published_by = auth.uid()
      where brief_id = p_brief_id;

    when 'archive' then
      if not public.has_permission('insight.brief.publish') then
        raise exception 'forbidden' using errcode = '42501';
      end if;
      if v_row.status = 'ARCHIVED' then
        raise exception 'already_archived' using errcode = '22023';
      end if;
      v_to := 'ARCHIVED';
      update public.institutional_briefs
      set status      = 'ARCHIVED',
          archived_at = now(),
          archived_by = auth.uid()
      where brief_id = p_brief_id;

    when 'return_to_draft' then
      if not public.has_permission('insight.brief.edit')
         and not public.has_permission('insight.brief.publish') then
        raise exception 'forbidden' using errcode = '42501';
      end if;
      if v_row.status not in ('IN_REVIEW', 'APPROVED') then
        raise exception 'invalid_transition' using errcode = '22023';
      end if;
      v_to := 'DRAFT';
      update public.institutional_briefs
      set status = 'DRAFT'
      where brief_id = p_brief_id;

    else
      raise exception 'invalid_action' using errcode = '22023';
  end case;

  perform audit.write_event(
    'insight.brief.' || p_action,
    'institutional_brief',
    p_brief_id::text,
    jsonb_build_object('from', v_row.status::text, 'to', v_to, 'note', v_note)
  );
  return v_to;
end;
$$;

revoke all on function public.brief_transition(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.brief_transition(uuid, text, text)
  to authenticated;

-- ============================================================================
-- 5. Withdrawal propagation helper
--
--    Called by the existing consent withdrawal flow (or manually) to mark
--    every open evidence link for a given submission as withdrawn and flag
--    any briefs in APPROVED or PUBLISHED state that need re-review.
-- ============================================================================

create or replace function public.propagate_consent_withdrawal(
  p_submission_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, audit
as $$
declare
  v_affected_briefs uuid[];
  v_at              timestamptz := now();
begin
  perform public.require_aal2();
  if not public.has_permission('insight.evidence.review') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Mark every evidence link for this submission as withdrawn.
  update public.brief_evidence_links
  set
    consent_active_at_review              = false,
    consent_withdrawn_at                  = v_at,
    consent_withdrawal_flagged_briefs_at  = v_at,
    eligibility                           = 'INELIGIBLE',
    updated_at                            = v_at
  where submission_id = p_submission_id
    and consent_withdrawn_at is null
  returning brief_id into v_affected_briefs;

  -- Re-compute distinct brief IDs.
  select array_agg(distinct brief_id) into v_affected_briefs
  from public.brief_evidence_links
  where submission_id = p_submission_id;

  perform audit.write_event(
    'insight.evidence.consent_withdrawn',
    'submission',
    p_submission_id::text,
    jsonb_build_object('affected_briefs', v_affected_briefs)
  );

  return jsonb_build_object(
    'submission_id',   p_submission_id,
    'withdrawn_at',    v_at,
    'affected_briefs', v_affected_briefs
  );
end;
$$;

revoke all on function public.propagate_consent_withdrawal(uuid)
  from public, anon, authenticated;
grant execute on function public.propagate_consent_withdrawal(uuid)
  to authenticated;

commit;
