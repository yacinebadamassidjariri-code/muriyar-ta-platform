"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_KEYS = [
  "title",
  "slug",
  "description",
  "episode_summary",
  "series_slug",
  "episode_kind",
  "language_code",
  "content_advisory",
  "is_featured",
] as const;

type AllowedKey = (typeof ALLOWED_KEYS)[number];

// Stable error codes the page knows how to map. Any other code becomes a
// generic top-level banner via "rpc_error".
const KNOWN_CODES = new Set<string>([
  "forbidden",
  "not_found",
  "title_required",
  "slug_format",
  "slug_taken",
  "unsupported_language",
  "podcast_invalid_series",
  "podcast_invalid_kind",
  "podcast_invalid_advisory",
  "podcast_description_too_long",
  "podcast_summary_too_long",
  "podcast_featured_requires_published",
  "podcast_not_draft",
  "podcast_not_published",
  "invalid_payload",
]);

const FIELD_FOR_CODE: Record<string, string | undefined> = {
  title_required: "title",
  slug_format: "slug",
  slug_taken: "slug",
  podcast_description_too_long: "description",
  podcast_summary_too_long: "episode_summary",
  unsupported_language: "language_code",
  podcast_invalid_series: "series_slug",
  podcast_invalid_kind: "episode_kind",
  podcast_invalid_advisory: "content_advisory",
  podcast_featured_requires_published: "is_featured",
};

function payloadFromForm(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of ALLOWED_KEYS as readonly AllowedKey[]) {
    if (!formData.has(key)) continue;
    const raw = formData.get(key);

    if (key === "is_featured") {
      // HTML checkbox semantics: present means true, absent means false.
      out.is_featured = raw === "on" || raw === "true";
      continue;
    }

    if (typeof raw === "string") {
      const trimmed = raw.trim();
      // Empty selects/inputs are sent as "" — convert to null on optional fields,
      // skip the key when it's a required field that simply wasn't changed.
      if (
        trimmed === "" &&
        (key === "slug" ||
          key === "description" ||
          key === "episode_summary" ||
          key === "series_slug" ||
          key === "episode_kind")
      ) {
        out[key] = null;
      } else if (trimmed !== "") {
        out[key] = trimmed;
      }
    }
  }
  return out;
}

function backToEditor(
  locale: string,
  episodeId: string,
  errorCode?: string,
  fieldName?: string,
): never {
  const params = new URLSearchParams();
  if (errorCode) {
    params.set("error", KNOWN_CODES.has(errorCode) ? errorCode : "rpc_error");
    if (fieldName) params.set("fields", fieldName);
  }
  const qs = params.toString();
  redirect(
    qs
      ? `/${locale}/admin/podcast/${episodeId}?${qs}`
      : `/${locale}/admin/podcast/${episodeId}`,
  );
}

export async function saveDraftAction(formData: FormData): Promise<void> {
  const locale = await getLocale();
  const episodeId = formData.get("episode_id");
  if (typeof episodeId !== "string" || !episodeId) {
    redirect(`/${locale}/admin/podcast`);
  }

  // Cast safety: episodeId is now guaranteed to be a non-empty string.
  const id = episodeId as string;
  const supabase = await createClient();

  const p_payload = payloadFromForm(formData);

  const { error } = await supabase.rpc("save_podcast_episode_draft", {
    p_episode_id: id,
    p_payload,
  });

  if (error) {
    const code = error.message;
    backToEditor(locale, id, code, FIELD_FOR_CODE[code]);
  }

  revalidatePath(`/${locale}/admin/podcast`);
  revalidatePath(`/${locale}/admin/podcast/${id}`);
  backToEditor(locale, id);
}