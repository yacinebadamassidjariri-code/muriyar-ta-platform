export const RISK_LEVELS = ["none", "low", "medium", "high", "critical"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const RISK_FLAGS = [
  "self_harm_concern",
  "violence",
  "child_protection",
  "legal_privacy_concern",
  "requires_escalation",
] as const;
export type RiskFlag = (typeof RISK_FLAGS)[number];

export type StoryDraftInput = {
  submissionId: string;
  title: string;
  body: string;
  excerpt: string;
  featuredQuote: string;
  categoryTagId: number | null;
  tagIds: number[];
  relatedPodcastIds: string[];
  relatedReportIds: string[];
};

export type ReviewInput = {
  submissionId: string;
  riskLevel: RiskLevel;
  riskFlags: string[];
  note: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanIds(values: unknown, kind: "number" | "uuid") {
  if (!Array.isArray(values) || values.length > 30) return null;
  const unique = [...new Set(values)];
  if (kind === "number") {
    return unique.every((value) => Number.isInteger(value) && Number(value) > 0)
      ? unique as number[] : null;
  }
  return unique.every((value) => typeof value === "string" && UUID.test(value))
    ? unique as string[] : null;
}

export function validateStoryDraft(input: StoryDraftInput) {
  const title = input.title.trim();
  const body = input.body.trim();
  const excerpt = input.excerpt.trim();
  const featuredQuote = input.featuredQuote.trim();
  const tagIds = cleanIds(input.tagIds, "number") as number[] | null;
  const podcasts = cleanIds(input.relatedPodcastIds, "uuid") as string[] | null;
  const reports = cleanIds(input.relatedReportIds, "uuid") as string[] | null;
  const errors: Record<string, string> = {};
  if (!UUID.test(input.submissionId)) errors.submissionId = "invalid";
  if (title.length > 200) errors.title = "too_long";
  if (body.length > 100000) errors.body = "too_long";
  if (excerpt.length > 500) errors.excerpt = "too_long";
  if (featuredQuote.length > 500) errors.featuredQuote = "too_long";
  if (input.categoryTagId !== null && (!Number.isInteger(input.categoryTagId) || input.categoryTagId < 1)) errors.categoryTagId = "invalid";
  if (!tagIds) errors.tagIds = "invalid";
  if (!podcasts) errors.relatedPodcastIds = "invalid";
  if (!reports) errors.relatedReportIds = "invalid";
  return Object.keys(errors).length ? { ok: false as const, errors } : {
    ok: true as const,
    value: { ...input, title, body, excerpt, featuredQuote, tagIds: tagIds!, relatedPodcastIds: podcasts!, relatedReportIds: reports! },
  };
}

export function validateReview(input: ReviewInput) {
  const note = input.note.trim();
  const flags = [...new Set(input.riskFlags)];
  if (!UUID.test(input.submissionId) || !RISK_LEVELS.includes(input.riskLevel)
      || flags.length > 20 || flags.some((flag) => !RISK_FLAGS.includes(flag as RiskFlag))
      || note.length > 2000) return null;
  return { ...input, note, riskFlags: flags };
}
