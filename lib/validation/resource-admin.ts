export const RESOURCE_STATUSES = ["draft", "published", "archived"] as const;
export const RESOURCE_PRIORITIES = ["high", "medium", "low"] as const;

export type ResourceAdminInput = {
  resourceId?: string | null;
  name: string;
  description: string;
  websiteUrl: string;
  phone: string;
  email: string;
  address: string;
  socialLinks: Record<string, string>;
  categoryIds: number[];
  regionIds: number[];
  languageCodes: string[];
  isCrisisResource: boolean;
  editorialPriority: "high" | "medium" | "low" | null;
  isFeatured: boolean;
  sortOrder: number;
  internalNotes: string;
};

export type ResourceAdminValidation =
  | { ok: true; value: ResourceAdminInput }
  | { ok: false; fieldErrors: Record<string, string> };

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return "";
  const cleaned = value.trim();
  return cleaned.length <= max ? cleaned : null;
}

export function validateResourceAdminInput(
  input: ResourceAdminInput,
): ResourceAdminValidation {
  const errors: Record<string, string> = {};
  const name = text(input.name, 200);
  const description = text(input.description, 10_000);
  const websiteUrl = text(input.websiteUrl, 500);
  const phone = text(input.phone, 60);
  const email = text(input.email, 200);
  const address = text(input.address, 1_000);
  const internalNotes = text(input.internalNotes, 5_000);

  if (!name) errors.name = "required";
  if (description === null) errors.description = "too_long";
  if (websiteUrl === null) errors.websiteUrl = "too_long";
  else if (websiteUrl && !/^https?:\/\/\S+$/i.test(websiteUrl)) errors.websiteUrl = "invalid_url";
  if (phone === null) errors.phone = "too_long";
  if (email === null) errors.email = "too_long";
  else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "invalid_email";
  if (address === null) errors.address = "too_long";
  if (internalNotes === null) errors.internalNotes = "too_long";
  if (!Array.isArray(input.categoryIds) || input.categoryIds.length === 0) errors.categoryIds = "required";
  if (!Number.isInteger(input.sortOrder) || input.sortOrder < -100_000 || input.sortOrder > 100_000) {
    errors.sortOrder = "invalid_number";
  }
  const socialLinks: Record<string, string> = {};
  for (const [network, raw] of Object.entries(input.socialLinks ?? {})) {
    const value = text(raw, 500);
    if (value === null || (value && !/^https?:\/\/\S+$/i.test(value))) {
      errors[`socialLinks.${network}`] = "invalid_url";
    } else if (value) socialLinks[network] = value;
  }
  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };

  return {
    ok: true,
    value: {
      ...input,
      name: name!,
      description: description!,
      websiteUrl: websiteUrl!,
      phone: phone!,
      email: email!.toLowerCase(),
      address: address!,
      internalNotes: internalNotes!,
      categoryIds: [...new Set(input.categoryIds)].sort((a, b) => a - b),
      regionIds: [...new Set(input.regionIds)].sort((a, b) => a - b),
      languageCodes: [...new Set(input.languageCodes)].sort(),
      socialLinks,
    },
  };
}
