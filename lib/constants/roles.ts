// Mirrors the roles seeded in seed.sql.
export const APP_ROLES = [
  "anonymous_contributor",
  "registered_reader",
  "moderator",
  "editor",
  "administrator",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const STAFF_ROLES: readonly AppRole[] = [
  "moderator",
  "editor",
  "administrator",
];

export function isStaff(role: AppRole | null | undefined): boolean {
  return !!role && STAFF_ROLES.includes(role);
}

export function isAdmin(role: AppRole | null | undefined): boolean {
  return role === "administrator";
}

export function isEditorOrAdmin(role: AppRole | null | undefined): boolean {
  return role === "editor" || role === "administrator";
}
