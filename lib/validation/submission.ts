import { locales } from "@/lib/i18n/routing";

export const STORY_MIN = 50;
export const STORY_MAX = 20000;
export const GEOGRAPHIC_CONTEXT_MAX = 100;

export const AGE_MIN = 10;
export const AGE_MAX = 99;

export type SubmissionInput = {
  language: string;
  story: string;
  country?: string;
  region?: string;
  age?: string; // raw string from FormData; parsed to number or null
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
    age: number | null;
    consent: boolean;
    researchConsent: boolean;
  };
} {
  const errors: SubmissionErrors = {};
  const story = (input.story ?? "").trim();
  const country = (input.country ?? "").trim() || null;
  const region = (input.region ?? "").trim() || null;

  // Age: optional. Empty string → null. Non-numeric or out of range → error.
  const rawAge = (input.age ?? "").trim();
  let age: number | null = null;
  if (rawAge !== "") {
    const parsed = Number(rawAge);
    if (!Number.isInteger(parsed) || parsed < AGE_MIN || parsed > AGE_MAX) {
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
      age,
      consent: input.consent,
      researchConsent: input.researchConsent,
    },
  };
}
