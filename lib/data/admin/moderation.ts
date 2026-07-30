import "server-only";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/auth/guards";
import type { RiskLevel } from "@/lib/validation/moderation-admin";

export type ModerationStatus = "PENDING" | "ASSIGNED" | "IN_REVIEW" | "NEEDS_EDIT" | "APPROVED" | "PUBLISHED" | "REJECTED" | "ARCHIVED";
export type ModerationSort = "submitted_desc" | "submitted_asc" | "activity_desc" | "activity_asc" | "status" | "risk";
export type ModeratorOption = { userId: string; displayName: string };
export type QueueRow = {
  submissionId: string; submittedAt: string; languageCode: string; country: string | null;
  status: ModerationStatus; riskLevel: RiskLevel; riskFlags: string[];
  assignedModeratorId: string | null; assignedModeratorName: string | null; lastActivity: string;
};
export type QueueResult = { items: QueueRow[]; total: number; page: number; pageCount: number };
export type LookupOption = { id: string | number; label: string };
export type ModerationLookups = {
  languages: LookupOption[]; tags: LookupOption[]; podcasts: LookupOption[];
  reports: LookupOption[]; rejectionReasons: LookupOption[]; moderators: ModeratorOption[];
};
export type ModerationWorkspace = {
  submission: { submissionId: string; languageCode: string; submittedAt: string; charCount: number;
    status: ModerationStatus; assignedModeratorId: string | null; country: string | null; region: string | null;
    body: string; rejectionReasonCode: string | null; isEscalated: boolean };
  review: { riskLevel: RiskLevel; riskFlags: string[] };
  draft: { title: string; body: string; excerpt: string; featuredQuote: string; categoryTagId: number | null;
    tagIds: number[]; relatedPodcastIds: string[]; relatedReportIds: string[] };
  publicStory: null | { storyId: string; slug: string; status: string; publishedAt: string | null; unpublishedAt: string | null; archivedAt: string | null };
  history: Array<{ actionId: string; action: string; fromState: string | null; toState: string | null; note: string | null; createdAt: string; actor: string }>;
};
export type DataResult<T> = { ok: true; value: T } | { ok: false; error: "forbidden" | "request_failed" | "not_found" };

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export async function getModerationDashboard(): Promise<DataResult<Record<string, number>>> {
  if (!(await hasPermission("submission.queue.read"))) return { ok: false, error: "forbidden" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("story_admin_dashboard");
  if (error) return { ok: false, error: "request_failed" };
  const totals: Record<string, number> = {};
  for (const row of data ?? []) totals[String(row.state)] = Number(row.total ?? 0);
  return { ok: true, value: totals };
}

export async function listModerationQueue(options: {
  q?: string; status?: string; language?: string; country?: string; assignee?: string | null;
  unassigned?: boolean; risk?: string; dateFrom?: string; dateTo?: string; sort?: ModerationSort; page?: number; pageSize?: number;
} = {}): Promise<DataResult<QueueResult>> {
  if (!(await hasPermission("submission.queue.read"))) return { ok: false, error: "forbidden" };
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(options.pageSize ?? 25)));
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("story_admin_queue", {
    p_q: options.q?.trim() || null, p_status: options.status || null,
    p_language: options.language || null, p_country: options.country?.trim() || null,
    p_assignee: options.assignee || null, p_unassigned: options.unassigned ?? false,
    p_risk: options.risk || null, p_date_from: options.dateFrom || null,
    p_date_to: options.dateTo || null, p_sort: options.sort ?? "submitted_desc",
    p_page: page, p_page_size: pageSize,
  });
  if (error) return { ok: false, error: "request_failed" };
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const items = rows.map((row): QueueRow => ({
    submissionId: String(row.submission_id), submittedAt: String(row.submission_timestamp),
    languageCode: String(row.language_code), country: typeof row.country === "string" ? row.country : null,
    status: String(row.current_state) as ModerationStatus,
    riskLevel: String(row.risk_level ?? "none") as RiskLevel,
    riskFlags: Array.isArray(row.risk_flags) ? row.risk_flags.map(String) : [],
    assignedModeratorId: typeof row.assigned_moderator_id === "string" ? row.assigned_moderator_id : null,
    assignedModeratorName: typeof row.assigned_moderator_name === "string" ? row.assigned_moderator_name : null,
    lastActivity: String(row.last_activity),
  }));
  const total = Number(rows[0]?.total_count ?? 0);
  return { ok: true, value: { items, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) } };
}

export async function getModerationLookups(): Promise<DataResult<ModerationLookups>> {
  if (!(await hasPermission("submission.queue.read"))) return { ok: false, error: "forbidden" };
  const supabase = await createClient();
  const [languages, tags, podcasts, reports, reasons, moderators] = await Promise.all([
    supabase.from("supported_languages").select("language_code,name").eq("is_active", true).order("name"),
    supabase.from("issue_tags").select("tag_id,name").order("name"),
    supabase.from("podcast_episodes").select("episode_id,title").order("title"),
    supabase.from("reports").select("report_id,title").order("title"),
    supabase.from("rejection_reason_codes").select("reason_code,description").order("reason_code"),
    supabase.rpc("story_admin_moderators"),
  ]);
  if ([languages, tags, podcasts, reports, reasons, moderators].some((result) => result.error)) return { ok: false, error: "request_failed" };
  return { ok: true, value: {
    languages: (languages.data ?? []).map((row) => ({ id: row.language_code, label: row.name })),
    tags: (tags.data ?? []).map((row) => ({ id: row.tag_id, label: row.name })),
    podcasts: (podcasts.data ?? []).map((row) => ({ id: row.episode_id, label: row.title })),
    reports: (reports.data ?? []).map((row) => ({ id: row.report_id, label: row.title })),
    rejectionReasons: (reasons.data ?? []).map((row) => ({ id: row.reason_code, label: `${row.reason_code} · ${row.description}` })),
    moderators: (moderators.data ?? []).map((row: { user_id: string; display_name: string }) => ({ userId: String(row.user_id), displayName: String(row.display_name) })),
  } };
}

export async function getModerationWorkspace(submissionId: string): Promise<DataResult<ModerationWorkspace>> {
  if (!(await hasPermission("submission.raw.read"))) return { ok: false, error: "forbidden" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("story_admin_workspace", { p_submission_id: submissionId });
  if (error) return { ok: false, error: error.message === "not_found" ? "not_found" : error.message === "forbidden" ? "forbidden" : "request_failed" };
  const row = object(data);
  if (!row || !object(row.submission) || !object(row.review) || !object(row.draft) || !Array.isArray(row.history)) return { ok: false, error: "request_failed" };
  return { ok: true, value: data as unknown as ModerationWorkspace };
}
