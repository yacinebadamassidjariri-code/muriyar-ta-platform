"use server";

import { revalidatePath } from "next/cache";
import { authorizeAdminAction, isUuid } from "./safe-action";

type Failure = { ok: false; error: string; requestId: string };
export type QaActionResult = { ok: true; status?: string } | Failure;

function refresh() {
  for (const locale of ["en", "fr", "ha", "zar"]) {
    revalidatePath(`/${locale}/admin/questions`);
    revalidatePath(`/${locale}/admin/questions/queue`);
    revalidatePath(`/${locale}/ask/browse`);
  }
}

function refreshQuestion(rawQuestionId: string) {
  refresh();
  for (const locale of ["en", "fr", "ha", "zar"]) {
    revalidatePath(`/${locale}/admin/questions/${rawQuestionId}`);
  }
}

function dbError(message?: string) {
  return ["forbidden", "not_found", "invalid_input", "invalid_transition", "already"].includes(
    message ?? ""
  )
    ? message!
    : "request_failed";
}

export async function assignQuestionAction(
  rawQuestionId: string,
  assigneeId: string | null
): Promise<QaActionResult> {
  const auth = await authorizeAdminAction("question.review");
  if (!auth.ok) return auth;
  if (!isUuid(rawQuestionId) || (assigneeId !== null && !isUuid(assigneeId)))
    return { ok: false, error: "invalid_input", requestId: auth.value.requestId };
  const { error } = await auth.value.supabase.rpc("question_assign", {
    p_raw_question_id: rawQuestionId,
    p_assignee_id: assigneeId,
  });
  if (error) return { ok: false, error: dbError(error.message), requestId: auth.value.requestId };
  refreshQuestion(rawQuestionId);
  return { ok: true };
}

export async function setQuestionStateAction(
  rawQuestionId: string,
  newState: string,
  reasonCode?: string | null
): Promise<QaActionResult> {
  const auth = await authorizeAdminAction("question.disposition");
  if (!auth.ok) return auth;
  if (!isUuid(rawQuestionId) || !newState)
    return { ok: false, error: "invalid_input", requestId: auth.value.requestId };
  const { data, error } = await auth.value.supabase.rpc("question_set_state", {
    p_raw_question_id: rawQuestionId,
    p_new_state: newState,
    p_reason_code: reasonCode ?? null,
  });
  if (error) return { ok: false, error: dbError(error.message), requestId: auth.value.requestId };
  refreshQuestion(rawQuestionId);
  const row = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  return { ok: true, status: typeof row.status === "string" ? row.status : undefined };
}

export async function saveQuestionAnswerAction(
  rawQuestionId: string,
  answerText: string
): Promise<QaActionResult> {
  const auth = await authorizeAdminAction("question.answer");
  if (!auth.ok) return auth;
  if (!isUuid(rawQuestionId) || !answerText?.trim())
    return { ok: false, error: "invalid_input", requestId: auth.value.requestId };
  if (answerText.trim().length > 10000)
    return { ok: false, error: "invalid_input", requestId: auth.value.requestId };
  const { error } = await auth.value.supabase.rpc("question_save_answer", {
    p_raw_question_id: rawQuestionId,
    p_answer_text: answerText.trim(),
  });
  if (error) return { ok: false, error: dbError(error.message), requestId: auth.value.requestId };
  refreshQuestion(rawQuestionId);
  return { ok: true };
}

export async function publishQuestionAction(rawQuestionId: string): Promise<QaActionResult> {
  const auth = await authorizeAdminAction("question.publish");
  if (!auth.ok) return auth;
  if (!isUuid(rawQuestionId))
    return { ok: false, error: "invalid_input", requestId: auth.value.requestId };
  const { data, error } = await auth.value.supabase.rpc("question_publish", {
    p_raw_question_id: rawQuestionId,
  });
  if (error) return { ok: false, error: dbError(error.message), requestId: auth.value.requestId };
  refreshQuestion(rawQuestionId);
  const row = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  return { ok: true, status: typeof row.status === "string" ? row.status : undefined };
}
