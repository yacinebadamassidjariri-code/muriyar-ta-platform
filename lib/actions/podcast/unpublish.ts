"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

const KNOWN_CODES = new Set<string>([
  "forbidden",
  "not_found",
  "podcast_not_published",
]);

export async function unpublishAction(formData: FormData): Promise<void> {
  const locale = await getLocale();
  const episodeId = formData.get("episode_id");
  if (typeof episodeId !== "string" || !episodeId) {
    redirect(`/${locale}/admin/podcast`);
  }

  const id = episodeId as string;
  const supabase = await createClient();

  const { error } = await supabase.rpc("unpublish_podcast_episode", {
    p_episode_id: id,
  });

  if (error) {
    const code = error.message;
    const errorParam = KNOWN_CODES.has(code) ? code : "rpc_error";
    redirect(`/${locale}/admin/podcast/${id}?error=${errorParam}`);
  }

  revalidatePath(`/${locale}/admin/podcast`);
  revalidatePath(`/${locale}/admin/podcast/${id}`);
  redirect(`/${locale}/admin/podcast/${id}`);
}