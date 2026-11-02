"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guards";

// ---------------------------------------------------------------------------
// Save brief (create or update draft)
// ---------------------------------------------------------------------------

export async function saveBriefAction(
  briefId: string | null,
  formData: FormData,
): Promise<{ ok: true; value: { brief_id: string } } | { ok: false; error: string }> {
  try {
    await requirePermission("insight.brief.edit");
  } catch {
    return { ok: false, error: "You do not have permission to edit briefs." };
  }

  const title = (formData.get("title") as string | null)?.trim() ?? "";
  if (!title) return { ok: false, error: "Title is required." };

  const fields = {
    title,
    subtitle: (formData.get("subtitle") as string | null)?.trim() || null,
    research_theme: (formData.get("research_theme") as string | null)?.trim() || null,
    language_code: (formData.get("language_code") as string | null) || "en",
    is_sample: formData.get("is_sample") === "on",
    research_questions:
      (formData.get("research_questions") as string | null)?.trim() || null,
    executive_summary:
      (formData.get("executive_summary") as string | null)?.trim() || null,
    methodology: (formData.get("methodology") as string | null)?.trim() || null,
    findings: (formData.get("findings") as string | null)?.trim() || null,
    recommendations:
      (formData.get("recommendations") as string | null)?.trim() || null,
    limitations: (formData.get("limitations") as string | null)?.trim() || null,
    references_text:
      (formData.get("references_text") as string | null)?.trim() || null,
  };

  const supabase = await createClient();

  if (briefId) {
    // Update — only allowed if currently DRAFT (enforced by DB policy on write)
    const { data, error } = await supabase
      .from("institutional_briefs")
      .update({ ...fields, status: "DRAFT" })
      .eq("brief_id", briefId)
      .select("brief_id")
      .single();

    if (error) {
      if (error.code === "42501") return { ok: false, error: "Permission denied." };
      return { ok: false, error: "Brief could not be saved. Please try again." };
    }
    return { ok: true, value: { brief_id: data.brief_id } };
  }

  // Create new
  const { data, error } = await supabase
    .from("institutional_briefs")
    .insert({ ...fields, status: "DRAFT" })
    .select("brief_id")
    .single();

  if (error) {
    if (error.code === "42501") return { ok: false, error: "Permission denied." };
    return { ok: false, error: "Brief could not be created. Please try again." };
  }
  return { ok: true, value: { brief_id: data.brief_id } };
}

// ---------------------------------------------------------------------------
// Brief workflow transition (wraps DB RPC brief_transition)
// ---------------------------------------------------------------------------

export async function briefTransitionAction(
  briefId: string,
  action: string,
  note?: string,
): Promise<{ ok: true; value: string } | { ok: false; error: string }> {
  // Permission check is enforced inside the RPC — guard here is belt-and-suspenders
  try {
    await requirePermission("insight.brief.read");
  } catch {
    return { ok: false, error: "Insufficient permissions." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("brief_transition", {
    p_brief_id: briefId,
    p_action: action,
    p_note: note ?? null,
  });

  if (error) {
    const msg = error.message.includes("invalid_transition")
      ? "This transition is not allowed from the current status."
      : error.message.includes("forbidden")
        ? "You do not have permission to perform this action."
        : error.message.includes("title_required")
          ? "A title is required before publishing."
          : "The transition could not be applied. Please try again.";
    return { ok: false, error: msg };
  }

  return { ok: true, value: data as string };
}

// ---------------------------------------------------------------------------
// Revalidate evidence consent (wraps DB RPC revalidate_evidence_consent)
// ---------------------------------------------------------------------------

export async function revalidateConsentAction(
  linkId: string,
): Promise<{ ok: true; value: { consent_active: boolean } } | { ok: false; error: string }> {
  try {
    await requirePermission("insight.evidence.review");
  } catch {
    return { ok: false, error: "Insufficient permissions for evidence review." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("revalidate_evidence_consent", {
    p_link_id: linkId,
  });

  if (error) {
    const msg = error.message.includes("forbidden")
      ? "You do not have permission to review evidence."
      : error.message.includes("not_found")
        ? "Evidence link not found."
        : "Consent revalidation failed. Please try again.";
    return { ok: false, error: msg };
  }

  const result = data as { consent_active: boolean };
  return { ok: true, value: result };
}
