import "server-only";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/auth/guards";

export type QaQuestionState =
  | "PENDING"
  | "ASSIGNED"
  | "IN_REVIEW"
  | "NEEDS_EDIT"
  | "ANSWERED"
  | "PUBLISHED"
  | "REJECTED"
  | "ARCHIVED";

export type QaQueueRow = {
  rawQuestionId: string;
  submissionTimestamp: string;
  languageCode: string;
  charCount: number;
  currentState: QaQuestionState;
  topicSlug: string | null;
  assignedModeratorId: string | null;
  isEscalated: boolean;
};

export type QaQueueResult = {
  items: QaQueueRow[];
  total: number;
  page: number;
  pageCount: number;
};

export type QaWorkspace = {
  rawQuestionId: string;
  questionTextPlain: string;
  charCount: number;
  languageCode: string;
  topicId: string | null;
  topicSlug: string | null;
  followUpTo: string | null;
  consentTimestamp: string;
  currentState: QaQuestionState;
  assignedModeratorId: string | null;
  riskLevel: string;
  riskFlags: string[];
  moderationNotes: string | null;
  submissionTimestamp: string;
  rejectionReasonCode: string | null;
  isEscalated: boolean;
};

export type DataResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: "forbidden" | "request_failed" | "not_found" };

/**
 * Returns question counts by state for the dashboard.
 * Uses a direct query since there's no dedicated dashboard RPC for Q&A yet.
 */
export async function getQaDashboard(): Promise<
  DataResult<Record<string, number>>
> {
  if (!(await hasPermission("question.queue.read")))
    return { ok: false, error: "forbidden" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("raw_questions")
    .select("current_state");
  if (error) return { ok: false, error: "request_failed" };
  const totals: Record<string, number> = {};
  for (const row of data ?? []) {
    const s = String(row.current_state);
    totals[s] = (totals[s] ?? 0) + 1;
  }
  return { ok: true, value: totals };
}

/**
 * List questions for the moderation queue with basic filtering.
 */
export async function listQaQueue(options: {
  status?: string;
  language?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<DataResult<QaQueueResult>> {
  if (!(await hasPermission("question.queue.read")))
    return { ok: false, error: "forbidden" };

  const page = Math.max(1, Math.floor(options.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 25));
  const supabase = await createClient();

  let query = supabase
    .from("raw_questions")
    .select(
      "raw_question_id, submission_timestamp, language_code, char_count, current_state, topic_id, assigned_moderator_id",
      { count: "exact" },
    )
    .order("submission_timestamp", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (options.status) query = query.eq("current_state", options.status);
  if (options.language) query = query.eq("language_code", options.language);

  const { data, error, count } = await query;
  if (error) return { ok: false, error: "request_failed" };

  // Get escalation status from state transitions
  const ids = (data ?? []).map((r) => r.raw_question_id as string);
  const escalatedSet = new Set<string>();
  if (ids.length > 0) {
    const { data: transitions } = await supabase
      .from("qa_state_transitions")
      .select("raw_question_id")
      .in("raw_question_id", ids)
      .eq("is_escalated", true);
    for (const t of transitions ?? []) escalatedSet.add(String(t.raw_question_id));
  }

  // Get topic slugs
  const topicIds = [...new Set((data ?? []).map((r) => r.topic_id).filter(Boolean))] as string[];
  const topicSlugMap = new Map<string, string>();
  if (topicIds.length > 0) {
    const { data: topics } = await supabase
      .from("qa_topics")
      .select("topic_id, slug")
      .in("topic_id", topicIds);
    for (const t of topics ?? []) topicSlugMap.set(String(t.topic_id), String(t.slug));
  }

  const total = count ?? 0;
  const items: QaQueueRow[] = (data ?? []).map((row) => ({
    rawQuestionId: String(row.raw_question_id),
    submissionTimestamp: String(row.submission_timestamp),
    languageCode: String(row.language_code),
    charCount: Number(row.char_count),
    currentState: String(row.current_state) as QaQuestionState,
    topicSlug: row.topic_id ? (topicSlugMap.get(String(row.topic_id)) ?? null) : null,
    assignedModeratorId: row.assigned_moderator_id ? String(row.assigned_moderator_id) : null,
    isEscalated: escalatedSet.has(String(row.raw_question_id)),
  }));

  return {
    ok: true,
    value: {
      items,
      total,
      page,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

/**
 * Load the full decrypted workspace for a single question.
 * Calls review_get_question() which enforces AAL2 + question.raw.read.
 */
export async function getQaWorkspace(
  rawQuestionId: string,
): Promise<DataResult<QaWorkspace>> {
  if (!(await hasPermission("question.raw.read")))
    return { ok: false, error: "forbidden" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("review_get_question", {
    p_raw_question_id: rawQuestionId,
  });
  if (error) {
    if (error.message === "not_found") return { ok: false, error: "not_found" };
    if (error.message === "forbidden") return { ok: false, error: "forbidden" };
    return { ok: false, error: "request_failed" };
  }
  const rows = Array.isArray(data) ? data : [];
  if (rows.length === 0) return { ok: false, error: "not_found" };
  const row = rows[0] as Record<string, unknown>;
  return {
    ok: true,
    value: {
      rawQuestionId: String(row.raw_question_id),
      questionTextPlain: String(row.question_text_plain ?? ""),
      charCount: Number(row.char_count),
      languageCode: String(row.language_code),
      topicId: row.topic_id ? String(row.topic_id) : null,
      topicSlug: row.topic_slug ? String(row.topic_slug) : null,
      followUpTo: row.follow_up_to ? String(row.follow_up_to) : null,
      consentTimestamp: String(row.consent_timestamp),
      currentState: String(row.current_state) as QaQuestionState,
      assignedModeratorId: row.assigned_moderator_id
        ? String(row.assigned_moderator_id)
        : null,
      riskLevel: String(row.risk_level ?? "none"),
      riskFlags: Array.isArray(row.risk_flags)
        ? row.risk_flags.map(String)
        : [],
      moderationNotes: row.moderation_notes ? String(row.moderation_notes) : null,
      submissionTimestamp: String(row.submission_timestamp),
      rejectionReasonCode: row.rejection_reason_code
        ? String(row.rejection_reason_code)
        : null,
      isEscalated: Boolean(row.is_escalated),
    },
  };
}
