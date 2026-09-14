import type { Locale } from "@/lib/i18n/routing";

export type PodcastEditorial = {
  purpose: string; listenSuffix: string; listenAction: string; startHere: string;
  archiveHeading: string; discoverHeading: string; continueListening: string;
  relatedVoices: string; findSupport: string; emptyTitle: string; emptyBody: string;
};

const en: PodcastEditorial = {
  purpose: "With consent and identities protected, episodes explore themes emerging from girls’ experiences to build awareness and youth dialogue.",
  listenSuffix: "min", listenAction: "Listen", startHere: "Start here", archiveHeading: "Episodes",
  discoverHeading: "Browse the archive", continueListening: "More episodes", relatedVoices: "Related voices",
  findSupport: "Related resources", emptyTitle: "Episodes are coming soon",
  emptyBody: "New episodes will appear here when they are ready to hear.",
};
const fr: PodcastEditorial = {
  purpose: "Avec consentement et protection des identités, les épisodes explorent les thèmes issus des expériences des filles pour sensibiliser et nourrir le dialogue entre jeunes.",
  listenSuffix: "min", listenAction: "Écouter", startHere: "Commencer ici", archiveHeading: "Épisodes",
  discoverHeading: "Parcourir les archives", continueListening: "Autres épisodes", relatedVoices: "Voix liées",
  findSupport: "Ressources liées", emptyTitle: "Les épisodes arrivent bientôt",
  emptyBody: "Les nouveaux épisodes apparaîtront ici lorsqu’ils seront prêts à être écoutés.",
};
export const podcastEditorial: Record<Locale, PodcastEditorial> = { en, fr, ha: en, zar: en };
export function listeningMinutes(durationSeconds: number | null): number | null {
  if (!durationSeconds || durationSeconds <= 0) return null;
  return Math.max(1, Math.round(durationSeconds / 60));
}
