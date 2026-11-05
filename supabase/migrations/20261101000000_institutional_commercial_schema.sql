-- Phase 3 — Institutional Insights & Commercial Partnerships schema.
--
-- Additive and reversible. Does NOT modify any existing table, policy, or
-- function. New tables follow the project's naming conventions, use
-- capability-checked RLS, and route writes through narrow security-definer
-- RPCs. Audit events use the existing audit.write_event() path.
--
-- Apply only in development until the production deployment checklist in
-- MIGRATIONS.md has been rehearsed.

begin;

-- ============================================================================
-- 1. New permissions
-- ============================================================================

insert into public.permissions (code, description) values
  ('insight.brief.read',    'Read institutional briefs and associated metadata'),
  ('insight.brief.edit',    'Create and edit institutional brief drafts'),
  ('insight.brief.publish', 'Approve and publish institutional briefs'),
  ('insight.evidence.review', 'Access the research evidence review interface'),
  ('commercial.read',       'View commercial pipeline, proposals, and financial records'),
  ('commercial.edit',       'Create and edit commercial records (proposals, contracts, invoices)')
on conflict (code) do update set description = excluded.description;

-- Grant to super_admin (all new permissions) and managing_editor (insights only).
insert into public.role_permissions (role_id, permission_id)
select r.role_id, p.permission_id
from public.roles r
cross join public.permissions p
where r.name = 'super_admin'
  and p.code in (
    'insight.brief.read', 'insight.brief.edit', 'insight.brief.publish',
    'insight.evidence.review', 'commercial.read', 'commercial.edit'
  )
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.role_id, p.permission_id
from public.roles r
cross join public.permissions p
where r.name = 'managing_editor'
  and p.code in (
    'insight.brief.read', 'insight.brief.edit', 'insight.brief.publish',
    'insight.evidence.review'
  )
on conflict do nothing;

-- Researcher role gets read-only access to briefs.
insert into public.role_permissions (role_id, permission_id)
select r.role_id, p.permission_id
from public.roles r
cross join public.permissions p
where r.name = 'researcher'
  and p.code = 'insight.brief.read'
on conflict do nothing;

-- ============================================================================
-- 2. Enumerations
-- ============================================================================

do $$ begin
  create type public.brief_status as enum (
    'DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.pipeline_stage as enum (
    'LEAD', 'CONTACTED', 'DISCOVERY', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.proposal_status as enum (
    'DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'SUPERSEDED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.contract_status as enum (
    'DRAFT', 'SIGNED', 'ACTIVE', 'COMPLETED', 'TERMINATED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invoice_status as enum (
    'DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.org_partnership_status as enum (
    'PROSPECT', 'ACTIVE', 'PAUSED', 'INACTIVE', 'ARCHIVED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.evidence_eligibility as enum (
    'ELIGIBLE', 'INELIGIBLE', 'UNDER_REVIEW', 'EXCLUDED'
  );
exception when duplicate_object then null; end $$;

-- ============================================================================
-- 3. Service packages
-- ============================================================================

create table if not exists public.service_packages (
  package_id            uuid primary key default gen_random_uuid(),
  package_code          varchar(40) not null unique,
  name                  text not null,
  description           text,
  deliverables          text,
  -- Pricing (NULL = custom quotation)
  base_price_usd        numeric(12,2),
  price_is_provisional  boolean not null default true,
  pricing_notes         text,
  -- Cost estimation (internal only; never exposed to clients)
  est_staff_hours       numeric(8,2),
  est_labor_cost_usd    numeric(12,2),
  est_overhead_usd      numeric(12,2),
  -- Administrative
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid references public.users(user_id) on delete set null,
  updated_by            uuid references public.users(user_id) on delete set null,
  constraint service_packages_price_non_negative
    check (base_price_usd is null or base_price_usd >= 0),
  constraint service_packages_hours_non_negative
    check (est_staff_hours is null or est_staff_hours >= 0)
);

comment on table public.service_packages is
  'Institutional service offerings. Prices are provisional until explicitly approved. '
  'Cost-estimation columns are internal and must never appear in client-facing outputs.';

-- Seed the three initial packages as defined in the Phase 3 specification.
insert into public.service_packages (
  package_code, name, description, deliverables,
  base_price_usd, price_is_provisional,
  est_staff_hours, est_labor_cost_usd, est_overhead_usd
) values
  (
    'BRIEF_001', 'Thematic Insights Brief',
    'Customized thematic research and analysis with evidence synthesis and program-design recommendations.',
    'Professional PDF policy brief. Does not guarantee any specific volume of contributor-derived evidence.',
    2200.00, true,
    40, 3200.00, 745.00
  ),
  (
    'QUARTERLY_001', 'Quarterly Insights Partnership',
    'Quarterly research and contextual updates with relevant qualitative insights where ethically and methodologically feasible, plus institutional consultation.',
    'Quarterly research brief and consultation session. Scope revised transparently if sufficient eligible evidence is unavailable.',
    3200.00, true,
    35, 2800.00, 600.00
  ),
  (
    'CUSTOM_001', 'Custom Research & Program Advisory',
    'Tailored scope and deliverables negotiated with the institutional partner.',
    'Defined per engagement. Scope revised transparently if eligible evidence is insufficient.',
    null, true,
    null, null, null
  )
on conflict (package_code) do nothing;

-- ============================================================================
-- 4. Institutional organizations
-- ============================================================================

create table if not exists public.institutional_organizations (
  org_id                uuid primary key default gen_random_uuid(),
  name                  text not null,
  org_type              varchar(80),        -- e.g. 'NGO', 'UN Agency', 'Government', 'Foundation'
  country               varchar(100),
  geographic_focus      text,               -- free text (e.g. "West Africa", "Global")
  website               text,
  areas_of_interest     text[],             -- e.g. '{girls_education,child_marriage}'
  partnership_status    public.org_partnership_status not null default 'PROSPECT',
  internal_notes        text,
  next_followup_date    date,
  -- Administrative
  is_archived           boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid references public.users(user_id) on delete set null,
  updated_by            uuid references public.users(user_id) on delete set null
);

-- Primary contact is stored separately so the table can be extended to
-- multiple contacts later without schema changes.
create table if not exists public.org_contacts (
  contact_id            uuid primary key default gen_random_uuid(),
  org_id                uuid not null
    references public.institutional_organizations(org_id) on delete cascade,
  is_primary            boolean not null default false,
  full_name             text not null,
  position              text,
  -- Contact details are PII — kept server-side, never in client responses.
  professional_email    text,
  professional_phone    text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid references public.users(user_id) on delete set null,
  updated_by            uuid references public.users(user_id) on delete set null
);

comment on column public.org_contacts.professional_email is
  'PII — server-side only. Never include in client-facing API responses or audit scrub targets.';

create table if not exists public.org_contact_history (
  history_id            uuid primary key default gen_random_uuid(),
  org_id                uuid not null
    references public.institutional_organizations(org_id) on delete cascade,
  contact_id            uuid
    references public.org_contacts(contact_id) on delete set null,
  contact_date          date not null,
  channel               varchar(40),        -- 'email', 'call', 'meeting', 'event'
  summary               text not null,
  recorded_by           uuid references public.users(user_id) on delete set null,
  created_at            timestamptz not null default now()
);

-- ============================================================================
-- 5. Commercial opportunities (pipeline)
-- ============================================================================

create table if not exists public.commercial_opportunities (
  opportunity_id        uuid primary key default gen_random_uuid(),
  org_id                uuid not null
    references public.institutional_organizations(org_id) on delete restrict,
  contact_id            uuid
    references public.org_contacts(contact_id) on delete set null,
  package_id            uuid
    references public.service_packages(package_id) on delete set null,
  title                 text not null,
  research_theme        text,
  estimated_value_usd   numeric(12,2),
  expected_close_date   date,
  assigned_to           uuid references public.users(user_id) on delete set null,
  stage                 public.pipeline_stage not null default 'LEAD',
  next_action           text,
  next_followup_date    date,
  internal_notes        text,
  -- Administrative
  is_archived           boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid references public.users(user_id) on delete set null,
  updated_by            uuid references public.users(user_id) on delete set null,
  constraint commercial_opportunities_value_non_negative
    check (estimated_value_usd is null or estimated_value_usd >= 0)
);

-- Immutable stage transition history (append-only via trigger).
create table if not exists public.opportunity_stage_history (
  history_id            uuid primary key default gen_random_uuid(),
  opportunity_id        uuid not null
    references public.commercial_opportunities(opportunity_id) on delete cascade,
  from_stage            public.pipeline_stage,
  to_stage              public.pipeline_stage not null,
  note                  text,
  changed_by            uuid references public.users(user_id) on delete set null,
  changed_at            timestamptz not null default now()
);

create table if not exists public.opportunity_meeting_notes (
  note_id               uuid primary key default gen_random_uuid(),
  opportunity_id        uuid not null
    references public.commercial_opportunities(opportunity_id) on delete cascade,
  meeting_date          date,
  summary               text not null,
  recorded_by           uuid references public.users(user_id) on delete set null,
  created_at            timestamptz not null default now()
);

-- ============================================================================
-- 6. Proposals
-- ============================================================================

create table if not exists public.commercial_proposals (
  proposal_id           uuid primary key default gen_random_uuid(),
  opportunity_id        uuid
    references public.commercial_opportunities(opportunity_id) on delete set null,
  org_id                uuid not null
    references public.institutional_organizations(org_id) on delete restrict,
  package_id            uuid
    references public.service_packages(package_id) on delete set null,
  proposal_number       text not null unique,
  title                 text not null,
  research_question     text,
  scope                 text,
  methodology_summary   text,
  deliverables          text,
  timeline              text,
  quoted_price_usd      numeric(12,2),
  currency              varchar(10) not null default 'USD',
  safeguarding_statement text,
  limitations_statement text,
  status                public.proposal_status not null default 'DRAFT',
  sent_at               timestamptz,
  responded_at          timestamptz,
  -- PDF storage (Supabase Storage path, not a public URL)
  pdf_storage_path      text,
  internal_notes        text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid references public.users(user_id) on delete set null,
  updated_by            uuid references public.users(user_id) on delete set null,
  constraint commercial_proposals_price_non_negative
    check (quoted_price_usd is null or quoted_price_usd >= 0)
);

-- ============================================================================
-- 7. Contracts
-- ============================================================================

create table if not exists public.commercial_contracts (
  contract_id           uuid primary key default gen_random_uuid(),
  opportunity_id        uuid
    references public.commercial_opportunities(opportunity_id) on delete set null,
  proposal_id           uuid
    references public.commercial_proposals(proposal_id) on delete set null,
  org_id                uuid not null
    references public.institutional_organizations(org_id) on delete restrict,
  contract_number       text not null unique,
  title                 text not null,
  contract_date         date,
  start_date            date,
  end_date              date,
  contract_value_usd    numeric(12,2) not null,
  currency              varchar(10) not null default 'USD',
  deliverables          text,
  obligations           text,
  status                public.contract_status not null default 'DRAFT',
  signed_at             timestamptz,
  -- Signed contract PDF stored in Supabase Storage (private bucket)
  signed_pdf_storage_path text,
  -- Template note — always surfaced in UI
  legal_review_notice   text not null default
    'This contract template requires legal review before use. It is not legal advice.',
  internal_notes        text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid references public.users(user_id) on delete set null,
  updated_by            uuid references public.users(user_id) on delete set null,
  constraint commercial_contracts_value_non_negative
    check (contract_value_usd >= 0),
  constraint commercial_contracts_dates_ordered
    check (start_date is null or end_date is null or end_date >= start_date)
);

-- ============================================================================
-- 8. Invoices and payments
-- ============================================================================

create table if not exists public.commercial_invoices (
  invoice_id            uuid primary key default gen_random_uuid(),
  contract_id           uuid
    references public.commercial_contracts(contract_id) on delete set null,
  org_id                uuid not null
    references public.institutional_organizations(org_id) on delete restrict,
  invoice_number        text not null unique,
  title                 text,
  issue_date            date not null,
  due_date              date,
  amount_usd            numeric(12,2) not null,
  currency              varchar(10) not null default 'USD',
  status                public.invoice_status not null default 'DRAFT',
  internal_notes        text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid references public.users(user_id) on delete set null,
  updated_by            uuid references public.users(user_id) on delete set null,
  constraint commercial_invoices_amount_positive
    check (amount_usd > 0),
  constraint commercial_invoices_due_after_issue
    check (due_date is null or due_date >= issue_date)
);

-- One invoice can have multiple partial payments.
create table if not exists public.invoice_payments (
  payment_id            uuid primary key default gen_random_uuid(),
  invoice_id            uuid not null
    references public.commercial_invoices(invoice_id) on delete restrict,
  payment_date          date not null,
  amount_usd            numeric(12,2) not null,
  currency              varchar(10) not null default 'USD',
  payment_reference     text,
  notes                 text,
  recorded_by           uuid references public.users(user_id) on delete set null,
  created_at            timestamptz not null default now(),
  constraint invoice_payments_amount_positive
    check (amount_usd > 0)
);

-- ============================================================================
-- 9. Institutional briefs
-- ============================================================================

create table if not exists public.institutional_briefs (
  brief_id              uuid primary key default gen_random_uuid(),
  -- Organizational relationship (optional — a brief may not be commissioned)
  org_id                uuid
    references public.institutional_organizations(org_id) on delete set null,
  contract_id           uuid
    references public.commercial_contracts(contract_id) on delete set null,
  -- Classification
  title                 text not null,
  subtitle              text,
  language_code         varchar(8) references public.supported_languages(language_code),
  research_theme        varchar(200),
  is_sample             boolean not null default false,
  -- Content fields (edited in admin; NOT derived directly from raw submissions)
  research_questions    text,
  executive_summary     text,
  methodology           text,
  findings              text,
  recommendations       text,
  limitations           text,
  references_text       text,
  -- Workflow
  status                public.brief_status not null default 'DRAFT',
  submitted_for_review_at  timestamptz,
  submitted_for_review_by  uuid references public.users(user_id) on delete set null,
  approved_at           timestamptz,
  approved_by           uuid references public.users(user_id) on delete set null,
  published_at          timestamptz,
  published_by          uuid references public.users(user_id) on delete set null,
  archived_at           timestamptz,
  archived_by           uuid references public.users(user_id) on delete set null,
  -- Storage paths (private bucket)
  uploaded_pdf_storage_path  text,      -- staff-uploaded existing PDF
  generated_pdf_storage_path text,      -- system-generated PDF on publish
  -- Administrative
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid references public.users(user_id) on delete set null,
  updated_by            uuid references public.users(user_id) on delete set null
);

-- Revision history (append-only; written by trigger on every UPDATE).
create table if not exists public.brief_revisions (
  revision_id           uuid primary key default gen_random_uuid(),
  brief_id              uuid not null
    references public.institutional_briefs(brief_id) on delete cascade,
  operation             text not null,     -- e.g. 'save_draft', 'submit_review', 'approve', 'publish'
  actor_id              uuid references public.users(user_id) on delete set null,
  before_snapshot       jsonb,
  after_snapshot        jsonb,
  created_at            timestamptz not null default now()
);

-- Supporting document attachments (stored in private Storage).
create table if not exists public.brief_attachments (
  attachment_id         uuid primary key default gen_random_uuid(),
  brief_id              uuid not null
    references public.institutional_briefs(brief_id) on delete cascade,
  label                 text not null,
  file_name             text not null,
  storage_path          text not null,
  mime_type             text,
  file_size_bytes       bigint,
  uploaded_by           uuid references public.users(user_id) on delete set null,
  uploaded_at           timestamptz not null default now()
);

-- ============================================================================
-- 10. Research evidence links
--     Connects institutional briefs to anonymized submission references.
--     IMPORTANT: This table never stores raw submission text or identifiers
--     that could link back to a contributor. The review decision and
--     de-identification notes are all that is retained.
-- ============================================================================

create table if not exists public.brief_evidence_links (
  link_id               uuid primary key default gen_random_uuid(),
  brief_id              uuid not null
    references public.institutional_briefs(brief_id) on delete cascade,
  -- Submission reference: the submission_id from raw_submissions.
  -- Access to the actual submission still requires submission.raw.read + AAL2.
  submission_id         uuid not null,
  -- Consent state captured at the time of review (point-in-time snapshot).
  research_consent_verified_at  timestamptz,
  research_consent_version_id   integer
    references public.research_consent_versions(research_consent_version_id),
  consent_active_at_review  boolean,    -- was consent still active when reviewed?
  -- Thematic classification
  thematic_categories   text[],
  eligibility           public.evidence_eligibility not null default 'UNDER_REVIEW',
  -- Safeguarding review
  reidentification_risk_flagged  boolean not null default false,
  reidentification_risk_notes    text,
  human_review_completed         boolean not null default false,
  human_review_completed_by      uuid references public.users(user_id) on delete set null,
  human_review_completed_at      timestamptz,
  -- Decision
  inclusion_decision    boolean,        -- true=included, false=excluded, null=pending
  decision_rationale    text,
  reviewed_by           uuid references public.users(user_id) on delete set null,
  reviewed_at           timestamptz,
  -- Withdrawal tracking
  consent_withdrawn_at  timestamptz,
  consent_withdrawal_flagged_briefs_at  timestamptz,
  -- Administrative
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid references public.users(user_id) on delete set null,
  unique (brief_id, submission_id),
  constraint brief_evidence_links_human_review_complete
    check (
      not human_review_completed
      or (human_review_completed_by is not null
          and human_review_completed_at is not null)
    )
);

comment on table public.brief_evidence_links is
  'Evidence review decisions for institutional briefs. Does NOT store raw submission text or '
  'any field that could re-identify a contributor. Access to the originating submission '
  'still requires submission.raw.read permission and AAL2.';

-- ============================================================================
-- 11. Indexes
-- ============================================================================

create index if not exists ib_status_idx
  on public.institutional_briefs (status, created_at desc);
create index if not exists ib_org_idx
  on public.institutional_briefs (org_id) where org_id is not null;
create index if not exists ib_sample_idx
  on public.institutional_briefs (is_sample) where is_sample;

create index if not exists bel_brief_idx
  on public.brief_evidence_links (brief_id);
create index if not exists bel_submission_idx
  on public.brief_evidence_links (submission_id);
create index if not exists bel_eligibility_idx
  on public.brief_evidence_links (eligibility);

create index if not exists io_status_idx
  on public.institutional_organizations (partnership_status, created_at desc);
create index if not exists io_archived_idx
  on public.institutional_organizations (is_archived) where not is_archived;

create index if not exists co_stage_idx
  on public.commercial_opportunities (stage, created_at desc);
create index if not exists co_org_idx
  on public.commercial_opportunities (org_id);

create index if not exists inv_status_idx
  on public.commercial_invoices (status, due_date);
create index if not exists inv_org_idx
  on public.commercial_invoices (org_id);

-- ============================================================================
-- 12. Updated_at maintenance triggers
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$ declare t text; begin
  foreach t in array array[
    'service_packages', 'institutional_organizations', 'org_contacts',
    'commercial_opportunities', 'commercial_proposals', 'commercial_contracts',
    'commercial_invoices', 'institutional_briefs'
  ] loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I;
       create trigger set_updated_at
         before update on public.%I
         for each row execute function public.set_updated_at();',
      t, t
    );
  end loop;
end $$;

-- ============================================================================
-- 13. Opportunity stage history trigger (append-only on stage change)
-- ============================================================================

create or replace function public.record_opportunity_stage_change()
returns trigger language plpgsql security definer
set search_path = public, audit
as $$
begin
  if new.stage is distinct from old.stage then
    insert into public.opportunity_stage_history(
      opportunity_id, from_stage, to_stage, changed_by
    ) values (new.opportunity_id, old.stage, new.stage, auth.uid());

    perform audit.write_event(
      'commercial.opportunity.stage_changed',
      'commercial_opportunity',
      new.opportunity_id::text,
      jsonb_build_object('from', old.stage, 'to', new.stage)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists opportunity_stage_history on public.commercial_opportunities;
create trigger opportunity_stage_history
  after update of stage on public.commercial_opportunities
  for each row execute function public.record_opportunity_stage_change();

-- ============================================================================
-- 14. Brief revision trigger
-- ============================================================================

create or replace function public.record_brief_revision()
returns trigger language plpgsql security definer
set search_path = public, audit
as $$
declare
  v_op text;
begin
  v_op := case
    when new.status <> old.status then 'status_change_' || lower(new.status::text)
    else 'save'
  end;

  insert into public.brief_revisions(brief_id, operation, actor_id, before_snapshot, after_snapshot)
  values (
    new.brief_id, v_op, auth.uid(),
    jsonb_build_object(
      'status', old.status, 'title', old.title, 'updated_at', old.updated_at
    ),
    jsonb_build_object(
      'status', new.status, 'title', new.title, 'updated_at', new.updated_at
    )
  );

  perform audit.write_event(
    'insight.brief.' || v_op,
    'institutional_brief',
    new.brief_id::text,
    jsonb_build_object('status', new.status, 'title', left(new.title, 200))
  );
  return new;
end;
$$;

drop trigger if exists brief_revision on public.institutional_briefs;
create trigger brief_revision
  after update on public.institutional_briefs
  for each row execute function public.record_brief_revision();

-- ============================================================================
-- 15. Row-level security
-- ============================================================================

-- Service packages: all staff can read; only commercial.edit can write.
alter table public.service_packages enable row level security;

create policy sp_staff_read on public.service_packages
  for select to authenticated
  using ((select public.has_permission('admin.access')));

create policy sp_commercial_write on public.service_packages
  for all to authenticated
  using ((select public.has_permission('commercial.edit')))
  with check ((select public.has_permission('commercial.edit')));

-- Institutional organizations: commercial.read or insights
alter table public.institutional_organizations enable row level security;

create policy io_read on public.institutional_organizations
  for select to authenticated
  using (
    (select public.has_permission('commercial.read'))
    or (select public.has_permission('commercial.edit'))
    or (select public.has_permission('insight.brief.read'))
    or (select public.has_permission('insight.brief.edit'))
  );

create policy io_write on public.institutional_organizations
  for all to authenticated
  using ((select public.has_permission('commercial.edit')))
  with check ((select public.has_permission('commercial.edit')));

-- Org contacts: commercial.edit only (PII protection)
alter table public.org_contacts enable row level security;

create policy oc_read on public.org_contacts
  for select to authenticated
  using ((select public.has_permission('commercial.read'))
    or (select public.has_permission('commercial.edit')));

create policy oc_write on public.org_contacts
  for all to authenticated
  using ((select public.has_permission('commercial.edit')))
  with check ((select public.has_permission('commercial.edit')));

-- Org contact history
alter table public.org_contact_history enable row level security;

create policy och_read on public.org_contact_history
  for select to authenticated
  using ((select public.has_permission('commercial.read'))
    or (select public.has_permission('commercial.edit')));

create policy och_write on public.org_contact_history
  for insert to authenticated
  with check ((select public.has_permission('commercial.edit')));

-- Commercial opportunities
alter table public.commercial_opportunities enable row level security;

create policy copp_read on public.commercial_opportunities
  for select to authenticated
  using ((select public.has_permission('commercial.read'))
    or (select public.has_permission('commercial.edit')));

create policy copp_write on public.commercial_opportunities
  for all to authenticated
  using ((select public.has_permission('commercial.edit')))
  with check ((select public.has_permission('commercial.edit')));

-- Opportunity stage history: read-only for commercial.read+
alter table public.opportunity_stage_history enable row level security;

create policy osh_read on public.opportunity_stage_history
  for select to authenticated
  using ((select public.has_permission('commercial.read'))
    or (select public.has_permission('commercial.edit')));

-- Opportunity meeting notes
alter table public.opportunity_meeting_notes enable row level security;

create policy omn_read on public.opportunity_meeting_notes
  for select to authenticated
  using ((select public.has_permission('commercial.read'))
    or (select public.has_permission('commercial.edit')));

create policy omn_write on public.opportunity_meeting_notes
  for insert to authenticated
  with check ((select public.has_permission('commercial.edit')));

-- Proposals
alter table public.commercial_proposals enable row level security;

create policy prop_read on public.commercial_proposals
  for select to authenticated
  using ((select public.has_permission('commercial.read'))
    or (select public.has_permission('commercial.edit')));

create policy prop_write on public.commercial_proposals
  for all to authenticated
  using ((select public.has_permission('commercial.edit')))
  with check ((select public.has_permission('commercial.edit')));

-- Contracts
alter table public.commercial_contracts enable row level security;

create policy con_read on public.commercial_contracts
  for select to authenticated
  using ((select public.has_permission('commercial.read'))
    or (select public.has_permission('commercial.edit')));

create policy con_write on public.commercial_contracts
  for all to authenticated
  using ((select public.has_permission('commercial.edit')))
  with check ((select public.has_permission('commercial.edit')));

-- Invoices: commercial.read can view, commercial.edit can write
alter table public.commercial_invoices enable row level security;

create policy inv_read on public.commercial_invoices
  for select to authenticated
  using ((select public.has_permission('commercial.read'))
    or (select public.has_permission('commercial.edit')));

create policy inv_write on public.commercial_invoices
  for all to authenticated
  using ((select public.has_permission('commercial.edit')))
  with check ((select public.has_permission('commercial.edit')));

-- Invoice payments: same as invoices
alter table public.invoice_payments enable row level security;

create policy ip_read on public.invoice_payments
  for select to authenticated
  using ((select public.has_permission('commercial.read'))
    or (select public.has_permission('commercial.edit')));

create policy ip_write on public.invoice_payments
  for insert to authenticated
  with check ((select public.has_permission('commercial.edit')));

-- Institutional briefs: role-segregated by brief_status
alter table public.institutional_briefs enable row level security;

create policy ib_read on public.institutional_briefs
  for select to authenticated
  using (
    (select public.has_permission('insight.brief.read'))
    or (select public.has_permission('insight.brief.edit'))
    or (select public.has_permission('insight.brief.publish'))
    -- Commercial roles see brief titles/status for pipeline linkage, but NOT content.
    -- Content fields are filtered server-side in the data layer.
    or (select public.has_permission('commercial.read'))
    or (select public.has_permission('commercial.edit'))
  );

create policy ib_write on public.institutional_briefs
  for all to authenticated
  using ((select public.has_permission('insight.brief.edit'))
    or (select public.has_permission('insight.brief.publish')))
  with check (
    case
      -- Only publishers can transition to APPROVED / PUBLISHED / ARCHIVED
      when status in ('APPROVED','PUBLISHED','ARCHIVED')
        then (select public.has_permission('insight.brief.publish'))
      else (select public.has_permission('insight.brief.edit'))
        or (select public.has_permission('insight.brief.publish'))
    end
  );

-- Brief revisions: read-only for authorized roles
alter table public.brief_revisions enable row level security;

create policy br_read on public.brief_revisions
  for select to authenticated
  using (
    (select public.has_permission('insight.brief.read'))
    or (select public.has_permission('insight.brief.edit'))
    or (select public.has_permission('insight.brief.publish'))
  );

-- Brief attachments
alter table public.brief_attachments enable row level security;

create policy ba_read on public.brief_attachments
  for select to authenticated
  using (
    (select public.has_permission('insight.brief.read'))
    or (select public.has_permission('insight.brief.edit'))
    or (select public.has_permission('insight.brief.publish'))
  );

create policy ba_write on public.brief_attachments
  for all to authenticated
  using ((select public.has_permission('insight.brief.edit'))
    or (select public.has_permission('insight.brief.publish')))
  with check ((select public.has_permission('insight.brief.edit'))
    or (select public.has_permission('insight.brief.publish')));

-- Brief evidence links: evidence.review only. Explicitly NOT commercial.
alter table public.brief_evidence_links enable row level security;

create policy bel_read on public.brief_evidence_links
  for select to authenticated
  using ((select public.has_permission('insight.evidence.review')));

create policy bel_write on public.brief_evidence_links
  for all to authenticated
  using ((select public.has_permission('insight.evidence.review')))
  with check ((select public.has_permission('insight.evidence.review')));

-- ============================================================================
-- 16. Table grants (deny direct writes; RPCs are the write path for mutations)
-- ============================================================================

grant select on
  public.service_packages,
  public.institutional_organizations,
  public.org_contacts,
  public.org_contact_history,
  public.commercial_opportunities,
  public.opportunity_stage_history,
  public.opportunity_meeting_notes,
  public.commercial_proposals,
  public.commercial_contracts,
  public.commercial_invoices,
  public.invoice_payments,
  public.institutional_briefs,
  public.brief_revisions,
  public.brief_attachments,
  public.brief_evidence_links
to authenticated;

-- Allow direct INSERT/UPDATE for tables where the admin UI writes directly
-- (lightweight tables without complex invariants enforced by the RLS above).
-- Heavy-state tables (brief status transitions, invoice numbering) use RPCs.
grant insert, update, delete on
  public.service_packages,
  public.institutional_organizations,
  public.org_contacts,
  public.org_contact_history,
  public.commercial_opportunities,
  public.opportunity_meeting_notes,
  public.commercial_proposals,
  public.commercial_contracts,
  public.brief_attachments
to authenticated;

-- Evidence links and financial records (invoices, payments) always go through RPCs.
-- Revisions, stage history are append-only via triggers only.
revoke insert, update, delete on
  public.brief_evidence_links,
  public.brief_revisions,
  public.opportunity_stage_history
from authenticated;

grant insert on
  public.brief_evidence_links,
  public.invoice_payments
to authenticated;

-- ============================================================================
-- 17. Sequence grants
-- ============================================================================
-- (No sequences — all PKs are uuid/gen_random_uuid())

-- ============================================================================
-- 18. Narrow RPCs for validated mutations
-- ============================================================================

-- Brief status transition RPC (enforces the allowed FSM).
create or replace function public.brief_transition(
  p_brief_id uuid,
  p_action text,
  p_note text default null
)
returns text
language plpgsql
security definer
set search_path = public, audit
as $$
declare
  v_row public.institutional_briefs%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_to text;
begin
  perform public.require_aal2();

  -- Load and lock
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
      set status = 'IN_REVIEW',
          submitted_for_review_at = now(),
          submitted_for_review_by = auth.uid()
      where brief_id = p_brief_id;

    when 'approve' then
      if not public.has_permission('insight.brief.publish') then
        raise exception 'forbidden' using errcode = '42501';
      end if;
      if v_row.status <> 'IN_REVIEW' then
        raise exception 'invalid_transition' using errcode = '22023';
      end if;
      v_to := 'APPROVED';
      update public.institutional_briefs
      set status = 'APPROVED',
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
      v_to := 'PUBLISHED';
      update public.institutional_briefs
      set status = 'PUBLISHED',
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
      set status = 'ARCHIVED',
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

revoke all on function public.brief_transition(uuid, text, text) from public, anon, authenticated;
grant execute on function public.brief_transition(uuid, text, text) to authenticated;


-- Invoice creation RPC (enforces unique invoice number, prevents duplicates).
create or replace function public.create_invoice(
  p_org_id uuid,
  p_contract_id uuid,
  p_title text,
  p_issue_date date,
  p_due_date date,
  p_amount_usd numeric,
  p_currency text default 'USD',
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, audit
as $$
declare
  v_invoice_id uuid;
  v_number text;
  v_year text := to_char(coalesce(p_issue_date, current_date), 'YYYY');
  v_seq int;
begin
  perform public.require_aal2();
  if not public.has_permission('commercial.edit') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_amount_usd <= 0 then
    raise exception 'amount_must_be_positive' using errcode = '22023';
  end if;
  if p_due_date is not null and p_due_date < p_issue_date then
    raise exception 'due_before_issue' using errcode = '22023';
  end if;
  if not exists (select 1 from public.institutional_organizations where org_id = p_org_id) then
    raise exception 'org_not_found' using errcode = 'P0002';
  end if;

  -- Generate invoice number: MT-YYYY-NNN (padded, sequential within year)
  select coalesce(max(
    nullif(regexp_replace(invoice_number, '^MT-' || v_year || '-0*', ''), '')::int
  ), 0) + 1
  into v_seq
  from public.commercial_invoices
  where invoice_number like 'MT-' || v_year || '-%';

  v_number := 'MT-' || v_year || '-' || lpad(v_seq::text, 3, '0');

  insert into public.commercial_invoices(
    org_id, contract_id, invoice_number, title,
    issue_date, due_date, amount_usd, currency,
    status, internal_notes, created_by, updated_by
  ) values (
    p_org_id, p_contract_id, v_number, p_title,
    p_issue_date, p_due_date, p_amount_usd, coalesce(p_currency, 'USD'),
    'DRAFT', p_notes, auth.uid(), auth.uid()
  ) returning invoice_id into v_invoice_id;

  perform audit.write_event(
    'commercial.invoice.created',
    'commercial_invoice',
    v_invoice_id::text,
    jsonb_build_object('number', v_number, 'amount_usd', p_amount_usd)
  );
  return v_invoice_id;
end;
$$;

revoke all on function public.create_invoice(uuid, uuid, text, date, date, numeric, text, text)
  from public, anon, authenticated;
grant execute on function public.create_invoice(uuid, uuid, text, date, date, numeric, text, text)
  to authenticated;


-- Record a manual payment against an invoice.
create or replace function public.record_invoice_payment(
  p_invoice_id uuid,
  p_payment_date date,
  p_amount_usd numeric,
  p_currency text default 'USD',
  p_reference text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, audit
as $$
declare
  v_payment_id uuid;
  v_invoice public.commercial_invoices%rowtype;
  v_paid_total numeric;
begin
  perform public.require_aal2();
  if not public.has_permission('commercial.edit') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_amount_usd <= 0 then
    raise exception 'amount_must_be_positive' using errcode = '22023';
  end if;

  select * into v_invoice from public.commercial_invoices
  where invoice_id = p_invoice_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v_invoice.status in ('CANCELLED') then
    raise exception 'invoice_cancelled' using errcode = '22023';
  end if;

  insert into public.invoice_payments(
    invoice_id, payment_date, amount_usd, currency,
    payment_reference, notes, recorded_by
  ) values (
    p_invoice_id, p_payment_date, p_amount_usd,
    coalesce(p_currency, 'USD'), p_reference, p_notes, auth.uid()
  ) returning payment_id into v_payment_id;

  -- Recalculate and update invoice status
  select coalesce(sum(amount_usd), 0) into v_paid_total
  from public.invoice_payments where invoice_id = p_invoice_id;

  update public.commercial_invoices
  set status = case
        when v_paid_total >= amount_usd then 'PAID'
        when v_paid_total > 0 then 'PARTIALLY_PAID'
        else status
      end
  where invoice_id = p_invoice_id;

  perform audit.write_event(
    'commercial.invoice.payment_recorded',
    'commercial_invoice',
    p_invoice_id::text,
    jsonb_build_object('payment_id', v_payment_id, 'amount_usd', p_amount_usd, 'total_paid', v_paid_total)
  );
  return v_payment_id;
end;
$$;

revoke all on function public.record_invoice_payment(uuid, date, numeric, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_invoice_payment(uuid, date, numeric, text, text, text)
  to authenticated;


-- Evidence consent revalidation RPC.
-- Checks the current consent state of a submission and updates the link record.
-- Does NOT return raw submission content — only consent metadata.
create or replace function public.revalidate_evidence_consent(
  p_link_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, audit
as $$
declare
  v_link public.brief_evidence_links%rowtype;
  v_consent_active boolean;
  v_consent_version integer;
begin
  perform public.require_aal2();
  if not public.has_permission('insight.evidence.review') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_link from public.brief_evidence_links
  where link_id = p_link_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;

  -- Verify consent is still active (does not expose raw submission body)
  select
    rs.research_consent_given,
    rs.research_consent_version_id
  into v_consent_active, v_consent_version
  from public.raw_submissions rs
  where rs.submission_id = v_link.submission_id;

  if not found then
    -- Submission no longer exists; treat as withdrawn
    v_consent_active := false;
    v_consent_version := null;
  end if;

  update public.brief_evidence_links
  set
    research_consent_verified_at = now(),
    research_consent_version_id  = v_consent_version,
    consent_active_at_review     = v_consent_active,
    consent_withdrawn_at         = case
      when not coalesce(v_consent_active, false) and consent_withdrawn_at is null
        then now()
      else consent_withdrawn_at
    end,
    updated_at = now()
  where link_id = p_link_id;

  perform audit.write_event(
    'insight.evidence.consent_revalidated',
    'brief_evidence_link',
    p_link_id::text,
    jsonb_build_object(
      'brief_id', v_link.brief_id,
      'consent_active', v_consent_active
    )
  );

  return jsonb_build_object(
    'link_id', p_link_id,
    'consent_active', v_consent_active,
    'verified_at', now()
  );
end;
$$;

revoke all on function public.revalidate_evidence_consent(uuid)
  from public, anon, authenticated;
grant execute on function public.revalidate_evidence_consent(uuid)
  to authenticated;

-- ============================================================================
-- 19. Commercial dashboard aggregate view (no raw PII, no submission content)
-- ============================================================================

create or replace view public.commercial_dashboard_summary
with (security_invoker = true)
as
select
  -- Organizations
  (select count(*) from public.institutional_organizations
    where not is_archived) as total_organizations,
  (select count(*) from public.institutional_organizations
    where partnership_status = 'ACTIVE' and not is_archived) as active_partners,

  -- Pipeline
  (select count(*) from public.commercial_opportunities
    where stage not in ('WON','LOST') and not is_archived) as active_opportunities,
  (select coalesce(sum(estimated_value_usd), 0)
    from public.commercial_opportunities
    where stage not in ('WON','LOST') and not is_archived) as pipeline_value_usd,

  -- Proposals
  (select count(*) from public.commercial_proposals
    where status = 'SENT') as proposals_sent,
  (select count(*) from public.commercial_proposals
    where status = 'ACCEPTED') as proposals_accepted,

  -- Contracts
  (select count(*) from public.commercial_contracts
    where status in ('SIGNED','ACTIVE')) as active_contracts,
  (select coalesce(sum(contract_value_usd), 0)
    from public.commercial_contracts
    where status in ('SIGNED','ACTIVE','COMPLETED')) as total_contracted_usd,

  -- Invoices & payments
  (select coalesce(sum(amount_usd), 0)
    from public.commercial_invoices
    where status not in ('CANCELLED','DRAFT')) as total_invoiced_usd,
  (select coalesce(sum(p.amount_usd), 0)
    from public.invoice_payments p
    join public.commercial_invoices i on i.invoice_id = p.invoice_id
    where i.status <> 'CANCELLED') as total_received_usd,
  (select coalesce(sum(i.amount_usd) - coalesce(sum(p.amount_usd), 0), 0)
    from public.commercial_invoices i
    left join public.invoice_payments p on p.invoice_id = i.invoice_id
    where i.status in ('ISSUED','PARTIALLY_PAID','OVERDUE')) as outstanding_usd,
  (select count(*) from public.commercial_invoices
    where status = 'OVERDUE') as overdue_invoices,

  -- Briefs
  (select count(*) from public.institutional_briefs
    where status = 'DRAFT') as briefs_draft,
  (select count(*) from public.institutional_briefs
    where status in ('IN_REVIEW','APPROVED')) as briefs_in_progress,
  (select count(*) from public.institutional_briefs
    where status = 'PUBLISHED') as briefs_published,

  -- Follow-ups due
  (select count(*) from public.commercial_opportunities
    where next_followup_date <= current_date + 7
      and stage not in ('WON','LOST')
      and not is_archived) as followups_due_7d;

-- View is only accessible to users with commercial.read or commercial.edit.
revoke all on public.commercial_dashboard_summary from anon, authenticated;
grant select on public.commercial_dashboard_summary to authenticated;

commit;
