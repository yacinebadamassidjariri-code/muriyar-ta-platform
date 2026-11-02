-- Phase 3B hardening — MFA enforcement at the database layer for commercial writes.
--
-- Problem:
--   Five tables currently have direct INSERT/UPDATE/DELETE grants to `authenticated`:
--     service_packages, institutional_organizations, commercial_opportunities,
--     commercial_proposals, commercial_contracts
--   This means an AAL1 session that has the `commercial.edit` permission code
--   can bypass require_aal2() by writing directly through PostgREST, bypassing
--   the server action / RPC path entirely.
--
-- Fix:
--   1. Create SECURITY DEFINER RPCs for each entity that call require_aal2()
--      as their first statement.
--   2. Revoke the broad INSERT/UPDATE/DELETE grants on those five tables.
--   3. The server actions in lib/actions/admin/partnerships.ts are updated
--      (in a separate application-code change) to call these RPCs instead of
--      writing directly via the Supabase client.
--
-- Scope of each RPC:
--   - save_organization(p_org_id, fields...)  → insert or update
--   - save_opportunity(p_org_id, fields...)   → insert or update
--   - save_proposal(p_proposal_id, fields...) → insert or update
--   - save_contract(p_contract_id, fields...) → insert or update
--   - save_package(p_package_id, fields...)   → update only (packages pre-seeded)
--
-- NOT YET APPLIED TO PRODUCTION.

begin;

-- ============================================================================
-- 1. save_organization
-- ============================================================================

create or replace function public.save_organization(
  p_org_id              uuid,        -- NULL = create
  p_name                text,
  p_org_type            text         default null,
  p_country             text         default null,
  p_geographic_focus    text         default null,
  p_website             text         default null,
  p_areas_of_interest   text[]       default null,
  p_partnership_status  text         default 'PROSPECT',
  p_next_followup_date  date         default null,
  p_internal_notes      text         default null
)
returns uuid
language plpgsql
security definer
set search_path = public, audit
as $$
declare
  v_id uuid;
begin
  perform public.require_aal2();
  if not public.has_permission('commercial.edit') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_name is null or trim(p_name) = '' then
    raise exception 'name_required' using errcode = '23514';
  end if;

  if p_org_id is not null then
    update public.institutional_organizations set
      name               = p_name,
      org_type           = p_org_type,
      country            = p_country,
      geographic_focus   = p_geographic_focus,
      website            = p_website,
      areas_of_interest  = p_areas_of_interest,
      partnership_status = p_partnership_status::public.org_partnership_status,
      next_followup_date = p_next_followup_date,
      internal_notes     = p_internal_notes,
      updated_at         = now(),
      updated_by         = auth.uid()
    where org_id = p_org_id
    returning org_id into v_id;
    if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  else
    insert into public.institutional_organizations(
      name, org_type, country, geographic_focus, website,
      areas_of_interest, partnership_status, next_followup_date,
      internal_notes, created_by, updated_by
    ) values (
      p_name, p_org_type, p_country, p_geographic_focus, p_website,
      p_areas_of_interest, p_partnership_status::public.org_partnership_status,
      p_next_followup_date, p_internal_notes, auth.uid(), auth.uid()
    ) returning org_id into v_id;
  end if;

  perform audit.write_event(
    case when p_org_id is null then 'commercial.organization.created'
         else 'commercial.organization.updated' end,
    'institutional_organization',
    v_id::text,
    jsonb_build_object('name', p_name, 'status', p_partnership_status)
  );
  return v_id;
end;
$$;

revoke all on function public.save_organization(uuid,text,text,text,text,text,text[],text,date,text)
  from public, anon, authenticated;
grant execute on function public.save_organization(uuid,text,text,text,text,text,text[],text,date,text)
  to authenticated;

-- ============================================================================
-- 2. save_opportunity
-- ============================================================================

create or replace function public.save_opportunity(
  p_opportunity_id      uuid,        -- NULL = create
  p_title               text,
  p_org_id              uuid,
  p_stage               text         default 'LEAD',
  p_research_theme      text         default null,
  p_estimated_value_usd numeric      default null,
  p_expected_close_date date         default null,
  p_package_id          uuid         default null,
  p_next_followup_date  date         default null,
  p_internal_notes      text         default null
)
returns uuid
language plpgsql
security definer
set search_path = public, audit
as $$
declare
  v_id uuid;
begin
  perform public.require_aal2();
  if not public.has_permission('commercial.edit') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_title is null or trim(p_title) = '' then
    raise exception 'title_required' using errcode = '23514';
  end if;
  if p_org_id is null then
    raise exception 'org_required' using errcode = '23514';
  end if;

  if p_opportunity_id is not null then
    update public.commercial_opportunities set
      title                = p_title,
      org_id               = p_org_id,
      stage                = p_stage::public.pipeline_stage,
      research_theme       = p_research_theme,
      estimated_value_usd  = p_estimated_value_usd,
      expected_close_date  = p_expected_close_date,
      package_id           = p_package_id,
      next_followup_date   = p_next_followup_date,
      internal_notes       = p_internal_notes,
      updated_at           = now(),
      updated_by           = auth.uid()
    where opportunity_id = p_opportunity_id
    returning opportunity_id into v_id;
    if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  else
    insert into public.commercial_opportunities(
      title, org_id, stage, research_theme, estimated_value_usd,
      expected_close_date, package_id, next_followup_date,
      internal_notes, created_by, updated_by
    ) values (
      p_title, p_org_id, p_stage::public.pipeline_stage, p_research_theme,
      p_estimated_value_usd, p_expected_close_date, p_package_id,
      p_next_followup_date, p_internal_notes, auth.uid(), auth.uid()
    ) returning opportunity_id into v_id;
  end if;

  perform audit.write_event(
    case when p_opportunity_id is null then 'commercial.opportunity.created'
         else 'commercial.opportunity.updated' end,
    'commercial_opportunity',
    v_id::text,
    jsonb_build_object('title', p_title, 'stage', p_stage)
  );
  return v_id;
end;
$$;

revoke all on function public.save_opportunity(uuid,text,uuid,text,text,numeric,date,uuid,date,text)
  from public, anon, authenticated;
grant execute on function public.save_opportunity(uuid,text,uuid,text,text,numeric,date,uuid,date,text)
  to authenticated;

-- ============================================================================
-- 3. save_proposal
-- ============================================================================

create or replace function public.save_proposal(
  p_proposal_id         uuid,        -- NULL = create
  p_title               text,
  p_org_id              uuid,
  p_status              text         default 'DRAFT',
  p_opportunity_id      uuid         default null,
  p_package_id          uuid         default null,
  p_quoted_price_usd    numeric      default null,
  p_scope_description   text         default null,
  p_deliverables        text         default null,
  p_timeline_weeks      int          default null,
  p_sent_at             date         default null,
  p_internal_notes      text         default null
)
returns uuid
language plpgsql
security definer
set search_path = public, audit
as $$
declare
  v_id     uuid;
  v_number text;
  v_seq    int;
begin
  perform public.require_aal2();
  if not public.has_permission('commercial.edit') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_title is null or trim(p_title) = '' then
    raise exception 'title_required' using errcode = '23514';
  end if;
  if p_org_id is null then
    raise exception 'org_required' using errcode = '23514';
  end if;

  if p_proposal_id is not null then
    update public.commercial_proposals set
      title              = p_title,
      org_id             = p_org_id,
      status             = p_status::public.proposal_status,
      opportunity_id     = p_opportunity_id,
      package_id         = p_package_id,
      quoted_price_usd   = p_quoted_price_usd,
      scope              = p_scope_description,
      deliverables       = p_deliverables,
      timeline           = case when p_timeline_weeks is not null
                                then p_timeline_weeks || ' weeks' else null end,
      sent_at            = p_sent_at::timestamptz,
      internal_notes     = p_internal_notes,
      updated_at         = now(),
      updated_by         = auth.uid()
    where proposal_id = p_proposal_id
    returning proposal_id into v_id;
    if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  else
    -- Auto-generate proposal number: PROP-YYYY-NNNN
    select coalesce(max(
      (regexp_match(proposal_number, '-(\d+)$'))[1]::int
    ), 0) + 1
    into v_seq
    from public.commercial_proposals
    where proposal_number like 'PROP-' || extract(year from now()) || '-%';

    v_number := 'PROP-' || extract(year from now()) || '-' || lpad(v_seq::text, 4, '0');

    insert into public.commercial_proposals(
      proposal_number, title, org_id, status, opportunity_id, package_id,
      quoted_price_usd, scope, deliverables, timeline, sent_at,
      internal_notes, created_by, updated_by
    ) values (
      v_number, p_title, p_org_id, p_status::public.proposal_status,
      p_opportunity_id, p_package_id, p_quoted_price_usd,
      p_scope_description, p_deliverables,
      case when p_timeline_weeks is not null then p_timeline_weeks || ' weeks' else null end,
      p_sent_at::timestamptz, p_internal_notes, auth.uid(), auth.uid()
    ) returning proposal_id into v_id;
  end if;

  perform audit.write_event(
    case when p_proposal_id is null then 'commercial.proposal.created'
         else 'commercial.proposal.updated' end,
    'commercial_proposal',
    v_id::text,
    jsonb_build_object('title', p_title, 'status', p_status)
  );
  return v_id;
end;
$$;

revoke all on function public.save_proposal(uuid,text,uuid,text,uuid,uuid,numeric,text,text,int,date,text)
  from public, anon, authenticated;
grant execute on function public.save_proposal(uuid,text,uuid,text,uuid,uuid,numeric,text,text,int,date,text)
  to authenticated;

-- ============================================================================
-- 4. save_contract
-- ============================================================================

create or replace function public.save_contract(
  p_contract_id         uuid,        -- NULL = create
  p_title               text,
  p_org_id              uuid,
  p_contract_number     text,
  p_contract_value_usd  numeric,
  p_status              text         default 'DRAFT',
  p_opportunity_id      uuid         default null,
  p_proposal_id         uuid         default null,
  p_contract_date       date         default null,
  p_start_date          date         default null,
  p_end_date            date         default null,
  p_deliverables        text         default null,
  p_obligations         text         default null,
  p_internal_notes      text         default null
)
returns uuid
language plpgsql
security definer
set search_path = public, audit
as $$
declare
  v_id uuid;
begin
  perform public.require_aal2();
  if not public.has_permission('commercial.edit') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_title is null or trim(p_title) = '' then
    raise exception 'title_required' using errcode = '23514';
  end if;
  if p_org_id is null then
    raise exception 'org_required' using errcode = '23514';
  end if;
  if p_contract_number is null or trim(p_contract_number) = '' then
    raise exception 'contract_number_required' using errcode = '23514';
  end if;
  if p_contract_value_usd is null or p_contract_value_usd < 0 then
    raise exception 'invalid_contract_value' using errcode = '22023';
  end if;

  if p_contract_id is not null then
    update public.commercial_contracts set
      title                = p_title,
      org_id               = p_org_id,
      contract_number      = p_contract_number,
      contract_value_usd   = p_contract_value_usd,
      status               = p_status::public.contract_status,
      opportunity_id       = p_opportunity_id,
      proposal_id          = p_proposal_id,
      contract_date        = p_contract_date,
      start_date           = p_start_date,
      end_date             = p_end_date,
      deliverables         = p_deliverables,
      obligations          = p_obligations,
      internal_notes       = p_internal_notes,
      updated_at           = now(),
      updated_by           = auth.uid()
    where contract_id = p_contract_id
    returning contract_id into v_id;
    if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  else
    insert into public.commercial_contracts(
      title, org_id, contract_number, contract_value_usd, status,
      opportunity_id, proposal_id, contract_date, start_date, end_date,
      deliverables, obligations, internal_notes, created_by, updated_by
    ) values (
      p_title, p_org_id, p_contract_number, p_contract_value_usd,
      p_status::public.contract_status, p_opportunity_id, p_proposal_id,
      p_contract_date, p_start_date, p_end_date, p_deliverables,
      p_obligations, p_internal_notes, auth.uid(), auth.uid()
    ) returning contract_id into v_id;
  end if;

  perform audit.write_event(
    case when p_contract_id is null then 'commercial.contract.created'
         else 'commercial.contract.updated' end,
    'commercial_contract',
    v_id::text,
    jsonb_build_object('title', p_title, 'status', p_status, 'value_usd', p_contract_value_usd)
  );
  return v_id;
end;
$$;

revoke all on function public.save_contract(uuid,text,uuid,text,numeric,text,uuid,uuid,date,date,date,text,text,text)
  from public, anon, authenticated;
grant execute on function public.save_contract(uuid,text,uuid,text,numeric,text,uuid,uuid,date,date,date,text,text,text)
  to authenticated;

-- ============================================================================
-- 5. save_package (update-only; packages are pre-seeded)
-- ============================================================================

create or replace function public.save_package(
  p_package_id          uuid,
  p_description         text         default null,
  p_deliverables        text         default null,
  p_base_price_usd      numeric      default null,
  p_price_is_provisional boolean     default true,
  p_pricing_notes       text         default null,
  -- Internal cost assumptions: stored but MUST NEVER appear in client outputs.
  p_est_staff_hours     numeric      default null,
  p_est_labor_cost_usd  numeric      default null,
  p_est_overhead_usd    numeric      default null,
  p_is_active           boolean      default true
)
returns void
language plpgsql
security definer
set search_path = public, audit
as $$
begin
  perform public.require_aal2();
  if not public.has_permission('commercial.edit') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_package_id is null then
    raise exception 'package_id_required' using errcode = '23514';
  end if;

  update public.service_packages set
    description          = p_description,
    deliverables         = p_deliverables,
    base_price_usd       = p_base_price_usd,
    price_is_provisional = p_price_is_provisional,
    pricing_notes        = p_pricing_notes,
    est_staff_hours      = p_est_staff_hours,
    est_labor_cost_usd   = p_est_labor_cost_usd,
    est_overhead_usd     = p_est_overhead_usd,
    is_active            = p_is_active,
    updated_at           = now(),
    updated_by           = auth.uid()
  where package_id = p_package_id;

  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;

  perform audit.write_event(
    'commercial.package.updated',
    'service_package',
    p_package_id::text,
    jsonb_build_object(
      'base_price_usd',      p_base_price_usd,
      'price_is_provisional', p_price_is_provisional,
      'is_active',           p_is_active
      -- intentionally omit internal cost fields from audit log
    )
  );
end;
$$;

revoke all on function public.save_package(uuid,text,text,numeric,boolean,text,numeric,numeric,numeric,boolean)
  from public, anon, authenticated;
grant execute on function public.save_package(uuid,text,text,numeric,boolean,text,numeric,numeric,numeric,boolean)
  to authenticated;

-- ============================================================================
-- 6. Revoke the broad direct-write grants that allowed AAL1 bypass
--
--    These tables previously had INSERT/UPDATE/DELETE granted to `authenticated`.
--    All writes must now go through the RPCs above (which enforce require_aal2).
--    READ grants are preserved — they are controlled by the existing RLS policies.
-- ============================================================================

revoke insert, update, delete on
  public.service_packages,
  public.institutional_organizations,
  public.commercial_opportunities,
  public.commercial_proposals,
  public.commercial_contracts
from authenticated;

-- org_contacts and org_contact_history are simpler tables with no financial
-- implications; they retain direct write access since the primary MFA risk
-- was on the commercial and evidence-bearing tables. If they require the same
-- treatment in future, add RPCs here.

commit;
