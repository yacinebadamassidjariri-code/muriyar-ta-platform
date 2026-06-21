"use server";

import { createClient } from "@/lib/supabase/server";
import { validateSubmission, type SubmissionErrors } from "@/lib/validation/submission";

export type SubmitState = {
  status: "idle" | "success" | "error";
  errors?: SubmissionErrors & { form?: string };
};

/**
 * Anonymous story intake (Application Structure §7: server-action mutation).
 * Calls the SECURITY DEFINER submit_story() RPC via the server Supabase client.
 * No identity, IP, or readback is collected or returned.
 */
export async function submitStory(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const input = {
    language: String(formData.get("language") ?? ""),
    story: String(formData.get("story") ?? ""),
    consent:
      formData.get("consent") === "on" || formData.get("consent") === "true",
    locale: String(formData.get("locale") ?? "en"),
  };

  const { ok, errors, data } = validateSubmission(input);
  if (!ok) return { status: "error", errors };

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("submit_story", {
      p_body: data.story,
      p_language_code: data.language,
      p_consent: true,
      p_consent_language: input.locale,
    });

    if (error) {
      // Map known server-side validation errors back to fields where possible.
      const code = error.message;
      if (code === "too_short") return { status: "error", errors: { story: "story_short" } };
      if (code === "consent_required") return { status: "error", errors: { consent: "consent_required" } };
      if (code === "unsupported_language") return { status: "error", errors: { language: "language_invalid" } };
      return { status: "error", errors: { form: "submit_failed" } };
    }

    return { status: "success" };
  } catch {
    return { status: "error", errors: { form: "submit_failed" } };
  }
}
