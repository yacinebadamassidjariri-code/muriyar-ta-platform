"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";

/**
 * Creates a new podcast episode draft via the SECURITY DEFINER RPC and
 * redirects to its editor. The RPC enforces `podcast.edit` and writes
 * status='draft'; this action is a thin wrapper.
 */
export async function createDraftAction(): Promise<void> {
  const supabase = await createClient();
  const locale = await getLocale();

  // Use a sensible placeholder title so the row passes the title_required
  // check. Editors immediately rename it on the editor page.
  const { data, error } = await supabase.rpc("save_podcast_episode_draft", {
    p_episode_id: null,
    p_payload: {
      title: "Untitled episode",
      language_code: locale,
    },
  });

  if (error || !data) {
    throw new Error(error?.message ?? "create_failed");
  }

  revalidatePath(`/${locale}/admin/podcast`);
  redirect(`/${locale}/admin/podcast/${data}`);
}