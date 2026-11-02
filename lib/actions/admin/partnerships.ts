"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/guards";

// ---------------------------------------------------------------------------
// Save organization (create or update)
// ---------------------------------------------------------------------------

export async function saveOrganizationAction(
  orgId: string | null,
  formData: FormData,
): Promise<{ ok: true; value: { org_id: string } } | { ok: false; error: string }> {
  try {
    await requirePermission("commercial.edit");
  } catch {
    return { ok: false, error: "You do not have permission to edit organizations." };
  }

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  if (!name) return { ok: false, error: "Organization name is required." };

  const areasRaw = (formData.get("areas_of_interest") as string | null)?.trim();
  const areas_of_interest = areasRaw
    ? areasRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : null;

  const fields = {
    name,
    org_type: (formData.get("org_type") as string | null)?.trim() || null,
    country: (formData.get("country") as string | null)?.trim() || null,
    geographic_focus: (formData.get("geographic_focus") as string | null)?.trim() || null,
    website: (formData.get("website") as string | null)?.trim() || null,
    contact_name: (formData.get("contact_name") as string | null)?.trim() || null,
    contact_email: (formData.get("contact_email") as string | null)?.trim() || null,
    contact_phone: (formData.get("contact_phone") as string | null)?.trim() || null,
    areas_of_interest,
    partnership_status:
      (formData.get("partnership_status") as string | null) || "PROSPECT",
    next_followup_date:
      (formData.get("next_followup_date") as string | null) || null,
    internal_notes: (formData.get("internal_notes") as string | null)?.trim() || null,
  };

  const supabase = await createClient();

  if (orgId) {
    const { data, error } = await supabase
      .from("institutional_organizations")
      .update(fields)
      .eq("org_id", orgId)
      .select("org_id")
      .single();

    if (error) {
      if (error.code === "42501") return { ok: false, error: "Permission denied." };
      return { ok: false, error: "Organization could not be saved. Please try again." };
    }
    return { ok: true, value: { org_id: data.org_id } };
  }

  const { data, error } = await supabase
    .from("institutional_organizations")
    .insert(fields)
    .select("org_id")
    .single();

  if (error) {
    if (error.code === "42501") return { ok: false, error: "Permission denied." };
    if (error.code === "23505") return { ok: false, error: "An organization with this name already exists." };
    return { ok: false, error: "Organization could not be created. Please try again." };
  }
  return { ok: true, value: { org_id: data.org_id } };
}

// ---------------------------------------------------------------------------
// Save opportunity
// ---------------------------------------------------------------------------

export async function saveOpportunityAction(
  opportunityId: string | null,
  formData: FormData,
): Promise<{ ok: true; value: { opportunity_id: string } } | { ok: false; error: string }> {
  try {
    await requirePermission("commercial.edit");
  } catch {
    return { ok: false, error: "You do not have permission to edit opportunities." };
  }

  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const orgId = (formData.get("org_id") as string | null)?.trim() ?? "";
  if (!title) return { ok: false, error: "Title is required." };
  if (!orgId) return { ok: false, error: "Organization is required." };

  const estimatedRaw = formData.get("estimated_value_usd") as string | null;
  const estimated_value_usd =
    estimatedRaw && !isNaN(parseFloat(estimatedRaw))
      ? parseFloat(estimatedRaw)
      : null;

  const fields = {
    title,
    org_id: orgId,
    research_theme: (formData.get("research_theme") as string | null)?.trim() || null,
    estimated_value_usd,
    expected_close_date:
      (formData.get("expected_close_date") as string | null) || null,
    stage: (formData.get("stage") as string | null) || "LEAD",
    next_followup_date:
      (formData.get("next_followup_date") as string | null) || null,
    package_id: (formData.get("package_id") as string | null) || null,
    notes: (formData.get("notes") as string | null)?.trim() || null,
  };

  const supabase = await createClient();

  if (opportunityId) {
    const { data, error } = await supabase
      .from("commercial_opportunities")
      .update(fields)
      .eq("opportunity_id", opportunityId)
      .select("opportunity_id")
      .single();

    if (error) {
      if (error.code === "42501") return { ok: false, error: "Permission denied." };
      return { ok: false, error: "Opportunity could not be saved." };
    }
    return { ok: true, value: { opportunity_id: data.opportunity_id } };
  }

  const { data, error } = await supabase
    .from("commercial_opportunities")
    .insert(fields)
    .select("opportunity_id")
    .single();

  if (error) {
    if (error.code === "42501") return { ok: false, error: "Permission denied." };
    return { ok: false, error: "Opportunity could not be created." };
  }
  return { ok: true, value: { opportunity_id: data.opportunity_id } };
}

// ---------------------------------------------------------------------------
// Create invoice (wraps DB RPC create_invoice)
// ---------------------------------------------------------------------------

export async function createInvoiceAction(
  contractId: string,
  formData: FormData,
): Promise<{ ok: true; value: { invoice_id: string } } | { ok: false; error: string }> {
  try {
    await requirePermission("commercial.edit");
  } catch {
    return { ok: false, error: "You do not have permission to create invoices." };
  }

  const amountRaw = formData.get("amount_usd") as string | null;
  const amount_usd = amountRaw && !isNaN(parseFloat(amountRaw)) ? parseFloat(amountRaw) : null;
  if (!amount_usd || amount_usd <= 0) {
    return { ok: false, error: "A valid invoice amount is required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_invoice", {
    p_contract_id: contractId,
    p_amount_usd: amount_usd,
    p_due_date: (formData.get("due_date") as string | null) || null,
    p_title: (formData.get("title") as string | null)?.trim() || null,
  });

  if (error) {
    const msg = error.message.includes("forbidden")
      ? "You do not have permission to create invoices."
      : error.message.includes("no_contract")
        ? "Contract not found."
        : "Invoice could not be created. Please try again.";
    return { ok: false, error: msg };
  }

  return { ok: true, value: { invoice_id: data as string } };
}

// ---------------------------------------------------------------------------
// Record invoice payment (wraps DB RPC record_invoice_payment)
// ---------------------------------------------------------------------------

export async function recordPaymentAction(
  invoiceId: string,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requirePermission("commercial.edit");
  } catch {
    return { ok: false, error: "You do not have permission to record payments." };
  }

  const amountRaw = formData.get("amount_usd") as string | null;
  const amount_usd = amountRaw && !isNaN(parseFloat(amountRaw)) ? parseFloat(amountRaw) : null;
  if (!amount_usd || amount_usd <= 0) {
    return { ok: false, error: "A valid payment amount is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_invoice_payment", {
    p_invoice_id: invoiceId,
    p_amount_usd: amount_usd,
    p_payment_date: (formData.get("payment_date") as string | null) || null,
    p_payment_method:
      (formData.get("payment_method") as string | null)?.trim() || null,
    p_reference: (formData.get("reference") as string | null)?.trim() || null,
  });

  if (error) {
    const msg = error.message.includes("forbidden")
      ? "You do not have permission to record payments."
      : error.message.includes("overpayment")
        ? "Payment amount exceeds the remaining balance on this invoice."
        : "Payment could not be recorded. Please try again.";
    return { ok: false, error: msg };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Save proposal
// ---------------------------------------------------------------------------

export async function saveProposalAction(
  proposalId: string | null,
  formData: FormData,
): Promise<{ ok: true; value: { proposal_id: string } } | { ok: false; error: string }> {
  try {
    await requirePermission("commercial.edit");
  } catch {
    return { ok: false, error: "You do not have permission to edit proposals." };
  }

  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const orgId = (formData.get("org_id") as string | null)?.trim() ?? "";
  if (!title) return { ok: false, error: "Title is required." };
  if (!orgId) return { ok: false, error: "Organization is required." };

  const quotedRaw = formData.get("quoted_price_usd") as string | null;
  const quoted_price_usd =
    quotedRaw && !isNaN(parseFloat(quotedRaw)) ? parseFloat(quotedRaw) : null;

  const fields = {
    title,
    org_id: orgId,
    quoted_price_usd,
    status: (formData.get("status") as string | null) || "DRAFT",
    opportunity_id: (formData.get("opportunity_id") as string | null) || null,
    package_id: (formData.get("package_id") as string | null) || null,
    scope_description:
      (formData.get("scope_description") as string | null)?.trim() || null,
    sent_at: (formData.get("sent_at") as string | null) || null,
  };

  const supabase = await createClient();

  if (proposalId) {
    const { data, error } = await supabase
      .from("commercial_proposals")
      .update(fields)
      .eq("proposal_id", proposalId)
      .select("proposal_id")
      .single();

    if (error) {
      if (error.code === "42501") return { ok: false, error: "Permission denied." };
      return { ok: false, error: "Proposal could not be saved." };
    }
    return { ok: true, value: { proposal_id: data.proposal_id } };
  }

  const { data, error } = await supabase
    .from("commercial_proposals")
    .insert(fields)
    .select("proposal_id")
    .single();

  if (error) {
    if (error.code === "42501") return { ok: false, error: "Permission denied." };
    return { ok: false, error: "Proposal could not be created." };
  }
  return { ok: true, value: { proposal_id: data.proposal_id } };
}
