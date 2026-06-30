"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PublishStoryInput = {
  submissionId: string;
  title: string;
  body: string;
};

export type PublishStoryResult =
  | { ok: true; storyId: string }
  | { ok: false; error: string };

export async function publishStory(
  input: PublishStoryInput,
): Promise<PublishStoryResult> {
  const supabase = await createClient();

const { data, error } = await supabase.rpc("publish_story", {
  p_submission_id: input.submissionId,
  p_title: input.title,
  p_body: input.body,
});

console.log("PUBLISH DATA:", data);
console.log("PUBLISH ERROR:", error);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/[locale]/admin/publishing", "layout");

  return {
    ok: true,
    storyId: String(data),
  };
}