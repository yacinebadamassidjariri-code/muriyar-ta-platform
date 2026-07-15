import type { Locale } from "@/lib/i18n/routing";

/**
 * Page-scoped editorial copy for the Podcast experience. Additive only — the
 * existing podcast strings stay in the shared `podcast` next-intl namespace;
 * this module holds just the editorial copy the redesign introduces (the
 * purpose paragraph, the archival transition note, listening-time and listen
 * labels, warmer section headings, the growing-platform note for the browse
 * rails, and hopeful empty-state copy), so no message catalogs or existing
 * types change.
 *
 * EN/FR authored; HA/ZAR fall back to EN, matching the convention used across
 * the homepage, stories archive, and submission page.
 */
export type PodcastEditorial = {
  /** One short editorial paragraph explaining why the podcast exists. */
  purpose: string;
  /** The quiet archival note that hands the reader from the intro into the archive. */
  archiveNote: string;
  /** Suffix after the listening-time number, e.g. "18 min listen". */
  listenSuffix: string;
  /** The invitation that sits directly above the player. */
  listenInvite: string;
  /** Small label above the player itself. */
  listenLabel: string;
  /** Warmer heading for the episode archive on the index. */
  archiveHeading: string;
  /** Warmer heading for the more-episodes sections on an episode page. */
  continueListening: string;
  /** Warmer heading for related stories on an episode page. */
  relatedVoices: string;
  /** Warmer heading for related resources on an episode page. */
  findSupport: string;
  /** Reassuring note beneath the browse rails: the platform is growing, not disabled. */
  growingNote: string;
  emptyTitle: string;
  emptyBody: string;
};

const en: PodcastEditorial = {
  purpose:
    "Every episode begins with an anonymous story. With the storyteller's consent, and her identity always protected, that story is given voice — narrated, and sometimes opened into conversation with others who understand it. What is kept in the archive can also be heard.",
  archiveNote: "An archive of voices, narrated with consent and kept with care.",
  listenSuffix: "min listen",
  listenInvite: "Listen to this episode",
  listenLabel: "Listen",
  archiveHeading: "From the archive",
  continueListening: "Continue listening",
  relatedVoices: "Related voices",
  findSupport: "Find support",
  growingNote:
    "Muriyar Ta is growing. New episodes are being recorded, and these collections open as they are ready.",
  emptyTitle: "This archive is just beginning",
  emptyBody:
    "The first episodes are being recorded. Soon you will be able to listen here.",
};

const fr: PodcastEditorial = {
  purpose:
    "Chaque épisode commence par un récit anonyme. Avec le consentement de celle qui l'a confié, et son identité toujours protégée, ce récit prend voix — raconté, et parfois ouvert à la conversation avec d'autres qui le comprennent. Ce qui est conservé dans l'archive peut aussi s'écouter.",
  archiveNote:
    "Une archive de voix, racontées avec consentement et conservées avec soin.",
  listenSuffix: "min d'écoute",
  listenInvite: "Écouter cet épisode",
  listenLabel: "Écouter",
  archiveHeading: "Depuis les archives",
  continueListening: "Continuer l'écoute",
  relatedVoices: "Voix liées",
  findSupport: "Trouver du soutien",
  growingNote:
    "Muriyar Ta grandit. De nouveaux épisodes sont en cours d'enregistrement, et ces collections s'ouvriront dès qu'elles seront prêtes.",
  emptyTitle: "Cette archive ne fait que commencer",
  emptyBody:
    "Les premiers épisodes sont en cours d'enregistrement. Bientôt, vous pourrez les écouter ici.",
};

export const podcastEditorial: Record<Locale, PodcastEditorial> = {
  en,
  fr,
  ha: en,
  zar: en,
};

/** Whole-minute listening estimate from a duration in seconds (min 1, or null). */
export function listeningMinutes(durationSeconds: number | null): number | null {
  if (!durationSeconds || durationSeconds <= 0) return null;
  return Math.max(1, Math.round(durationSeconds / 60));
}
