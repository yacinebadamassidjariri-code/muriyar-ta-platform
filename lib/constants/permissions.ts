// Mirrors the permission catalog seeded in seed.sql. Server-side permission checks
// resolve through the has_permission() RPC (see lib/auth/guards.ts); this union is
// for type-safe references in code.
export const PERMISSIONS = [
  "submission.create",
  "public.read",
  "newsletter.subscribe",
  "report.download",
  "contact.create",
  "submission.review",
  "submission.deidentify",
  "submission.disposition",
  "submission.escalate",
  "moderation.note",
  "story.publish",
  "podcast.manage",
  "resource.manage",
  "report.manage",
  "campaign.create",
  "social.schedule",
  "partnership.manage",
  "user.manage",
  "role.assign",
  "settings.configure",
  "analytics.view",
  "founder_dashboard.view",
  "audit.view",
  "data.export",
] as const;

export type Permission = (typeof PERMISSIONS)[number];
