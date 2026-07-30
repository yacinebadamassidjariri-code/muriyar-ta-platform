import type { Permission } from "./permissions";

// Public navigation. `key` indexes the "nav" message namespace; `href` is a
// locale-agnostic path (the i18n <Link> adds the locale prefix).
// Ordered as two editorial clusters: the "voices" a reader encounters and adds
// to (Stories, Podcast, Share your story), then the surrounding context
// (Resources, Report, About). Hrefs are unchanged; only the sequence reflects
// Muriyar Ta's editorial priorities. Consumed only by the masthead.
export const mainNav = [
  { key: "stories", href: "/stories" },
  { key: "podcast", href: "/podcast" },
  { key: "submit", href: "/submit" },
  { key: "resources", href: "/resources" },
  { key: "reports", href: "/report" },
  { key: "about", href: "/about" },
] as const;

// Pre-launch presentation only. Routes omitted here remain directly accessible;
// the server-side mode flag changes navigation emphasis, never route access.
export const prelaunchNav = [
  { key: "submit", href: "/submit" },
  { key: "about", href: "/#about-founder" },
] as const;

export const footerNav = [
  { key: "stories", href: "/stories" },
  { key: "podcast", href: "/podcast" },
  { key: "resources", href: "/resources" },
  { key: "reports", href: "/report" },
  { key: "contact", href: "/contact" },
  { key: "about", href: "/about" },
] as const;

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
