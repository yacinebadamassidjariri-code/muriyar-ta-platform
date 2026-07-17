import { localeLabels, type Locale } from "@/lib/i18n/routing";

// Shape returned by review_get_submission()
export type ReviewSubmission = {
  submission_id: string;
  language_code: string;
  submission_timestamp: string;
  char_count: number;
  current_state: string;
  issue_tag_id: number | null;
  region_id: number | null;
  country: string | null;
  region: string | null;
  assigned_moderator_id: string | null;
  consent_given: boolean;
  consent_version_id: number | null;
  consent_timestamp: string | null;
  consent_language: string | null;
  rejection_reason_code: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  body: string | null;
};

export type QueueItem = {
  submission_id: string;
  language_code: string;
  submission_timestamp: string;
  char_count: number;
  current_state: string;
  assigned_moderator_id: string | null;
};

export type HistoryItem = {
  action_id: string;
  action_type: string;
  from_state: string | null;
  to_state: string | null;
  note: string | null;
  created_at: string;
};

export type Reason = { reason_code: string; description: string };

// Zarma ('zar') is not a guaranteed Intl locale; fall back to English formatting.
const INTL_LOCALE: Record<string, string> = { en: "en", fr: "fr", ha: "ha", zar: "en" };

export function formatDateTime(ts: string | null, locale: string): string {
  if (!ts) return "—";
  try {
    return new Intl.DateTimeFormat(INTL_LOCALE[locale] ?? "en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toISOString().slice(0, 16).replace("T", " ");
  }
}

export function langLabel(code: string): string {
  return localeLabels[code as Locale] ?? code.toUpperCase();
}

export function shortId(id: string): string {
  return id.slice(0, 8);
}
