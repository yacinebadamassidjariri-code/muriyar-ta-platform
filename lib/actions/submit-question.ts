"use server";

import { createClient } from "@/lib/supabase/server";

const QUESTION_MIN = 50;
const QUESTION_MAX = 800;

export type QuestionSubmitState = {
  status: "idle" | "success" | "error";
  errors?: {
    question?: string;
    consent?: string;
    form?: string;
  };
};

/**
 * Anonymous question intake.
 * Calls the SECURITY DEFINER submit_question() RPC via the server Supabase client.
 * No identity, IP, or readback is collected or returned.
 */
export async function submitQuestion(
  _prev: QuestionSubmitState,
  formData: FormData,
): Promise<QuestionSubmitState> {
  const question = String(formData.get("question") ?? "").trim();
  const languageCode = String(formData.get("language") ?? "en");
  const topicId = formData.get("topic_id");
  const consent =
    formData.get("consent") === "on" || formData.get("consent") === "true";
  const locale = String(formData.get("locale") ?? "en");

  // Client-side validation mirror (RPC enforces server-side)
  if (!consent) {
    return { status: "error", errors: { consent: "consent_required" } };
  }
  if (question.length < QUESTION_MIN) {
    return { status: "error", errors: { question: "too_short" } };
  }
  if (question.length > QUESTION_MAX) {
    return { status: "error", errors: { question: "too_long" } };
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch (initErr) {
    console.error("[submit-question] supabase client init failed", {
      error: initErr instanceof Error ? initErr.message : String(initErr),
    });
    return { status: "error", errors: { form: "submit_failed" } };
  }

  try {
    const { error } = await supabase.rpc("submit_question", {
      p_question: question,
      p_language_code: languageCode,
      p_consent: true,
      p_consent_language: locale,
      // Pass null (not empty string) when topic not selected
      p_topic_id: topicId && topicId !== "" ? topicId : null,
    });

    if (error) {
      const code = error.message;
      if (code === "too_short") {
        return { status: "error", errors: { question: "too_short" } };
      }
      if (code === "consent_required") {
        return { status: "error", errors: { consent: "consent_required" } };
      }
      if (code === "rate_limited" || code === "rate_limit_exceeded") {
        return { status: "error", errors: { form: "rate_limited" } };
      }
      console.error("[submit-question] rpc error", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return { status: "error", errors: { form: "submit_failed" } };
    }

    return { status: "success" };
  } catch (err) {
    console.error("[submit-question] unexpected exception", {
      error: err instanceof Error ? err.message : String(err),
      type: err instanceof Error ? err.constructor.name : typeof err,
    });
    return { status: "error", errors: { form: "submit_failed" } };
  }
}
