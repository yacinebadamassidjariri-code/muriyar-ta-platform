/**
 * Server-side data access for the Partnerships & Commercial admin module.
 *
 * PII fields (contact email/phone) are read server-side only; never returned
 * to client components. Financial figures are database-accurate, never estimated.
 */
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OrgPartnershipStatus =
  | "PROSPECT"
  | "ACTIVE"
  | "PAUSED"
  | "INACTIVE"
  | "ARCHIVED";

export type PipelineStage =
  | "LEAD"
  | "CONTACTED"
  | "DISCOVERY"
  | "PROPOSAL_SENT"
  | "NEGOTIATION"
  | "WON"
  | "LOST";

export type ProposalStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "DECLINED"
  | "SUPERSEDED";

export type ContractStatus =
  | "DRAFT"
  | "SIGNED"
  | "ACTIVE"
  | "COMPLETED"
  | "TERMINATED";

export type InvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

export type OrgListItem = {
  org_id: string;
  name: string;
  org_type: string | null;
  country: string | null;
  geographic_focus: string | null;
  website: string | null;
  areas_of_interest: string[] | null;
  partnership_status: OrgPartnershipStatus;
  next_followup_date: string | null;
  created_at: string;
  updated_at: string;
};

export type OrgDetail = OrgListItem & {
  internal_notes: string | null;
  is_archived: boolean;
};

export type OpportunityListItem = {
  opportunity_id: string;
  org_id: string;
  org_name: string;
  title: string;
  research_theme: string | null;
  estimated_value_usd: number | null;
  expected_close_date: string | null;
  stage: PipelineStage;
  next_followup_date: string | null;
  package_name: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
};

export type ProposalListItem = {
  proposal_id: string;
  proposal_number: string;
  title: string;
  org_name: string;
  quoted_price_usd: number | null;
  status: ProposalStatus;
  sent_at: string | null;
  created_at: string;
};

export type ContractListItem = {
  contract_id: string;
  contract_number: string;
  title: string;
  org_name: string;
  contract_value_usd: number;
  status: ContractStatus;
  start_date: string | null;
  end_date: string | null;
  signed_at: string | null;
  created_at: string;
};

export type InvoiceListItem = {
  invoice_id: string;
  invoice_number: string;
  title: string | null;
  org_name: string;
  amount_usd: number;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  paid_total: number;
  created_at: string;
};

export type ServicePackage = {
  package_id: string;
  package_code: string;
  name: string;
  description: string | null;
  deliverables: string | null;
  base_price_usd: number | null;
  price_is_provisional: boolean;
  pricing_notes: string | null;
  est_staff_hours: number | null;
  est_labor_cost_usd: number | null;
  est_overhead_usd: number | null;
  is_active: boolean;
};

export type CommercialDashboard = {
  total_organizations: number;
  active_partners: number;
  active_opportunities: number;
  pipeline_value_usd: number;
  proposals_sent: number;
  proposals_accepted: number;
  active_contracts: number;
  total_contracted_usd: number;
  total_invoiced_usd: number;
  total_received_usd: number;
  outstanding_usd: number;
  overdue_invoices: number;
  briefs_draft: number;
  briefs_in_progress: number;
  briefs_published: number;
  followups_due_7d: number;
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function getCommercialDashboard(): Promise<
  { ok: true; value: CommercialDashboard } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("commercial_dashboard_summary")
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    value: data as CommercialDashboard,
  };
}

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

export async function listOrganizations(opts: {
  q?: string;
  status?: OrgPartnershipStatus | null;
  page?: number;
} = {}): Promise<
  | {
      ok: true;
      value: { items: OrgListItem[]; total: number; page: number; pageCount: number };
    }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const pageSize = 25;
  const page = Math.max(opts.page ?? 1, 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("institutional_organizations")
    .select(
      `org_id, name, org_type, country, geographic_focus, website,
       areas_of_interest, partnership_status, next_followup_date,
       created_at, updated_at`,
      { count: "exact" },
    )
    .eq("is_archived", false)
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (opts.q) query = query.ilike("name", `%${opts.q}%`);
  if (opts.status) query = query.eq("partnership_status", opts.status);

  const { data, error, count } = await query;
  if (error) return { ok: false, error: error.message };

  const total = count ?? 0;
  return {
    ok: true,
    value: {
      items: (data ?? []) as OrgListItem[],
      total,
      page,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function getOrganization(orgId: string): Promise<
  { ok: true; value: OrgDetail } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("institutional_organizations")
    .select(
      `org_id, name, org_type, country, geographic_focus, website,
       areas_of_interest, partnership_status, next_followup_date,
       internal_notes, is_archived, created_at, updated_at`,
    )
    .eq("org_id", orgId)
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, value: data as OrgDetail };
}

// ---------------------------------------------------------------------------
// Pipeline opportunities
// ---------------------------------------------------------------------------

export async function listOpportunities(opts: {
  stage?: PipelineStage | null;
  orgId?: string | null;
  page?: number;
} = {}): Promise<
  | {
      ok: true;
      value: { items: OpportunityListItem[]; total: number; page: number; pageCount: number };
    }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const pageSize = 50;
  const page = Math.max(opts.page ?? 1, 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("commercial_opportunities")
    .select(
      `opportunity_id, org_id, title, research_theme,
       estimated_value_usd, expected_close_date, stage,
       next_followup_date, assigned_to, created_at, updated_at,
       institutional_organizations(name),
       service_packages(name)`,
      { count: "exact" },
    )
    .eq("is_archived", false)
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (opts.stage) query = query.eq("stage", opts.stage);
  if (opts.orgId) query = query.eq("org_id", opts.orgId);

  const { data, error, count } = await query;
  if (error) return { ok: false, error: error.message };

  const items: OpportunityListItem[] = (data ?? []).map((row: Record<string, unknown>) => ({
    opportunity_id: row.opportunity_id as string,
    org_id: row.org_id as string,
    org_name: (row.institutional_organizations as { name: string } | null)?.name ?? "—",
    title: row.title as string,
    research_theme: row.research_theme as string | null,
    estimated_value_usd: row.estimated_value_usd as number | null,
    expected_close_date: row.expected_close_date as string | null,
    stage: row.stage as PipelineStage,
    next_followup_date: row.next_followup_date as string | null,
    package_name: (row.service_packages as { name: string } | null)?.name ?? null,
    assigned_to: row.assigned_to as string | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }));

  const total = count ?? 0;
  return {
    ok: true,
    value: { items, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

// ---------------------------------------------------------------------------
// Proposals
// ---------------------------------------------------------------------------

export async function listProposals(opts: {
  status?: ProposalStatus | null;
  orgId?: string | null;
  page?: number;
} = {}): Promise<
  { ok: true; value: ProposalListItem[] } | { ok: false; error: string }
> {
  const supabase = await createClient();
  let query = supabase
    .from("commercial_proposals")
    .select(
      `proposal_id, proposal_number, title, quoted_price_usd, status,
       sent_at, created_at,
       institutional_organizations(name)`,
    )
    .order("created_at", { ascending: false });

  if (opts.status) query = query.eq("status", opts.status);
  if (opts.orgId) query = query.eq("org_id", opts.orgId);

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };

  const items: ProposalListItem[] = (data ?? []).map((row: Record<string, unknown>) => ({
    proposal_id: row.proposal_id as string,
    proposal_number: row.proposal_number as string,
    title: row.title as string,
    org_name: (row.institutional_organizations as { name: string } | null)?.name ?? "—",
    quoted_price_usd: row.quoted_price_usd as number | null,
    status: row.status as ProposalStatus,
    sent_at: row.sent_at as string | null,
    created_at: row.created_at as string,
  }));

  return { ok: true, value: items };
}

// ---------------------------------------------------------------------------
// Contracts
// ---------------------------------------------------------------------------

export async function listContracts(opts: {
  status?: ContractStatus | null;
  orgId?: string | null;
} = {}): Promise<
  { ok: true; value: ContractListItem[] } | { ok: false; error: string }
> {
  const supabase = await createClient();
  let query = supabase
    .from("commercial_contracts")
    .select(
      `contract_id, contract_number, title, contract_value_usd, status,
       start_date, end_date, signed_at, created_at,
       institutional_organizations(name)`,
    )
    .order("created_at", { ascending: false });

  if (opts.status) query = query.eq("status", opts.status);
  if (opts.orgId) query = query.eq("org_id", opts.orgId);

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };

  const items: ContractListItem[] = (data ?? []).map((row: Record<string, unknown>) => ({
    contract_id: row.contract_id as string,
    contract_number: row.contract_number as string,
    title: row.title as string,
    org_name: (row.institutional_organizations as { name: string } | null)?.name ?? "—",
    contract_value_usd: row.contract_value_usd as number,
    status: row.status as ContractStatus,
    start_date: row.start_date as string | null,
    end_date: row.end_date as string | null,
    signed_at: row.signed_at as string | null,
    created_at: row.created_at as string,
  }));

  return { ok: true, value: items };
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export async function listInvoices(opts: {
  status?: InvoiceStatus | null;
  orgId?: string | null;
} = {}): Promise<
  { ok: true; value: InvoiceListItem[] } | { ok: false; error: string }
> {
  const supabase = await createClient();
  let query = supabase
    .from("commercial_invoices")
    .select(
      `invoice_id, invoice_number, title, amount_usd, status,
       issue_date, due_date, created_at,
       institutional_organizations(name),
       invoice_payments(amount_usd)`,
    )
    .order("issue_date", { ascending: false });

  if (opts.status) query = query.eq("status", opts.status);
  if (opts.orgId) query = query.eq("org_id", opts.orgId);

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };

  const items: InvoiceListItem[] = (data ?? []).map((row: Record<string, unknown>) => {
    const payments = (row.invoice_payments as { amount_usd: number }[] | null) ?? [];
    const paid_total = payments.reduce((sum, p) => sum + (p.amount_usd ?? 0), 0);
    return {
      invoice_id: row.invoice_id as string,
      invoice_number: row.invoice_number as string,
      title: row.title as string | null,
      org_name: (row.institutional_organizations as { name: string } | null)?.name ?? "—",
      amount_usd: row.amount_usd as number,
      status: row.status as InvoiceStatus,
      issue_date: row.issue_date as string,
      due_date: row.due_date as string | null,
      paid_total,
      created_at: row.created_at as string,
    };
  });

  return { ok: true, value: items };
}

// ---------------------------------------------------------------------------
// Service packages
// ---------------------------------------------------------------------------

export async function listServicePackages(): Promise<
  { ok: true; value: ServicePackage[] } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_packages")
    .select(
      `package_id, package_code, name, description, deliverables,
       base_price_usd, price_is_provisional, pricing_notes,
       est_staff_hours, est_labor_cost_usd, est_overhead_usd, is_active`,
    )
    .order("is_active", { ascending: false })
    .order("base_price_usd", { ascending: true, nullsFirst: false });

  if (error) return { ok: false, error: error.message };
  return { ok: true, value: (data ?? []) as ServicePackage[] };
}
