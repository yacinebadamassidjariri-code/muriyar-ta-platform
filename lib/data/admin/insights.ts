/**
 * Server-side data access for the Institutional Insights admin module.
 *
 * All functions run in RSC or Server Action context, never client-side.
 * No raw submission bodies or contributor identifiers are returned here.
 */
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BriefStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "APPROVED"
  | "PUBLISHED"
  | "ARCHIVED";

export type BriefListItem = {
  brief_id: string;
  title: string;
  subtitle: string | null;
  language_code: string | null;
  research_theme: string | null;
  status: BriefStatus;
  is_sample: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  org_name: string | null;
};

export type BriefDetail = BriefListItem & {
  org_id: string | null;
  contract_id: string | null;
  research_questions: string | null;
  executive_summary: string | null;
  methodology: string | null;
  findings: string | null;
  recommendations: string | null;
  limitations: string | null;
  references_text: string | null;
  submitted_for_review_at: string | null;
  approved_at: string | null;
  archived_at: string | null;
  uploaded_pdf_storage_path: string | null;
  generated_pdf_storage_path: string | null;
  created_by: string | null;
  updated_by: string | null;
  approved_by: string | null;
  published_by: string | null;
};

export type InsightsDashboardStats = {
  total: number;
  draft: number;
  in_review: number;
  approved: number;
  published: number;
  archived: number;
};

export type EvidenceLinkListItem = {
  link_id: string;
  brief_id: string;
  brief_title: string;
  submission_id: string;
  eligibility: string;
  inclusion_decision: boolean | null;
  consent_active_at_review: boolean | null;
  research_consent_verified_at: string | null;
  human_review_completed: boolean;
  reidentification_risk_flagged: boolean;
  thematic_categories: string[] | null;
  reviewed_at: string | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function getInsightsDashboardStats(): Promise<
  { ok: true; value: InsightsDashboardStats } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("institutional_briefs")
    .select("status");

  if (error) return { ok: false, error: error.message };

  const rows = data as { status: string }[];
  const stats: InsightsDashboardStats = {
    total: rows.length,
    draft: rows.filter((r) => r.status === "DRAFT").length,
    in_review: rows.filter((r) => r.status === "IN_REVIEW").length,
    approved: rows.filter((r) => r.status === "APPROVED").length,
    published: rows.filter((r) => r.status === "PUBLISHED").length,
    archived: rows.filter((r) => r.status === "ARCHIVED").length,
  };
  return { ok: true, value: stats };
}

// ---------------------------------------------------------------------------
// Brief listing
// ---------------------------------------------------------------------------

export type BriefListFilter = {
  q?: string;
  status?: BriefStatus | null;
  theme?: string | null;
  is_sample?: boolean | null;
  page?: number;
  pageSize?: number;
};

export async function listBriefs(filter: BriefListFilter = {}): Promise<
  | {
      ok: true;
      value: { items: BriefListItem[]; total: number; page: number; pageCount: number };
    }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const pageSize = Math.min(filter.pageSize ?? 25, 100);
  const page = Math.max(filter.page ?? 1, 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("institutional_briefs")
    .select(
      `brief_id, title, subtitle, language_code, research_theme, status,
       is_sample, created_at, updated_at, published_at,
       institutional_organizations(name)`,
      { count: "exact" },
    )
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (filter.q) {
    query = query.ilike("title", `%${filter.q}%`);
  }
  if (filter.status) {
    query = query.eq("status", filter.status);
  }
  if (filter.theme) {
    query = query.eq("research_theme", filter.theme);
  }
  if (filter.is_sample !== null && filter.is_sample !== undefined) {
    query = query.eq("is_sample", filter.is_sample);
  }

  const { data, error, count } = await query;
  if (error) return { ok: false, error: error.message };

  const items: BriefListItem[] = (data ?? []).map((row: Record<string, unknown>) => ({
    brief_id: row.brief_id as string,
    title: row.title as string,
    subtitle: row.subtitle as string | null,
    language_code: row.language_code as string | null,
    research_theme: row.research_theme as string | null,
    status: row.status as BriefStatus,
    is_sample: row.is_sample as boolean,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    published_at: row.published_at as string | null,
    org_name:
      (row.institutional_organizations as { name: string } | null)?.name ?? null,
  }));

  const total = count ?? 0;
  return {
    ok: true,
    value: { items, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

// ---------------------------------------------------------------------------
// Single brief
// ---------------------------------------------------------------------------

export async function getBrief(
  briefId: string,
): Promise<{ ok: true; value: BriefDetail } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("institutional_briefs")
    .select(
      `brief_id, title, subtitle, language_code, research_theme, status,
       is_sample, created_at, updated_at, published_at,
       org_id, contract_id, research_questions, executive_summary,
       methodology, findings, recommendations, limitations,
       references_text, submitted_for_review_at, approved_at, archived_at,
       uploaded_pdf_storage_path, generated_pdf_storage_path,
       created_by, updated_by, approved_by, published_by,
       institutional_organizations(name)`,
    )
    .eq("brief_id", briefId)
    .single();

  if (error) return { ok: false, error: error.message };

  const row = data as Record<string, unknown>;
  return {
    ok: true,
    value: {
      ...(row as BriefDetail),
      org_name: (row.institutional_organizations as { name: string } | null)?.name ?? null,
    },
  };
}

// ---------------------------------------------------------------------------
// Evidence links listing (no submission bodies returned)
// ---------------------------------------------------------------------------

export async function listEvidenceLinks(
  briefId?: string,
): Promise<{ ok: true; value: EvidenceLinkListItem[] } | { ok: false; error: string }> {
  const supabase = await createClient();
  let query = supabase
    .from("brief_evidence_links")
    .select(
      `link_id, brief_id, submission_id, eligibility, inclusion_decision,
       consent_active_at_review, research_consent_verified_at,
       human_review_completed, reidentification_risk_flagged,
       thematic_categories, reviewed_at, created_at,
       institutional_briefs(title)`,
    )
    .order("created_at", { ascending: false });

  if (briefId) {
    query = query.eq("brief_id", briefId);
  }

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };

  const items: EvidenceLinkListItem[] = (data ?? []).map((row: Record<string, unknown>) => ({
    link_id: row.link_id as string,
    brief_id: row.brief_id as string,
    brief_title:
      (row.institutional_briefs as { title: string } | null)?.title ?? "—",
    submission_id: row.submission_id as string,
    eligibility: row.eligibility as string,
    inclusion_decision: row.inclusion_decision as boolean | null,
    consent_active_at_review: row.consent_active_at_review as boolean | null,
    research_consent_verified_at: row.research_consent_verified_at as string | null,
    human_review_completed: row.human_review_completed as boolean,
    reidentification_risk_flagged: row.reidentification_risk_flagged as boolean,
    thematic_categories: row.thematic_categories as string[] | null,
    reviewed_at: row.reviewed_at as string | null,
    created_at: row.created_at as string,
  }));

  return { ok: true, value: items };
}
