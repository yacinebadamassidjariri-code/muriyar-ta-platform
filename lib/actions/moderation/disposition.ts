"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type DispositionInput = {
  submissionId: string;
  action: "approve" | "reject";
  reasonCode?: string | null;
  note?: string | null;
};

export type DispositionResult =
  | { ok: true; state: string }
  | { ok: false; error: string };

/**
 * Approve or reject a submission via review_set_disposition(). The RPC enforces
 * the submission.disposition permission, validates the transition, and writes the
 * immutable moderation_actions row; existing triggers handle resolved_at /
 * scheduled_purge_at.
 */
export async function setDisposition(
  input: DispositionInput,
): Promise<DispositionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("review_set_disposition", {
    p_submission_id: input.submissionId,
    p_action: input.action,
    p_reason_code: input.reasonCode ?? null,
    p_note: input.note ?? null,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/[locale]/admin/moderation", "layout");
  return { ok: true, state: String(data) };
}
