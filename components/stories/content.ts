import type { Locale } from "@/lib/i18n/routing";

export type StoriesEditorial = {
  heroEyebrow: string;
  readStory: string;
  moreStories: string;
  emptyTitle: string;
  emptyBody: string;
  emptyCta: string;
};

const en: StoriesEditorial = {
  heroEyebrow: "Lived experiences",
  readStory: "Read story",
  moreStories: "Read more stories",
  emptyTitle: "No stories yet",
  emptyBody: "Published stories will appear here.",
  emptyCta: "Share your story",
};

const fr: StoriesEditorial = {
  heroEyebrow: "Expériences vécues",
  readStory: "Lire le récit",
  moreStories: "Lire d’autres récits",
  emptyTitle: "Aucun récit pour l’instant",
  emptyBody: "Les récits publiés apparaîtront ici.",
  emptyCta: "Partager votre récit",
};

export const storiesEditorial: Record<Locale, StoriesEditorial> = {
  en,
  fr,
  ha: en,
  zar: en,
};
