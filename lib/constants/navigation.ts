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
  { key: "ask", href: "/ask" },
  { key: "insights", href: "/insights" },
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
    { key: "ask", href: "/ask" },
    { key: "submit", href: "/submit" },
  ],
  organization: [
    { key: "about", href: "/about" },
    { key: "insights", href: "/insights" },
    { key: "partner", href: "/partner", footerKey: true },
    { key: "contact", href: "/contact" },
  ],
  legal: [
    { key: "crisisResources", href: "/resources/crisis", footerKey: true },
    { key: "reportConcern", href: "/report", footerKey: true },
  ],
} as const;

export type AdminNavKey =
  | "overview"
  | "moderation"
  | "questions"
  | "podcast"
  | "resources"
  // Phase 3 — Institutional Insights
  | "insightsOverview"
  | "insightsBriefs"
  | "insightsNewBrief"
  | "insightsEvidence"
  // Phase 3 — Partnerships & Commercial
  | "partnershipsOverview"
  | "partnershipsOrganizations"
  | "partnershipsPipeline"
  | "partnershipsProposals"
  | "partnershipsContracts"
  | "partnershipsInvoices"
  | "partnershipsPackages";

// Phase 1 exposes only routes that exist. The shell filters this list against
// the caller's capabilities; database/RPC checks remain authoritative.
export const adminNav: {
  href: string;
  key: AdminNavKey;
  permission: Permission;
  group?: string;
}[] = [
  { href: "/admin", key: "overview", permission: "admin.access" },
  {
    href: "/admin/moderation",
    key: "moderation",
    permission: "submission.queue.read",
  },
  {
    href: "/admin/questions",
    key: "questions",
    permission: "question.queue.read",
  },
  { href: "/admin/podcasts", key: "podcast", permission: "podcast.edit" },
  { href: "/admin/resources", key: "resources", permission: "resource.edit" },
  // Phase 3 — Institutional Insights
  {
    href: "/admin/insights",
    key: "insightsOverview",
    permission: "insight.brief.read",
    group: "insights",
  },
  {
    href: "/admin/insights/briefs",
    key: "insightsBriefs",
    permission: "insight.brief.read",
    group: "insights",
  },
  {
    href: "/admin/insights/briefs/new",
    key: "insightsNewBrief",
    permission: "insight.brief.edit",
    group: "insights",
  },
  {
    href: "/admin/insights/evidence",
    key: "insightsEvidence",
    permission: "insight.evidence.review",
    group: "insights",
  },
  // Phase 3 — Partnerships & Commercial
  {
    href: "/admin/partnerships",
    key: "partnershipsOverview",
    permission: "commercial.read",
    group: "partnerships",
  },
  {
    href: "/admin/partnerships/organizations",
    key: "partnershipsOrganizations",
    permission: "commercial.read",
    group: "partnerships",
  },
  {
    href: "/admin/partnerships/pipeline",
    key: "partnershipsPipeline",
    permission: "commercial.read",
    group: "partnerships",
  },
  {
    href: "/admin/partnerships/proposals",
    key: "partnershipsProposals",
    permission: "commercial.read",
    group: "partnerships",
  },
  {
    href: "/admin/partnerships/contracts",
    key: "partnershipsContracts",
    permission: "commercial.read",
    group: "partnerships",
  },
  {
    href: "/admin/partnerships/invoices",
    key: "partnershipsInvoices",
    permission: "commercial.read",
    group: "partnerships",
  },
  {
    href: "/admin/partnerships/packages",
    key: "partnershipsPackages",
    permission: "commercial.edit",
    group: "partnerships",
  },
];
