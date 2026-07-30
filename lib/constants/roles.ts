export const APP_ROLES = [
  "super_admin",
  "managing_editor",
  "moderator",
  "resource_editor",
  "translator",
  "researcher",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const STAFF_ROLES: readonly AppRole[] = [
  "super_admin",
  "managing_editor",
  "moderator",
  "resource_editor",
  "translator",
  "researcher",
];

export function isStaff(roles: readonly AppRole[]): boolean {
  return roles.some((role) => STAFF_ROLES.includes(role));
}

export function isAdmin(roles: readonly AppRole[]): boolean {
  return roles.includes("super_admin");
}

export function isEditorOrAdmin(roles: readonly AppRole[]): boolean {
  return roles.includes("managing_editor") || roles.includes("super_admin");
}
