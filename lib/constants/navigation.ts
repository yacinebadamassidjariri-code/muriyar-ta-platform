import type { Permission } from "./permissions";

// Public navigation. `key` indexes the "nav" message namespace; `href` is a
// locale-agnostic path (the i18n <Link> adds the locale prefix).
// Centre navigation of the masthead. "Share your story" (/submit) is not
// listed here: the masthead renders it as its own terracotta call to action.
// Consumed only by the masthead.
export const mainNav = [
  { key: "stories", href: "/stories" },
  { key: "podcast", href: "/podcast" },
  { key: "resources", href: "/resources" },
  { key: "about", href: "/about" },
] as const;

// Pre-launch presentation only. Routes omitted here remain directly accessible;
// the server-side mode flag changes navigation emphasis, never route access.
export const prelaunchNav = [
  { key: "submit", href: "/submit" },
  { key: "about", href: "/about" },
] as const;

// Footer groups. Only existing public routes. `key` indexes "nav" unless the
// entry sets `footerKey`, which indexes the "footer" namespace instead.
export const footerNav = {
  platform: [
    { key: "stories", href: "/stories" },
    { key: "podcast", href: "/podcast" },
    { key: "resources", href: "/resources" },
    { key: "submit", href: "/submit" },
  ],
  organization: [
    { key: "about", href: "/about" },
    { key: "partner", href: "/partner", footerKey: true },
    { key: "contact", href: "/contact" },
  ],
  legal: [
    { key: "crisisResources", href: "/resources/crisis", footerKey: true },
    { key: "reportConcern", href: "/report", footerKey: true },
  ],
} as const;

export type AdminNavKey = "overview" | "moderation" | "podcast" | "resources";

// Phase 1 exposes only routes that exist. The shell filters this list against
// the caller's capabilities; database/RPC checks remain authoritative.
export const adminNav: {
  href: string;
  key: AdminNavKey;
  permission: Permission;
}[] = [
  { href: "/admin", key: "overview", permission: "admin.access" },
  {
    href: "/admin/moderation",
    key: "moderation",
    permission: "submission.queue.read",
  },
  { href: "/admin/podcasts", key: "podcast", permission: "podcast.edit" },
  { href: "/admin/resources", key: "resources", permission: "resource.edit" },
];
