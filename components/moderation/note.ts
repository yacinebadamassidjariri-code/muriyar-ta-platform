"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type NoteInput = { submissionId: string; note: string };

export type NoteResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Add a standalone moderation note via review_add_note(). The RPC enforces the
 * moderation.note permission and appends to the immutable trail (no state change).
 */
export async function addNote(input: NoteInput): Promise<NoteResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("review_add_note", {
    p_submission_id: input.submissionId,
    p_note: input.note,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/[locale]/admin/moderation/[submissionId]", "page");
  return { ok: true, id: String(data) };
}
