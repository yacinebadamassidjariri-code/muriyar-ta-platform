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
    internal_notes: (formData.get("internal_notes") as string | null)?.trim() || null,
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
  orgId: string,
  formData: FormData,
): Promise<{ ok: true; value: { invoice_id: string } } | { ok: false; error: string }> {
  try {
    await requirePermission("commercial.edit");
  } catch {
    return { ok: false, error: "You do not have permission to create invoices." };
  }

  if (!orgId) return { ok: false, error: "Organization is required." };

  const amountRaw = formData.get("amount_usd") as string | null;
  const amount_usd = amountRaw && !isNaN(parseFloat(amountRaw)) ? parseFloat(amountRaw) : null;
  if (!amount_usd || amount_usd <= 0) {
    return { ok: false, error: "A valid invoice amount is required." };
  }

  const issueDateRaw = (formData.get("issue_date") as string | null) || null;
  const issue_date = issueDateRaw || new Date().toISOString().slice(0, 10);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_invoice", {
    p_org_id: orgId,
    p_contract_id: contractId || null,
    p_amount_usd: amount_usd,
    p_issue_date: issue_date,
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

  const paymentDateRaw = (formData.get("payment_date") as string | null) || null;
  const payment_date = paymentDateRaw || new Date().toISOString().slice(0, 10);

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_invoice_payment", {
    p_invoice_id: invoiceId,
    p_payment_date: payment_date,
    p_amount_usd: amount_usd,
    p_currency: "USD",
    p_reference: (formData.get("reference") as string | null)?.trim() || null,
    p_notes: (formData.get("notes") as string | null)?.trim() || null,
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

// ---------------------------------------------------------------------------
// Save contract (create or update)
// ---------------------------------------------------------------------------

export async function saveContractAction(
  contractId: string | null,
  formData: FormData,
): Promise<{ ok: true; value: { contract_id: string } } | { ok: false; error: string }> {
  try {
    await requirePermission("commercial.edit");
  } catch {
    return { ok: false, error: "You do not have permission to edit contracts." };
  }

  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const orgId = (formData.get("org_id") as string | null)?.trim() ?? "";
  const contractNumber = (formData.get("contract_number") as string | null)?.trim() ?? "";
  const contractValueRaw = formData.get("contract_value_usd") as string | null;
  const contract_value_usd =
    contractValueRaw && !isNaN(parseFloat(contractValueRaw))
      ? parseFloat(contractValueRaw)
      : null;

  if (!title) return { ok: false, error: "Contract title is required." };
  if (!orgId) return { ok: false, error: "Organization is required." };
  if (!contractNumber) return { ok: false, error: "Contract number is required." };
  if (contract_value_usd === null || contract_value_usd < 0)
    return { ok: false, error: "A valid contract value is required." };

  const fields = {
    title,
    org_id: orgId,
    contract_number: contractNumber,
    contract_value_usd,
    status: (formData.get("status") as string | null) || "DRAFT",
    opportunity_id: (formData.get("opportunity_id") as string | null) || null,
    proposal_id: (formData.get("proposal_id") as string | null) || null,
    contract_date: (formData.get("contract_date") as string | null) || null,
    start_date: (formData.get("start_date") as string | null) || null,
    end_date: (formData.get("end_date") as string | null) || null,
    deliverables: (formData.get("deliverables") as string | null)?.trim() || null,
    obligations: (formData.get("obligations") as string | null)?.trim() || null,
    internal_notes: (formData.get("internal_notes") as string | null)?.trim() || null,
  };

  const supabase = await createClient();

  if (contractId) {
    const { data, error } = await supabase
      .from("commercial_contracts")
      .update(fields)
      .eq("contract_id", contractId)
      .select("contract_id")
      .single();

    if (error) {
      if (error.code === "42501") return { ok: false, error: "Permission denied." };
      if (error.code === "23505") return { ok: false, error: "A contract with this number already exists." };
      return { ok: false, error: "Contract could not be saved." };
    }
    return { ok: true, value: { contract_id: data.contract_id } };
  }

  const { data, error } = await supabase
    .from("commercial_contracts")
    .insert(fields)
    .select("contract_id")
    .single();

  if (error) {
    if (error.code === "42501") return { ok: false, error: "Permission denied." };
    if (error.code === "23505") return { ok: false, error: "A contract with this number already exists." };
    return { ok: false, error: "Contract could not be created." };
  }
  return { ok: true, value: { contract_id: data.contract_id } };
}

// ---------------------------------------------------------------------------
// Save service package (edit only — packages are pre-seeded, not created ad-hoc)
// Internal cost fields (est_labor_cost_usd, est_overhead_usd) are stored here
// but MUST NEVER appear in any client-facing output.
// ---------------------------------------------------------------------------

export async function savePackageAction(
  packageId: string,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requirePermission("commercial.edit");
  } catch {
    return { ok: false, error: "You do not have permission to edit service packages." };
  }

  if (!packageId) return { ok: false, error: "Package ID is required." };

  const basePriceRaw = formData.get("base_price_usd") as string | null;
  const base_price_usd =
    basePriceRaw && !isNaN(parseFloat(basePriceRaw)) ? parseFloat(basePriceRaw) : null;

  const laborRaw = formData.get("est_labor_cost_usd") as string | null;
  const est_labor_cost_usd =
    laborRaw && !isNaN(parseFloat(laborRaw)) ? parseFloat(laborRaw) : null;

  const overheadRaw = formData.get("est_overhead_usd") as string | null;
  const est_overhead_usd =
    overheadRaw && !isNaN(parseFloat(overheadRaw)) ? parseFloat(overheadRaw) : null;

  const staffHoursRaw = formData.get("est_staff_hours") as string | null;
  const est_staff_hours =
    staffHoursRaw && !isNaN(parseInt(staffHoursRaw)) ? parseInt(staffHoursRaw) : null;

  const deliverablesRaw = (formData.get("deliverables") as string | null)?.trim() || null;

  const fields = {
    description: (formData.get("description") as string | null)?.trim() || null,
    deliverables: deliverablesRaw
      ? deliverablesRaw.split("\n").map((s) => s.trim()).filter(Boolean)
      : null,
    base_price_usd,
    price_is_provisional: formData.get("price_is_provisional") === "true",
    pricing_notes: (formData.get("pricing_notes") as string | null)?.trim() || null,
    // Internal cost assumptions — MUST NEVER appear in client-facing materials.
    est_staff_hours,
    est_labor_cost_usd,
    est_overhead_usd,
    is_active: formData.get("is_active") === "true",
  };

  const supabase = await createClient();
  const { error } = await supabase
    .from("service_packages")
    .update(fields)
    .eq("package_id", packageId);

  if (error) {
    if (error.code === "42501") return { ok: false, error: "Permission denied." };
    return { ok: false, error: "Package could not be saved. Please try again." };
  }
  return { ok: true };
}
