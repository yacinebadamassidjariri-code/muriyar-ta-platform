import { locales } from "@/lib/i18n/routing";

export const STORY_MIN = 50;
export const STORY_MAX = 20000;
export const GEOGRAPHIC_CONTEXT_MAX = 100;

export type SubmissionInput = {
  language: string;
  story: string;
  country?: string;
  region?: string;
  consent: boolean;
  locale?: string;
};

export type SubmissionField =
  | "language"
  | "story"
  | "country"
  | "region"
  | "consent";
export type SubmissionErrors = Partial<Record<SubmissionField, string>>;

/**
 * Pure validator shared by the client form (UX) and the server action
 * (authoritative). Returns error *codes*; the UI maps them to localized text.
 */
export function validateSubmission(input: SubmissionInput): {
  ok: boolean;
  errors: SubmissionErrors;
  data: {
    language: string;
    story: string;
    country: string | null;
    region: string | null;
    consent: boolean;
  };
} {
  const errors: SubmissionErrors = {};
  const story = (input.story ?? "").trim();
  const country = (input.country ?? "").trim() || null;
  const region = (input.region ?? "").trim() || null;

  if (!(locales as readonly string[]).includes(input.language)) {
    errors.language = "language_invalid";
  }
  if (story.length === 0) errors.story = "story_required";
  else if (story.length < STORY_MIN) errors.story = "story_short";
  else if (story.length > STORY_MAX) errors.story = "story_long";

  if (country && country.length > GEOGRAPHIC_CONTEXT_MAX) {
    errors.country = "country_long";
  }
  if (region && region.length > GEOGRAPHIC_CONTEXT_MAX) {
    errors.region = "region_long";
  }

  if (!input.consent) errors.consent = "consent_required";

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    data: {
      language: input.language,
      story,
      country,
      region,
      consent: input.consent,
    },
  };
}
