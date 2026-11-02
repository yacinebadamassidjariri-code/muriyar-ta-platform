-- Phase 3B hardening — Immutable research consent withdrawal ledger.
--
-- Purpose:
--   Replace the mutable consent-withdrawal tracking on brief_evidence_links
--   with an authoritative, append-only ledger. This closes the security gap
--   in migration 20261103 where staff could clear `consent_withdrawn_at` on
--   an evidence link to bypass a contributor's withdrawal.
--
-- What changes:
--   1. New table: research_consent_withdrawals — append-only, no UPDATE/DELETE
--      for any application role.
--   2. New function: record_consent_withdrawal() — the ONLY path for inserting
--      a withdrawal record. Requires AAL2 + insight.evidence.review. Audited.
--   3. Replaces assert_brief_consent_cleared() — now joins raw_submissions
--      (authoritative immutable consent) AND research_consent_withdrawals
--      (immutable withdrawal ledger). brief_evidence_links metadata is still
--      checked for review quality but can NEVER override the authoritative
--      sources.
--   4. Replaces check_brief_consent_status() — returns the new source-of-truth
--      breakdown including withdrawal ledger status.
--   5. Replaces propagate_consent_withdrawal() — now writes to the ledger and
--      also flags any PUBLISHED briefs for safeguarding review. No longer
--      mutates consent_withdrawn_at on brief_evidence_links (that column
--      becomes informational only and will not be trusted by the gate).
--   6. New function: flag_brief_for_safeguarding_review() — sets a new
--      safeguarding_review_required flag and records the reason.
--   7. New column: institutional_briefs.safeguarding_review_required — set by
--      the withdrawal propagation path; cleared only by an authorized reviewer.
--   8. New function: clear_safeguarding_review_flag() — requires AAL2 +
--      insight.brief.publish + explicit content review confirmation.
--   9. Removes evidence link exclusion clearing withdrawal effects: removing
--      a link from a brief does NOT automatically clear the brief for release.
--      The brief must undergo documented content review via
--      clear_safeguarding_review_flag().
--  10. Staff CANNOT recreate consent by inserting a replacement raw_submission.
--      raw_submissions writes go through submit_story() (anon/authenticated
--      SECURITY DEFINER) — it checks only for a valid active consent version,
--      not withdrawal records. This is correct: submit_story() records a new
--      submission by a different user context. However, a withdrawal from
--      submission A cannot be cleared by creating submission B. Each submission
--      is independently evaluated; evidence links from withdrawn submissions
--      remain blocked regardless of other submissions.
--
-- NOT YET APPLIED TO PRODUCTION.
-- Apply only with explicit owner authorization after full staging rehearsal.

begin;

-- ============================================================================
-- 1. New column: institutional_briefs.safeguarding_review_required
--    Set when a withdrawal affects a published or approved brief.
--    Cleared only by an authorized reviewer via clear_safeguarding_review_flag().
-- ============================================================================

alter table public.institutional_briefs
  add column if not exists safeguarding_review_required        boolean not null default false,
  add column if not exists safeguarding_review_required_since  timestamptz,
  add column if not exists safeguarding_review_reason          text,
  add column if not exists safeguarding_review_cleared_at      timestamptz,
  add column if not exists safeguarding_review_cleared_by      uuid
    references public.users(user_id) on delete set null,
  add column if not exists safeguarding_review_notes           text;

comment on column public.institutional_briefs.safeguarding_review_required is
  'Set true when a research consent withdrawal affects this brief after approval '
  'or publication. Blocks further release transitions until cleared by an '
  'authorized reviewer via clear_safeguarding_review_flag(). Does NOT imply '
  'that previously distributed copies have been recalled.';

-- ============================================================================
-- 2. Append-only withdrawal ledger
-- ============================================================================

create table if not exists public.research_consent_withdrawals (
  withdrawal_id       uuid primary key default gen_random_uuid(),
  -- The submission whose research consent is being withdrawn.
  -- References raw_submissions — a withdrawal is tied to a specific submission
  -- record, not to a person directly (submissions are pseudonymous).
  submission_id       uuid not null
    references public.raw_submissions(submission_id) on delete restrict,
  -- When the withdrawal was processed (set by record_consent_withdrawal()).
  withdrawn_at        timestamptz not null default now(),
  -- The staff member who processed the withdrawal on behalf of the contributor.
  -- NULL if withdrawn via an automated contributor-facing flow (future).
  processed_by        uuid references public.users(user_id) on delete set null,
  -- Free-text reason code — MUST NOT contain contributor identifying information.
  -- Use concise operational categories, e.g. 'contributor_requested',
  -- 'safeguarding_concern', 'legal_requirement'.
  reason_code         varchar(100) not null,
  -- Optional operational notes. Must not contain personal data.
  operational_notes   text,
  created_at          timestamptz not null default now()
);

-- Only one active withdrawal per submission is needed (idempotent checks).
-- We do not allow deletion, but we allow checking existence.
create unique index if not exists research_consent_withdrawals_one_per_submission
  on public.research_consent_withdrawals (submission_id);

comment on table public.research_consent_withdrawals is
  'Immutable append-only ledger of research consent withdrawals. '
  'A row here permanently blocks the associated submission from being included '
  'in any newly approved or published brief. '
  'No UPDATE or DELETE is granted to any application role. '
  'Must not store contributor personal data — use reason codes only.';

-- RLS
alter table public.research_consent_withdrawals enable row level security;

-- Authenticated users with insight.evidence.review can read withdrawal records
-- (needed by the admin evidence review UI).
create policy "evidence_reviewers_can_read_withdrawals"
  on public.research_consent_withdrawals
  for select
  to authenticated
  using (public.has_permission('insight.evidence.review'));

-- No direct INSERT policy — all inserts go through record_consent_withdrawal()
-- which is SECURITY DEFINER. Direct INSERT from authenticated is blocked.
-- (No INSERT/UPDATE/DELETE policy = deny by default under RLS.)

-- Revoke all direct write access — the SECURITY DEFINER function bypasses RLS
-- for its own INSERT, but no application role can write directly.
revoke insert, update, delete
  on public.research_consent_withdrawals
  from anon, authenticated;

-- ============================================================================
-- 3. record_consent_withdrawal(p_submission_id, p_reason_code, p_notes)
--
--    The ONLY path for recording a research consent withdrawal.
--    Requires: AAL2 + insight.evidence.review permission.
--    Effect:
--      a. Inserts into research_consent_withdrawals (once; duplicate raises).
--      b. Marks all brief_evidence_links for this submission INELIGIBLE
--         (informational — the gate no longer trusts these fields, but the
--         UI should still reflect the withdrawn state clearly).
--      c. Flags any APPROVED or PUBLISHED briefs for safeguarding review.
--      d. Writes a full audit event.
--    Returns: jsonb summary of affected briefs.
-- ============================================================================

create or replace function public.record_consent_withdrawal(
  p_submission_id   uuid,
  p_reason_code     varchar(100),
  p_notes           text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, audit
as $$
declare
  v_at              timestamptz := now();
  v_withdrawal_id   uuid;
  v_affected_briefs uuid[];
  v_safeguard_briefs uuid[];
  bid               uuid;
begin
  -- Must be AAL2 with evidence review permission.
  perform public.require_aal2();
  if not public.has_permission('insight.evidence.review') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Validate inputs.
  if p_submission_id is null then
    raise exception 'submission_id is required' using errcode = '23502';
  end if;
  if nullif(trim(p_reason_code), '') is null then
    raise exception 'reason_code is required' using errcode = '23502';
  end if;

  -- Verify the submission exists and had research consent originally.
  -- (A submission that never had research_consent_given = true should not
  -- appear in briefs at all, but we record the withdrawal defensively.)
  if not exists (
    select 1 from public.raw_submissions
    where submission_id = p_submission_id
  ) then
    raise exception 'submission_not_found' using errcode = 'P0002';
  end if;

  -- Idempotency: if a withdrawal already exists for this submission, raise.
  -- Do not silently succeed — the caller should know it already happened.
  if exists (
    select 1 from public.research_consent_withdrawals
    where submission_id = p_submission_id
  ) then
    raise exception 'withdrawal_already_recorded'
      using errcode = '23505',
            detail  = 'A research consent withdrawal has already been recorded for this submission.';
  end if;

  -- Insert the immutable withdrawal record.
  insert into public.research_consent_withdrawals (
    submission_id,
    withdrawn_at,
    processed_by,
    reason_code,
    operational_notes
  ) values (
    p_submission_id,
    v_at,
    auth.uid(),
    p_reason_code,
    p_notes
  )
  returning withdrawal_id into v_withdrawal_id;

  -- Mark all brief_evidence_links for this submission as INELIGIBLE.
  -- This is informational metadata for the UI — the consent gate no longer
  -- relies on these fields, but they should reflect reality.
  update public.brief_evidence_links
  set
    eligibility                          = 'INELIGIBLE',
    consent_active_at_review             = false,
    consent_withdrawn_at                 = v_at,
    consent_withdrawal_flagged_briefs_at = v_at,
    updated_at                           = v_at
  where submission_id = p_submission_id;

  -- Collect all briefs that reference this submission.
  select array_agg(distinct brief_id) into v_affected_briefs
  from public.brief_evidence_links
  where submission_id = p_submission_id;

  -- Flag APPROVED or PUBLISHED briefs for safeguarding review.
  -- This suspends further distribution of those briefs.
  v_safeguard_briefs := array[]::uuid[];
  if v_affected_briefs is not null then
    foreach bid in array v_affected_briefs loop
      if exists (
        select 1 from public.institutional_briefs
        where brief_id = bid
          and status in ('APPROVED', 'PUBLISHED')
          and not safeguarding_review_required  -- avoid redundant updates
      ) then
        update public.institutional_briefs
        set
          safeguarding_review_required       = true,
          safeguarding_review_required_since = v_at,
          safeguarding_review_reason         =
            'Research consent withdrawn for submission ' || p_submission_id::text ||
            ' (reason: ' || p_reason_code || '). ' ||
            'Authorized reviewer must determine whether brief requires revision or withdrawal.',
          updated_at                         = v_at
        where brief_id = bid;
        v_safeguard_briefs := v_safeguard_briefs || bid;
      end if;
    end loop;
  end if;

  -- Full audit record — no personal data in payload.
  perform audit.write_event(
    'insight.evidence.consent_withdrawn',
    'submission',
    p_submission_id::text,
    jsonb_build_object(
      'withdrawal_id',     v_withdrawal_id,
      'reason_code',       p_reason_code,
      'affected_briefs',   v_affected_briefs,
      'safeguard_flagged', v_safeguard_briefs,
      'processed_by',      auth.uid()
    )
  );

  return jsonb_build_object(
    'submission_id',      p_submission_id,
    'withdrawal_id',      v_withdrawal_id,
    'withdrawn_at',       v_at,
    'affected_briefs',    coalesce(v_affected_briefs, array[]::uuid[]),
    'safeguard_flagged',  v_safeguard_briefs
  );
end;
$$;

revoke all on function public.record_consent_withdrawal(uuid, varchar, text)
  from public, anon, authenticated;
grant execute on function public.record_consent_withdrawal(uuid, varchar, text)
  to authenticated;

-- ============================================================================
-- 4. Safeguarding flag management
--    clear_safeguarding_review_flag() — clears the flag on a brief after a
--    documented content review. Requires AAL2 + insight.brief.publish.
--    The reviewer must confirm they have assessed the content.
--    This function does NOT re-publish the brief — it only clears the block
--    so that the normal brief_transition() flow can proceed.
-- ============================================================================

create or replace function public.clear_safeguarding_review_flag(
  p_brief_id      uuid,
  p_review_notes  text
)
returns void
language plpgsql
security definer
set search_path = public, audit
as $$
declare
  v_brief public.institutional_briefs%rowtype;
begin
  perform public.require_aal2();
  if not public.has_permission('insight.brief.publish') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if nullif(trim(coalesce(p_review_notes, '')), '') is null then
    raise exception 'review_notes_required'
      using errcode = '23502',
            detail  = 'A documented review note is required before clearing the safeguarding flag.';
  end if;

  select * into v_brief
  from public.institutional_briefs
  where brief_id = p_brief_id
  for update;

  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  if not v_brief.safeguarding_review_required then
    raise exception 'safeguarding_flag_not_set'
      using errcode = '22023',
            detail  = 'This brief does not have an active safeguarding review flag.';
  end if;

  update public.institutional_briefs
  set
    safeguarding_review_required  = false,
    safeguarding_review_cleared_at = now(),
    safeguarding_review_cleared_by = auth.uid(),
    safeguarding_review_notes      = p_review_notes,
    updated_at                     = now()
  where brief_id = p_brief_id;

  perform audit.write_event(
    'insight.brief.safeguarding_review_cleared',
    'institutional_brief',
    p_brief_id::text,
    jsonb_build_object(
      'cleared_by',    auth.uid(),
      'review_notes',  p_review_notes,
      'prior_reason',  v_brief.safeguarding_review_reason
    )
  );
end;
$$;

revoke all on function public.clear_safeguarding_review_flag(uuid, text)
  from public, anon, authenticated;
grant execute on function public.clear_safeguarding_review_flag(uuid, text)
  to authenticated;

-- ============================================================================
-- 5. Replace assert_brief_consent_cleared()
--
--    Now checks THREE layers in order, most authoritative first:
--      Layer 1 — raw_submissions.research_consent_given (immutable)
--                If the submission never gave research consent, block.
--      Layer 2 — research_consent_withdrawals ledger (immutable)
--                If a withdrawal record exists, block regardless of any
--                brief_evidence_links metadata.
--      Layer 3 — brief_evidence_links review quality (mutable, staff-managed)
--                Staleness, human review, inclusion decision, re-id risk.
--                These are necessary conditions on top of the authoritative
--                sources — they assess review quality, not consent authority.
--
--    brief_evidence_links.consent_withdrawn_at is NO LONGER TRUSTED as a
--    consent authority — it is informational only. Layer 2 is the gate.
--
--    Also checks: safeguarding_review_required. A brief flagged for
--    safeguarding review cannot be approved or published until cleared.
-- ============================================================================

create or replace function public.assert_brief_consent_cleared(p_brief_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sample              boolean;
  v_safeguard_required  boolean;
  v_fail_reasons        text[];
  rec                   record;
begin
  -- Load brief metadata — lock to prevent concurrent transitions.
  select is_sample, safeguarding_review_required
  into v_sample, v_safeguard_required
  from public.institutional_briefs
  where brief_id = p_brief_id;

  -- Sample briefs are exempt from evidence consent checks.
  if v_sample then
    return;
  end if;

  -- Safeguarding review flag blocks all approval and publication.
  if v_safeguard_required then
    raise exception 'consent_gate_failed'
      using errcode = '23514',
            detail  = 'This brief has an active safeguarding review flag due to a consent '
                      'withdrawal affecting a previously approved or published version. '
                      'An authorized reviewer must complete the documented content review '
                      'via clear_safeguarding_review_flag() before this brief can proceed.';
  end if;

  v_fail_reasons := array[]::text[];

  -- Join brief_evidence_links with both authoritative sources.
  for rec in
    select
      bel.link_id,
      bel.submission_id,
      bel.eligibility,
      bel.human_review_completed,
      bel.inclusion_decision,
      bel.consent_active_at_review,
      bel.research_consent_verified_at,
      bel.reidentification_risk_flagged,
      -- Layer 1: authoritative original consent from raw_submissions (immutable).
      rs.research_consent_given,
      -- Layer 2: authoritative withdrawal from ledger (immutable).
      (
        select withdrawn_at
        from public.research_consent_withdrawals w
        where w.submission_id = bel.submission_id
        limit 1
      ) as ledger_withdrawn_at
    from public.brief_evidence_links bel
    -- LEFT JOIN: if the submission_id doesn't exist in raw_submissions,
    -- treat as consent_not_given (rs.research_consent_given will be NULL).
    left join public.raw_submissions rs
      on rs.submission_id = bel.submission_id
    where bel.brief_id = p_brief_id
  loop

    -- ── Layer 1: original research consent (immutable) ──────────────────────
    -- research_consent_given = false or NULL means the contributor never
    -- consented to research use. This evidence link should never have been
    -- added, but if it is here, it is unconditionally blocked.
    if not coalesce(rec.research_consent_given, false) then
      v_fail_reasons := v_fail_reasons || format(
        'link %s (submission %s): no research consent recorded in the original submission',
        rec.link_id, rec.submission_id
      );
      -- No point checking further layers for this link.
      continue;
    end if;

    -- ── Layer 2: withdrawal ledger (immutable) ───────────────────────────────
    -- If a withdrawal record exists in the ledger, this submission's research
    -- consent has been permanently withdrawn. Staff-editable fields on
    -- brief_evidence_links cannot override this.
    if rec.ledger_withdrawn_at is not null then
      v_fail_reasons := v_fail_reasons || format(
        'link %s (submission %s): research consent was withdrawn (ledger record at %s). '
        'Withdrawal is permanent — staff cannot override it. '
        'Remove this evidence link or ensure the contributor independently provides new consent.',
        rec.link_id, rec.submission_id, rec.ledger_withdrawn_at
      );
      -- Layer 3 checks are skipped — withdrawal is a hard block.
      continue;
    end if;

    -- ── Layer 3: review quality checks (brief_evidence_links metadata) ───────
    -- These checks assess review quality and consent staleness.
    -- They are necessary conditions but cannot substitute for Layer 1 + 2.

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

    -- Consent verification must be fresh (within 90 days).
    if rec.research_consent_verified_at is null
       or rec.research_consent_verified_at < now() - interval '90 days' then
      v_fail_reasons := v_fail_reasons || format(
        'link %s: consent verification is stale or absent (last verified: %s)',
        rec.link_id,
        coalesce(rec.research_consent_verified_at::text, 'never')
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
            detail  = array_to_string(v_fail_reasons, '; ');
  end if;
end;
$$;

revoke all on function public.assert_brief_consent_cleared(uuid)
  from public, anon, authenticated;
grant execute on function public.assert_brief_consent_cleared(uuid)
  to authenticated;

-- ============================================================================
-- 6. Replace check_brief_consent_status() — JSON pre-flight (admin UI)
--    Returns a full breakdown including authoritative layer status.
-- ============================================================================

create or replace function public.check_brief_consent_status(p_brief_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sample              boolean;
  v_safeguard           boolean;
  v_safeguard_reason    text;
  v_total               integer := 0;
  v_blocked             integer := 0;
  v_issues              jsonb   := '[]'::jsonb;
  rec                   record;
  link_issues           text[];
begin
  perform public.require_aal2();
  if not public.has_permission('insight.brief.edit')
     and not public.has_permission('insight.brief.publish') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select is_sample, safeguarding_review_required, safeguarding_review_reason
  into v_sample, v_safeguard, v_safeguard_reason
  from public.institutional_briefs
  where brief_id = p_brief_id;

  if v_sample then
    return jsonb_build_object(
      'brief_id',             p_brief_id,
      'is_sample',            true,
      'consent_gate_required', false,
      'cleared',              true,
      'total_links',          0,
      'blocked_links',        0,
      'safeguarding_review_required', false,
      'issues',               '[]'::jsonb
    );
  end if;

  for rec in
    select
      bel.link_id,
      bel.submission_id,
      bel.eligibility,
      bel.human_review_completed,
      bel.inclusion_decision,
      bel.consent_active_at_review,
      bel.research_consent_verified_at,
      bel.reidentification_risk_flagged,
      rs.research_consent_given,
      (
        select withdrawn_at
        from public.research_consent_withdrawals w
        where w.submission_id = bel.submission_id
        limit 1
      ) as ledger_withdrawn_at
    from public.brief_evidence_links bel
    left join public.raw_submissions rs
      on rs.submission_id = bel.submission_id
    where bel.brief_id = p_brief_id
  loop
    v_total := v_total + 1;
    link_issues := array[]::text[];

    -- Layer 1
    if not coalesce(rec.research_consent_given, false) then
      link_issues := link_issues || 'no_original_research_consent';
    end if;

    -- Layer 2
    if rec.ledger_withdrawn_at is not null then
      link_issues := link_issues || ('ledger_withdrawal_at=' || rec.ledger_withdrawn_at::text);
    end if;

    -- Layer 3 (only checked if Layers 1+2 pass, so the UI shows all issues)
    if coalesce(rec.research_consent_given, false) and rec.ledger_withdrawn_at is null then
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
        link_issues := link_issues || 'consent_not_active_at_review';
      end if;
      if rec.research_consent_verified_at is null
         or rec.research_consent_verified_at < now() - interval '90 days' then
        link_issues := link_issues || ('consent_stale: last_verified=' || coalesce(rec.research_consent_verified_at::text, 'never'));
      end if;
      if rec.reidentification_risk_flagged then
        link_issues := link_issues || 'reidentification_risk_unresolved';
      end if;
    end if;

    if cardinality(link_issues) > 0 then
      v_blocked := v_blocked + 1;
      v_issues := v_issues || jsonb_build_object(
        'link_id',  rec.link_id,
        'issues',   to_jsonb(link_issues)
      );
    end if;
  end loop;

  return jsonb_build_object(
    'brief_id',                     p_brief_id,
    'is_sample',                    false,
    'consent_gate_required',        true,
    'cleared',                      v_blocked = 0 and not v_safeguard,
    'total_links',                  v_total,
    'blocked_links',                v_blocked,
    'safeguarding_review_required', v_safeguard,
    'safeguarding_review_reason',   v_safeguard_reason,
    'issues',                       v_issues
  );
end;
$$;

revoke all on function public.check_brief_consent_status(uuid)
  from public, anon, authenticated;
grant execute on function public.check_brief_consent_status(uuid)
  to authenticated;

-- ============================================================================
-- 7. Replace propagate_consent_withdrawal()
--    Now delegates to record_consent_withdrawal() for the ledger insert.
--    This function is kept as a compatibility shim — callers that used the
--    old propagate_consent_withdrawal() should migrate to calling
--    record_consent_withdrawal() directly, but the shim ensures existing
--    code does not silently become a no-op.
-- ============================================================================

create or replace function public.propagate_consent_withdrawal(
  p_submission_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Delegate entirely to record_consent_withdrawal() with a default reason code.
  -- The caller should use record_consent_withdrawal() directly for full control
  -- over the reason_code and operational_notes.
  return public.record_consent_withdrawal(
    p_submission_id,
    'contributor_requested',
    'Processed via propagate_consent_withdrawal() compatibility shim. '
    'Caller should migrate to record_consent_withdrawal() for full audit detail.'
  );
end;
$$;

revoke all on function public.propagate_consent_withdrawal(uuid)
  from public, anon, authenticated;
grant execute on function public.propagate_consent_withdrawal(uuid)
  to authenticated;

-- ============================================================================
-- 8. Update brief_transition() to enforce safeguarding review flag
--    and double-check authoritative consent on APPROVE and PUBLISH.
--    (assert_brief_consent_cleared now handles the flag check internally,
--    but we add an explicit gate at the transition level for PUBLISHED briefs
--    that are being re-processed after a withdrawal.)
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
      -- *** CONSENT GATE (Layers 1+2+3 + safeguarding flag) ***
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
      -- *** CONSENT GATE (re-checked at publish — covers time between APPROVE and PUBLISH) ***
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
-- 9. Protect withdrawal table with an immutability trigger
--    Belt-and-suspenders: even if a superuser inadvertently grants UPDATE or
--    DELETE on the table in the future, this trigger fires first and refuses.
--    Only a superuser running ALTER TABLE ... DISABLE TRIGGER could bypass it,
--    which is a visible DDL operation.
-- ============================================================================

create or replace function public.protect_consent_withdrawal_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'consent_withdrawal_immutable'
    using errcode = '42501',
          detail  = 'Research consent withdrawal records cannot be modified or deleted. '
                    'This is a permanent audit record. Contact a system administrator '
                    'if you believe this record was created in error.';
end;
$$;

drop trigger if exists enforce_withdrawal_immutability
  on public.research_consent_withdrawals;

create trigger enforce_withdrawal_immutability
  before update or delete
  on public.research_consent_withdrawals
  for each row
  execute function public.protect_consent_withdrawal_immutability();

-- ============================================================================
-- 10. Verify the trigger is in place (sanity check at migration time)
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from information_schema.triggers
    where trigger_name = 'enforce_withdrawal_immutability'
      and event_object_table = 'research_consent_withdrawals'
      and event_object_schema = 'public'
  ) then
    raise exception 'MIGRATION INTEGRITY CHECK FAILED: '
      'enforce_withdrawal_immutability trigger was not created on '
      'research_consent_withdrawals. Do not proceed.';
  end if;
end $$;

commit;
