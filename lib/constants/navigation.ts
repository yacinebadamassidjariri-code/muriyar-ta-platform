import type { AppRole } from "./roles";

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

// Admin sidebar. Labels are English-first (internal staff tool); each item is
// gated by role to match the RLS/permission model.
export const adminNav: { href: string; label: string; roles: AppRole[] }[] = [
  { href: "/admin/moderation", label: "Moderation", roles: ["moderator", "editor", "administrator"] },
  { href: "/admin/stories", label: "Stories", roles: ["editor", "administrator"] },
  { href: "/admin/podcast", label: "Podcast", roles: ["editor", "administrator"] },
  { href: "/admin/resources", label: "Resources", roles: ["editor", "administrator"] },
  { href: "/admin/newsletter", label: "Newsletter", roles: ["editor", "administrator"] },
  { href: "/admin/report", label: "Reports", roles: ["editor", "administrator"] },
  { href: "/admin/partnerships", label: "Partnerships", roles: ["administrator"] },
  { href: "/admin/users", label: "Users", roles: ["administrator"] },
  { href: "/admin/audit", label: "Audit Log", roles: ["administrator"] },
  { href: "/admin/founder", label: "Founder Dashboard", roles: ["administrator"] },
  { href: "/admin/settings", label: "Settings", roles: ["administrator"] },
];
