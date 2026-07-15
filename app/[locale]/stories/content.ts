import type { Locale } from "@/lib/i18n/routing";

/**
 * Page-scoped editorial copy for the Stories archive. Additive only — the
 * existing story strings stay in the shared `stories` next-intl namespace; this
 * file holds just the few editorial labels the archive introduces (the hero
 * eyebrow, the reading-time suffix, the archival transition note, and the
 * hopeful empty-state copy), so no message catalogs or existing types change.
 *
 * The empty-state copy lives here deliberately: the catalog's emptyTitle/
 * emptyBody are absence-framed ("No stories yet"), and this milestone asks the
 * empty state to read as the beginning of an archive rather than a missing list.
 *
 * EN/FR authored; HA/ZAR fall back to EN, matching the convention used across
 * the homepage and submission page.
 */
export type StoriesEditorial = {
  heroEyebrow: string;
  /** Suffix after the reading-time number, e.g. "4 min read". */
  readSuffix: string;
  /** The quiet archival note that hands the reader from the intro into the archive. */
  archiveNote: string;
  emptyTitle: string;
  emptyBody: string;
  emptyCta: string;
};

const en: StoriesEditorial = {
  heroEyebrow: "Lived experiences",
  readSuffix: "min read",
  archiveNote:
    "An archive of lived experiences, shared in trust and kept with care.",
  emptyTitle: "This archive is just beginning",
  emptyBody:
    "The first stories are still to come. If you have something you want to share, this is a place to be heard.",
  emptyCta: "Share your story",
};

const fr: StoriesEditorial = {
  heroEyebrow: "Expériences vécues",
  readSuffix: "min de lecture",
  archiveNote:
    "Une archive d'expériences vécues, confiées en toute confiance et conservées avec soin.",
  emptyTitle: "Cette archive ne fait que commencer",
  emptyBody:
    "Les premiers récits sont encore à venir. Si vous avez quelque chose à partager, voici un lieu pour être entendue.",
  emptyCta: "Partagez votre récit",
};

export const storiesEditorial: Record<Locale, StoriesEditorial> = {
  en,
  fr,
  ha: en,
  zar: en,
};
