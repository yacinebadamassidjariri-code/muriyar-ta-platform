"use server";

import { revalidatePath } from "next/cache";
import { authorizeAdminAction, isUuid } from "./safe-action";
import { validateReview, validateStoryDraft, type ReviewInput, type StoryDraftInput } from "@/lib/validation/moderation-admin";

type Failure = { ok: false; error: string; requestId: string; fieldErrors?: Record<string,string> };
export type ModerationActionResult = { ok: true; status?: string; storyId?: string } | Failure;
export type ModerationBulkResult = { ok: true; bulk: { requested: number; updated: number; skipped: number; already: number } } | Failure;

function refresh() {
  for (const locale of ["en","fr","ha","zar"]) {
    revalidatePath(`/${locale}/admin/moderation`);
    revalidatePath(`/${locale}/admin/moderation/queue`);
    revalidatePath(`/${locale}/stories`);
  }
}

function dbError(message?: string) {
  return ["forbidden","not_found","invalid_input","invalid_transition","already"].includes(message ?? "") ? message! : "request_failed";
}

export async function assignStoryAction(submissionId: string, assigneeId: string | null): Promise<ModerationActionResult> {
  const auth = await authorizeAdminAction("submission.review");
  if (!auth.ok) return auth;
  if (!isUuid(submissionId) || (assigneeId !== null && !isUuid(assigneeId))) return { ok:false,error:"invalid_input",requestId:auth.value.requestId };
  const { data, error } = await auth.value.supabase.rpc("story_admin_assign", { p_submission_id: submissionId, p_assignee_id: assigneeId });
  if (error) return { ok:false,error:dbError(error.message),requestId:auth.value.requestId };
  refresh();
  const row = data && typeof data === "object" ? data as Record<string,unknown> : {};
  return { ok:true,status:typeof row.status === "string" ? row.status : undefined };
}

export async function saveStoryReviewAction(input: ReviewInput): Promise<ModerationActionResult> {
  const auth = await authorizeAdminAction("submission.review");
  if (!auth.ok) return auth;
  const value = validateReview(input);
  if (!value) return { ok:false,error:"invalid_input",requestId:auth.value.requestId };
  const { error } = await auth.value.supabase.rpc("story_admin_save_review", {
    p_submission_id:value.submissionId,p_risk_level:value.riskLevel,p_risk_flags:value.riskFlags,p_note:value.note||null,
  });
  if (error) return { ok:false,error:dbError(error.message),requestId:auth.value.requestId };
  refresh(); return { ok:true };
}

export async function saveStoryDraftAction(input: StoryDraftInput): Promise<ModerationActionResult> {
  const auth = await authorizeAdminAction("story.edit");
  if (!auth.ok) return auth;
  const checked = validateStoryDraft(input);
  if (!checked.ok) return { ok:false,error:"invalid_input",requestId:auth.value.requestId,fieldErrors:checked.errors };
  const value = checked.value;
  const { error } = await auth.value.supabase.rpc("story_admin_save_draft", { p_submission_id:value.submissionId,p_payload:{
    title:value.title,body:value.body,excerpt:value.excerpt||null,featured_quote:value.featuredQuote||null,
    category_tag_id:value.categoryTagId,tag_ids:value.tagIds,related_podcast_ids:value.relatedPodcastIds,related_report_ids:value.relatedReportIds,
  } });
  if (error) return { ok:false,error:dbError(error.message),requestId:auth.value.requestId };
  refresh(); return { ok:true };
}

export async function transitionStoryAction(input: { submissionId:string; action:"approve"|"reject"|"publish"|"unpublish"|"archive"|"restore"; reasonCode?:string|null; note?:string }): Promise<ModerationActionResult> {
  const permission = ["approve","reject"].includes(input.action) ? "submission.disposition" : "story.publish";
  const auth = await authorizeAdminAction(permission);
  if (!auth.ok) return auth;
  if (!isUuid(input.submissionId) || (input.note?.trim().length ?? 0)>2000) return { ok:false,error:"invalid_input",requestId:auth.value.requestId };
  const { data,error } = await auth.value.supabase.rpc("story_admin_transition", { p_submission_id:input.submissionId,p_action:input.action,p_reason_code:input.reasonCode||null,p_note:input.note?.trim()||null });
  if (error) return { ok:false,error:dbError(error.message),requestId:auth.value.requestId };
  refresh(); const row = data && typeof data === "object" ? data as Record<string,unknown> : {};
  return { ok:true,status:typeof row.status==="string"?row.status:undefined,storyId:typeof row.storyId==="string"?row.storyId:undefined };
}

export async function bulkStoryAction(input: { submissionIds:string[]; action:"approve"|"reject"|"publish"|"unpublish"|"archive"|"restore"|"assign"|"reassign"|"release"; assigneeId?:string|null; reasonCode?:string|null }): Promise<ModerationBulkResult> {
  const permission = ["assign","reassign","release"].includes(input.action) ? "submission.review" : ["approve","reject"].includes(input.action) ? "submission.disposition" : "story.publish";
  const auth=await authorizeAdminAction(permission); if(!auth.ok)return auth;
  const ids=[...new Set(input.submissionIds)];
  if(!ids.length||ids.length>100||ids.some((id)=>!isUuid(id))||(input.assigneeId!=null&&!isUuid(input.assigneeId)))return{ok:false,error:"invalid_input",requestId:auth.value.requestId};
  const {data,error}=await auth.value.supabase.rpc("story_admin_bulk",{p_submission_ids:ids,p_action:input.action,p_assignee_id:input.assigneeId??null,p_reason_code:input.reasonCode??null});
  if(error)return{ok:false,error:dbError(error.message),requestId:auth.value.requestId};
  const row=data&&typeof data==="object"?data as Record<string,unknown>:null;
  if(!row||![row.requested,row.updated,row.skipped,row.already].every((value)=>typeof value==="number"))return{ok:false,error:"request_failed",requestId:auth.value.requestId};
  refresh();
  return {
    ok: true,
    bulk: {
      requested: row.requested as number,
      updated: row.updated as number,
      skipped: row.skipped as number,
      already: row.already as number,
    },
  };
}
