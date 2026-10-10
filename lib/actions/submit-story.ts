"use server";

import { createClient } from "@/lib/supabase/server";
import { validateSubmission, type SubmissionErrors } from "@/lib/validation/submission";
import { recordEvent } from "@/lib/actions/record-event";

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
    country: String(formData.get("country") ?? ""),
    region: String(formData.get("region") ?? ""),
    age: String(formData.get("age") ?? ""),
    consent:
      formData.get("consent") === "on" || formData.get("consent") === "true",
    researchConsent:
      formData.get("researchConsent") === "on" ||
      formData.get("researchConsent") === "true",
    locale: String(formData.get("locale") ?? "en"),
  };

  const { ok, errors, data } = validateSubmission(input);
  if (!ok) return { status: "error", errors };

  let supabase;
  try {
    supabase = await createClient();
  } catch (initErr) {
    // Client construction threw — likely a missing env var.
    console.error("[submit-story] supabase client init failed", {
      error: initErr instanceof Error ? initErr.message : String(initErr),
    });
    return { status: "error", errors: { form: "submit_failed" } };
  }

  try {
    const { error } = await supabase.rpc("submit_story", {
      p_body: data.story,
      p_language_code: data.language,
      p_consent: true,
      p_consent_language: input.locale,
      p_research_consent: data.researchConsent,
      p_country: data.country,
      p_region: data.region,
      // PostgREST serialises JS numbers as JSON integers, which PostgreSQL
      // cannot unambiguously resolve to smallint during overload resolution
      // (error 42883). Passing the value as a string lets Postgres cast it
      // explicitly to smallint. null is passed as-is so the column default applies.
      p_age: data.age !== null ? String(data.age) : null,
    });

    if (error) {
      // Map known server-side validation errors back to fields where possible.
      const code = error.message;
      if (code === "too_short") {
        return { status: "error", errors: { story: "story_short" } };
      }
      if (code === "consent_required") {
        return { status: "error", errors: { consent: "consent_required" } };
      }
      if (code === "unsupported_language") {
        return { status: "error", errors: { language: "language_invalid" } };
      }
      if (code === "country_too_long") {
        return { status: "error", errors: { country: "country_long" } };
      }
      if (code === "region_too_long") {
        return { status: "error", errors: { region: "region_long" } };
      }
      if (code === "age_out_of_range") {
        return { status: "error", errors: { age: "age_invalid" } };
      }
      // Unknown RPC error — log structured details for diagnostics.
      // No form data, story content, or personal information is logged.
      console.error("[submit-story] rpc error", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return { status: "error", errors: { form: "submit_failed" } };
    }

    // Record conversion — locale only, no submission ID or personal data.
    void recordEvent("submission_completed", "locale", input.locale);

    return { status: "success" };
  } catch (err) {
    // Unexpected exception (network failure, serialisation error, etc.).
    // No form data, story content, or personal information is logged.
    console.error("[submit-story] unexpected exception", {
      error: err instanceof Error ? err.message : String(err),
      type: err instanceof Error ? err.constructor.name : typeof err,
    });
    return { status: "error", errors: { form: "submit_failed" } };
  }
}
