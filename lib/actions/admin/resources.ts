"use server";

import { revalidatePath } from "next/cache";
import {
  authorizeAdminAction,
  isUuid,
  safeDatabaseError,
  type AdminActionErrorCode,
} from "./safe-action";
import {
  validateResourceAdminInput,
  type ResourceAdminInput,
} from "@/lib/validation/resource-admin";

export type ResourceBulkSummary = {
  requested: number;
  updated: number;
  skipped: number;
  already: number;
};

type ResourceActionFailure = {
  ok: false;
  error: AdminActionErrorCode;
  requestId: string;
  fieldErrors?: Record<string, string>;
};

export type ResourceActionResult =
  | { ok: true; resourceId?: string }
  | ResourceActionFailure;

export type ResourceBulkActionResult =
  | { ok: true; bulk: ResourceBulkSummary }
  | ResourceActionFailure;

function refreshResourcePaths() {
  for (const locale of ["en", "fr", "ha", "zar"]) {
    revalidatePath(`/${locale}/admin/resources`);
    revalidatePath(`/${locale}/resources`);
    revalidatePath(`/${locale}/resources/crisis`);
  }
}

export async function saveResourceAction(
  input: ResourceAdminInput,
): Promise<ResourceActionResult> {
  const authorization = await authorizeAdminAction("resource.edit");
  if (!authorization.ok) return authorization;
  const validated = validateResourceAdminInput(input);
  if (!validated.ok) {
    return {
      ok: false,
      error: "invalid_input",
      requestId: authorization.value.requestId,
      fieldErrors: validated.fieldErrors,
    };
  }
  const v = validated.value;
  const { data, error } = await authorization.value.supabase.rpc(
    "resource_admin_save_v2",
    {
      p_resource_id: v.resourceId || null,
      p_payload: {
        name: v.name,
        description: v.description || null,
        website_url: v.websiteUrl || null,
        contact_phone: v.phone || null,
        contact_email: v.email || null,
        address: v.address || null,
        social_links: v.socialLinks,
        category_ids: v.categoryIds,
        region_ids: v.regionIds,
        language_codes: v.languageCodes,
        is_crisis_resource: v.isCrisisResource,
        editorial_priority: v.editorialPriority,
        is_featured: v.isFeatured,
        sort_order: v.sortOrder,
        internal_notes: v.internalNotes || null,
      },
    },
  );
  if (error || typeof data !== "string") {
    return {
      ok: false,
      error: safeDatabaseError(error?.message),
      requestId: authorization.value.requestId,
    };
  }
  refreshResourcePaths();
  return { ok: true, resourceId: data };
}

export async function transitionResourceAction(
  resourceId: string,
  action: "publish" | "unpublish" | "archive" | "restore",
): Promise<ResourceActionResult> {
  const authorization = await authorizeAdminAction("resource.verify");
  if (!authorization.ok) return authorization;
  if (!isUuid(resourceId)) {
    return { ok: false, error: "invalid_input", requestId: authorization.value.requestId };
  }
  const { error } = await authorization.value.supabase.rpc(
    "resource_admin_transition_v2",
    { p_resource_id: resourceId, p_action: action },
  );
  if (error) {
    return { ok: false, error: safeDatabaseError(error.message), requestId: authorization.value.requestId };
  }
  refreshResourcePaths();
  return { ok: true, resourceId };
}

export async function bulkResourceAction(input: {
  resourceIds: string[];
  action: "publish" | "unpublish" | "archive" | "restore" | "assign_category" | "remove_category" | "change_priority";
  categoryId?: number | null;
  priority?: "high" | "medium" | "low" | null;
}): Promise<ResourceBulkActionResult> {
  const permission = ["publish", "unpublish", "archive", "restore"].includes(input.action)
    ? "resource.verify" : "resource.edit";
  const authorization = await authorizeAdminAction(permission);
  if (!authorization.ok) return authorization;
  const ids = [...new Set(input.resourceIds)].filter(isUuid);
  if (ids.length === 0 || ids.length !== input.resourceIds.length || ids.length > 100) {
    return { ok: false, error: "invalid_input", requestId: authorization.value.requestId };
  }
  const { data, error } = await authorization.value.supabase.rpc("resource_admin_bulk_v2", {
    p_resource_ids: ids,
    p_action: input.action,
    p_category_id: input.categoryId ?? null,
    p_priority: input.priority ?? null,
  });
  if (error) {
    return { ok: false, error: safeDatabaseError(error.message), requestId: authorization.value.requestId };
  }
  const bulk = data && typeof data === "object" && !Array.isArray(data)
    ? data as Partial<ResourceBulkSummary>
    : null;
  if (!bulk || ![bulk.requested, bulk.updated, bulk.skipped, bulk.already]
    .every((value) => typeof value === "number" && Number.isInteger(value) && value >= 0)) {
    return { ok: false, error: "request_failed", requestId: authorization.value.requestId };
  }
  refreshResourcePaths();
  return { ok: true, bulk: bulk as ResourceBulkSummary };
}
