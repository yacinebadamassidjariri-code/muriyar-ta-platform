import { locales } from "@/lib/i18n/routing";

export const STORY_MIN = 50;
export const STORY_MAX = 20000;
export const GEOGRAPHIC_CONTEXT_MAX = 100;


export type SubmissionInput = {
  language: string;
  story: string;
  country?: string;
  region?: string;
  age?: string; // raw string from FormData; parsed to number
  consent: boolean;
  researchConsent: boolean;
  locale?: string;
};

export type SubmissionField =
  | "language"
  | "story"
  | "country"
  | "region"
  | "age"
  | "consent";

// Age is required for new submissions.
// No minimum or maximum age may determine submission eligibility.
// Existing submissions with NULL age are preserved (database allows NULL for historical rows).
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
    age: number;
    consent: boolean;
    researchConsent: boolean;
  };
} {
  const errors: SubmissionErrors = {};
  const story = (input.story ?? "").trim();
  const country = (input.country ?? "").trim() || null;
  const region = (input.region ?? "").trim() || null;

  // Age: required for new submissions. Empty string → age_required error.
  // No minimum or maximum age may determine submission eligibility.
  // Any non-negative integer is accepted — 0, 9, 100, and beyond all pass.
  // age_invalid is returned only when the value is not a valid non-negative integer.
  const rawAge = (input.age ?? "").trim();
  let age = 0; // placeholder; replaced below or errors.age is set
  if (rawAge === "") {
    errors.age = "age_required";
  } else {
    const parsed = Number(rawAge);
    if (!Number.isInteger(parsed) || parsed < 0) {
      errors.age = "age_invalid";
    } else {
      age = parsed;
    }
  }

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
      age,                        // always a number; errors.age set if absent/invalid
      consent: input.consent,
      researchConsent: input.researchConsent,
    },
  };
}
